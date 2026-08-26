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
  NotificationPriority,
  CommunicationDevice,
  CommunicationNotification,
  CommunicationNotificationType,
  CommunicationActionType,
  DevicePermissionStatus,
  NotificationPreferences
} from '../types';

// ============================================================================
// Web Audio API Chime Synthesizer & Mobile Sound Engine Unlock
// ============================================================================
let globalAudioContext: AudioContext | null = null;

export const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = new AudioContextClass();
  }
  return globalAudioContext;
};

export const unlockAudioEngine = async () => {
  try {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx) {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch (err) {
    console.warn('Unlock audio engine notice:', err);
  }
};

// Global auto-unlock listeners on first user interaction
if (typeof window !== 'undefined') {
  const handleAutoUnlock = () => {
    unlockAudioEngine();
  };
  window.addEventListener('pointerdown', handleAutoUnlock, { passive: true, once: true });
  window.addEventListener('touchstart', handleAutoUnlock, { passive: true, once: true });
  window.addEventListener('click', handleAutoUnlock, { passive: true, once: true });
  window.addEventListener('keydown', handleAutoUnlock, { passive: true, once: true });
}

// Multi-tone chime synthesizer for audible notification alerts on Android & Desktop
export const playNotificationSound = (priority: 'normal' | 'important' | 'urgent' = 'normal') => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Hardware vibration feedback on mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(priority === 'urgent' ? [400, 150, 400, 150, 400] : priority === 'important' ? [250, 100, 250] : [150]);
      } catch {}
    }

    if (priority === 'urgent') {
      // High Alert Dual-Tone Loud Ring (A5 880Hz -> D6 1174Hz -> E6 1318Hz)
      gainNode.gain.setValueAtTime(0.75, now);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);

      osc2.frequency.setValueAtTime(1318.5, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.35);

      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc1.connect(gainNode);
      osc2.connect(gainNode);

      osc1.start(now);
      osc1.stop(now + 0.17);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.52);
    } else if (priority === 'important') {
      // Important Chime (659Hz -> 880Hz)
      gainNode.gain.setValueAtTime(0.65, now);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880, now + 0.12);

      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Standard Notice Chime (523Hz -> 659Hz)
      gainNode.gain.setValueAtTime(0.5, now);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);

      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.34);
    }
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
};

// ============================================================================
// Client Device & Platform Detection
// ============================================================================
export const getPersistentDeviceId = (): string => {
  if (typeof window === 'undefined') return 'device_server_fallback';
  const STORAGE_KEY = 'glowzaa_device_uuid';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    try {
      localStorage.setItem(STORAGE_KEY, deviceId);
    } catch {}
  }
  return deviceId;
};

export const detectClientDeviceInfo = (): {
  platform: 'Android' | 'Windows' | 'macOS' | 'iOS' | 'Linux' | 'Unknown';
  browser: string;
  deviceLabel: string;
  isMobile: boolean;
} => {
  if (typeof window === 'undefined') {
    return { platform: 'Unknown', browser: 'Unknown', deviceLabel: 'Generic Client', isMobile: false };
  }

  const ua = navigator.userAgent || '';
  let platform: 'Android' | 'Windows' | 'macOS' | 'iOS' | 'Linux' | 'Unknown' = 'Unknown';
  let isMobile = false;

  if (/android/i.test(ua)) {
    platform = 'Android';
    isMobile = true;
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    platform = 'iOS';
    isMobile = true;
  } else if (/windows/i.test(ua)) {
    platform = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    platform = 'macOS';
  } else if (/linux/i.test(ua)) {
    platform = 'Linux';
  }

  let browser = 'Chrome';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/samsung/i.test(ua)) browser = 'Samsung Internet';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  // Build human friendly device label
  let deviceLabel = `${platform} • ${browser}`;
  if (platform === 'Android') {
    const match = ua.match(/;\s*([^;]+)\s+Build/);
    if (match && match[1]) {
      deviceLabel = `${match[1].trim()} • Android / ${browser}`;
    } else {
      deviceLabel = `Android Mobile • ${browser}`;
    }
  } else if (platform === 'iOS') {
    deviceLabel = `Apple Device • iOS / ${browser}`;
  } else if (platform === 'macOS') {
    deviceLabel = `Mac Workstation • ${browser}`;
  } else if (platform === 'Windows') {
    deviceLabel = `Windows PC • ${browser}`;
  }

  return { platform, browser, deviceLabel, isMobile };
};

