import { GroupCall, AuthUser, VoiceCallConnectionState } from '../types';
import { 
  updateGroupCallStatus, 
  updateParticipantStatus,
  sendGroupSignal,
  subscribeToGroupCall,
  subscribeToGroupSignals 
} from './groupVoiceCallSignalingService';
import { getWebRTCConfiguration } from './webRTCConfig';

export class GroupVoiceCallManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private localStream: MediaStream | null = null;
  
  private callId: string | null = null;
  private currentUserId: string | null = null;
  
  private unsubCall: (() => void) | null = null;
  private unsubSignals: (() => void) | null = null;
  
  private reconnectAttempts: Map<string, number> = new Map();
  private statsIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  public onLocalStream: ((stream: MediaStream) => void) | null = null;
  public onRemoteStreamAdded: ((userId: string, stream: MediaStream) => void) | null = null;
  public onRemoteStreamRemoved: ((userId: string) => void) | null = null;
  public onCallStateChange: ((call: GroupCall) => void) | null = null;
  public onConnectionStateChange: ((userId: string, state: VoiceCallConnectionState) => void) | null = null;
  public onQualityUpdate: ((userId: string, quality: 'Excellent' | 'Good' | 'Fair' | 'Poor') => void) | null = null;
  public onCallEnded: (() => void) | null = null;

  constructor() {}

  public async requestMicrophonePermission(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.localStream = stream;
      if (this.onLocalStream) this.onLocalStream(stream);
      return stream;
    } catch (err) {
      throw new Error('Microphone access is blocked or unavailable.');
    }
  }

  private async createPeerConnection(targetUserId: string, isInitiator: boolean) {
    const config = await getWebRTCConfiguration();
    const pc = new RTCPeerConnection(config);
    this.reconnectAttempts.set(targetUserId, 0);
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStreams.set(targetUserId, event.streams[0]);
        if (this.onRemoteStreamAdded) this.onRemoteStreamAdded(targetUserId, event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.callId && this.currentUserId) {
        sendGroupSignal(this.callId, this.currentUserId, targetUserId, 'ice-candidate', undefined, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment
        }).catch(err => console.warn('Failed to send ICE candidate', err));
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      let appState: VoiceCallConnectionState = 'disconnected';
      
      switch (state) {
        case 'new':
        case 'connecting': appState = 'reconnecting'; break;
        case 'connected': 
          appState = 'good'; 
          this.reconnectAttempts.set(targetUserId, 0);
          this.startStatsMonitoring(targetUserId, pc);
          break;
        case 'disconnected': 
        case 'failed':
          appState = 'reconnecting';
          this.attemptReconnect(targetUserId, pc);
          break;
        case 'closed': appState = 'disconnected'; break;
      }
      
      if (this.onConnectionStateChange) this.onConnectionStateChange(targetUserId, appState);
    };

    this.peerConnections.set(targetUserId, pc);
    return pc;
  }
  
  private startStatsMonitoring(targetUserId: string, pc: RTCPeerConnection) {
    const existing = this.statsIntervals.get(targetUserId);
    if (existing) clearInterval(existing);
    
    const interval = setInterval(async () => {
      if (pc.connectionState !== 'connected') return;
      try {
        const stats = await pc.getStats();
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
        
        if (this.onQualityUpdate) this.onQualityUpdate(targetUserId, quality);
      } catch (err) {
        console.warn('Stats error', err);
      }
    }, 2000);
    this.statsIntervals.set(targetUserId, interval);
  }
  
  private attemptReconnect(targetUserId: string, pc: RTCPeerConnection) {
    const attempts = this.reconnectAttempts.get(targetUserId) || 0;
    if (attempts >= 4) {
      console.warn(`Max reconnect attempts reached for ${targetUserId}`);
      return;
    }
    
    this.reconnectAttempts.set(targetUserId, attempts + 1);
    const backoffTime = Math.pow(2, attempts) * 1000;
    
    setTimeout(async () => {
      if (!this.callId || !this.currentUserId) return;
      try {
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        await sendGroupSignal(this.callId, this.currentUserId, targetUserId, 'offer', JSON.stringify(offer));
      } catch (err) {
        console.error('ICE restart failed for group', err);
        this.attemptReconnect(targetUserId, pc);
      }
    }, backoffTime);
  }

  private handleOnline = () => {
    if (!this.callId || !this.currentUserId) return;
    this.peerConnections.forEach((pc, userId) => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.attemptReconnect(userId, pc);
      }
    });
  };

  private handleOffline = () => {
    console.warn('Network offline, group calls might disconnect');
  };

  public async startGroupCall(call: GroupCall, user: AuthUser) {
    this.callId = call.id;
    this.currentUserId = user.uid;
    
    if (!this.localStream) {
      await this.requestMicrophonePermission();
    }
    
    await updateGroupCallStatus(this.callId, 'active');
    
    this.setupListeners(user);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // In mesh, initiator doesn't immediately create offers to everyone.
    // They wait for others to join (status='connected'), then create offer to them.
  }

  public async joinGroupCall(call: GroupCall, user: AuthUser) {
    this.callId = call.id;
    this.currentUserId = user.uid;
    
    if (!this.localStream) {
      await this.requestMicrophonePermission();
    }
    
    await updateParticipantStatus(this.callId, user.uid, 'connected');
    
    this.setupListeners(user);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  public async rejectGroupCall(callId: string, user: AuthUser) {
    await updateParticipantStatus(callId, user.uid, 'rejected');
    this.cleanupCall();
  }

  private setupListeners(user: AuthUser) {
    if (!this.callId) return;
    
    this.unsubCall = subscribeToGroupCall(this.callId, async (call) => {
      if (this.onCallStateChange) this.onCallStateChange(call);
      
      // If call is ended globally
      if (call.status === 'ended') {
        this.cleanupCall();
        return;
      }

      // If my status is left/kicked
      const myStatus = call.participants[user.uid]?.status;
      if (['left', 'rejected', 'missed', 'failed'].includes(myStatus)) {
        this.cleanupCall();
        return;
      }

      // Connect to any new participants that are 'connected'
      for (const [participantId, p] of Object.entries(call.participants)) {
        if (participantId === user.uid) continue;
        
        if (p.status === 'connected') {
          if (!this.peerConnections.has(participantId)) {
            // Tie break: lower UID initiates connection
            const isInitiator = user.uid < participantId;
            const pc = await this.createPeerConnection(participantId, isInitiator);
            
            if (isInitiator) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await sendGroupSignal(this.callId!, user.uid, participantId, 'offer', JSON.stringify(offer));
            }
          }
        } else {
          // If they left, clean up their PC
          if (this.peerConnections.has(participantId)) {
            this.peerConnections.get(participantId)?.close();
            this.peerConnections.delete(participantId);
            this.remoteStreams.delete(participantId);
            if (this.onRemoteStreamRemoved) this.onRemoteStreamRemoved(participantId);
            const statsInt = this.statsIntervals.get(participantId);
            if (statsInt) { clearInterval(statsInt); this.statsIntervals.delete(participantId); }
          }
        }
      }
    });
    
    this.unsubSignals = subscribeToGroupSignals(this.callId, user.uid, async (signal) => {
      try {
        if (signal.type === 'offer' && signal.sdp) {
          let pc = this.peerConnections.get(signal.senderId);
          if (!pc) {
            pc = await this.createPeerConnection(signal.senderId, false);
          }
          
          const currentState = pc.signalingState as string;
          if (currentState !== 'stable' && currentState !== 'have-local-offer') {
            console.warn(`Ignoring group offer in state: ${currentState}`);
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.sdp)));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendGroupSignal(this.callId!, user.uid, signal.senderId, 'answer', JSON.stringify(answer));
          
        } else if (signal.type === 'answer' && signal.sdp) {
          const pc = this.peerConnections.get(signal.senderId);
          if (pc && (pc.signalingState as string) === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.sdp)));
          }
          
        } else if (signal.type === 'ice-candidate' && signal.candidate) {
          const pc = this.peerConnections.get(signal.senderId);
          if (pc && (pc.signalingState as string) !== 'closed') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate({
                candidate: signal.candidate.candidate,
                sdpMid: signal.candidate.sdpMid,
                sdpMLineIndex: signal.candidate.sdpMLineIndex,
                usernameFragment: signal.candidate.usernameFragment
              }));
            } catch (e) {
              console.warn('Failed to add group ICE candidate', e);
            }
          }
        }
      } catch (err) {
        console.error('Error handling group signal', err);
      }
    });
  }

  public async leaveCall(user: AuthUser, endForEveryone = false) {
    if (this.callId) {
      if (endForEveryone) {
        await updateGroupCallStatus(this.callId, 'ended');
      } else {
        await updateParticipantStatus(this.callId, user.uid, 'left');
      }
    }
    this.cleanupCall();
  }

  public toggleMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      
      if (this.callId && this.currentUserId) {
        updateParticipantStatus(this.callId, this.currentUserId, 'connected', muted).catch(console.warn);
      }
    }
  }

  public cleanupCall() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.unsubCall) { this.unsubCall(); this.unsubCall = null; }
    if (this.unsubSignals) { this.unsubSignals(); this.unsubSignals = null; }
    
    this.statsIntervals.forEach(int => clearInterval(int));
    this.statsIntervals.clear();
    this.reconnectAttempts.clear();
    
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    
    this.remoteStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
    this.remoteStreams.clear();
    this.callId = null;
    this.currentUserId = null;
    
    if (this.onCallEnded) this.onCallEnded();
  }
}

export const groupVoiceCallManager = new GroupVoiceCallManager();
