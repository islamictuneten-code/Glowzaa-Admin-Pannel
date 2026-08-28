import { db } from '../lib/firebase';
import { 
  collection, doc, setDoc, getDoc, getDocs, onSnapshot, 
  query, where, orderBy, limit, updateDoc, Timestamp,
  writeBatch
} from 'firebase/firestore';
import { AuthUser, VoiceCall, VoiceCallStatus, VoiceCallSignal, VoiceCallSignalType, VoiceCallSignalCandidate } from '../types';

/**
 * Creates a new voice call record
 */
export const createVoiceCall = async (caller: AuthUser, receiver: AuthUser, conversationId?: string): Promise<VoiceCall> => {
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  
  const callData: VoiceCall = {
    id: callId,
    callerId: caller.uid,
    callerName: caller.name,
    callerRole: caller.role,
    callerAvatar: '',
    callerPhone: caller.phone || '',
    receiverId: receiver.uid,
    receiverName: receiver.name,
    receiverRole: receiver.role || 'sales',
    receiverAvatar: '',
    receiverPhone: receiver.phone || '',
    conversationId,
    callType: 'voice',
    status: 'calling',
    startedAt: now,
    createdAt: now,
    updatedAt: now
  };
  
  await setDoc(doc(db, 'communication_calls', callId), callData);
  
  // Write to audit log
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'audit_logs', logId), {
      id: logId,
      action: 'VOICE_CALL_STARTED',
      targetUserId: receiver.uid,
      targetUserName: receiver.name,
      targetRole: receiver.role || 'staff',
      performedByUserId: caller.uid,
      performedByUserName: caller.name,
      timestamp: now,
      details: `Started voice call ${callId}`
    });
  } catch (err) {
    console.warn('Audit log write failed', err);
  }
  
  return callData;
};

/**
 * Update the status of an existing call
 */
export const updateVoiceCallStatus = async (
  callId: string, 
  status: VoiceCallStatus, 
  endReason?: string,
  user?: AuthUser
): Promise<void> => {
  const now = new Date().toISOString();
  const updates: Partial<VoiceCall> = {
    status,
    updatedAt: now
  };
  
  if (status === 'connected' || status === 'ringing') {
    if (status === 'connected') {
      updates.answeredAt = now;
    }
  } else if (['ended', 'rejected', 'missed', 'cancelled', 'failed'].includes(status)) {
    updates.endedAt = now;
    if (endReason) {
      updates.endReason = endReason;
    }
    
    // We should compute duration
    const callDoc = await getDoc(doc(db, 'communication_calls', callId));
    if (callDoc.exists()) {
      const callData = callDoc.data() as VoiceCall;
      if (callData.answeredAt) {
        updates.durationSeconds = Math.floor((new Date(now).getTime() - new Date(callData.answeredAt).getTime()) / 1000);
      }
      
      // Write to audit log for end states
      if (user) {
        try {
          const actionMap: Record<string, string> = {
            'ended': 'VOICE_CALL_ENDED',
            'rejected': 'VOICE_CALL_REJECTED',
            'missed': 'VOICE_CALL_MISSED',
            'cancelled': 'VOICE_CALL_CANCELLED',
            'failed': 'VOICE_CALL_FAILED'
          };
          const action = actionMap[status] || 'VOICE_CALL_STATUS_CHANGED';
          
          const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await setDoc(doc(db, 'audit_logs', logId), {
            id: logId,
            action,
            targetUserId: callData.callerId === user.uid ? callData.receiverId : callData.callerId,
            targetUserName: callData.callerId === user.uid ? callData.receiverName : callData.callerName,
            targetRole: callData.callerId === user.uid ? callData.receiverRole : callData.callerRole,
            performedByUserId: user.uid,
            performedByUserName: user.name,
            timestamp: now,
            details: `Call ${callId} status changed to ${status}${endReason ? ` (${endReason})` : ''}`
          });
        } catch (err) {
          console.warn('Audit log write failed', err);
        }
      }
    }
  }
  
  await updateDoc(doc(db, 'communication_calls', callId), updates);
};

/**
 * Send an SDP offer/answer or a generic signal (hangup)
 */
export const sendSignal = async (
  callId: string, 
  senderId: string, 
  type: VoiceCallSignalType, 
  sdp?: string,
  receiverId?: string
): Promise<void> => {
  const signalId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const signal: VoiceCallSignal = {
    id: signalId,
    callId,
    senderId,
    type,
    createdAt: new Date().toISOString()
  };
  
  if (sdp) signal.sdp = sdp;
  if (receiverId) signal.receiverId = receiverId;
  
  await setDoc(doc(db, 'communication_calls', callId, 'signals', signalId), signal);
};

