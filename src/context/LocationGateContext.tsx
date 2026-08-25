import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { LocationReadiness, FieldDutySession } from '../types';
import { 
  getLocationPermissionState, 
  requestCurrentLocation, 
  startWatchingLocation, 
  stopWatchingLocation
} from '../services/locationService';
import { 
  getOrCreateActiveFieldDutySession, 
  startFieldDutySession,
  endFieldDutySession as apiEndFieldDutySession,
  writeFieldDutyAuditLog
} from '../services/firestoreService';

export interface LocationGateContextType {
  readiness: LocationReadiness;
  permissionState: PermissionState | 'unsupported';
  coords: { latitude: number; longitude: number; accuracy: number } | null;
  lastVerifiedAt: string | null;
  errorMessage: string | null;
  isChecking: boolean;
  isLocationLost: boolean;
  activeSession: FieldDutySession | null;
  createFieldDutySession: (lat: number, lon: number) => Promise<void>;
  endFieldDutySession: () => Promise<void>;
  checkLocationReadiness: (forceFresh?: boolean) => Promise<boolean>;
  retryLocation: () => Promise<boolean>;
  requestShopLocation: () => Promise<{ latitude: number; longitude: number; accuracy: number; capturedAt: string; capturedByUserId: string } | null>;
}

const LocationGateContext = createContext<LocationGateContextType | undefined>(undefined);