// ============================================================================
// Android Mobile & Desktop System Push Banner Display
// ============================================================================
export const displaySystemNotification = async (
  title: string,
  options: {
    body: string;
    icon?: string;
    tag?: string;
    priority?: 'normal' | 'important' | 'urgent';
    actionUrl?: string;
  }
) => {
  if (typeof window === 'undefined') return;

  // 1. Trigger audio chime alert & physical vibration
  playNotificationSound(options.priority || 'normal');

  // 2. Check notification permission
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notifOptions: any = {
    body: options.body,
    icon: options.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: options.tag || `glowzaa-push-${Date.now()}`,
    renotify: true,
    requireInteraction: options.priority === 'urgent',
    vibrate: options.priority === 'urgent' ? [400, 150, 400, 150, 400] : [250, 100, 250],
    data: {
      actionUrl: options.actionUrl || '/',
      timestamp: Date.now()
    }
  };

  // Modern Android Chrome REQUIREMENT: ServiceWorkerRegistration.showNotification()
  try {
    if ('serviceWorker' in navigator) {
      let reg: ServiceWorkerRegistration | undefined;
      try {
        reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      } catch {}
      if (!reg) {
        try {
          reg = await navigator.serviceWorker.ready;
        } catch {}
      }
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notifOptions);
        return;
      }
    }
  } catch (swErr) {
    console.warn('SW showNotification notice:', swErr);
  }

  // Desktop / Safari direct constructor fallback
  try {
    new Notification(title, notifOptions);
  } catch (err) {
    console.warn('Direct Notification constructor notice:', err);
  }
};

// ============================================================================
// STEP 15: Device Registration & FCM Token in `communication_devices`
// ============================================================================