/**
 * Send an ICE candidate
 */
export const sendIceCandidate = async (
  callId: string, 
  senderId: string, 
  candidate: VoiceCallSignalCandidate,
  receiverId?: string
): Promise<void> => {
  const signalId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const signal: VoiceCallSignal = {
    id: signalId,
    callId,
    senderId,
    type: 'ice-candidate',
    candidate,
    createdAt: new Date().toISOString()
  };
  
  if (receiverId) signal.receiverId = receiverId;
  
  await setDoc(doc(db, 'communication_calls', callId, 'signals', signalId), signal);
};

/**
 * Force cleanup all active calls for a user (ends any stuck calls in Firestore)
 */
export const forceCleanupUserActiveCalls = async (userId: string): Promise<void> => {
  const now = new Date().toISOString();
  const promises: Promise<any>[] = [];
  
  try {
    const outgoingQ = query(
      collection(db, 'communication_calls'),
      where('callerId', '==', userId),
      where('status', 'in', ['calling', 'ringing', 'connecting', 'connected'])
    );
    const outgoingSnap = await getDocs(outgoingQ);
    for (const docSnap of outgoingSnap.docs) {
      promises.push(
        updateDoc(doc(db, 'communication_calls', docSnap.id), {
          status: 'ended',
          endReason: 'User forced call reset',
          endedAt: now,
          updatedAt: now
        }).catch(console.warn)
      );
    }

    const incomingQ = query(
      collection(db, 'communication_calls'),
      where('receiverId', '==', userId),
      where('status', 'in', ['calling', 'ringing', 'connecting', 'connected'])
    );
    const incomingSnap = await getDocs(incomingQ);
    for (const docSnap of incomingSnap.docs) {
      promises.push(
        updateDoc(doc(db, 'communication_calls', docSnap.id), {
          status: 'ended',
          endReason: 'User forced call reset',
          endedAt: now,
          updatedAt: now
        }).catch(console.warn)
      );
    }

    // Clean up group calls for user
    const groupQ = query(
      collection(db, 'communication_group_calls'),
      where('participantIds', 'array-contains', userId),
      where('status', 'in', ['initializing', 'active'])
    );
    const groupSnap = await getDocs(groupQ);
    for (const docSnap of groupSnap.docs) {
      const data = docSnap.data();
      if (data.participants?.[userId]) {
        promises.push(
          updateDoc(doc(db, 'communication_group_calls', docSnap.id), {
            [`participants.${userId}.status`]: 'left',
            updatedAt: now
          }).catch(console.warn)
        );
      }
    }

    await Promise.all(promises);
  } catch (err) {
    console.warn('Error during forceCleanupUserActiveCalls:', err);
  }
};

/**
 * Check if user is already in an active call, with automatic cleanup for stale calls
 */
