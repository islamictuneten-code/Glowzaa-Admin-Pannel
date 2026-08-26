import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { AuthUser, VoiceCall, VoiceCallConnectionState } from '../../types';
import { voiceCallManager } from '../../services/voiceCallService';

interface ActiveVoiceCallProps {
  call: VoiceCall;
  currentUser: AuthUser;
  onClose: () => void;
}

export const ActiveVoiceCall: React.FC<ActiveVoiceCallProps> = ({ call, currentUser, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<VoiceCallConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const isCaller = call.callerId === currentUser.uid;
  const otherPartyName = isCaller ? call.receiverName : call.callerName;
  const otherPartyRole = isCaller ? call.receiverRole : call.callerRole;
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (call.status === 'connected') {
      const start = new Date(call.answeredAt || new Date()).getTime();
      timer = setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [call.status, call.answeredAt]);

  useEffect(() => {
    // Setup callbacks
    voiceCallManager.onConnectionStateChange = (state) => {
      setConnectionState(state);
    };
    
    voiceCallManager.onRemoteStream = (stream) => {
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(e => console.warn('Audio play failed', e));
      }
    };
    
    voiceCallManager.onCallEnded = () => {
      onClose();
    };
    
    // Start or answer
    const initCall = async () => {
      try {
        if (isCaller) {
          if (call.status === 'calling') {
            await voiceCallManager.startCall(call, currentUser);
          }
        } else {
          if (call.status === 'ringing') {
            await voiceCallManager.answerCall(call, currentUser);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect');
        setTimeout(() => {
          voiceCallManager.cleanupCall();
          onClose();
        }, 3000);
      }
    };
    
    // Only init if it's new
    if ((isCaller && call.status === 'calling') || (!isCaller && call.status === 'ringing')) {
      initCall();
    }
    
    return () => {
      voiceCallManager.onConnectionStateChange = null;
      voiceCallManager.onRemoteStream = null;
      voiceCallManager.onCallEnded = null;
    };
  }, [call, currentUser, isCaller, onClose]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    voiceCallManager.toggleMute(!isMuted);
  };

  const handleEndCall = () => {
    if (call.status === 'ringing' && isCaller) {
      // Cancel
      import('../../services/voiceCallSignalingService').then(m => {
        m.updateVoiceCallStatus(call.id, 'cancelled', undefined, currentUser);
      });
    } else {
      voiceCallManager.hangUp(currentUser);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = () => {
    if (error) return error;
    switch (call.status) {
      case 'calling': return 'Calling...';
      case 'ringing': return 'Ringing...';
      case 'connecting': return 'Connecting...';
      case 'connected': return formatDuration(duration);
      case 'ended': return 'Call ended';
      case 'failed': return 'Call failed';
      default: return call.status;
    }
  };

  const getConnectionColor = () => {
    switch (connectionState) {
      case 'excellent':
      case 'good': return 'text-green-400';
      case 'poor': return 'text-yellow-400';
      case 'reconnecting': return 'text-orange-400';
      case 'failed':
      case 'disconnected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-95 p-4 sm:p-0">
      <div className="bg-gradient-to-b from-[#0F766E] to-gray-900 w-full h-full sm:w-[400px] sm:h-[600px] sm:rounded-3xl sm:shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Audio Element */}
        <audio ref={audioRef} autoPlay />

        {/* Header */}
        <div className="flex-1 flex flex-col items-center justify-center pt-10 pb-4 px-6 text-center">
          <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center text-white text-4xl mb-6 shadow-xl border-4 border-white/20 backdrop-blur-sm">
            {otherPartyName.charAt(0).toUpperCase()}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">{otherPartyName}</h2>
          <p className="text-emerald-300 font-medium tracking-wide text-sm uppercase mb-6">{otherPartyRole}</p>
          
          <div className="flex items-center space-x-2 bg-black/20 rounded-full px-4 py-2">
            <span className={`w-2 h-2 rounded-full ${getConnectionColor()} ${connectionState === 'reconnecting' ? 'animate-pulse' : ''}`} />
            <span className="text-white/90 text-lg font-mono tracking-wider">{getStatusDisplay()}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black/40 backdrop-blur-md p-8 sm:rounded-b-3xl">
          <div className="flex items-center justify-around">
            <button 
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isMuted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={handleEndCall}
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
            
            <button 
              onClick={() => setIsSpeaker(!isSpeaker)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                !isSpeaker ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/20 text-emerald-400'
              }`}
            >
              {!isSpeaker ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