export const registerCommunicationDevice = async (
  user: AuthUser,
  fcmTokenString: string,
  permissionStatus: DevicePermissionStatus = 'granted'
): Promise<{ success: boolean; deviceId?: string; error?: string }> => {
  if (!user || !user.uid) {
    return { success: false, error: 'Authenticated user profile is required.' };
  }

  try {
    const rawDeviceId = getPersistentDeviceId();
    const cleanDeviceId = `dev_${user.uid}_${rawDeviceId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const { platform, browser, deviceLabel } = detectClientDeviceInfo();
    const nowIso = new Date().toISOString();

    const deviceDocRef = doc(db, 'communication_devices', cleanDeviceId);

    const deviceData: CommunicationDevice = {
      id: cleanDeviceId,
      userId: user.uid,
      role: user.role,
      userName: user.name || 'Glowzaa Staff',
      platform: platform,
      browser: browser,
      deviceLabel: deviceLabel,
      fcmToken: fcmTokenString || `pwa_token_${user.uid}_${Date.now()}`,
      permissionStatus: permissionStatus,
      isActive: true,
      lastSeenAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await setDoc(deviceDocRef, {
      ...deviceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    }, { merge: true });

    // Legacy sync to staff_push_tokens for backward compatibility
    try {
      const legacyTokenId = `token_${user.uid}_${(fcmTokenString || cleanDeviceId).substring(0, 12).replace(/[^a-zA-Z0-9]/g, '')}`;
      const legacyDocRef = doc(db, 'staff_push_tokens', legacyTokenId);
      await setDoc(legacyDocRef, {
        id: legacyTokenId,
        tokenId: legacyTokenId,
        userId: user.uid,
        userName: user.name,
        role: user.role,
        token: fcmTokenString || cleanDeviceId,
        deviceType: platform === 'Android' ? 'android' : 'desktop',
        browser: browser,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp()
      }, { merge: true });
    } catch {}

    return { success: true, deviceId: cleanDeviceId };
  } catch (err: any) {
    console.error('Error registering communication device in Firestore:', err);
    return { success: false, error: err.message || 'Failed to register communication device.' };
  }
};

// Deactivate device on user logout or session termination
export const deactivateCommunicationDevice = async (
  user: AuthUser
): Promise<void> => {
  if (!user || !user.uid) return;
  try {
    const rawDeviceId = getPersistentDeviceId();
    const cleanDeviceId = `dev_${user.uid}_${rawDeviceId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const deviceDocRef = doc(db, 'communication_devices', cleanDeviceId);
    
    await updateDoc(deviceDocRef, {
      isActive: false,
      lastSeenAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Deactivate device notice:', err);
  }
};

// ============================================================================
// STEP 15: Request Permission & Obtain FCM Token
// ============================================================================

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
      // Record denied/default status
      await registerCommunicationDevice(user, '', permission as DevicePermissionStatus);
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
        console.warn('FCM getToken notice (falling back to PWA web push identifier):', fcmErr?.message || fcmErr);
        tokenString = `pwa_web_push_${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }
    } else {
      tokenString = `pwa_web_push_${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    if (tokenString) {
      await registerCommunicationDevice(user, tokenString, 'granted');
      await unlockAudioEngine();
      await displaySystemNotification('Glowzaa Notifications Activated 🔔', {
        body: 'Push alerts and chime sounds are now active for wholesale commerce updates.',
        priority: 'normal',
        tag: `perm_welcome_${Date.now()}`
      });
      return { success: true, token: tokenString, permissionGranted: true };
    }

    return { success: false, error: 'Could not generate FCM push registration token.' };
  } catch (err: any) {
    console.error('Error requesting notification permission:', err);
    return { success: false, error: err.message || 'Failed to request notification permission.' };
  }
};

// ============================================================================
// STEP 15: Send Push Notification in `communication_notifications`
// ============================================================================

export interface SendCommunicationNotificationPayload {
  recipientUserId: string; // 'all' | 'role:sales' | 'role:delivery' | 'role:admin' | user UID
  recipientRole: 'all' | 'sales' | 'delivery' | 'admin' | 'individual' | string;
  recipientUserName?: string;
  title: string;
  body: string;
  type: CommunicationNotificationType;
  priority: 'normal' | 'important' | 'urgent';
  actionType: CommunicationActionType;
  actionTarget?: string;
  relatedId?: string | null;
}

export const sendCommunicationNotification = async (
  sender: AuthUser,
  payload: SendCommunicationNotificationPayload
): Promise<{ success: boolean; notificationId?: string; error?: string }> => {
  if (!sender || !sender.uid) {
    return { success: false, error: 'Authenticated sender profile is required.' };
  }
  if (!payload.title.trim() || !payload.body.trim()) {
    return { success: false, error: 'Notification title and message content are required.' };
  }

  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const notifDocRef = doc(db, 'communication_notifications', notifId);
    const nowIso = new Date().toISOString();

    const newRecord: CommunicationNotification = {
      id: notifId,
      recipientUserId: payload.recipientUserId,
      recipientRole: payload.recipientRole,
      recipientUserName: payload.recipientUserName || (
        payload.recipientUserId === 'all' ? 'All Staff' : 
        payload.recipientRole === 'sales' ? 'Sales Team' : 
        payload.recipientRole === 'delivery' ? 'Delivery Fleet' : 'Staff Member'
      ),
      senderUserId: sender.uid,
      senderName: sender.name || 'Admin HQ',
      senderRole: sender.role,
      type: payload.type,
      title: payload.title.trim(),
      body: payload.body.trim(),
      priority: payload.priority,
      actionType: payload.actionType || 'none',
      actionTarget: payload.actionTarget || undefined,
      relatedId: payload.relatedId || null,
      isRead: false,
      createdAt: nowIso
    };

    // Remove any undefined properties
    const cleanedRecord: Record<string, any> = {};
    for (const [key, val] of Object.entries(newRecord)) {
      if (val !== undefined) {
        cleanedRecord[key] = val;
      }
    }

    await setDoc(notifDocRef, {
      ...cleanedRecord,
      createdAt: serverTimestamp()
    });

    // Write real Audit Log for admin dispatched notification
    try {
      const auditLogId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const auditRef = doc(db, 'audit_logs', auditLogId);
      await setDoc(auditRef, {
        id: auditLogId,
        action: 'NOTIFICATION_SENT',
        targetUserId: payload.recipientUserId,
        targetUserName: payload.recipientUserName || payload.recipientRole,
        targetRole: payload.recipientRole,
        performedByUserId: sender.uid,
        performedByUserName: sender.name,
        timestamp: nowIso,
        details: `Dispatched [${payload.priority.toUpperCase()}] ${payload.type} notification: "${payload.title.trim()}" to ${payload.recipientRole}`
      });
    } catch (logErr) {
      console.warn('Audit log write notice:', logErr);
    }

    // Legacy sync to staff_notifications for backward compatibility
    try {
      const legacyRef = doc(db, 'staff_notifications', notifId);
      await setDoc(legacyRef, {
        id: notifId,
        notificationId: notifId,
        recipientUserId: payload.recipientUserId,
        recipientUserName: newRecord.recipientUserName,
        recipientRole: payload.recipientRole,
        senderUserId: sender.uid,
        senderUserName: sender.name,
        senderRole: sender.role,
        title: payload.title.trim(),
        message: payload.body.trim(),
        type: payload.type === 'message' ? 'admin_note' : payload.type === 'field' ? 'field_task' : payload.type,
        priority: payload.priority,
        status: 'sent',
        isRead: false,
        createdAt: serverTimestamp(),
        sentAt: serverTimestamp()
      });
    } catch {}

    // Dispatch local notification sound / banner if recipient includes sender
    if (typeof window !== 'undefined') {
      try {
        if (payload.recipientUserId === 'all' || payload.recipientUserId === sender.uid) {
          await displaySystemNotification(payload.title, {
            body: payload.body,
            priority: payload.priority,
            tag: notifId
          });
        }
      } catch (err) {
        console.warn('Local dispatch notice:', err);
      }
    }

    return { success: true, notificationId: notifId };
  } catch (err: any) {
    console.error('Error dispatching communication notification:', err);
    return { success: false, error: err.message || 'Failed to dispatch notification.' };
  }
};

// ============================================================================
// STEP 15: Real-time Subscriptions for Notifications & Devices
// ============================================================================

export const subscribeCommunicationNotifications = (
  currentUser: AuthUser,
  callback: (notifications: CommunicationNotification[]) => void
): (() => void) => {
  if (!currentUser || !currentUser.uid) {
    callback([]);
    return () => {};
  }

  const notifRef = collection(db, 'communication_notifications');
  const q = query(notifRef, orderBy('createdAt', 'desc'), limit(150));

  return onSnapshot(q, (snapshot) => {
    const list: CommunicationNotification[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const recId = data.recipientUserId;
      const recRole = data.recipientRole;
      const isSender = data.senderUserId === currentUser.uid;

      // Role and user matching logic
      const isDirectMatch = 
        recId === currentUser.uid ||
        (currentUser.id && recId === currentUser.id) ||
        (currentUser.loginId && recId === currentUser.loginId) ||
        (currentUser.staffId && recId === currentUser.staffId) ||
        (currentUser.salesStaffId && recId === currentUser.salesStaffId) ||
        (currentUser.deliveryStaffId && recId === currentUser.deliveryStaffId) ||
        (currentUser.email && recId === currentUser.email);

      const isRoleMatch = 
        recId === `role:${currentUser.role}` ||
        recId === currentUser.role ||
        recRole === currentUser.role ||
        recRole === 'all' ||
        recId === 'all';

      const isRelevant = 
        currentUser.role === 'admin' ||
        isDirectMatch ||
        isRoleMatch ||
        isSender;

      if (isRelevant) {
        let createdAtIso = new Date().toISOString();
        if (data.createdAt) {
          if (typeof data.createdAt === 'string') createdAtIso = data.createdAt;
          else if (typeof data.createdAt.toDate === 'function') {
            try { createdAtIso = data.createdAt.toDate().toISOString(); } catch {}
          }
        }

        let readAtIso: string | null = null;
        if (data.readAt) {
          if (typeof data.readAt === 'string') readAtIso = data.readAt;
          else if (typeof data.readAt.toDate === 'function') {
            try { readAtIso = data.readAt.toDate().toISOString(); } catch {}
          }
        }

        list.push({
          id: docSnap.id,
          recipientUserId: data.recipientUserId || 'all',
          recipientRole: data.recipientRole || 'all',
          recipientUserName: data.recipientUserName,
          senderUserId: data.senderUserId || 'admin',
          senderName: data.senderName || 'Admin HQ',
          senderRole: data.senderRole || 'admin',
          type: (data.type as CommunicationNotificationType) || 'announcement',
          title: data.title || 'Notification',
          body: data.body || data.message || '',
          priority: data.priority || 'normal',
          actionType: (data.actionType as CommunicationActionType) || 'none',
          actionTarget: data.actionTarget,
          relatedId: data.relatedId || data.relatedOrderId || null,
          isRead: Boolean(data.isRead),
          createdAt: createdAtIso,
          readAt: readAtIso,
          expiresAt: data.expiresAt || null
        });
      }
    });

    callback(list);
  }, (err) => {
    console.warn('Firestore communication notifications subscription notice:', err);
    callback([]);
  });
};

