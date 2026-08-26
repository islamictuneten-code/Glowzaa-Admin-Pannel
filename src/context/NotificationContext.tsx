import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  CommunicationNotification, 
  CommunicationDevice, 
  DevicePermissionStatus, 
  NotificationPreferences 
} from '../types';
import { 
  subscribeCommunicationNotifications, 
  markCommunicationNotificationAsRead, 
  markAllCommunicationNotificationsAsRead, 
  deleteCommunicationNotification,
  requestNotificationPermissionAndRegisterToken,
  listenForegroundPushMessages,
  displaySystemNotification,
  playNotificationSound,
  unlockAudioEngine,
  getPersistentDeviceId,
  deactivateCommunicationDevice
} from '../services/notificationService';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  announcements: true,
  importantUpdates: true,
  deliveryUpdates: true,
  paymentUpdates: true,
  fieldSalesUpdates: true,
  systemNotifications: true,
  soundEnabled: true,
  vibrationEnabled: true
};

const PREFS_STORAGE_KEY = 'glowzaa_notification_preferences';

interface NotificationContextType {
  notifications: CommunicationNotification[];
  unreadCount: number;
  permissionStatus: NotificationPermission | 'unsupported';
  isDeviceRegistered: boolean;
  currentDeviceId: string;
  preferences: NotificationPreferences;
  updatePreferences: (newPrefs: Partial<NotificationPreferences>) => void;
  requestPermission: () => Promise<boolean>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  foregroundToast: CommunicationNotification | null;
  dismissToast: () => void;
  playChime: (priority?: 'normal' | 'important' | 'urgent') => Promise<void>;
  testChimeAndAlert: (priority?: 'normal' | 'important' | 'urgent') => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [notifications, setNotifications] = useState<CommunicationNotification[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [isDeviceRegistered, setIsDeviceRegistered] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [foregroundToast, setForegroundToast] = useState<CommunicationNotification | null>(null);

  // Load preferences from localStorage
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  const updatePreferences = (newPrefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const isInitialLoadRef = useRef(true);
  const previousUnreadCountRef = useRef(0);
  const toastTimeoutRef = useRef<any>(null);

  // Initialize device ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const devId = getPersistentDeviceId();
      setCurrentDeviceId(devId);
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
        if (Notification.permission === 'granted') {
          setIsDeviceRegistered(true);
        }
      }
    }
  }, []);

  // Subscribe to live Firestore communication_notifications
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setIsDeviceRegistered(false);
      return;
    }

    const unsubscribe = subscribeCommunicationNotifications(currentUser, (incomingList) => {
      const currentUnread = incomingList.filter(n => !n.isRead).length;

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        previousUnreadCountRef.current = currentUnread;
      } else {
        if (currentUnread > previousUnreadCountRef.current) {
          const newest = incomingList[0];
          if (newest && !newest.isRead) {
            // Check category preference filter
            const isCategoryAllowed = checkCategoryPreference(newest.type, preferences);
            
            if (isCategoryAllowed) {
              // Trigger in-app toast
              setForegroundToast(newest);
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = setTimeout(() => {
                setForegroundToast(null);
              }, newest.priority === 'urgent' ? 9000 : 6000);

              // Sound & Vibration alert
              if (preferences.soundEnabled) {
                playNotificationSound(newest.priority);
              }

              // System Notification (if browser permission granted)
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                displaySystemNotification(newest.title, {
                  body: newest.body,
                  priority: newest.priority,
                  tag: newest.id
                });
              }
            }
          }
        }
        previousUnreadCountRef.current = currentUnread;
      }

      setNotifications(incomingList);
    });

    return () => {
      unsubscribe();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [currentUser, preferences]);

  // Foreground Push Message listener from FCM
  useEffect(() => {
    if (!currentUser) return;
    const unsubFCM = listenForegroundPushMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Glowzaa B2B Alert';
      const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'New wholesale update';
      const priority = payload.data?.priority || 'normal';

      if (preferences.soundEnabled) {
        playNotificationSound(priority);
      }
    });

    return () => {
      unsubFCM();
    };
  }, [currentUser, preferences.soundEnabled]);

  // Explicit User-initiated Permission Request
  const requestPermission = async (): Promise<boolean> => {
    if (!currentUser) return false;
    await unlockAudioEngine();
    const result = await requestNotificationPermissionAndRegisterToken(currentUser);
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    if (result.success && result.permissionGranted) {
      setIsDeviceRegistered(true);
      return true;
    }
    return false;
  };

  const markAsRead = async (notificationId: string) => {
    await markCommunicationNotificationAsRead(notificationId);
    if (foregroundToast?.id === notificationId) {
      setForegroundToast(null);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length > 0) {
      await markAllCommunicationNotificationsAsRead(unread);
    }
    setForegroundToast(null);
  };

  const deleteNotification = async (notificationId: string) => {
    await deleteCommunicationNotification(notificationId);
    if (foregroundToast?.id === notificationId) {
      setForegroundToast(null);
    }
  };

  const dismissToast = () => {
    setForegroundToast(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };

  const testChimeAndAlert = async (priority: 'normal' | 'important' | 'urgent' = 'normal') => {
    await unlockAudioEngine();
    await displaySystemNotification(`Glowzaa Audio & Push Test (${priority.toUpperCase()}) 🔔`, {
      body: 'Synthesizer chime, vibration, and status bar banner are functioning properly.',
      priority: priority,
      tag: `test_${Date.now()}`
    });
  };

  const playChime = async (priority: 'normal' | 'important' | 'urgent' = 'normal') => {
    if (preferences.soundEnabled) {
      await playNotificationSound(priority);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        permissionStatus,
        isDeviceRegistered,
        currentDeviceId,
        preferences,
        updatePreferences,
        requestPermission,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        foregroundToast,
        dismissToast,
        playChime,
        testChimeAndAlert
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Helper: check if notification type is allowed by user preferences
function checkCategoryPreference(type: string, prefs: NotificationPreferences): boolean {
  switch (type) {
    case 'announcement':
      return prefs.announcements;
    case 'urgent':
      return prefs.importantUpdates;
    case 'delivery':
      return prefs.deliveryUpdates;
    case 'payment':
      return prefs.paymentUpdates;
    case 'field':
      return prefs.fieldSalesUpdates;
    case 'system':
    case 'message':
    default:
      return prefs.systemNotifications;
  }
}