export const checkUserBusyStatus = async (userId: string): Promise<boolean> => {
  const now = Date.now();
  const STALE_CALLING_MS = 30 * 1000; // 30 seconds for unanswered calling/ringing
  const STALE_CONNECTED_MS = 6 * 60 * 60 * 1000; // 6 hours for connected calls

  let isBusy = false;
  const cleanupPromises: Promise<any>[] = [];

  try {
    // Check active outgoing calls
    const outgoingQ = query(
      collection(db, 'communication_calls'),
      where('callerId', '==', userId),
      where('status', 'in', ['calling', 'ringing', 'connecting', 'connected'])
    );
    
    const outgoingSnap = await getDocs(outgoingQ);
    for (const docSnap of outgoingSnap.docs) {
      const call = docSnap.data() as VoiceCall;
      const createdAtMs = new Date(call.createdAt || call.startedAt || Date.now()).getTime();
      const ageMs = now - createdAtMs;

      if (['calling', 'ringing', 'connecting'].includes(call.status) && ageMs > STALE_CALLING_MS) {
        // Auto-cleanup stale call
        cleanupPromises.push(
          updateDoc(doc(db, 'communication_calls', call.id), {
            status: 'missed',
            endReason: 'Timeout/Stale cleanup',
            endedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).catch(console.warn)
        );
      } else if (call.status === 'connected' && ageMs > STALE_CONNECTED_MS) {
        cleanupPromises.push(
          updateDoc(doc(db, 'communication_calls', call.id), {
            status: 'ended',
            endReason: 'Stale connection cleanup',
            endedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).catch(console.warn)
        );
      } else {
        isBusy = true;
      }
    }
    
    // Check active incoming calls
    const incomingQ = query(
      collection(db, 'communication_calls'),
      where('receiverId', '==', userId),
      where('status', 'in', ['calling', 'ringing', 'connecting', 'connected'])
    );
    
    const incomingSnap = await getDocs(incomingQ);
    for (const docSnap of incomingSnap.docs) {
      const call = docSnap.data() as VoiceCall;
      const createdAtMs = new Date(call.createdAt || call.startedAt || Date.now()).getTime();
      const ageMs = now - createdAtMs;

      if (['calling', 'ringing', 'connecting'].includes(call.status) && ageMs > STALE_CALLING_MS) {
        cleanupPromises.push(
          updateDoc(doc(db, 'communication_calls', call.id), {
            status: 'missed',
            endReason: 'Timeout/Stale cleanup',
            endedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).catch(console.warn)
        );
      } else if (call.status === 'connected' && ageMs > STALE_CONNECTED_MS) {
        cleanupPromises.push(
          updateDoc(doc(db, 'communication_calls', call.id), {
            status: 'ended',
            endReason: 'Stale connection cleanup',
            endedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).catch(console.warn)
        );
      } else {
        isBusy = true;
      }
    }

    // Check group calls
    const groupQ = query(
      collection(db, 'communication_group_calls'),
      where('participantIds', 'array-contains', userId),
      where('status', 'in', ['initializing', 'active'])
    );
    const groupSnap = await getDocs(groupQ);
    groupSnap.forEach(docSnap => {
      const data = docSnap.data();
      const myStatus = data.participants?.[userId]?.status;
      const createdAtMs = new Date(data.createdAt || Date.now()).getTime();
      const ageMs = now - createdAtMs;

      if ((myStatus === 'invited' || myStatus === 'ringing') && ageMs > STALE_CALLING_MS) {
        // ignore stale group invites
      } else if (myStatus === 'invited' || myStatus === 'ringing' || myStatus === 'connected') {
        isBusy = true;
      }
    });

    if (cleanupPromises.length > 0) {
      await Promise.all(cleanupPromises);
    }
  } catch (err) {
    console.warn('Error checking user busy status:', err);
  }

  return isBusy;
};

/**
 * Subscribes to outgoing active calls for a caller
 */
export const subscribeToOutgoingCalls = (userId: string, callback: (call: VoiceCall) => void) => {
  const callsQ = query(
    collection(db, 'communication_calls'),
    where('callerId', '==', userId),
    where('status', 'in', ['calling', 'ringing', 'connecting', 'connected'])
  );
  
  return onSnapshot(callsQ, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        callback(change.doc.data() as VoiceCall);
      }
    });
  });
};

/**
 * Subscribes to changes in a call document
 */
export const subscribeToCall = (callId: string, callback: (call: VoiceCall) => void) => {
  return onSnapshot(doc(db, 'communication_calls', callId), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as VoiceCall);
    }
  });
};

/**
 * Subscribes to incoming signals for a call
 */
export const subscribeToSignals = (
  callId: string, 
  receiverId: string,
  callback: (signal: VoiceCallSignal) => void
) => {
  const signalsQ = query(
    collection(db, 'communication_calls', callId, 'signals'),
    where('senderId', '!=', receiverId),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(signalsQ, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const signal = change.doc.data() as VoiceCallSignal;
        callback(signal);
      }
    });
  });
};

/**
 * Subscribes to incoming calls for a user
 */
export const subscribeToIncomingCalls = (userId: string, callback: (call: VoiceCall) => void) => {
  const callsQ = query(
    collection(db, 'communication_calls'),
    where('receiverId', '==', userId),
    where('status', 'in', ['calling', 'ringing'])
  );
  
  return onSnapshot(callsQ, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        callback(change.doc.data() as VoiceCall);
      }
    });
  });
};

/**
 * Fetches call history for a user
 */
export const getCallHistory = async (userId: string, limitCount = 50): Promise<VoiceCall[]> => {
  // Need to merge caller and receiver queries
  
  const callerQ = query(
    collection(db, 'communication_calls'),
    where('callerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const receiverQ = query(
    collection(db, 'communication_calls'),
    where('receiverId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const [callerSnap, receiverSnap] = await Promise.all([
    getDocs(callerQ),
    getDocs(receiverQ)
  ]);
  
  const calls: VoiceCall[] = [];
  
  callerSnap.forEach(doc => {
    calls.push(doc.data() as VoiceCall);
  });
  
  receiverSnap.forEach(doc => {
    // Avoid duplicates if user called themselves (rare)
    if (!calls.find(c => c.id === doc.id)) {
      calls.push(doc.data() as VoiceCall);
    }
  });
  
  return calls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limitCount);
};
