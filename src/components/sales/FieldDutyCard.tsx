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
  requestCurrentLocation,
  evaluateGpsFreshness,
  evaluateTrackingStatus,
  evaluateGpsQuality, 
  getDeviceBatteryInfo, 
  shouldSendGpsPing, 
  calculateDistanceKm
} from '../../services/locationService';
import { 
  processLocationForAutomaticVisits, 
  getCurrentDwellState, 
  flushPendingVisitsQueue,
  savePendingVisitOffline 
} from '../../services/automaticVisitService';
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
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

export const FieldDutyCard: React.FC = () => {
  const { currentUser } = useAuth();
  const { customers, currentSalesUser, addToast } = useApp();

  const [activeSession, setActiveSession] = useState<FieldDutySession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [isRefreshingGps, setIsRefreshingGps] = useState<boolean>(false);

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
    setGpsErrorMessage(null);

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

  const handleLocationUpdateRef = useRef(handleLocationUpdate);
  useEffect(() => {
    handleLocationUpdateRef.current = handleLocationUpdate;
  }, [handleLocationUpdate]);

  // Online/Offline Listener & Visibility / Reconnection GPS Refresh
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (currentUser) {
        // Flush any offline visits
        await flushPendingVisitsQueue(currentUser);
      }
      if (activeSession && activeSession.status === 'active') {
        try {
          const pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
          await handleLocationUpdateRef.current(pos, activeSession, true);
        } catch (err) {
          console.warn('Online sync GPS refresh failed:', err);
        }
      }
    };
    const handleOffline = () => setIsOnline(false);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && activeSession && activeSession.status === 'active') {
        try {
          const pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
          await handleLocationUpdateRef.current(pos, activeSession, true);
        } catch (err) {
          console.warn('Visibility resume GPS refresh failed:', err);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSession, currentUser]);

  // Periodic GPS Heartbeat ping (every 2.5 minutes) to ensure freshness even if stationary
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;

    const heartbeatInterval = setInterval(async () => {
      const timeSinceLastPing = Date.now() - lastPingRef.current.timestampMs;
      // If no ping sent in last 2 minutes, trigger a fresh location check
      if (timeSinceLastPing >= 120000) {
        try {
          const pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
          await handleLocationUpdateRef.current(pos, activeSession, false);
        } catch (err: any) {
          console.warn('Periodic GPS heartbeat error:', err?.message || err);
        }
      }
    }, 120000);

    return () => clearInterval(heartbeatInterval);
  }, [activeSession]);

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

  // Start continuous watch position
  const beginGpsTracking = useCallback((session: FieldDutySession) => {
    stopWatchingLocation();

    const id = startWatchingLocation(
      (position) => {
        handleLocationUpdate(position, session, false);
      },
      (error) => {
        console.warn('GPS location update notice:', error.message);
        let msg = 'Location signal weak or paused.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission disabled in browser. Field duty is active, but GPS cannot update.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS signal acquisition timed out. Retrying in background...';
        }
        setGpsErrorMessage(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );

    watchIdRef.current = id;
  }, [handleLocationUpdate]);

  // Force Manual GPS Refresh
  const handleForceGpsRefresh = async () => {
    if (!activeSession || activeSession.status !== 'active') return;
    setIsRefreshingGps(true);
    try {
      const pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      await handleLocationUpdate(pos, activeSession, true);
      addToast({
        type: 'success',
        title: 'GPS Synced',
        message: 'Current location recorded successfully.'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'GPS Sync Failed',
        message: err.message || 'Could not acquire satellite fix.'
      });
    } finally {
      setIsRefreshingGps(false);
    }
  };

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
          beginGpsTracking(session);
        }
      } catch (err) {
        console.error('Failed to initialize automatic field tracking:', err);
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

  // Phase 4 Decoupled State Evaluations
  const trackingEval = evaluateTrackingStatus(activeSession);
  const gpsFreshness = evaluateGpsFreshness(activeSession?.lastLocationUpdateAt);
  const gpsQuality = evaluateGpsQuality(currentAccuracy, isOnline);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Indicator Group */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            {trackingEval.isOnField ? (
              <>
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* 1. Primary Field Duty Status */}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${trackingEval.badgeBg}`}>
                {trackingEval.label}
              </span>

              {/* 2. Secondary GPS Freshness */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${gpsFreshness.badgeBg}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${gpsFreshness.dotColor}`}></span>
                GPS {gpsFreshness.label}
                {gpsFreshness.minutesAgo < 900 && gpsFreshness.minutesAgo > 0 ? ` (${gpsFreshness.minutesAgo}m)` : ''}
              </span>

              {/* 3. Network Status */}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isOnline ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="w-2.5 h-2.5 text-emerald-600" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="w-2.5 h-2.5 text-rose-600" />
                    Offline (Buffered)
                  </>
                )}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
              <span>Synced {lastSyncTime}</span>
              {currentAccuracy !== null && (
                <>
                  <span>•</span>
                  <span>±{Math.round(currentAccuracy)}m</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Telemetry info pill & Manual Refresh */}
        <div className="flex items-center gap-2 text-xs text-slate-600 ml-auto">
          {batteryState.level !== null && (
            <div className="hidden xs:flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              {batteryState.charging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{batteryState.level}%</span>
            </div>
          )}

          <div className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            <Radio className="w-3.5 h-3.5 text-teal-600" />
            <span>{activeSession?.totalVisitsCompleted || 0} Visits</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>{activeSession?.totalDistanceKm || 0} km</span>
          </div>

          <button
            type="button"
            onClick={handleForceGpsRefresh}
            disabled={isRefreshingGps}
            title="Sync current GPS location now"
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingGps ? 'animate-spin text-[#087F7A]' : ''}`} />
          </button>
        </div>
      </div>

      {/* GPS Warning Banner if any error occurs (Duty remains ON FIELD) */}
      {gpsErrorMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{gpsErrorMessage}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Your field duty session is active. Enable GPS or move to an open area to resume automatic location sync.
            </p>
          </div>
        </div>
      )}

      {/* Active Shop Dwell Banner (if currently inside shop geofence) */}
      {activeShopName && (
        <div className="bg-teal-50/80 border border-teal-200 p-2.5 rounded-lg flex items-center justify-between text-xs text-teal-900">
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

      {/* Helpful Mobile/Browser Background GPS Notice */}
      <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Background GPS may be limited by your phone's battery and browser settings.</span>
        </span>
      </div>
    </div>
  );
};

