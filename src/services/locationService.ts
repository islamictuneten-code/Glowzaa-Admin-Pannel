/**
 * GLOWZAA B2B WHOLESALE COMMERCE
 * Location & Geolocation Service for Field Sales Tracking (Phase 3)
 */

export type GpsSignalQuality = 'excellent' | 'good' | 'moderate' | 'weak' | 'searching' | 'error' | 'denied' | 'disabled' | 'offline';

export interface GpsStatusInfo {
  state: GpsSignalQuality;
  label: string;
  subLabel: string;
  accuracyMeters: number | null;
}

export interface GeolocationCoordinatesClean {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

// Configurable Phase 3 Constants
export const SHOP_CHECKIN_RADIUS_METERS = 100; // Geofence check-in radius (100 meters)
export const MAX_ACCEPTABLE_ACCURACY_METERS = 80; // Above 80m is considered POOR / untrusted for verification
export const EXCELLENT_ACCURACY_THRESHOLD_METERS = 30; // <= 30m is GOOD

// Throttling constants
export const MIN_PING_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
export const MIN_PING_DISTANCE_METERS = 200; // 200 meters

/**
 * Validates GPS accuracy against Phase 3 business rules:
 * - accuracy <= 30m: GOOD
 * - 30m < accuracy <= 80m: MODERATE
 * - accuracy > 80m: POOR (unreliable, normal check-in rejected)
 */
export function validateLocationAccuracy(accuracyMeters: number | null): {
  level: 'good' | 'moderate' | 'poor' | 'unknown';
  label: string;
  isAcceptable: boolean;
  message: string;
  accuracyMeters: number | null;
} {
  if (accuracyMeters === null || accuracyMeters === undefined || isNaN(accuracyMeters)) {
    return {
      level: 'unknown',
      label: 'Unknown',
      isAcceptable: false,
      message: 'GPS accuracy could not be determined.',
      accuracyMeters: null
    };
  }

  if (accuracyMeters <= EXCELLENT_ACCURACY_THRESHOLD_METERS) {
    return {
      level: 'good',
      label: 'GOOD',
      isAcceptable: true,
      message: `GPS accuracy is excellent (±${Math.round(accuracyMeters)}m).`,
      accuracyMeters
    };
  }

  if (accuracyMeters <= MAX_ACCEPTABLE_ACCURACY_METERS) {
    return {
      level: 'moderate',
      label: 'MODERATE',
      isAcceptable: true,
      message: `GPS accuracy is moderate (±${Math.round(accuracyMeters)}m).`,
      accuracyMeters
    };
  }

  return {
    level: 'poor',
    label: 'POOR',
    isAcceptable: false,
    message: `GPS accuracy is too weak (±${Math.round(accuracyMeters)}m). Please move to an open area and try again.`,
    accuracyMeters
  };
}

/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
 * @returns Distance in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  
  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const φ1 = lat1 * rad;
  const φ2 = lat2 * rad;
  const Δφ = (lat2 - lat1) * rad;
  const Δλ = (lon2 - lon1) * rad;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Calculates distance in kilometers rounded to 2 decimal places.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const meters = calculateDistanceMeters(lat1, lon1, lat2, lon2);
  return Number((meters / 1000).toFixed(2));
}

/**
 * Validates whether seller current location is within geofence radius of shop
 */
