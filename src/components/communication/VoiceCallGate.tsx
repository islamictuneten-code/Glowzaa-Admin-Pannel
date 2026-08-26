import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { VoiceCall } from '../../types';
import { subscribeToIncomingCalls, subscribeToOutgoingCalls } from '../../services/voiceCallSignalingService';
import { IncomingCallModal } from './IncomingCallModal';
import { ActiveVoiceCall } from './ActiveVoiceCall';
import { voiceCallManager } from '../../services/voiceCallService';

export const VoiceCallGate: React.FC = () => {
  const { currentUser } = useAuth();
  const [incomingCall, setIncomingCall] = useState<VoiceCall | null>(null);
  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    // 1. Subscribe to incoming calls for receiver
    const unsubIncoming = subscribeToIncomingCalls(currentUser.uid, (call) => {
      if (call.status === 'calling' || call.status === 'ringing') {
        setIncomingCall(call);
      } else {
        setIncomingCall(prev => (prev && prev.id === call.id) ? null : prev);
      }
    });

    // 2. Subscribe to outgoing calls for caller
    const unsubOutgoing = subscribeToOutgoingCalls(currentUser.uid, (call) => {
      if (['calling', 'ringing', 'connecting', 'connected'].includes(call.status)) {
        setActiveCall(call);
      } else {
        setActiveCall(prev => (prev && prev.id === call.id) ? null : prev);
      }
    });
    
    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [currentUser]);

  // Hook into active call manager state change
  useEffect(() => {
    voiceCallManager.onCallStateChange = (call) => {
      if (['ended', 'rejected', 'missed', 'failed', 'cancelled'].includes(call.status)) {
        setActiveCall(null);
      } else {
        setActiveCall(call);
      }
    };
    
    return () => {
      voiceCallManager.onCallStateChange = null;
    };
  }, []);

  const handleAcceptCall = (call: VoiceCall) => {
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
        <IncomingCallModal 
          call={incomingCall} 
          currentUser={currentUser} 
          onAccept={handleAcceptCall} 
          onReject={handleRejectCall} 
        />
      )}
      
      {activeCall && (
        <ActiveVoiceCall 
          call={activeCall} 
          currentUser={currentUser} 
          onClose={handleCloseActiveCall} 
        />
      )}
    </>
  );
};
