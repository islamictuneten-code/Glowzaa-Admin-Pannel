import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  AuthUser, 
  CommunicationConversation, 
  CommunicationMessage, 
  CommunicationMessageStatus,
  ParticipantTypingState 
} from '../types';
import { sendCommunicationNotification } from './notificationService';

/**
 * Generates a deterministic, sorted conversation ID between two users.
 * Example: adminUid_salesUid (sorted alphabetically so order of args doesn't matter)
 */
export function getDeterministicConversationId(userId1: string, userId2: string): string {
  const sorted = [userId1.trim(), userId2.trim()].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Removes undefined fields before writing to Firestore
 */
function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        cleaned[key] = cleanUndefined(obj[key]);
      } else {
        cleaned[key] = obj[key];
      }
    }
  });
  return cleaned as T;
}

/**
 * Helper to extract all possible candidate user IDs (uid, id, loginId, staffId, email).
 */
export function getUserCandidateIds(user: { uid?: string; id?: string; loginId?: string; staffId?: string; salesStaffId?: string; deliveryStaffId?: string; email?: string; [key: string]: any }): string[] {
  if (!user) return [];
  const raw = [
    user.uid,
    user.id,
    user.loginId,
    user.staffId,
    user.salesStaffId,
    user.deliveryStaffId,
    user.email
  ];
  const valid = raw.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item!.trim());
  return Array.from(new Set(valid));
}

/**
 * Retrieves or creates a 1-on-1 private conversation between Admin and a Staff member.
 * Guarantees no duplicate conversations across UIDs, document IDs, or login IDs.
 */
export async function getOrCreateCommunicationConversation(
  adminUser: { uid: string; name?: string; role?: string; [key: string]: any },
  staffUser: { uid: string; name?: string; role?: string; [key: string]: any }
): Promise<CommunicationConversation> {
  const adminCandidateIds = getUserCandidateIds(adminUser);
  if (!adminCandidateIds.includes('admin_hq')) adminCandidateIds.push('admin_hq');
  if (!adminCandidateIds.includes('admin')) adminCandidateIds.push('admin');

  const staffCandidateIds = getUserCandidateIds(staffUser);
  const primaryStaffUid = staffCandidateIds[0] || (staffUser.uid ? staffUser.uid.trim() : '');

  if (!primaryStaffUid && staffCandidateIds.length === 0) {
    throw new Error('Staff UID or identifier is required to locate or create a conversation.');
  }

  const colRef = collection(db, 'communication_conversations');

  // 1. Check if any conversation already exists for any candidate ID of this staff member
  try {
    const q = query(colRef, where('participantIds', 'array-contains-any', staffCandidateIds.slice(0, 10)), limit(10));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const matchingDoc = snap.docs.find(d => {
        const data = d.data() as CommunicationConversation;
        return data.participantIds.some(id => adminCandidateIds.includes(id));
      }) || snap.docs[0];

      const data = matchingDoc.data() as CommunicationConversation;

      // Ensure all candidate IDs for both admin and staff are present in participantIds and metadata
      const allParticipantIds = Array.from(new Set([...(data.participantIds || []), ...adminCandidateIds, ...staffCandidateIds]));
      
      const updatedNames = { ...(data.participantNames || {}) };
      adminCandidateIds.forEach(id => { updatedNames[id] = adminUser.name || 'Admin HQ'; });
      staffCandidateIds.forEach(id => { updatedNames[id] = staffUser.name || 'Staff Member'; });

      const updatedRoles = { ...(data.participantRoles || {}) };
      adminCandidateIds.forEach(id => { updatedRoles[id] = adminUser.role || 'admin'; });
      staffCandidateIds.forEach(id => { updatedRoles[id] = staffUser.role || 'sales'; });

      const needsUpdate = allParticipantIds.length !== (data.participantIds || []).length;
      if (needsUpdate) {
        await updateDoc(doc(db, 'communication_conversations', matchingDoc.id), {
          participantIds: allParticipantIds,
          participantNames: updatedNames,
          participantRoles: updatedRoles
        }).catch(() => {});
        data.participantIds = allParticipantIds;
        data.participantNames = updatedNames;
        data.participantRoles = updatedRoles;
      }

      return { id: matchingDoc.id, ...data };
    }
  } catch (err) {
    console.warn('Notice checking existing staff conversation with candidate IDs:', err);
  }

  // 2. Deterministic fallback if no conversation document exists yet
  const primaryAdminUid = adminCandidateIds[0] || 'admin_hq';
  const conversationId = getDeterministicConversationId(primaryAdminUid, primaryStaffUid);
  const convRef = doc(db, 'communication_conversations', conversationId);

  try {
    const snap = await getDoc(convRef);
    if (snap.exists()) {
      const data = snap.data() as CommunicationConversation;
      return { id: snap.id, ...data };
    }

    const now = new Date().toISOString();
    const allParticipantIds = Array.from(new Set([...adminCandidateIds, ...staffCandidateIds]));

    const participantNames: Record<string, string> = {};
    adminCandidateIds.forEach(id => { participantNames[id] = adminUser.name || 'Admin HQ'; });
    staffCandidateIds.forEach(id => { participantNames[id] = staffUser.name || 'Staff Member'; });

    const participantRoles: Record<string, string> = {};
    adminCandidateIds.forEach(id => { participantRoles[id] = adminUser.role || 'admin'; });
    staffCandidateIds.forEach(id => { participantRoles[id] = staffUser.role || 'sales'; });

    const unreadCounts: Record<string, number> = {};
    allParticipantIds.forEach(id => { unreadCounts[id] = 0; });

    const newConv: CommunicationConversation = {
      id: conversationId,
      participantIds: allParticipantIds,
      participantNames,
      participantRoles,
      lastMessage: 'Conversation opened',
      lastMessageSenderId: primaryAdminUid,
      lastMessageAt: now,
      unreadCounts,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(convRef, cleanUndefined(newConv));

    // Audit log conversation creation
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setDoc(doc(db, 'audit_logs', logId), {
        id: logId,
        action: 'COMMUNICATION_CONVERSATION_CREATED',
        targetUserId: primaryStaffUid,
        targetUserName: staffUser.name || 'Staff Member',
        targetRole: staffUser.role || 'staff',
        performedByUserId: primaryAdminUid,
        performedByUserName: adminUser.name || 'Admin',
        timestamp: now,
        details: `Conversation initialized: ${conversationId}`
      }).catch(() => {});
    } catch {
      // safe fallback
    }

    return newConv;
  } catch (err) {
    console.error('Error in getOrCreateCommunicationConversation:', err);
    throw err;
  }
}