export function verifyShopGeofence(params: {
  sellerLat: number;
  sellerLon: number;
  sellerAccuracy: number;
  shopLat: number | null | undefined;
  shopLon: number | null | undefined;
  radiusMeters?: number;
}): {
  isVerified: boolean;
  distanceMeters: number | null;
  accuracyValidation: ReturnType<typeof validateLocationAccuracy>;
  isTooFar: boolean;
  isPoorAccuracy: boolean;
  isMissingShopGps: boolean;
  reason: string;
} {
  const radius = params.radiusMeters || SHOP_CHECKIN_RADIUS_METERS;
  const accuracyVal = validateLocationAccuracy(params.sellerAccuracy);

  // 1. Check if shop has GPS coordinates
  if (
    typeof params.shopLat !== 'number' ||
    typeof params.shopLon !== 'number' ||
    isNaN(params.shopLat) ||
    isNaN(params.shopLon)
  ) {
    return {
      isVerified: false,
      distanceMeters: null,
      accuracyValidation: accuracyVal,
      isTooFar: false,
      isPoorAccuracy: false,
      isMissingShopGps: true,
      reason: 'Shop does not have saved GPS coordinates.'
    };
  }

  // 2. Check seller GPS accuracy safety
  if (!accuracyVal.isAcceptable) {
    return {
      isVerified: false,
      distanceMeters: null,
      accuracyValidation: accuracyVal,
      isTooFar: false,
      isPoorAccuracy: true,
      isMissingShopGps: false,
      reason: `GPS accuracy is too low (±${Math.round(params.sellerAccuracy)}m). Please enable GPS and try again.`
    };
  }

  // 3. Calculate Haversine distance
  const distance = calculateDistanceMeters(
    params.sellerLat,
    params.sellerLon,
    params.shopLat,
    params.shopLon
  );

  // 4. Geofence radius check
  if (distance <= radius) {
    return {
      isVerified: true,
      distanceMeters: distance,
      accuracyValidation: accuracyVal,
      isTooFar: false,
      isPoorAccuracy: false,
      isMissingShopGps: false,
      reason: `You are ${distance}m from the shop (within ${radius}m radius).`
    };
  }

  return {
    isVerified: false,
    distanceMeters: distance,
    accuracyValidation: accuracyVal,
    isTooFar: true,
    isPoorAccuracy: false,
    isMissingShopGps: false,
    reason: `You are too far from this shop (${distance}m away). Maximum allowed is ${radius}m.`
  };
}

/**
 * Returns a direct Google Maps link for given latitude and longitude.
 */
export function getGoogleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/**
 * Determines whether a new GPS ping should be transmitted to Firestore based on throttling rules:
 * 1. At least 3 minutes have passed since the last ping, OR
 * 2. The user has moved at least 200 meters since the last ping, OR
 * 3. An important event triggered the ping (e.g. duty start, shop visit check-in).
 */
export function shouldSendGpsPing(params: {
  lastPingTimestampMs: number;
  lastPingLat: number | null;
  lastPingLon: number | null;
  currentLat: number;
  currentLon: number;
  isForcedEvent?: boolean;
}): boolean {
  if (params.isForcedEvent) return true;

  const now = Date.now();
  const timeElapsedMs = now - params.lastPingTimestampMs;

  // 1. Time-based threshold (>= 3 minutes)
  if (timeElapsedMs >= MIN_PING_INTERVAL_MS) {
    return true;
  }

  // 2. Distance-based threshold (>= 200 meters)
  if (
    params.lastPingLat !== null &&
    params.lastPingLon !== null
  ) {
    const dist = calculateDistanceMeters(
      params.lastPingLat,
      params.lastPingLon,
      params.currentLat,
      params.currentLon
    );
    if (dist >= MIN_PING_DISTANCE_METERS) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates GPS accuracy to determine signal quality.
 */
export function evaluateGpsQuality(accuracyMeters: number | null, isOnline: boolean = true): GpsStatusInfo {
  if (!isOnline) {
    return {
      state: 'offline',
      label: 'Offline',
      subLabel: 'GPS will sync when connection restores',
      accuracyMeters
    };
  }

  if (accuracyMeters === null) {
    return {
      state: 'searching',
      label: 'GPS Searching',
      subLabel: 'Acquiring satellite signal...',
      accuracyMeters: null
    };
  }

  if (accuracyMeters <= 30) {
    return {
      state: 'excellent',
      label: 'GPS Excellent',
      subLabel: `±${Math.round(accuracyMeters)}m precision`,
      accuracyMeters
    };
  }

  if (accuracyMeters <= 80) {
    return {
      state: 'good',
      label: 'GPS Good',
      subLabel: `±${Math.round(accuracyMeters)}m precision`,
      accuracyMeters
    };
  }

  return {
    state: 'weak',
    label: 'GPS Weak',
    subLabel: `±${Math.round(accuracyMeters)}m (low accuracy)`,
    accuracyMeters
  };
}

/**
 * Inspects device battery status safely without breaking unsupported browsers.
 */
export async function getDeviceBatteryInfo(): Promise<{ batteryLevel: number | null; isCharging: boolean | null }> {
  try {
    if (typeof window !== 'undefined' && 'getBattery' in navigator) {
      const battery: any = await (navigator as any).getBattery();
      if (battery) {
        return {
          batteryLevel: Math.round((battery.level || 0) * 100),
          isCharging: Boolean(battery.charging)
        };
      }
    }
  } catch {
    // Battery API is restricted or not supported in this browser
  }
  return { batteryLevel: null, isCharging: null };
}

/**
 * Checks browser permission state for geolocation if supported by the Permissions API.
 */
export async function getLocationPermissionState(): Promise<PermissionState | 'unsupported'> {
  try {
    if (typeof window !== 'undefined' && navigator?.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' as any });
      return status.state;
    }
  } catch {
    // Permissions API query not supported
  }
  return 'unsupported';
}

// Global reference to active watch ID for clean cancellation across app lifecycle
let activeWatchId: number | null = null;

/**
 * Requests the single current GPS position using high accuracy.
 */
export function requestCurrentLocation(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser or device.'));
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          return reject(new Error('Location permission is required. Please allow location access in browser settings.'));
        }

        // Fallback attempt with enableHighAccuracy: false if high accuracy timed out or failed
        if (defaultOptions.enableHighAccuracy) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => resolve(fallbackPos),
            (fallbackErr) => {
              let message = 'Failed to acquire device location.';
              switch (fallbackErr.code) {
                case fallbackErr.PERMISSION_DENIED:
                  message = 'Location permission was denied in browser settings.';
                  break;
                case fallbackErr.POSITION_UNAVAILABLE:
                  message = 'Unable to get your current location. Please ensure device GPS/Location is turned on.';
                  break;
                case fallbackErr.TIMEOUT:
                  message = 'Location request timed out. Please retry or check device location settings.';
                  break;
              }
              reject(new Error(message));
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000
            }
          );
          return;
        }

        let message = 'Failed to acquire device location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location permission is required to capture location.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Unable to get your current location. Please enable device location/GPS.';
            break;
          case err.TIMEOUT:
            message = 'Location request timed out. Please move to an open area and try again.';
            break;
        }
        reject(new Error(message));
      },
      defaultOptions
    );
  });
}

