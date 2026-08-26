import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GroupCall } from '../../types';
import { subscribeToIncomingGroupCalls } from '../../services/groupVoiceCallSignalingService';
import { groupVoiceCallManager } from '../../services/groupVoiceCallService';
import { GroupIncomingCallModal } from './GroupIncomingCallModal';
import { ActiveGroupCall } from './ActiveGroupCall';

export const GroupCallGate: React.FC = () => {
  const { currentUser } = useAuth();
  const [incomingCall, setIncomingCall] = useState<GroupCall | null>(null);
  const [activeCall, setActiveCall] = useState<GroupCall | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    const unsub = subscribeToIncomingGroupCalls(currentUser.uid, (call) => {
      if (call.status === 'initializing' || call.status === 'active') {
        const myStatus = call.participants[currentUser.uid]?.status;
        if ((myStatus === 'invited' || myStatus === 'ringing') && !activeCall) {
          setIncomingCall(call);
        } else {
          // If status changes to connected/rejected/left on another device, clear incoming modal
          setIncomingCall(prev => (prev && prev.id === call.id) ? null : prev);
        }
      } else {
        // Call ended or cancelled globally
        setIncomingCall(prev => (prev && prev.id === call.id) ? null : prev);
      }
    });
    
    return () => unsub();
  }, [currentUser, activeCall]);

  useEffect(() => {
    groupVoiceCallManager.onCallStateChange = (call) => {
      const myStatus = call.participants[currentUser?.uid || '']?.status;
      if (call.status === 'ended' || ['left', 'rejected', 'missed', 'failed'].includes(myStatus)) {
        setActiveCall(null);
      } else {
        setActiveCall(call);
      }
    };
    
    return () => {
      groupVoiceCallManager.onCallStateChange = null;
    };
  }, [currentUser]);

  const handleAcceptCall = (call: GroupCall) => {
    setIncomingCall(null);
    setActiveCall(call);
  };

  const handleRejectCall = () => {
    setIncomingCall(null);
  };

  const handleCloseActiveCall = () => {
    setActiveCall(null);
  };

  if (!currentUser) return null;

  return (
    <>
      {incomingCall && !activeCall && (
        <GroupIncomingCallModal 
          call={incomingCall} 
          currentUser={currentUser} 
          onAccept={handleAcceptCall} 
          onReject={handleRejectCall} 
        />
      )}
      
      {activeCall && (
        <ActiveGroupCall 
          call={activeCall} 
          currentUser={currentUser} 
          onClose={handleCloseActiveCall} 
        />
      )}
    </>
  );
};
