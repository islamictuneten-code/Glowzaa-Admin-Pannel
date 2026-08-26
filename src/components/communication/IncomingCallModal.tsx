import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { VoiceCall, AuthUser } from '../../types';
import { updateVoiceCallStatus } from '../../services/voiceCallSignalingService';

interface IncomingCallModalProps {
  call: VoiceCall;
  currentUser: AuthUser;
  onAccept: (call: VoiceCall) => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ call, currentUser, onAccept, onReject }) => {
  
  const handleReject = async () => {
    try {
      await updateVoiceCallStatus(call.id, 'rejected', undefined, currentUser);
      onReject();
    } catch (err) {
      console.warn('Failed to reject call', err);
    }
  };

  const handleAccept = async () => {
    try {
      await updateVoiceCallStatus(call.id, 'ringing', undefined, currentUser); // transition state to ringing for self
      onAccept(call);
    } catch (err) {
      console.warn('Failed to accept call', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10">
        <div className="p-8 flex flex-col items-center text-center">
          
          <div className="text-emerald-400 font-medium tracking-widest text-xs uppercase mb-8">
            Incoming Voice Call
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
            <div className="w-24 h-24 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center text-white text-3xl mb-4 relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              {call.callerName.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1 mt-4">{call.callerName}</h2>
          <p className="text-gray-400 text-sm mb-8">{call.callerRole.toUpperCase()}</p>
          
          <div className="flex items-center justify-center gap-8 w-full">
            <button 
              onClick={handleReject}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 group-hover:bg-red-500 flex items-center justify-center transition-colors border border-red-500/50 group-hover:border-transparent">
                <PhoneOff className="w-6 h-6 text-red-500 group-hover:text-white" />
              </div>
              <span className="text-white/70 text-xs font-medium uppercase tracking-wider">Decline</span>
            </button>
            
            <button 
              onClick={handleAccept}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-all hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-bounce">
                <Phone className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-white/90 text-xs font-medium uppercase tracking-wider">Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