export const GPS_GATE_MAX_ACCURACY_METERS = 100;
export const LOCATION_STALE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export const LocationGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [readiness, setReadiness] = useState<LocationReadiness>('checking');
  const [permissionState, setPermissionState] = useState<PermissionState | 'unsupported'>('prompt');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isLocationLost, setIsLocationLost] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<FieldDutySession | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const prevIsLocationLostRef = useRef<boolean>(false);
  const auditLoggedStateRef = useRef<{ gatePassed?: boolean }>({});

  // Helper for logging audit events
  const logLocationAuditEvent = useCallback(async (
    action: 'SALES_LOCATION_GATE_PASSED' | 'SALES_LOCATION_PERMISSION_DENIED' | 'SALES_GPS_UNAVAILABLE' | 'SALES_LOCATION_LOST' | 'SALES_LOCATION_RESTORED',
    details: string,
    reason?: string
  ) => {
    if (!currentUser?.uid) return;
    try {
      await writeFieldDutyAuditLog({
        action,
        targetUserId: currentUser.uid,
        targetUserLoginId: currentUser.loginId || currentUser.email || '',
        targetUserName: currentUser.name || 'Sales Staff',
        targetRole: currentUser.role,
        performedByUserId: currentUser.uid,
        performedByUserName: currentUser.name || 'Sales Staff',
        timestamp: new Date().toISOString(),
        details,
        reason
      });
    } catch (err) {
      console.warn('Location Gate audit log warning:', err);
    }
  }, [currentUser]);

  /**
   * Primary Location Gate Readiness Check
   */
  const checkLocationReadiness = useCallback(async (forceFresh: boolean = false): Promise<boolean> => {
    // Non-sales users (admin, delivery) bypass gate completely
    if (!currentUser || currentUser.role !== 'sales') {
      setReadiness('ready');
      setIsChecking(false);
      setIsLocationLost(false);
      return true;
    }

    setIsChecking(true);
    setErrorMessage(null);

    // 1. Browser Capability Check
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setReadiness('unsupported');
      setErrorMessage('Geolocation is not supported by your browser or device.');
      setIsChecking(false);
      await logLocationAuditEvent('SALES_GPS_UNAVAILABLE', 'Geolocation API unsupported by browser', 'API_UNSUPPORTED');
      return false;
    }

    // 2. Permission Query Check
    const perm = await getLocationPermissionState();
    setPermissionState(perm);

    if (perm === 'denied') {
      setReadiness('permission_denied');
      setErrorMessage('Location permission is denied. Please enable location permission in browser settings.');
      setIsChecking(false);
      await logLocationAuditEvent('SALES_LOCATION_PERMISSION_DENIED', 'Browser permission state is explicitly denied', 'PERMISSION_DENIED');
      return false;
    }

    // 3. Obtain Real GPS Coordinates
    try {
      const position = await requestCurrentLocation({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: forceFresh ? 0 : 30000
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Coordinate boundary safety
      if (typeof lat !== 'number' || lat < -90 || lat > 90 || typeof lon !== 'number' || lon < -180 || lon > 180) {
        setReadiness('gps_unavailable');
        setErrorMessage('Invalid GPS coordinates received from device.');
        setIsChecking(false);
        await logLocationAuditEvent('SALES_GPS_UNAVAILABLE', 'Invalid coordinate bounds', 'INVALID_COORDINATES');
        return false;
      }

      // 4. GPS Accuracy Check (<= 100m threshold)
      if (accuracy > GPS_GATE_MAX_ACCURACY_METERS) {
        setReadiness('weak_accuracy');
        setCoords({ latitude: lat, longitude: lon, accuracy });
        setErrorMessage(`GPS accuracy is weak (±${Math.round(accuracy)}m). Required is ±${GPS_GATE_MAX_ACCURACY_METERS}m or better. Please move to an open area and try again.`);
        setIsChecking(false);
        await logLocationAuditEvent('SALES_GPS_UNAVAILABLE', `GPS accuracy too weak: ±${Math.round(accuracy)}m`, 'WEAK_ACCURACY');
        return false;
      }

      // 5. SUCCESS! Gate Passed!
      const nowIso = new Date().toISOString();
      setCoords({ latitude: lat, longitude: lon, accuracy });
      setLastVerifiedAt(nowIso);
      setReadiness('ready');
      setIsLocationLost(false);
      setErrorMessage(null);
      setPermissionState('granted');
      setIsChecking(false);

      if (!auditLoggedStateRef.current.gatePassed) {
        auditLoggedStateRef.current.gatePassed = true;
        await logLocationAuditEvent('SALES_LOCATION_GATE_PASSED', `Location readiness gate passed (Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}, Accuracy: ±${Math.round(accuracy)}m)`);
      }

      // 6. Automatically start or resume active Field Duty session
      try {
        const sessionRes = await getOrCreateActiveFieldDutySession(currentUser, {
          latitude: lat,
          longitude: lon,
          accuracy
        });
        if (sessionRes.success && sessionRes.session) {
          setActiveSession(sessionRes.session);
        }
      } catch (sessErr) {
        console.warn('Field duty session initialization notice:', sessErr);
      }

      return true;
    } catch (err: any) {
      console.warn('Location readiness check failed:', err);
      const msg = err.message || 'Unable to access device location.';

      // If we already have valid coordinates in state from background tracking or previous check, preserve ready state
      if (coords && coords.latitude && coords.longitude && coords.accuracy <= GPS_GATE_MAX_ACCURACY_METERS) {
        setReadiness('ready');
        setErrorMessage(null);
        setPermissionState('granted');
        setIsLocationLost(false);
        setIsChecking(false);
        return true;
      }

      setCoords(null);
      if (msg.includes('permission') || msg.includes('Permission')) {
        setReadiness('permission_denied');
        setPermissionState('denied');
        setErrorMessage('Location permission was denied. Please allow location access in your browser settings.');
        await logLocationAuditEvent('SALES_LOCATION_PERMISSION_DENIED', msg, 'PERMISSION_DENIED');
      } else {
        setReadiness('gps_unavailable');
        setErrorMessage('Device GPS signal is unavailable. Please ensure GPS/Location is turned on in device settings.');
        await logLocationAuditEvent('SALES_GPS_UNAVAILABLE', msg, 'POSITION_UNAVAILABLE');
      }

      setIsChecking(false);
      return false;
    }
  }, [currentUser, logLocationAuditEvent]);

  // Automated background polling if not ready
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (readiness !== 'ready' && readiness !== 'permission_denied' && readiness !== 'unsupported') {
        interval = setInterval(() => {
            checkLocationReadiness(true);
        }, 5000); // Poll every 5 seconds
    }
    return () => clearInterval(interval);
  }, [readiness, checkLocationReadiness]);

  const retryLocation = useCallback(() => {
    return checkLocationReadiness(true);
  }, [checkLocationReadiness]);

  const createFieldDutySession = useCallback(async (lat: number, lon: number) => {
    if (!currentUser) return;
    try {
      const res = await startFieldDutySession(currentUser, { latitude: lat, longitude: lon, accuracy: coords?.accuracy || 10 });
      if (res.success && res.session) {
        setActiveSession(res.session);
      }
    } catch (err) {
      console.error('Failed to create field duty session:', err);
    }
  }, [currentUser, coords]);

  const endFieldDutySession = useCallback(async () => {
    if (!currentUser || !activeSession) return;
    try {
      await apiEndFieldDutySession(currentUser, activeSession.sessionId || activeSession.id);
      setActiveSession(null);
    } catch (err) {
      console.error('Failed to end field duty session:', err);
    }
  }, [currentUser, activeSession]);

  /**
   * Request verified shop location for customer creation/editing
   */
  const requestShopLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    capturedAt: string;
    capturedByUserId: string;
  } | null> => {
    if (!currentUser || currentUser.role !== 'sales') {
      try {
        const pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 10000 });
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
          capturedByUserId: currentUser?.uid || 'system'
        };
      } catch {
        return null;
      }
    }

    // For sales staff: Ensure location gate is checked fresh
    const isReady = await checkLocationReadiness(true);
    if (!isReady || !coords) return null;

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      capturedAt: new Date().toISOString(),
      capturedByUserId: currentUser.uid
    };
  }, [currentUser, checkLocationReadiness, coords]);

  // Initial check on mount or when user changes
  useEffect(() => {
    let isMounted = true;
    if (currentUser && currentUser.role === 'sales') {
      checkLocationReadiness(false).then(() => {
        if (!isMounted) return;
      });
    } else {
      setReadiness('ready');
      setIsChecking(false);
      setIsLocationLost(false);
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, checkLocationReadiness]);

  // Continuous background location monitoring & Location Lost detection
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'sales' || readiness !== 'ready') {
      stopWatchingLocation();
      return;
    }

    stopWatchingLocation();

    const id = startWatchingLocation(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        const nowIso = new Date().toISOString();

        if (acc <= GPS_GATE_MAX_ACCURACY_METERS) {
          setCoords({ latitude: lat, longitude: lon, accuracy: acc });
          setLastVerifiedAt(nowIso);
          setIsLocationLost(false);
          prevIsLocationLostRef.current = false;
        }
      },
      (err) => {
        console.warn('Background GPS tracking loss event:', err.message);
        // Distinguish between PERMISSION_DENIED (user action needed) and POSITION_UNAVAILABLE/TIMEOUT (auto-recovery)
        if (err.code === err.PERMISSION_DENIED) {
           setIsLocationLost(true);
           setErrorMessage('Location permission is blocked. Please allow Location for Glowzaa in browser settings.');
           logLocationAuditEvent('SALES_LOCATION_PERMISSION_DENIED', 'Permission denied during watch', 'PERMISSION_DENIED');
        } else {
           // Do not immediately mark as "lost" to the user, keep trying in background
           console.log('GPS signal temporarily unavailable, auto-recovering...');
           // Keep isLocationLost as false to allow auto-recovery, or set a "searching" state in UI if needed
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000
      }
    );

    watchIdRef.current = id;

    return () => {
      stopWatchingLocation();
    };
  }, [currentUser, readiness, logLocationAuditEvent]);

  return (
    <LocationGateContext.Provider
      value={{
        readiness,
        permissionState,
        coords,
        lastVerifiedAt,
        errorMessage,
        isChecking,
        isLocationLost,
        activeSession,
        createFieldDutySession,
        endFieldDutySession,
        checkLocationReadiness,
        retryLocation,
        requestShopLocation
      }}
    >
      {children}
    </LocationGateContext.Provider>
  );
};

export const useLocationGate = (): LocationGateContextType => {
  const context = useContext(LocationGateContext);
  if (!context) {
    throw new Error('useLocationGate must be used within a LocationGateProvider');
  }
  return context;
};
