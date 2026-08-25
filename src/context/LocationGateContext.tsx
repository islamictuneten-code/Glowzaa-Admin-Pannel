import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { LocationReadiness, FieldDutySession, GpsConnectionState } from '../types';
import { 
  getLocationPermissionState, 
  requestCurrentLocation, 
  evaluateGpsQuality
} from '../services/locationService';
import { 
  getActiveFieldDutySession,
  getOrCreateActiveFieldDutySession,
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
  gpsStatus: GpsConnectionState;
  startDuty: () => Promise<boolean>;
  stopDuty: () => Promise<void>;
  checkLocationReadiness: (forceFresh?: boolean) => Promise<boolean>;
  retryLocation: () => Promise<boolean>;
  requestShopLocation: () => Promise<{ latitude: number; longitude: number; accuracy: number; capturedAt: string; capturedByUserId: string } | null>;
}

const LocationGateContext = createContext<LocationGateContextType | undefined>(undefined);

export const LocationGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [readiness, setReadiness] = useState<LocationReadiness>('ready');
  const [permissionState, setPermissionState] = useState<PermissionState | 'unsupported'>('prompt');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isLocationLost, setIsLocationLost] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<FieldDutySession | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsConnectionState>('idle');

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

  // Check initial permission and active session on mount or user change
  useEffect(() => {
    let isMounted = true;
    const initializeLocationState = async () => {
      if (!currentUser || currentUser.role !== 'sales') {
        if (isMounted) {
          setReadiness('ready');
          setIsChecking(false);
        }
        return;
      }

      try {
        const perm = await getLocationPermissionState();
        if (isMounted) setPermissionState(perm);

        const activeSess = await getActiveFieldDutySession(currentUser.uid);
        if (isMounted && activeSess) {
          setActiveSession(activeSess);
          if (activeSess.lastLatitude && activeSess.lastLongitude) {
            setCoords({
              latitude: activeSess.lastLatitude,
              longitude: activeSess.lastLongitude,
              accuracy: activeSess.gpsAccuracyMeters || 15
            });
            const quality = evaluateGpsQuality(activeSess.gpsAccuracyMeters || 15);
            setGpsStatus(quality.state);
          }
        }
      } catch (err) {
        console.warn('Error initializing location state:', err);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    initializeLocationState();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Start Field Duty (turns on GPS check and creates session)
  const startDuty = useCallback(async (): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'sales') return false;

    setIsChecking(true);
    setErrorMessage(null);
    setGpsStatus('requesting');

    try {
      const perm = await getLocationPermissionState();
      setPermissionState(perm);

      if (perm === 'denied') {
        setReadiness('permission_denied');
        setErrorMessage('Location permission is blocked. Please allow location access in your browser settings.');
        setIsChecking(false);
        await logLocationAuditEvent('SALES_LOCATION_PERMISSION_DENIED', 'Permission denied when starting field duty', 'PERMISSION_DENIED');
        return false;
      }

      setGpsStatus('searching');
      const pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 15000 });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      setCoords({ latitude: lat, longitude: lon, accuracy });
      setLastVerifiedAt(new Date().toISOString());
      setReadiness('ready');
      setGpsStatus(evaluateGpsQuality(accuracy).state);

      // Create or get active field duty session
      const res = await getOrCreateActiveFieldDutySession(currentUser, {
        latitude: lat,
        longitude: lon,
        accuracy
      });

      if (res.success && res.session) {
        setActiveSession(res.session);
      }

      setIsChecking(false);
      await logLocationAuditEvent('SALES_LOCATION_GATE_PASSED', `Field duty started (Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}, Accuracy: ±${Math.round(accuracy)}m)`);
      return true;
    } catch (err: any) {
      console.warn('Failed to start field duty location:', err);
      const msg = err.message || 'Unable to acquire GPS location.';
      setErrorMessage(msg);
      setIsChecking(false);
      setGpsStatus('timeout');
      return false;
    }
  }, [currentUser, logLocationAuditEvent]);

  // Stop Field Duty
  const stopDuty = useCallback(async (): Promise<void> => {
    if (!currentUser) return;
    try {
      if (activeSession) {
        await apiEndFieldDutySession(currentUser, activeSession.sessionId || activeSession.id);
      }
      setActiveSession(null);
      setGpsStatus('idle');
    } catch (err) {
      console.error('Failed to stop field duty session:', err);
    }
  }, [currentUser, activeSession]);

  const checkLocationReadiness = useCallback(async (_forceFresh: boolean = false): Promise<boolean> => {
    const perm = await getLocationPermissionState();
    setPermissionState(perm);
    return perm !== 'denied';
  }, []);

  const retryLocation = useCallback(async (): Promise<boolean> => {
    return startDuty();
  }, [startDuty]);

  const requestShopLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    capturedAt: string;
    capturedByUserId: string;
  } | null> => {
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
      if (coords) {
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          capturedAt: new Date().toISOString(),
          capturedByUserId: currentUser?.uid || 'system'
        };
      }
      return null;
    }
  }, [currentUser, coords]);

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
        gpsStatus,
        startDuty,
        stopDuty,
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
