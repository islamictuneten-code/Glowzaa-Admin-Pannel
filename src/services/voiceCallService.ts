import { VoiceCall, AuthUser, VoiceCallSignal, VoiceCallConnectionState } from '../types';
import { 
  updateVoiceCallStatus, 
  sendSignal, 
  sendIceCandidate, 
  subscribeToCall, 
  subscribeToSignals 
} from './voiceCallSignalingService';
import { getWebRTCConfiguration } from './webRTCConfig';

export class VoiceCallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  private callId: string | null = null;
  private currentUserId: string | null = null;
  private peerUser: AuthUser | null = null;
  
  private unsubCall: (() => void) | null = null;
  private unsubSignals: (() => void) | null = null;
  
  private ringingTimeout: NodeJS.Timeout | null = null;
  
  // Reconnection logic
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 4;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Stats monitoring
  private statsInterval: NodeJS.Timeout | null = null;

  // Callbacks
  public onLocalStream: ((stream: MediaStream) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onCallStateChange: ((call: VoiceCall) => void) | null = null;
  public onConnectionStateChange: ((state: VoiceCallConnectionState) => void) | null = null;
  public onQualityUpdate: ((quality: 'Excellent' | 'Good' | 'Fair' | 'Poor') => void) | null = null;
  public onCallEnded: (() => void) | null = null;

  constructor() {
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline() {
    if (this.peerConnection && this.peerConnection.connectionState === 'disconnected') {
      this.attemptReconnect();
    }
  }

  private handleOffline() {
    if (this.peerConnection) {
      if (this.onConnectionStateChange) this.onConnectionStateChange('reconnecting');
    }
  }

  /**
   * Request microphone permission and get stream
   */
  public async requestMicrophonePermission(): Promise<MediaStream> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone API is not supported in this environment or context.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.localStream = stream;
      if (this.onLocalStream) this.onLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('Microphone permission denied or unavailable:', err);
      const errName = err?.name || '';
      const errMsg = err?.message || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.includes('Permission denied')) {
        throw new Error('Microphone permission was denied. Please allow microphone access in your browser site settings or address bar icon and try again.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        throw new Error('No microphone hardware was detected on your device.');
      } else {
        throw new Error('Microphone is unavailable. Please check your browser microphone permissions.');
      }
    }
  }

  /**
   * Setup WebRTC PeerConnection
   */
  private async createPeerConnection() {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn('Error closing existing peer connection', e);
      }
      this.peerConnection = null;
    }

    const config = await getWebRTCConfiguration();
    this.peerConnection = new RTCPeerConnection(config);
    
    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callId && this.currentUserId) {
        sendIceCandidate(this.callId, this.currentUserId, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment
        }).catch(err => console.warn('Failed to send ICE candidate', err));
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.connectionState;
      let appState: VoiceCallConnectionState = 'disconnected';
      
      switch (state) {
        case 'new':
        case 'connecting':
          appState = 'reconnecting';
          break;
        case 'connected':
          appState = 'good';
          this.reconnectAttempts = 0; // Reset attempts on success
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.startStatsMonitoring();
          break;
        case 'disconnected':
        case 'failed':
          appState = 'reconnecting';
          this.attemptReconnect();
          break;
        case 'closed':
          appState = 'disconnected';
          break;
      }
      
      if (this.onConnectionStateChange) this.onConnectionStateChange(appState);
      
      if (state === 'connected' && this.callId && this.currentUserId) {
        updateVoiceCallStatus(this.callId, 'connected').catch(console.warn);
      }
    };
  }

  private startStatsMonitoring() {
    if (this.statsInterval) clearInterval(this.statsInterval);
    
    this.statsInterval = setInterval(async () => {
      if (!this.peerConnection || this.peerConnection.connectionState !== 'connected') return;
      
      try {
        const stats = await this.peerConnection.getStats();
        let packetLoss = 0;
        let rtt = 0;
        
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            const packetsLost = report.packetsLost || 0;
            const packetsReceived = report.packetsReceived || 0;
            if (packetsReceived + packetsLost > 0) {
              packetLoss = packetsLost / (packetsReceived + packetsLost);
            }
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          }
        });
        
        let quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Excellent';
        if (packetLoss > 0.05 || rtt > 0.5) quality = 'Poor';
        else if (packetLoss > 0.02 || rtt > 0.25) quality = 'Fair';
        else if (packetLoss > 0.01 || rtt > 0.15) quality = 'Good';
        
        if (this.onQualityUpdate) this.onQualityUpdate(quality);
        
      } catch (err) {
        console.warn('Stats error', err);
      }
    }, 2000);
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached. Failing call.');
      if (this.callId && this.peerUser) {
        updateVoiceCallStatus(this.callId, 'failed', 'Connection lost', this.peerUser).catch(console.warn);
      }
      this.cleanupCall('Connection failed');
      return;
    }
    
    this.reconnectAttempts++;
    const backoffTime = Math.pow(2, this.reconnectAttempts - 1) * 1000;
    console.log(`Attempting ICE restart in ${backoffTime}ms (Attempt ${this.reconnectAttempts})`);
    
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    
    this.reconnectTimeout = setTimeout(async () => {
      if (!this.peerConnection || !this.callId || !this.currentUserId) return;
      try {
        // ICE Restart
        const offer = await this.peerConnection.createOffer({ iceRestart: true });
        await this.peerConnection.setLocalDescription(offer);
        await sendSignal(this.callId, this.currentUserId, 'offer', JSON.stringify(offer));
      } catch (err) {
        console.error('ICE restart failed', err);
        this.attemptReconnect(); // Try again on failure
      }
    }, backoffTime);
  }

  /**
   * Initialize and start a call as the caller
   */
  public async startCall(call: VoiceCall, callerUser: AuthUser) {
    this.callId = call.id;
    this.currentUserId = callerUser.uid;
    this.peerUser = callerUser; // Setting peer to caller for status updates if needed
    this.reconnectAttempts = 0;
    
    // 1. Get media
    if (!this.localStream) {
      await this.requestMicrophonePermission();
    }
    
    // 2. Setup PC
    await this.createPeerConnection();
    
    // 3. Listen to DB state
    this.setupListeners(callerUser);
    
    // 4. Create offer
    if (this.peerConnection) {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // 5. Send offer via signaling
      await sendSignal(this.callId, callerUser.uid, 'offer', JSON.stringify(offer));
      
      // 6. Set ringing timeout (30 seconds)
      this.ringingTimeout = setTimeout(() => {
        this.missedCall(callerUser);
      }, 30000);
    }
  }

  /**
   * Answer an incoming call
   */
  public async answerCall(call: VoiceCall, receiverUser: AuthUser) {
    this.callId = call.id;
    this.currentUserId = receiverUser.uid;
    this.peerUser = receiverUser;
    this.reconnectAttempts = 0;
    
    // 1. Get media
    if (!this.localStream) {
      await this.requestMicrophonePermission();
    }
    
    // 2. Setup PC
    await this.createPeerConnection();
    
    // 3. Update status
    await updateVoiceCallStatus(this.callId, 'connecting');
    
    // 4. Listen to DB state
    this.setupListeners(receiverUser);
  }

  /**
   * Reject an incoming call
   */
  public async rejectCall(callId: string, receiverUser: AuthUser) {
    await updateVoiceCallStatus(callId, 'rejected', undefined, receiverUser);
    this.cleanupCall();
  }

  /**
   * Missed call handler
   */
  private async missedCall(user: AuthUser) {
    if (this.callId) {
      await updateVoiceCallStatus(this.callId, 'missed', 'Timeout', user);
    }
    this.cleanupCall();
  }

  /**
   * Hang up the call
   */
  public async hangUp(user: AuthUser) {
    if (this.callId) {
      // Send hangup signal just in case
      await sendSignal(this.callId, user.uid, 'hangup').catch(() => {});
      
      // Update status
      await updateVoiceCallStatus(this.callId, 'ended', 'User hung up', user).catch(() => {});
    }
    this.cleanupCall();
  }

  /**
   * Setup Firestore listeners
   */
  private setupListeners(user: AuthUser) {
    if (!this.callId) return;
    
    // Listen to call document
    this.unsubCall = subscribeToCall(this.callId, (call) => {
      if (this.onCallStateChange) this.onCallStateChange(call);
      
      if (call.status === 'ended' || call.status === 'rejected' || call.status === 'missed' || call.status === 'cancelled' || call.status === 'failed') {
        this.cleanupCall();
      }
    });
    
    // Listen to signals
    this.unsubSignals = subscribeToSignals(this.callId, user.uid, async (signal) => {
      const pc = this.peerConnection;
      if (!pc || (pc.signalingState as string) === 'closed') return;
      
      try {
        if (signal.type === 'offer' && signal.sdp) {
          // Offer can only be applied if signaling state is stable or have-local-offer (glare)
          const currentState = pc.signalingState as string;
          if (currentState !== 'stable' && currentState !== 'have-local-offer') {
            console.warn(`Ignoring duplicate offer signal in state: ${currentState}`);
            return;
          }
          const offer = JSON.parse(signal.sdp);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(this.callId!, user.uid, 'answer', JSON.stringify(answer));
          
        } else if (signal.type === 'answer' && signal.sdp) {
          // Answer can only be applied if we sent an offer (have-local-offer)
          const currentState = pc.signalingState as string;
          if (currentState !== 'have-local-offer') {
            console.warn(`Ignoring answer signal received in wrong state: ${currentState}`);
            return;
          }
          const answer = JSON.parse(signal.sdp);
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          
          if (this.ringingTimeout) {
            clearTimeout(this.ringingTimeout);
            this.ringingTimeout = null;
          }
          
        } else if (signal.type === 'ice-candidate' && signal.candidate) {
          if ((pc.signalingState as string) === 'closed') return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate({
              candidate: signal.candidate.candidate,
              sdpMid: signal.candidate.sdpMid,
              sdpMLineIndex: signal.candidate.sdpMLineIndex,
              usernameFragment: signal.candidate.usernameFragment
            }));
          } catch (e) {
            console.warn('Failed to add ICE candidate', e);
          }
        } else if (signal.type === 'hangup') {
          this.cleanupCall();
        }
      } catch (err) {
        console.error('Error handling signal', err);
      }
    });
  }

  /**
   * Mute / Unmute microphone
   */
  public toggleMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Clean up everything
   */
  public cleanupCall(reason?: string) {
    if (this.ringingTimeout) {
      clearTimeout(this.ringingTimeout);
      this.ringingTimeout = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.unsubCall) {
      this.unsubCall();
      this.unsubCall = null;
    }
    
    if (this.unsubSignals) {
      this.unsubSignals();
      this.unsubSignals = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    this.callId = null;
    this.currentUserId = null;
    this.peerUser = null;
    
    if (this.onCallEnded) this.onCallEnded();
  }
}

// Singleton instance for the app
export const voiceCallManager = new VoiceCallManager();
