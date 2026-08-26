export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}

// In a real production environment, TURN credentials should be fetched dynamically
// from a secure backend endpoint to ensure temporary, time-bound access.
// Here we provide an abstraction that defaults to STUN, and allows injection of TURN.
export const getWebRTCConfiguration = async (): Promise<WebRTCConfig> => {
  try {
    // Attempt to fetch TURN credentials from backend/cloud function
    // const response = await fetch('/api/turn-credentials');
    // const credentials = await response.json();
    // return { iceServers: credentials.iceServers };
    
    // Fallback to STUN for development/mesh
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  } catch (error) {
    console.warn('Failed to fetch production TURN credentials. Falling back to public STUN.', error);
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
  }
};
