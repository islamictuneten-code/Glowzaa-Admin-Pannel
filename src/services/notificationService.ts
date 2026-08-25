import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
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
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app, { db } from '../lib/firebase';
import { 
  StaffNotification, 
  StaffPushToken, 
  AuthUser, 
  NotificationType, 
  NotificationPriority 
} from '../types';

// Web Audio API Chime Synthesizer for high-priority notification sounds
export const playNotificationSound = (priority: NotificationPriority = 'normal') => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = priority === 'urgent' ? 'sawtooth' : 'sine';
    
    // Higher pitch alerts for urgent
    const startFreq = priority === 'urgent' ? 880 : priority === 'important' ? 660 : 523.25; // A5, E5, C5
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    if (priority === 'urgent') {
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    } else {
      osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.2); // G5
    }

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (priority === 'urgent' ? 0.4 : 0.3));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (priority === 'urgent' ? 0.4 : 0.3));
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
};

// Device Detector Helper
export const detectDeviceClientInfo = (): { deviceType: 'android' | 'desktop' | 'mobile_browser' | 'unknown'; browser: string; userAgent: string } => {
  if (typeof window === 'undefined') {
    return { deviceType: 'unknown', browser: 'Unknown', userAgent: '' };
  }
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isMobile = /mobile|iphone|ipad|android/i.test(ua);
  
  let browser = 'Chrome';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/samsung/i.test(ua)) browser = 'Samsung Internet';

  let deviceType: 'android' | 'desktop' | 'mobile_browser' | 'unknown' = 'desktop';
  if (isAndroid) deviceType = 'android';
  else if (isMobile) deviceType = 'mobile_browser';

  return { deviceType, browser, userAgent: ua };
};

// 1. Register or Update Staff FCM Push Token in Firestore (/staff_push_tokens)
export const registerPushTokenInFirestore = async (
  user: AuthUser,
  tokenString: string
): Promise<{ success: boolean; tokenId?: string; error?: string }> => {
  if (!user || !user.uid || !tokenString) {
    return { success: false, error: 'User UID and token string required.' };
  }

  try {
    const { deviceType, browser, userAgent } = detectDeviceClientInfo();
    // Unique token ID based on sanitized token snippet or user+device
    const tokenId = `token_${user.uid}_${tokenString.substring(0, 12).replace(/[^a-zA-Z0-9]/g, '')}`;
    const tokenDocRef = doc(db, 'staff_push_tokens', tokenId);
    const nowIso = new Date().toISOString();

    const tokenData: StaffPushToken = {
      id: tokenId,
      tokenId: tokenId,
      userId: user.uid,
      userLoginId: user.loginId || user.email?.split('@')[0],
      userName: user.name,
      role: user.role,
      token: tokenString,
      deviceType: deviceType,
      browser: browser,
      userAgent: userAgent,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastSeenAt: nowIso,
      isActive: true
    };

    await setDoc(tokenDocRef, {
      ...tokenData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    }, { merge: true });

    return { success: true, tokenId };
  } catch (err: any) {
    console.error('Error registering push token in Firestore:', err);
    return { success: false, error: err.message || 'Failed to save push token.' };
  }
};