/**
 * Sends a private communication message, updates the parent conversation metadata,
 * increments the receiver's unread counter, and triggers background push notification.
 */
export async function sendCommunicationMessage(params: {
  conversationId: string;
  sender: { uid: string; name: string; role: string };
  receiver: { uid: string; name?: string; role?: string };
  text: string;
}): Promise<CommunicationMessage> {
  const { conversationId, sender, receiver, text } = params;
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error('Message text cannot be empty.');
  }

  const now = new Date().toISOString();
  const messagesCol = collection(db, 'communication_messages');
  const messageDocRef = doc(messagesCol);

  const messageData: CommunicationMessage = {
    id: messageDocRef.id,
    conversationId,
    senderId: sender.uid,
    senderName: sender.name,
    senderRole: sender.role,
    receiverId: receiver.uid,
    text: trimmedText,
    status: 'sent',
    sentAt: now,
    deliveredAt: null,
    seenAt: null
  };

  try {
    // 1. Write the message document
    await setDoc(messageDocRef, cleanUndefined(messageData));

    // 2. Update conversation lastMessage, lastMessageAt, and unreadCounts
    const convRef = doc(db, 'communication_conversations', conversationId);
    const convSnap = await getDoc(convRef);
    let currentUnread = 0;
    if (convSnap.exists()) {
      const data = convSnap.data() as CommunicationConversation;
      currentUnread = data.unreadCounts?.[receiver.uid] || 0;
    }

    await updateDoc(convRef, cleanUndefined({
      lastMessage: trimmedText,
      lastMessageSenderId: sender.uid,
      lastMessageAt: now,
      updatedAt: now,
      [`unreadCounts.${receiver.uid}`]: currentUnread + 1,
      [`typing.${sender.uid}.isTyping`]: false
    }));

    // 3. Dispatch Push Notification to Receiver (FCM + Web Chime)
    const notifTitle = sender.role === 'admin' 
      ? 'Admin HQ Direct Message' 
      : `${sender.name} (${(sender.role || 'staff').toUpperCase()})`;

    sendCommunicationNotification(
      {
        uid: sender.uid,
        id: sender.uid,
        name: sender.name,
        email: '',
        phone: '',
        role: sender.role as any,
        status: 'active',
        createdAt: now
      },
      {
        recipientUserId: receiver.uid,
        recipientRole: (receiver.role || 'sales') as any,
        recipientUserName: receiver.name,
        type: 'message',
        title: notifTitle,
        body: trimmedText.length > 120 ? `${trimmedText.slice(0, 117)}...` : trimmedText,
        priority: 'normal',
        actionType: 'communication',
        actionTarget: conversationId,
        relatedId: messageDocRef.id
      }
    ).catch((notifErr) => {
      console.warn('Background message push dispatch notice:', notifErr);
    });

    // 4. Audit Log
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setDoc(doc(db, 'audit_logs', logId), {
        id: logId,
        action: 'COMMUNICATION_MESSAGE_SENT',
        targetUserId: receiver.uid,
        targetUserName: receiver.name || 'Recipient',
        targetRole: receiver.role || 'staff',
        performedByUserId: sender.uid,
        performedByUserName: sender.name,
        timestamp: now,
        details: `Direct message dispatched in conversation ${conversationId}`
      }).catch(() => {});
    } catch {
      // safe fallback
    }

    return messageData;
  } catch (err) {
    console.error('Error sending communication message:', err);
    throw err;
  }
}