export const markCommunicationNotificationAsRead = async (
  notificationId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!notificationId) return { success: false, error: 'Notification ID required.' };
  try {
    const docRef = doc(db, 'communication_notifications', notificationId);
    await updateDoc(docRef, {
      isRead: true,
      readAt: new Date().toISOString()
    });
    // Also try updating legacy staff_notifications if it exists
    try {
      const legacyRef = doc(db, 'staff_notifications', notificationId);
      await updateDoc(legacyRef, { isRead: true, readAt: new Date().toISOString() });
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    return { success: false, error: err.message };
  }
};

export const markAllCommunicationNotificationsAsRead = async (
  unreadNotifications: CommunicationNotification[]
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
        const ref = doc(db, 'communication_notifications', n.id);
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

export const deleteCommunicationNotification = async (
  notificationId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!notificationId) return { success: false, error: 'Notification ID required.' };
  try {
    await deleteDoc(doc(db, 'communication_notifications', notificationId));
    try {
      await deleteDoc(doc(db, 'staff_notifications', notificationId));
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting communication notification:', err);
    return { success: false, error: err.message };
  }
};

// Subscribe all registered devices for Admin Registered Devices View
export const subscribeCommunicationDevices = (
  callback: (devices: CommunicationDevice[]) => void
): (() => void) => {
  const devicesRef = collection(db, 'communication_devices');
  const q = query(devicesRef, orderBy('lastSeenAt', 'desc'), limit(150));

  return onSnapshot(q, (snapshot) => {
    const list: CommunicationDevice[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let lastSeenAtIso = new Date().toISOString();
      if (data.lastSeenAt) {
        if (typeof data.lastSeenAt === 'string') lastSeenAtIso = data.lastSeenAt;
        else if (typeof data.lastSeenAt.toDate === 'function') {
          try { lastSeenAtIso = data.lastSeenAt.toDate().toISOString(); } catch {}
        }
      }

      let createdAtIso = lastSeenAtIso;
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') createdAtIso = data.createdAt;
        else if (typeof data.createdAt.toDate === 'function') {
          try { createdAtIso = data.createdAt.toDate().toISOString(); } catch {}
        }
      }

      list.push({
        id: docSnap.id,
        userId: data.userId,
        role: data.role || 'sales',
        userName: data.userName || 'Staff Member',
        platform: data.platform || 'Unknown',
        browser: data.browser || 'Unknown',
        deviceLabel: data.deviceLabel || `${data.platform || 'Device'} • ${data.browser || 'Browser'}`,
        fcmToken: data.fcmToken || '',
        permissionStatus: data.permissionStatus || 'default',
        isActive: Boolean(data.isActive),
        lastSeenAt: lastSeenAtIso,
        createdAt: createdAtIso,
        updatedAt: data.updatedAt || lastSeenAtIso
      });
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore communication devices subscription notice:', err);
    callback([]);
  });
};

// Admin Action: Deactivate device record
export const setDeviceActiveStatus = async (
  deviceId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    const devRef = doc(db, 'communication_devices', deviceId);
    await updateDoc(devRef, {
      isActive: isActive,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ============================================================================
// Foreground Messaging Listener
// ============================================================================
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

// ============================================================================
// Backward Compatibility Wrappers for existing code
// ============================================================================
export const registerPushTokenInFirestore = async (user: AuthUser, tokenString: string) => {
  return registerCommunicationDevice(user, tokenString, 'granted');
};

export const sendStaffNotificationInFirestore = async (
  sender: AuthUser,
  payload: any
) => {
  return sendCommunicationNotification(sender, {
    recipientUserId: payload.recipientUserId,
    recipientRole: payload.recipientRole,
    recipientUserName: payload.recipientUserName,
    title: payload.title,
    body: payload.message,
    type: payload.type === 'admin_note' ? 'message' : payload.type === 'field_task' ? 'field' : (payload.type as CommunicationNotificationType) || 'announcement',
    priority: payload.priority,
    actionType: payload.relatedOrderId ? 'order' : 'none',
    actionTarget: payload.actionUrl || payload.relatedOrderId,
    relatedId: payload.relatedOrderId
  });
};

export const subscribeStaffNotifications = (
  currentUser: AuthUser,
  callback: (notifications: StaffNotification[]) => void
) => {
  return subscribeCommunicationNotifications(currentUser, (comList) => {
    const staffList: StaffNotification[] = comList.map(c => ({
      id: c.id,
      notificationId: c.id,
      recipientUserId: c.recipientUserId,
      recipientUserName: c.recipientUserName,
      recipientRole: c.recipientRole,
      senderUserId: c.senderUserId,
      senderUserName: c.senderName,
      senderRole: c.senderRole || 'admin',
      title: c.title,
      message: c.body,
      type: (c.type === 'message' ? 'admin_note' : c.type === 'field' ? 'field_task' : c.type) as NotificationType,
      priority: c.priority,
      relatedOrderId: c.relatedId || undefined,
      actionUrl: c.actionTarget,
      createdAt: c.createdAt,
      sentAt: c.createdAt,
      readAt: c.readAt || undefined,
      status: 'sent',
      isRead: c.isRead
    }));
    callback(staffList);
  });
};

export const markNotificationAsReadInFirestore = markCommunicationNotificationAsRead;
export const markAllNotificationsAsReadInFirestore = async (notifs: StaffNotification[]) => {
  const comNotifs: CommunicationNotification[] = notifs.map(n => ({
    id: n.id,
    recipientUserId: n.recipientUserId,
    recipientRole: n.recipientRole as any,
    senderUserId: n.senderUserId,
    senderName: n.senderUserName,
    type: 'announcement',
    title: n.title,
    body: n.message,
    priority: n.priority,
    actionType: 'none',
    isRead: n.isRead,
    createdAt: n.createdAt
  }));
  return markAllCommunicationNotificationsAsRead(comNotifs);
};
export const deleteNotificationInFirestore = deleteCommunicationNotification;
export const subscribeStaffPushTokens = (callback: (tokens: StaffPushToken[]) => void) => {
  return subscribeCommunicationDevices((devices) => {
    const tokens: StaffPushToken[] = devices.map(d => ({
      id: d.id,
      tokenId: d.id,
      userId: d.userId,
      userName: d.userName,
      role: d.role,
      token: d.fcmToken,
      deviceType: d.platform === 'Android' ? 'android' : 'desktop',
      browser: d.browser,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      lastSeenAt: d.lastSeenAt,
      isActive: d.isActive
    }));
    callback(tokens);
  });
};