// 2. Initialize FCM and Request Notification Permission
export const requestNotificationPermissionAndRegisterToken = async (
  user: AuthUser
): Promise<{ success: boolean; token?: string; error?: string; permissionGranted?: boolean }> => {
  if (typeof window === 'undefined') return { success: false, error: 'SSR context' };

  if (!('Notification' in window)) {
    return { success: false, error: 'This browser does not support desktop/Android system notifications.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { 
        success: false, 
        permissionGranted: false, 
        error: 'Notification permission was denied. Please allow notifications in site settings.' 
      };
    }

    const messagingSupported = await isSupported();
    let tokenString = '';

    if (messagingSupported) {
      try {
        // Register service worker
        let swRegistration: ServiceWorkerRegistration | undefined;
        if ('serviceWorker' in navigator) {
          swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        }

        const messaging = getMessaging(app);
        tokenString = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration,
          vapidKey: (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || undefined
        });
      } catch (fcmErr: any) {
        console.warn('FCM getToken notice:', fcmErr?.message || fcmErr);
        // Fallback token identifier for PWA/Web push state in Firestore
        tokenString = `pwa_web_push_${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }
    } else {
      tokenString = `pwa_web_push_${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    if (tokenString) {
      await registerPushTokenInFirestore(user, tokenString);
      return { success: true, token: tokenString, permissionGranted: true };
    }

    return { success: false, error: 'Could not generate FCM push registration token.' };
  } catch (err: any) {
    console.error('Error requesting notification permission:', err);
    return { success: false, error: err.message || 'Failed to request notification permission.' };
  }
};

// 3. Send Staff Notification in Firestore (/staff_notifications)
export const sendStaffNotificationInFirestore = async (
  sender: AuthUser,
  payload: {
    recipientUserId: string; // 'all' or specific user UID or 'role:sales', 'role:delivery'
    recipientUserName?: string;
    recipientRole: string;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    relatedOrderId?: string;
    relatedOrderNumber?: string;
    relatedCustomerId?: string;
    relatedCustomerName?: string;
    actionUrl?: string;
  }
): Promise<{ success: boolean; notificationId?: string; error?: string }> => {
  if (!sender || !sender.uid) {
    return { success: false, error: 'Authenticated sender profile is required.' };
  }
  if (!payload.title.trim() || !payload.message.trim()) {
    return { success: false, error: 'Notification title and message content are required.' };
  }

  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const notifDocRef = doc(db, 'staff_notifications', notifId);
    const nowIso = new Date().toISOString();

    const notifRecord: StaffNotification = {
      id: notifId,
      notificationId: notifId,
      recipientUserId: payload.recipientUserId,
      recipientUserName: payload.recipientUserName || (payload.recipientUserId === 'all' ? 'All Glowzaa Staff' : payload.recipientRole.toUpperCase() + ' Team'),
      recipientRole: payload.recipientRole,
      senderUserId: sender.uid,
      senderUserName: sender.name,
      senderRole: sender.role,
      title: payload.title.trim(),
      message: payload.message.trim(),
      type: payload.type,
      priority: payload.priority,
      relatedOrderId: payload.relatedOrderId || undefined,
      relatedOrderNumber: payload.relatedOrderNumber || undefined,
      relatedCustomerId: payload.relatedCustomerId || undefined,
      relatedCustomerName: payload.relatedCustomerName || undefined,
      actionUrl: payload.actionUrl || (payload.relatedOrderId ? `/orders/${payload.relatedOrderId}` : undefined),
      createdAt: nowIso,
      sentAt: nowIso,
      status: 'sent',
      isRead: false
    };

    await setDoc(notifDocRef, {
      ...notifRecord,
      createdAt: serverTimestamp(),
      sentAt: serverTimestamp()
    });

    // If browser system notification is available in foreground/background, trigger browser notification immediately
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (payload.recipientUserId === 'all' || payload.recipientUserId === sender.uid || payload.recipientRole === sender.role) {
          new Notification(payload.title, {
            body: payload.message,
            icon: '/icon-192.png',
            tag: notifId
          });
          playNotificationSound(payload.priority);
        }
      } catch {}
    }

    return { success: true, notificationId: notifId };
  } catch (err: any) {
    console.error('Error creating staff notification document:', err);
    return { success: false, error: err.message || 'Failed to dispatch staff notification.' };
  }
};

// 4. Subscribe Live Staff Notifications for current logged-in user
export const subscribeStaffNotifications = (
  currentUser: AuthUser,
  callback: (notifications: StaffNotification[]) => void
): (() => void) => {
  if (!currentUser || !currentUser.uid) {
    callback([]);
    return () => {};
  }

  const notifRef = collection(db, 'staff_notifications');
  // Order by createdAt desc
  const q = query(notifRef, orderBy('createdAt', 'desc'), limit(100));

  return onSnapshot(q, (snapshot) => {
    const list: StaffNotification[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const recId = data.recipientUserId;
      const recRole = data.recipientRole;
      const isSender = data.senderUserId === currentUser.uid;

      // Filter relevance for logged in user:
      // Admin sees all. Non-admin sees notifications targeted to 'all', their role ('role:sales' or recRole==user.role), their specific uid, or sent by them.
      const isForMe = 
        currentUser.role === 'admin' ||
        recId === 'all' ||
        recId === currentUser.uid ||
        recId === `role:${currentUser.role}` ||
        recRole === currentUser.role ||
        recRole === 'all' ||
        isSender;

      if (isForMe) {
        let createdAtIso = new Date().toISOString();
        if (data.createdAt) {
          if (typeof data.createdAt === 'string') createdAtIso = data.createdAt;
          else if (typeof data.createdAt.toDate === 'function') {
            try { createdAtIso = data.createdAt.toDate().toISOString(); } catch {}
          }
        }

        let sentAtIso = undefined;
        if (data.sentAt) {
          if (typeof data.sentAt === 'string') sentAtIso = data.sentAt;
          else if (typeof data.sentAt.toDate === 'function') {
            try { sentAtIso = data.sentAt.toDate().toISOString(); } catch {}
          }
        }

        let readAtIso = undefined;
        if (data.readAt) {
          if (typeof data.readAt === 'string') readAtIso = data.readAt;
          else if (typeof data.readAt.toDate === 'function') {
            try { readAtIso = data.readAt.toDate().toISOString(); } catch {}
          }
        }

        list.push({
          id: docSnap.id,
          notificationId: data.notificationId || docSnap.id,
          recipientUserId: data.recipientUserId,
          recipientUserName: data.recipientUserName,
          recipientRole: data.recipientRole,
          senderUserId: data.senderUserId,
          senderUserName: data.senderUserName,
          senderRole: data.senderRole,
          title: data.title || 'Notification',
          message: data.message || '',
          type: data.type || 'system',
          priority: data.priority || 'normal',
          relatedOrderId: data.relatedOrderId,
          relatedOrderNumber: data.relatedOrderNumber,
          relatedCustomerId: data.relatedCustomerId,
          relatedCustomerName: data.relatedCustomerName,
          actionUrl: data.actionUrl,
          createdAt: createdAtIso,
          sentAt: sentAtIso,
          readAt: readAtIso,
          status: data.status || 'sent',
          isRead: Boolean(data.isRead)
        });
      }
    });

    callback(list);
  }, (err) => {
    console.warn('Firestore live notifications subscription notice:', err);
    callback([]);
  });
};