/**
 * Gets a single conversation by ID.
 */
export async function getCommunicationConversation(conversationId: string): Promise<CommunicationConversation | null> {
  try {
    const snap = await getDoc(doc(db, 'communication_conversations', conversationId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) } as CommunicationConversation;
  } catch (err) {
    console.error('Error fetching conversation:', err);
    return null;
  }
}

/**
 * Fetches all conversations where the user is a participant or all if admin.
 */
export async function getUserCommunicationConversations(userId: string, role?: string): Promise<CommunicationConversation[]> {
  try {
    const colRef = collection(db, 'communication_conversations');
    let q;
    if (role === 'admin') {
      q = query(colRef, orderBy('updatedAt', 'desc'), limit(100));
    } else {
      q = query(colRef, where('participantIds', 'array-contains', userId), limit(50));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CommunicationConversation));
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.error('Error fetching user conversations:', err);
    return [];
  }
}

/**
 * Marks a message as delivered.
 */
export async function markCommunicationMessageDelivered(messageId: string): Promise<void> {
  try {
    const msgRef = doc(db, 'communication_messages', messageId);
    const snap = await getDoc(msgRef);
    if (snap.exists()) {
      const data = snap.data() as CommunicationMessage;
      if (data.status === 'sent') {
        await updateDoc(msgRef, {
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('Mark message delivered notice:', err);
  }
}

/**
 * Marks a single message as seen.
 */
export async function markCommunicationMessageSeen(
  messageId: string, 
  conversationId?: string, 
  readerId?: string
): Promise<void> {
  try {
    const msgRef = doc(db, 'communication_messages', messageId);
    const now = new Date().toISOString();
    await updateDoc(msgRef, {
      status: 'seen',
      seenAt: now
    });

    if (conversationId && readerId) {
      const convRef = doc(db, 'communication_conversations', conversationId);
      await updateDoc(convRef, {
        [`unreadCounts.${readerId}`]: 0
      });
    }
  } catch (err) {
    console.warn('Mark message seen notice:', err);
  }
}

/**
 * Marks all incoming messages in a conversation as seen and resets unread count.
 */
export async function markAllConversationMessagesSeen(
  conversationId: string,
  readerId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, 'communication_messages'),
      where('conversationId', '==', conversationId),
      where('receiverId', '==', readerId),
      limit(50)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    let hasUnseen = false;

    snap.docs.forEach((docSnap) => {
      const msg = docSnap.data() as CommunicationMessage;
      if (msg.status !== 'seen') {
        hasUnseen = true;
        batch.update(docSnap.ref, {
          status: 'seen',
          seenAt: now
        });
      }
    });

    // Reset conversation unread count for this reader
    const convRef = doc(db, 'communication_conversations', conversationId);
    batch.update(convRef, {
      [`unreadCounts.${readerId}`]: 0
    });

    await batch.commit();
  } catch (err) {
    console.warn('Mark all conversation messages seen notice:', err);
  }
}

/**
 * Fetches recent messages for a conversation.
 */
export async function getCommunicationMessages(
  conversationId: string, 
  limitCount: number = 100
): Promise<CommunicationMessage[]> {
  try {
    const q = query(
      collection(db, 'communication_messages'),
      where('conversationId', '==', conversationId),
      orderBy('sentAt', 'asc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CommunicationMessage));
  } catch (err) {
    console.warn('Fallback messages fetch without orderBy:', err);
    try {
      const fallbackQ = query(
        collection(db, 'communication_messages'),
        where('conversationId', '==', conversationId),
        limit(limitCount)
      );
      const snap = await getDocs(fallbackQ);
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) } as CommunicationMessage))
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    } catch (fallbackErr) {
      console.error('Error fetching communication messages:', fallbackErr);
      return [];
    }
  }
}

