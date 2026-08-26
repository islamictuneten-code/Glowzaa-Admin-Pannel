import { db } from '../lib/firebase';
import { 
  collection, doc, setDoc, getDoc, getDocs, onSnapshot, 
  query, where, orderBy, updateDoc,
} from 'firebase/firestore';
import { AuthUser, GroupCall, GroupCallParticipant, VoiceCallSignal, VoiceCallSignalType, VoiceCallSignalCandidate } from '../types';

export const createGroupCall = async (
  initiator: AuthUser, 
  participants: AuthUser[],
  type: 'group' | 'broadcast' = 'group'
): Promise<GroupCall> => {
  if (participants.length > 5) {
    throw new Error('Mesh WebRTC is limited to 5 participants. An SFU (Selective Forwarding Unit) media server is required for larger groups.');
  }

  const callId = `gcall_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  
  const participantData: Record<string, GroupCallParticipant> = {};
  
  // Add initiator
  participantData[initiator.uid] = {
    uid: initiator.uid,
    name: initiator.name,
    role: initiator.role,
    status: 'connected',
    joinedAt: now
  };
  
  // Add others
  participants.forEach(p => {
    participantData[p.uid] = {
      uid: p.uid,
      name: p.name,
      role: p.role,
      status: 'invited'
    };
  });
  
  const callData: GroupCall = {
    id: callId,
    initiatorId: initiator.uid,
    initiatorName: initiator.name,
    initiatorRole: initiator.role,
    type,
    status: 'initializing',
    participantIds: [initiator.uid, ...participants.map(p => p.uid)],
    participants: participantData,
    startedAt: now,
    createdAt: now,
    updatedAt: now
  };
  
  await setDoc(doc(db, 'communication_group_calls', callId), callData);
  
  // Audit log
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'audit_logs', logId), {
      id: logId,
      action: type === 'broadcast' ? 'BROADCAST_CALL_STARTED' : 'GROUP_CALL_STARTED',
      targetUserId: 'GROUP',
      targetUserName: `${participants.length} participants`,
      targetRole: 'mixed',
      performedByUserId: initiator.uid,
      performedByUserName: initiator.name,
      timestamp: now,
      details: `Started ${type} call ${callId} with ${participants.length} participants`
    });
  } catch (err) {
    console.warn('Audit log write failed', err);
  }
  
  return callData;
};

export const updateGroupCallStatus = async (callId: string, status: GroupCall['status']) => {
  const now = new Date().toISOString();
  const updates: any = {
    status,
    updatedAt: now
  };
  
  if (status === 'ended') {
    updates.endedAt = now;
  }
  
  await updateDoc(doc(db, 'communication_group_calls', callId), updates);
};

export const updateParticipantStatus = async (
  callId: string, 
  userId: string, 
  status: GroupCallParticipant['status'],
  isMuted?: boolean
) => {
  const now = new Date().toISOString();
  const updates: any = {
    [`participants.${userId}.status`]: status,
    updatedAt: now
  };
  
  if (status === 'connected') {
    updates[`participants.${userId}.joinedAt`] = now;
  } else if (['left', 'rejected', 'missed', 'failed'].includes(status)) {
    updates[`participants.${userId}.leftAt`] = now;
  }
  
  if (isMuted !== undefined) {
    updates[`participants.${userId}.isMuted`] = isMuted;
  }
  
  await updateDoc(doc(db, 'communication_group_calls', callId), updates);
};

export const sendGroupSignal = async (
  callId: string, 
  senderId: string,
  receiverId: string,
  type: VoiceCallSignalType, 
  sdp?: string,
  candidate?: VoiceCallSignalCandidate
): Promise<void> => {
  const signalId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const signal: VoiceCallSignal = {
    id: signalId,
    callId,
    senderId,
    receiverId, // In mesh, signals must be targeted to specific peer
    type,
    createdAt: new Date().toISOString()
  };
  
  if (sdp) signal.sdp = sdp;
  if (candidate) signal.candidate = candidate;
  
  await setDoc(doc(db, 'communication_group_calls', callId, 'signals', signalId), signal);
};

export const subscribeToGroupCall = (callId: string, callback: (call: GroupCall) => void) => {
  return onSnapshot(doc(db, 'communication_group_calls', callId), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as GroupCall);
    }
  });
};

export const subscribeToGroupSignals = (
  callId: string, 
  receiverId: string,
  callback: (signal: VoiceCallSignal) => void
) => {
  const signalsQ = query(
    collection(db, 'communication_group_calls', callId, 'signals'),
    where('receiverId', '==', receiverId),
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

export const subscribeToIncomingGroupCalls = (userId: string, callback: (call: GroupCall) => void) => {
  // Can't easily query by map value status in firestore natively without composite indexes on every possible map key.
  // Instead, we query where participantIds contains userId and status is initializing/active, then filter client-side.
  const callsQ = query(
    collection(db, 'communication_group_calls'),
    where('participantIds', 'array-contains', userId),
    where('status', 'in', ['initializing', 'active'])
  );
  
  return onSnapshot(callsQ, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const call = change.doc.data() as GroupCall;
        const myStatus = call.participants[userId]?.status;
        if (myStatus === 'invited' || myStatus === 'ringing') {
          callback(call);
        }
      }
    });
  });
};
