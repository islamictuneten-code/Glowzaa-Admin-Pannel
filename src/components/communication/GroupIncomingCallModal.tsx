import React from 'react';
import { Phone, PhoneOff, Users } from 'lucide-react';
import { GroupCall, AuthUser } from '../../types';
import { updateParticipantStatus } from '../../services/groupVoiceCallSignalingService';

interface GroupIncomingCallModalProps {
  call: GroupCall;
  currentUser: AuthUser;
  onAccept: (call: GroupCall) => void;
  onReject: () => void;
}

export const GroupIncomingCallModal: React.FC<GroupIncomingCallModalProps> = ({ call, currentUser, onAccept, onReject }) => {
  const handleReject = async () => {
    try {
      await updateParticipantStatus(call.id, currentUser.uid, 'rejected');
      onReject();
    } catch (err) {
      console.warn('Failed to reject call', err);
    }
  };

  const handleAccept = async () => {
    try {
      await updateParticipantStatus(call.id, currentUser.uid, 'ringing'); 
      onAccept(call);
    } catch (err) {
      console.warn('Failed to accept call', err);
    }
  };

  const participantCount = call.participantIds.length;
  const callerName = call.initiatorName;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10">
        <div className="p-8 flex flex-col items-center text-center">
          
          <div className="text-emerald-400 font-medium tracking-widest text-xs uppercase mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {call.type === 'broadcast' ? 'Team Broadcast' : 'Group Voice Call'}
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
            <div className="w-24 h-24 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center text-white text-3xl mb-4 relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              {callerName.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1 mt-4">{callerName}</h2>
          <p className="text-gray-400 text-sm mb-2">{call.initiatorRole.toUpperCase()}</p>
          
          <div className="bg-black/20 rounded-full px-4 py-1.5 mb-8">
            <span className="text-emerald-300 text-sm font-medium">{participantCount} Participants invited</span>
          </div>
          
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
              <span className="text-white/90 text-xs font-medium uppercase tracking-wider">Join Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
