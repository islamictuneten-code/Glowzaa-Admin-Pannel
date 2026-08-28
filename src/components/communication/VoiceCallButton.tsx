import React, { useState } from 'react';
import { Phone, PhoneCall } from 'lucide-react';
import { AuthUser } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { checkUserBusyStatus, createVoiceCall } from '../../services/voiceCallSignalingService';
import { voiceCallManager } from '../../services/voiceCallService';
import { sendCommunicationNotification } from '../../services/notificationService';

interface VoiceCallButtonProps {
  receiver: AuthUser;
  conversationId?: string;
  className?: string;
  showLabel?: boolean;
  label?: string;
  children?: React.ReactNode;
}

export const VoiceCallButton: React.FC<VoiceCallButtonProps> = ({ 
  receiver, 
  conversationId, 
  className = '',
  showLabel = false,
  label = 'Voice Call',
  children
}) => {
  const { currentUser } = useAuth();
  const { addToast } = useApp();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartCall = async () => {
    if (!currentUser) return;
    
    try {
      setIsStarting(true);
      
      // Check if mic is available before proceeding
      await voiceCallManager.requestMicrophonePermission();
      
      // Auto force cleanup any leftover/stuck call records for current user
      const { forceCleanupUserActiveCalls } = await import('../../services/voiceCallSignalingService');
      await forceCleanupUserActiveCalls(currentUser.uid);
      
      // Check if receiver is busy
      const receiverBusy = await checkUserBusyStatus(receiver.uid);
      if (receiverBusy) {
        if (currentUser.role === 'admin') {
          // Ask if they want to queue
          const doQueue = window.confirm(`${receiver.name || 'User'} is currently on another call. Do you want to add them to your call queue?`);
          if (doQueue) {
            const { doc, setDoc, collection } = await import('firebase/firestore');
            const { db } = await import('../../lib/firebase');
            const queueId = `queue_${Date.now()}`;
            await setDoc(doc(collection(db, 'communication_call_queue'), queueId), {
              id: queueId,
              callerId: currentUser.uid,
              callerName: currentUser.name,
              targetId: receiver.uid,
              targetName: receiver.name,
              targetRole: receiver.role,
              status: 'queued',
              queuedAt: new Date().toISOString()
            });
            addToast({ title: 'Queued', message: `${receiver.name} added to your call queue.`, type: 'success' });
          }
        } else {
          addToast({ title: 'User Busy', message: `${receiver.name || 'User'} is currently on another call.`, type: 'warning' });
        }
        return;
      }
      
      // Create call
      const call = await createVoiceCall(currentUser, receiver, conversationId);
      
      // Send FCM push notification so receiver gets it even if backgrounded
      sendCommunicationNotification(currentUser, {
        recipientUserId: receiver.uid,
        recipientRole: (receiver.role || 'sales') as any,
        recipientUserName: receiver.name,
        type: 'voice_call' as any,
        title: 'Incoming Voice Call',
        body: `${currentUser.name} is calling you`,
        priority: 'urgent',
        actionType: 'voice_call' as any,
        actionTarget: call.id,
      }).catch(err => console.warn('Failed to send call push', err));
      
      // We don't start the webRTC yet, the global CallProvider or App component should pick up the call creation and render the ActiveVoiceCall component.
      
    } catch (err: any) {
      addToast({ title: 'Call Error', message: err.message || 'Failed to start call', type: 'error' });
    } finally {
      setIsStarting(false);
    }
  };

  const defaultClasses = className || "p-2 rounded-xl border border-[#087F7A]/30 bg-teal-50 text-[#087F7A] hover:bg-teal-100 transition-colors cursor-pointer flex items-center gap-1.5";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleStartCall();
      }}
      disabled={isStarting}
      title={`Call ${receiver?.name || 'User'} via Voice`}
      className={defaultClasses}
    >
      {children ? children : (
        <>
          <PhoneCall className={`w-4 h-4 ${isStarting ? 'animate-pulse text-amber-500' : ''}`} />
          {showLabel && <span className="text-xs font-bold">{isStarting ? 'Calling...' : label}</span>}
        </>
      )}
    </button>
  );
};
