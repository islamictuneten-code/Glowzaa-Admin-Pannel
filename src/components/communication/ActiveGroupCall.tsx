import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Users, Signal } from 'lucide-react';
import { AuthUser, GroupCall, VoiceCallConnectionState } from '../../types';
import { groupVoiceCallManager } from '../../services/groupVoiceCallService';

interface ActiveGroupCallProps {
  call: GroupCall;
  currentUser: AuthUser;
  onClose: () => void;
}

export const ActiveGroupCall: React.FC<ActiveGroupCallProps> = ({ call, currentUser, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const [connectionStates, setConnectionStates] = useState<Record<string, VoiceCallConnectionState>>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const isInitiator = call.initiatorId === currentUser.uid;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (call.status === 'active') {
      const start = new Date(call.startedAt || new Date()).getTime();
      timer = setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [call.status, call.startedAt]);

  useEffect(() => {
    // Setup callbacks
    groupVoiceCallManager.onConnectionStateChange = (userId, state) => {
      setConnectionStates(prev => ({ ...prev, [userId]: state }));
    };
    
    groupVoiceCallManager.onRemoteStreamAdded = (userId, stream) => {
      if (!audioElementsRef.current.has(userId)) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = stream;
        audioElementsRef.current.set(userId, audio);
        
        // Need user interaction to play audio in some browsers, but often WebRTC streams bypass this
        audio.play().catch(e => console.warn('Audio play failed for', userId, e));
      }
    };

    groupVoiceCallManager.onRemoteStreamRemoved = (userId) => {
      const audio = audioElementsRef.current.get(userId);
      if (audio) {
        audio.srcObject = null;
        audioElementsRef.current.delete(userId);
      }
    };
    
    groupVoiceCallManager.onCallEnded = () => {
      onClose();
    };
    
    // Start or answer
    const initCall = async () => {
      try {
        if (isInitiator) {
          if (call.status === 'initializing') {
            await groupVoiceCallManager.startGroupCall(call, currentUser);
          }
        } else {
          // If we are here, we accepted the call
          await groupVoiceCallManager.joinGroupCall(call, currentUser);
        }
      } catch (err: any) {
        console.error(err);
        setTimeout(() => {
          groupVoiceCallManager.cleanupCall();
          onClose();
        }, 3000);
      }
    };
    
    initCall();
    
    return () => {
      groupVoiceCallManager.onConnectionStateChange = null;
      groupVoiceCallManager.onRemoteStreamAdded = null;
      groupVoiceCallManager.onRemoteStreamRemoved = null;
      groupVoiceCallManager.onCallEnded = null;
      
      // Clean up audio elements
      audioElementsRef.current.forEach(audio => {
        audio.pause();
        audio.srcObject = null;
      });
      audioElementsRef.current.clear();
    };
  }, [call.id, isInitiator, currentUser, onClose]); // Deliberately omitted 'call' to prevent re-triggering initCall

  const toggleMute = () => {
    setIsMuted(!isMuted);
    groupVoiceCallManager.toggleMute(!isMuted);
  };

  const handleEndCall = () => {
    groupVoiceCallManager.leaveCall(currentUser, isInitiator);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeParticipants = (Object.values(call.participants) as any[]).filter(p => p.status === 'connected' || p.status === 'invited' || p.status === 'ringing');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-95 p-4 sm:p-0">
      <div className="bg-gradient-to-b from-[#0F766E] to-gray-900 w-full h-full sm:w-[500px] sm:h-[700px] sm:rounded-3xl sm:shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="pt-8 pb-4 px-6 text-center shrink-0">
          <div className="flex items-center justify-center gap-2 text-emerald-300 font-medium tracking-wide text-xs uppercase mb-2">
            <Users className="w-4 h-4" />
            {call.type === 'broadcast' ? 'Team Broadcast' : 'Group Voice Call'}
          </div>
          <h2 className="text-xl font-bold text-white mb-4">
            {formatDuration(duration)}
          </h2>
        </div>

        {/* Avatar Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            {activeParticipants.map(p => {
              const isMe = p.uid === currentUser.uid;
              const isConnected = p.status === 'connected';
              const state = connectionStates[p.uid] || 'connecting';
              
              return (
                <div key={p.uid} className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center border border-white/5 relative">
                  
                  {/* Status Indicator */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {isConnected ? (
                      <Signal className={`w-3 h-3 ${state === 'good' ? 'text-green-400' : state === 'poor' ? 'text-yellow-400' : 'text-red-400'}`} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    )}
                  </div>
                  
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mb-3 shadow-lg border-2 ${isConnected ? 'border-emerald-500 bg-emerald-600/30' : 'border-gray-500 bg-gray-600/30'}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="text-white font-medium text-sm text-center truncate w-full">
                    {isMe ? 'You' : p.name}
                  </div>
                  <div className="text-emerald-300/70 text-xs mt-0.5 truncate w-full text-center">
                    {isConnected ? p.role : 'Calling...'}
                  </div>
                  
                  {isConnected && p.isMuted && (
                    <div className="absolute bottom-3 right-3 bg-red-500/20 p-1 rounded-full text-red-400">
                      <MicOff className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black/40 backdrop-blur-md p-6 sm:rounded-b-3xl shrink-0">
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
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-6 h-6 text-white" />
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
          {isInitiator && (
            <div className="mt-4 text-center">
              <span className="text-xs text-white/50">Ending the call will disconnect all participants</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
