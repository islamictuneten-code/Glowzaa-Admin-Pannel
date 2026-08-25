import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  FieldDutySession, 
  CustomerVisit 
} from '../../types';
import { 
  getActiveFieldDutySession, 
  getOrCreateActiveFieldDutySession,
  createLocationPing
} from '../../services/firestoreService';
import { 
  startWatchingLocation, 
  stopWatchingLocation, 
  evaluateGpsQuality, 
  getDeviceBatteryInfo, 
  shouldSendGpsPing, 
  calculateDistanceKm
} from '../../services/locationService';
import { processLocationForAutomaticVisits, getCurrentDwellState } from '../../services/automaticVisitService';
import { 
  MapPin, 
  Navigation, 
  Radio, 
  RefreshCw, 
  Battery, 
  BatteryCharging, 
  CheckCircle2, 
  Store,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const FieldDutyCard: React.FC = () => {
  const { currentUser } = useAuth();
  const { customers, currentSalesUser, addToast } = useApp();

  const [activeSession, setActiveSession] = useState<FieldDutySession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [statusText, setStatusText] = useState<string>('Initializing automatic field tracking...');

  // Active dwelling/visit feedback for passive display
  const [activeShopName, setActiveShopName] = useState<string | null>(null);
  const [dwellMinutes, setDwellMinutes] = useState<number>(0);

  // Real-time GPS Telemetry State
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [batteryState, setBatteryState] = useState<{ level: number | null; charging: boolean | null }>({ level: null, charging: null });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  // Throttling References
  const lastPingRef = useRef<{
    timestampMs: number;
    lat: number | null;
    lon: number | null;
  }>({
    timestampMs: 0,
    lat: null,
    lon: null
  });

  const cumulativeDistanceKmRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // Online/Offline Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update device battery status periodically
  useEffect(() => {
    let isMounted = true;
    const updateBattery = async () => {
      const bat = await getDeviceBatteryInfo();
      if (isMounted) {
        setBatteryState({ level: bat.batteryLevel, charging: bat.isCharging });
      }
    };
    updateBattery();
    const interval = setInterval(updateBattery, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Process GPS location for automatic pings and geofence visit detection
  const handleLocationUpdate = useCallback(async (pos: GeolocationPosition, session: FieldDutySession, forced = false) => {
    if (!currentUser || session.status !== 'active') return;

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const accuracy = pos.coords.accuracy;
    const speed = pos.coords.speed;
    const heading = pos.coords.heading;
    const altitude = pos.coords.altitude;

    setCurrentCoords({ latitude: lat, longitude: lon });
    setCurrentAccuracy(accuracy);

    // Calculate distance delta
    if (lastPingRef.current.lat !== null && lastPingRef.current.lon !== null) {
      const distKm = calculateDistanceKm(
        lastPingRef.current.lat,
        lastPingRef.current.lon,
        lat,
        lon
      );
      if (distKm > 0 && distKm < 50) {
        cumulativeDistanceKmRef.current = Number((cumulativeDistanceKmRef.current + distKm).toFixed(2));
      }
    }

    // 1. Automatic Shop Geofence Detection
    try {
      const result = await processLocationForAutomaticVisits({
        currentUser,
        activeSession: session,
        currentLat: lat,
        currentLon: lon,
        accuracy,
        allCustomers: customers,
        onVisitCreated: (visit) => {
          addToast({
            type: 'success',
            title: 'Shop Visit Auto-Detected',
            message: `Arrival recorded at ${visit.shopName} via GPS geofence.`
          });
        },
        onVisitCompleted: (visitId, durationMin) => {
          addToast({
            type: 'info',
            title: 'Shop Visit Completed',
            message: `Departure recorded (${durationMin} min duration).`
          });
        }
      });

      if (result.actionTaken === 'dwell_started' || result.actionTaken === 'in_progress' || result.actionTaken === 'visit_confirmed') {
        setActiveShopName(result.currentShopName || 'Customer Shop');
        setDwellMinutes(result.dwellMinutes || 0);
      } else if (result.actionTaken === 'visit_exited') {
        setActiveShopName(null);
        setDwellMinutes(0);
      }
    } catch (err) {
      console.error('Error processing automatic shop visit geofence:', err);
    }

    // 2. Throttled Firestore Location Ping Transmission
    const shouldSend = shouldSendGpsPing({
      lastPingTimestampMs: lastPingRef.current.timestampMs,
      lastPingLat: lastPingRef.current.lat,
      lastPingLon: lastPingRef.current.lon,
      currentLat: lat,
      currentLon: lon,
      isForcedEvent: forced
    });

    if (shouldSend && isOnline) {
      const pingRes = await createLocationPing(currentUser, {
        sessionId: session.sessionId,
        latitude: lat,
        longitude: lon,
        accuracy: accuracy,
        speed: speed ?? null,
        heading: heading ?? null,
        altitude: altitude ?? null,
        batteryLevel: batteryState.level,
        isCharging: batteryState.charging,
        networkOnline: isOnline
      });

      if (pingRes.success) {
        lastPingRef.current = {
          timestampMs: Date.now(),
          lat,
          lon
        };
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setActiveSession(prev => prev ? {
          ...prev,
          lastLatitude: lat,
          lastLongitude: lon,
          lastLocationUpdateAt: new Date().toISOString(),
          gpsAccuracyMeters: accuracy,
          totalDistanceKm: cumulativeDistanceKmRef.current || prev.totalDistanceKm || 0
        } : null);
      }
    }
  }, [currentUser, isOnline, batteryState, customers, addToast]);

  // Start continuous watch position
  const beginGpsTracking = useCallback((session: FieldDutySession) => {
    stopWatchingLocation();

    const id = startWatchingLocation(
      (position) => {
        handleLocationUpdate(position, session, false);
      },
      (error) => {
        console.warn('GPS location update notice:', error.message);
        setStatusText('Location access restricted. Please check device GPS settings.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );

    watchIdRef.current = id;
  }, [handleLocationUpdate]);

  // Automatic session restoration & start on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAutomaticTracking = async () => {
      if (!currentUser?.uid || (currentUser.role !== 'sales' && currentUser.role !== 'admin')) {
        setIsLoadingSession(false);
        return;
      }

      setIsLoadingSession(true);
      try {
        // Automatically get existing session for today or create a new active session for today
        const res = await getOrCreateActiveFieldDutySession(currentUser);
        const session = res?.session || null;
        if (isMounted && session) {
          setActiveSession(session);
          cumulativeDistanceKmRef.current = session.totalDistanceKm || 0;
          if (session.lastLatitude && session.lastLongitude) {
            lastPingRef.current = {
              timestampMs: Date.now(),
              lat: session.lastLatitude,
              lon: session.lastLongitude
            };
            setCurrentCoords({ latitude: session.lastLatitude, longitude: session.lastLongitude });
            setCurrentAccuracy(session.gpsAccuracyMeters || null);
          }
          setStatusText('Automatic Field Tracking Active');
          beginGpsTracking(session);
        }
      } catch (err) {
        console.error('Failed to initialize automatic field tracking:', err);
        if (isMounted) setStatusText('GPS Sync Active');
      } finally {
        if (isMounted) setIsLoadingSession(false);
      }
    };

    initializeAutomaticTracking();

    return () => {
      isMounted = false;
      stopWatchingLocation();
    };
  }, [currentUser, beginGpsTracking]);

  if (!currentUser || (currentUser.role !== 'sales' && currentUser.role !== 'admin')) {
    return null;
  }

  const gpsQuality = evaluateGpsQuality(currentAccuracy, isOnline);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-3">
        {/* Passive Status Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {activeShopName ? `At ${activeShopName}` : 'Field GPS Tracking Active'}
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                Auto-Detect Enabled
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Synced {lastSyncTime}</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">{gpsQuality.label} ({gpsQuality.subLabel})</span>
            </p>
          </div>
        </div>

        {/* Telemetry info pill */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600">
          {batteryState.level !== null && (
            <div className="flex items-center gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
              {batteryState.charging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{batteryState.level}%</span>
            </div>
          )}

          <div className="flex items-center gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
            <Radio className="w-3.5 h-3.5 text-teal-600" />
            <span>{activeSession?.totalVisitsCompleted || 0} Shops Visited</span>
          </div>

          <div className="flex items-center gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>{activeSession?.totalDistanceKm || 0} km</span>
          </div>
        </div>
      </div>

      {/* Active Shop Dwell Banner (if currently inside shop geofence) */}
      {activeShopName && (
        <div className="bg-teal-50/70 border border-teal-200 p-2.5 rounded-lg flex items-center justify-between text-xs text-teal-900">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[#087F7A]" />
            <span>
              Auto-Visit Active at <b>{activeShopName}</b>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-[#087F7A] bg-white px-2.5 py-1 rounded border border-teal-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Dwell: {dwellMinutes} min</span>
          </div>
        </div>
      )}
    </div>
  );
};
