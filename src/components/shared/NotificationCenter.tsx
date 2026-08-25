import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  CheckCheck, 
  Trash2, 
  X, 
  ExternalLink, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Send, 
  Megaphone, 
  Truck, 
  ShoppingBag, 
  DollarSign, 
  Info,
  Check,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  StaffNotification, 
  NotificationPriority, 
  NotificationType 
} from '../../types';
import { 
  subscribeStaffNotifications, 
  markNotificationAsReadInFirestore, 
  markAllNotificationsAsReadInFirestore, 
  deleteNotificationInFirestore,
  requestNotificationPermissionAndRegisterToken,
  listenForegroundPushMessages,
  playNotificationSound,
  displaySystemNotification,
  unlockAudioEngine
} from '../../services/notificationService';

// Native date formatting helper
const formatDistanceToNowHelper = (dateInput: string | Date): string => {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
};

export const NotificationCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const { setAdminTab, setSalesTab, setDeliveryTab, setSelectedOrderId, setIsInvoiceModalOpen } = useApp();
  
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'urgent'>('all');
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isFirstLoadRef = useRef(true);
  const prevCountRef = useRef(0);

  // Subscribe to live notifications from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeStaffNotifications(currentUser, (list) => {
      const currentUnreadCount = list.filter(n => !n.isRead).length;

      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        prevCountRef.current = currentUnreadCount;
      } else {
        if (currentUnreadCount > prevCountRef.current) {
          // New notification arrived in real-time!
          const latest = list[0];
          if (latest && !latest.isRead) {
            if (soundEnabled) {
              displaySystemNotification(latest.title, {
                body: latest.message,
                priority: latest.priority,
                actionUrl: latest.actionUrl,
                tag: latest.id || latest.notificationId
              });
            }
          }
        }
        prevCountRef.current = currentUnreadCount;
      }

      setNotifications(list);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, soundEnabled]);

  // Listen to foreground FCM push messages
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = listenForegroundPushMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Glowzaa B2B Alert';
      const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'New order notice';
      const priority: NotificationPriority = payload.data?.priority || 'normal';

      if (soundEnabled) {
        displaySystemNotification(title, {
          body,
          priority,
          actionUrl: payload.data?.actionUrl,
          tag: payload.data?.notificationId
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser, soundEnabled]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleRequestPermission = async () => {
    if (!currentUser) return;
    setIsRegistering(true);
    try {
      await unlockAudioEngine();
      const res = await requestNotificationPermissionAndRegisterToken(currentUser);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionState(Notification.permission);
      }
      if (res.success) {
        await displaySystemNotification('System Push Notifications Activated! 🔔', {
          body: 'Order alerts and high-priority sound chimes will now display on your phone status bar.',
          priority: 'important'
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTestSoundAndPush = async () => {
    await unlockAudioEngine();
    await displaySystemNotification('Glowzaa Sound & Push Test 🔔', {
      body: 'Phone status bar banner and loud sound chime are functioning properly!',
      priority: 'urgent',
      tag: `test_push_${Date.now()}`
    });
  };

  const handleMarkAsRead = async (notif: StaffNotification) => {
    if (!notif.isRead) {
      await markNotificationAsReadInFirestore(notif.id);
    }
    if (notif.relatedOrderId) {
      setSelectedOrderId(notif.relatedOrderId);
      setIsInvoiceModalOpen(true);
    } else if (notif.actionUrl) {
      if (currentUser?.role === 'admin' && notif.actionUrl.includes('notifications')) {
        setAdminTab('notifications');
      }
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length > 0) {
      await markAllNotificationsAsReadInFirestore(unread);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotificationInFirestore(id);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'urgent') return n.priority === 'urgent' || n.priority === 'important';
    return true;
  });

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'order_instruction':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'delivery_instruction':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'payment_reminder':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
      case 'field_task':
        return <Send className="w-4 h-4 text-indigo-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse">
            Urgent
          </span>
        );
      case 'important':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            Important
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Notice
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
        title="Staff Push Notifications"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-bounce" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-rose-600 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Staff Communication & Push
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={handleTestSoundAndPush}
                className="px-2 py-1 text-[11px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 rounded border border-rose-200/60 dark:border-rose-900 flex items-center space-x-1 transition-colors"
                title="Test Sound Chime & Status Bar Push Notification"
              >
                <Volume2 className="w-3 h-3 text-rose-600" />
                <span>Test Alert</span>
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Android / Browser Permission Banner if not granted */}
          {permissionState !== 'granted' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-start space-x-2.5 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Android Push Notifications Disabled
                </p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  Enable system notifications to receive order & delivery updates even when app is closed.
                </p>
                <button
                  onClick={handleRequestPermission}
                  disabled={isRegistering}
                  className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-xs transition-colors disabled:opacity-50"
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Enabling...</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="w-3 h-3" />
                      <span>Enable System Push</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tabs & Filter Bar */}
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 font-medium rounded-md transition-all ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-2.5 py-1 font-medium rounded-md transition-all ${
                  activeTab === 'unread'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab('urgent')}
                className={`px-2.5 py-1 font-medium rounded-md transition-all ${
                  activeTab === 'urgent'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Urgent
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center space-x-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-96">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-1" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No notifications found</p>
                <p className="text-xs mt-0.5">Staff instructions and order updates will appear here.</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n)}
                  className={`p-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start space-x-3 ${
                    !n.isRead ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                  }`}
                >
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0 mt-0.5">
                    {getTypeIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        {getPriorityBadge(n.priority)}
                        <button
                          onClick={(e) => handleDelete(e, n.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 rounded"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">
                      {n.message}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="truncate">
                        From: <strong className="text-slate-600 dark:text-slate-400">{n.senderUserName}</strong> ({n.senderRole})
                      </span>
                      <span className="shrink-0">
                        {n.createdAt ? formatDistanceToNowHelper(new Date(n.createdAt)) : 'Just now'}
                      </span>
                    </div>

                    {n.relatedOrderNumber && (
                      <div className="mt-1 inline-flex items-center space-x-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        <span>Invoice #{n.relatedOrderNumber}</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {currentUser?.role === 'admin' && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center">
              <button
                onClick={() => {
                  setAdminTab('notifications');
                  setIsOpen(false);
                }}
                className="w-full py-1.5 px-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition-colors inline-flex items-center justify-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5 text-rose-600" />
                <span>Open HQ Push Notification Command Center</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