// 5. Mark single notification as read in Firestore
export const markNotificationAsReadInFirestore = async (
  notificationId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!notificationId) return { success: false, error: 'Notification ID required.' };
  try {
    const docRef = doc(db, 'staff_notifications', notificationId);
    await updateDoc(docRef, {
      isRead: true,
      readAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    return { success: false, error: err.message };
  }
};

// 6. Mark ALL unread notifications as read for current user
export const markAllNotificationsAsReadInFirestore = async (
  unreadNotifications: StaffNotification[]
): Promise<{ success: boolean; count?: number; error?: string }> => {
  if (!unreadNotifications || unreadNotifications.length === 0) {
    return { success: true, count: 0 };
  }
  try {
    const batch = writeBatch(db);
    let count = 0;
    const nowIso = new Date().toISOString();
    
    unreadNotifications.forEach((n) => {
      if (!n.isRead) {
        const ref = doc(db, 'staff_notifications', n.id);
        batch.update(ref, {
          isRead: true,
          readAt: nowIso
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return { success: true, count };
  } catch (err: any) {
    console.error('Error marking all notifications as read:', err);
    return { success: false, error: err.message };
  }
};

// 7. Delete notification from Firestore
export const deleteNotificationInFirestore = async (
  notificationId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!notificationId) return { success: false, error: 'Notification ID required.' };
  try {
    await deleteDoc(doc(db, 'staff_notifications', notificationId));
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting notification:', err);
    return { success: false, error: err.message };
  }
};

// 8. Subscribe registered Push Tokens (for Admin Staff Token Registry view)
export const subscribeStaffPushTokens = (
  callback: (tokens: StaffPushToken[]) => void
): (() => void) => {
  const tokensRef = collection(db, 'staff_push_tokens');
  const q = query(tokensRef, orderBy('updatedAt', 'desc'), limit(150));

  return onSnapshot(q, (snapshot) => {
    const list: StaffPushToken[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let updatedAtIso = new Date().toISOString();
      if (data.updatedAt) {
        if (typeof data.updatedAt === 'string') updatedAtIso = data.updatedAt;
        else if (typeof data.updatedAt.toDate === 'function') {
          try { updatedAtIso = data.updatedAt.toDate().toISOString(); } catch {}
        }
      }

      list.push({
        id: docSnap.id,
        tokenId: data.tokenId || docSnap.id,
        userId: data.userId,
        userLoginId: data.userLoginId,
        userName: data.userName,
        role: data.role,
        token: data.token,
        deviceType: data.deviceType || 'unknown',
        browser: data.browser || 'Unknown Browser',
        userAgent: data.userAgent,
        createdAt: data.createdAt || updatedAtIso,
        updatedAt: updatedAtIso,
        lastSeenAt: data.lastSeenAt || updatedAtIso,
        isActive: Boolean(data.isActive)
      });
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore live push tokens subscription notice:', err);
    callback([]);
  });
};

// 9. Foreground Messaging Listener (if FCM messaging is supported)
export const listenForegroundPushMessages = (
  onPushReceived: (payload: any) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  let unsubscribe = () => {};

  isSupported().then((supported) => {
    if (supported) {
      try {
        const messaging = getMessaging(app);
        unsubscribe = onMessage(messaging, (payload) => {
          console.log('Foreground Push Message received:', payload);
          onPushReceived(payload);
        });
      } catch (e) {
        console.warn('Foreground messaging init notice:', e);
      }
    }
  });

  return () => {
    unsubscribe();
  };
};