/**
 * Alias helper function to get current location cleanly.
 */
export async function getCurrentLocation(options?: PositionOptions): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}> {
  const pos = await requestCurrentLocation(options);
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp
  };
}

/**
 * Starts continuous location monitoring via navigator.geolocation.watchPosition().
 */
export function startWatchingLocation(
  onPosition: (pos: GeolocationPosition) => void,
  onError: (err: GeolocationPositionError) => void,
  options?: PositionOptions
): number | null {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  // Clear any existing active watch before creating a new one
  stopWatchingLocation();

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000,
    ...options
  };

  try {
    activeWatchId = navigator.geolocation.watchPosition(
      (position) => {
        onPosition(position);
      },
      (error) => {
        onError(error);
      },
      defaultOptions
    );
    return activeWatchId;
  } catch (err) {
    console.error('Error starting geolocation watch:', err);
    return null;
  }
}

/**
 * Alias helper for startWatchingLocation
 */
export const watchCurrentLocation = startWatchingLocation;

/**
 * Stops and clears any active geolocation watch immediately.
 */
export function stopWatchingLocation(watchId?: number | null): void {
  if (typeof window === 'undefined' || !navigator.geolocation) return;

  const idToClear = watchId !== undefined ? watchId : activeWatchId;
  if (idToClear !== null && idToClear !== undefined) {
    try {
      navigator.geolocation.clearWatch(idToClear);
    } catch (err) {
      console.warn('Error clearing geolocation watch:', err);
    }
  }
  if (idToClear === activeWatchId) {
    activeWatchId = null;
  }
}

/**
 * Alias helper for stopWatchingLocation
 */
export const stopLocationTracking = stopWatchingLocation;

/**
 * Formats a duration in milliseconds to "HHh MMm" or "MMm SSs".
 */
export function formatDutyDuration(startedAtIso: string): string {
  if (!startedAtIso) return '00h 00m';
  const startMs = new Date(startedAtIso).getTime();
  const nowMs = Date.now();
  if (isNaN(startMs) || nowMs < startMs) return '00h 00m';

  const diffSeconds = Math.floor((nowMs - startMs) / 1000);
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}h ${pad(minutes)}m`;
}