/**
 * Subscribes to real-time conversation messages with automatic delivery marking.
 */
export function subscribeToCommunicationMessages(
  conversationId: string,
  currentUserId: string,
  callback: (messages: CommunicationMessage[]) => void
): () => void {
  if (!conversationId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'communication_messages'),
    where('conversationId', '==', conversationId),
    limit(150)
  );

  return onSnapshot(
    q,
    (snap) => {
      const messages: CommunicationMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any)
      } as CommunicationMessage));

      messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      callback(messages);

      // Auto-mark incoming sent messages as delivered
      messages.forEach((msg) => {
        if (msg.receiverId === currentUserId && msg.status === 'sent') {
          markCommunicationMessageDelivered(msg.id);
        }
      });
    },
    (err) => {
      console.error('Communication messages subscription error:', err);
      callback([]);
    }
  );
}

/**
 * Subscribes to all conversations relevant to the user (accepts single string or array of candidate user IDs).
 */
export function subscribeToCommunicationConversations(
  userIds: string | string[],
  role: string,
  callback: (conversations: CommunicationConversation[]) => void
): () => void {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  if (ids.length === 0) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'communication_conversations');
  let q;
  if (role === 'admin') {
    q = query(colRef, limit(100));
  } else if (ids.length === 1) {
    q = query(colRef, where('participantIds', 'array-contains', ids[0]), limit(50));
  } else {
    q = query(colRef, where('participantIds', 'array-contains-any', ids.slice(0, 10)), limit(50));
  }

  return onSnapshot(
    q,
    (snap) => {
      const conversations: CommunicationConversation[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any)
      } as CommunicationConversation));

      conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      callback(conversations);
    },
    (err) => {
      console.error('Communication conversations subscription error:', err);
      callback([]);
    }
  );
}

/**
 * Sets lightweight typing presence state on a conversation doc.
 */
export async function setConversationTypingState(
  conversationId: string,
  userId: string,
  isTyping: boolean,
  userName?: string
): Promise<void> {
  if (!conversationId || !userId) return;
  try {
    const convRef = doc(db, 'communication_conversations', conversationId);
    await updateDoc(convRef, cleanUndefined({
      [`typing.${userId}`]: {
        isTyping,
        updatedAt: new Date().toISOString(),
        userName: userName || 'Staff'
      }
    }));
  } catch (err) {
    console.warn('Typing state update notice:', err);
  }
}

/**
 * Computes total unread messages count for a user across all active conversations.
 */
export async function getUnreadCommunicationMessageCount(userId: string): Promise<number> {
  try {
    const conversations = await getUserCommunicationConversations(userId);
    return conversations.reduce((sum, c) => sum + (c.unreadCounts?.[userId] || 0), 0);
  } catch (err) {
    console.error('Error getting unread communication count:', err);
    return 0;
  }
}
