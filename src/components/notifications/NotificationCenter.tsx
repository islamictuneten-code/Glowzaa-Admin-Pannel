import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  CheckCheck, 
  Trash2, 
  X, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Megaphone, 
  Truck, 
  ShoppingBag, 
  DollarSign, 
  MapPin, 
  Info, 
  Check, 
  Settings, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { CommunicationNotification } from '../../types';
import { NotificationPermissionCard } from './NotificationPermissionCard';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatRelativeTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recently';
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    preferences, 
    updatePreferences,
    permissionStatus
  } = useNotification();

  const { currentUser } = useAuth();
  const { setSelectedOrderId, setIsInvoiceModalOpen, setAdminTab, setSalesTab, setDeliveryTab, role } = useApp();

  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'urgent' | 'orders'>('all');
  const [showPreferences, setShowPreferences] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif: CommunicationNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    // Route target
    if (notif.actionType === 'order' || notif.relatedId) {
      if (notif.relatedId) {
        setSelectedOrderId(notif.relatedId);
        setIsInvoiceModalOpen(true);
      } else if (role === 'admin') {
        setAdminTab('orders');
      } else if (role === 'sales') {
        setSalesTab('my_orders');
      } else if (role === 'delivery') {
        setDeliveryTab('assigned_orders');
      }
    } else if (notif.actionType === 'delivery') {
      if (role === 'delivery') setDeliveryTab('assigned_orders');
      else if (role === 'admin') setAdminTab('orders');
    } else if (notif.actionType === 'payment') {
      if (role === 'sales') setSalesTab('customer_due');
      else if (role === 'delivery') setDeliveryTab('due_collection');
      else if (role === 'admin') setAdminTab('payments');
    } else if (notif.actionType === 'field_tracking') {
      if (role === 'admin') setAdminTab('field_tracking');
      else if (role === 'sales') setSalesTab('dashboard');
    } else if (notif.actionType === 'announcement') {
      if (role === 'admin') setAdminTab('notifications');
    } else if (notif.actionType === 'communication') {
      if (role === 'admin') setAdminTab('messages');
      else if (role === 'sales') setSalesTab('messages');
      else if (role === 'delivery') setDeliveryTab('messages');
    }

    onClose();
  };

  const filteredList = notifications.filter(item => {
    if (filterTab === 'unread') return !item.isRead;
    if (filterTab === 'urgent') return item.priority === 'urgent' || item.priority === 'important';
    if (filterTab === 'orders') return item.type === 'order' || item.type === 'delivery' || item.type === 'payment';
    return true;
  });

  // Group notifications by date
  const todayList: CommunicationNotification[] = [];
  const yesterdayList: CommunicationNotification[] = [];
  const earlierList: CommunicationNotification[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);

  filteredList.forEach(item => {
    const itemTime = new Date(item.createdAt).getTime();
    if (itemTime >= todayStart) {
      todayList.push(item);
    } else if (itemTime >= yesterdayStart) {
      yesterdayList.push(item);
    } else {
      earlierList.push(item);
    }
  });

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'delivery':
        return <Truck className="w-4 h-4 text-teal-600" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
      case 'field':
        return <MapPin className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#087F7A]" />;
    }
  };

  const renderNotificationCard = (item: CommunicationNotification) => {
    const isUrgent = item.priority === 'urgent';
    const isImportant = item.priority === 'important';

    return (
      <div
        key={item.id}
        onClick={() => handleNotificationClick(item)}
        className={`group relative p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer text-left ${
          !item.isRead 
            ? isUrgent 
              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/60' 
              : 'bg-teal-50/50 border-teal-200/90 hover:bg-teal-50' 
            : 'bg-white border-slate-200/80 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div 
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isUrgent ? 'bg-rose-100 text-rose-700' :
              isImportant ? 'bg-amber-100 text-amber-800' :
              !item.isRead ? 'bg-teal-100 text-[#087F7A]' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {getCategoryIcon(item.type)}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                  isUrgent ? 'bg-rose-100 text-rose-800 border-rose-300' :
                  isImportant ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {item.priority}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {formatRelativeTime(item.createdAt)}
                </span>
                {!item.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#087F7A] shrink-0" title="Unread" />
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200/60 transition-all cursor-pointer"
                title="Delete notification"
                aria-label="Delete notification"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <h5 className={`text-xs font-bold ${!item.isRead ? 'text-[#102A2A]' : 'text-slate-700'} line-clamp-1`}>
              {item.title}
            </h5>

            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
              {item.body}
            </p>

            {/* Sender attribution */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span className="truncate">From: {item.senderName}</span>
              {item.actionType !== 'none' && (
                <span className="text-[#087F7A] font-semibold flex items-center gap-0.5 group-hover:underline shrink-0">
                  Open Action <ChevronRight className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#087F7A] border border-teal-200 flex items-center justify-center">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#102A2A]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#087F7A] text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Wholesale Communication Center</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Quick Sound Toggle */}
              <button
                onClick={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  preferences.soundEnabled 
                    ? 'bg-teal-50 text-[#087F7A] border-teal-200' 
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
                title={preferences.soundEnabled ? 'Sound alert enabled' : 'Sound alert muted'}
                aria-label="Toggle notification sound"
              >
                {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Preferences Settings Toggle */}
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  showPreferences 
                    ? 'bg-[#087F7A] text-white border-[#087F7A]' 
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Notification settings"
                aria-label="Notification settings"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Close Drawer Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close notification drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Actions & Filters Bar */}
          {!showPreferences && (
            <div className="mt-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === 'all' ? 'bg-white text-[#087F7A] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === 'unread' ? 'bg-white text-[#087F7A] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setFilterTab('urgent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === 'urgent' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Urgent
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-[#087F7A] hover:text-[#075E5B] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Permission Card Banner if not granted */}
          {permissionStatus !== 'granted' && !showPreferences && (
            <NotificationPermissionCard compact />
          )}

          {/* Preferences Sub-view */}
          {showPreferences ? (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-[#102A2A] uppercase tracking-wider">Alert Preferences</h4>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-xs font-semibold text-[#087F7A] hover:underline"
                >
                  Back to List
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#102A2A]">HQ Announcements</p>
                    <p className="text-[10px] text-slate-500">Official company notices & policies</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.announcements}
                    onChange={(e) => updatePreferences({ announcements: e.target.checked })}
                    className="w-4 h-4 accent-[#087F7A] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#102A2A]">Important & Urgent Alerts</p>
                    <p className="text-[10px] text-slate-500">High priority operational directives</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.importantUpdates}
                    onChange={(e) => updatePreferences({ importantUpdates: e.target.checked })}
                    className="w-4 h-4 accent-[#087F7A] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#102A2A]">Delivery & Dispatch Updates</p>
                    <p className="text-[10px] text-slate-500">Order assignments & status changes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.deliveryUpdates}
                    onChange={(e) => updatePreferences({ deliveryUpdates: e.target.checked })}
                    className="w-4 h-4 accent-[#087F7A] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#102A2A]">Payment & Credit Reminders</p>
                    <p className="text-[10px] text-slate-500">Customer dues & collection tasks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.paymentUpdates}
                    onChange={(e) => updatePreferences({ paymentUpdates: e.target.checked })}
                    className="w-4 h-4 accent-[#087F7A] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#102A2A]">Field Sales Directives</p>
                    <p className="text-[10px] text-slate-500">Territory visit targets & tasks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.fieldSalesUpdates}
                    onChange={(e) => updatePreferences({ fieldSalesUpdates: e.target.checked })}
                    className="w-4 h-4 accent-[#087F7A] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-[#102A2A]">Audio Chime alerts</p>
                    <p className="text-[10px] text-slate-500">Play chime synthesizer on notification</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.soundEnabled}
                    onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#087F7A] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          ) : filteredList.length === 0 ? (
            /* Empty State */
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-8 h-8 opacity-40" />
              </div>
              <h4 className="text-sm font-bold text-[#102A2A]">No Notifications</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {filterTab === 'unread' 
                  ? "You've read all notifications! You're all caught up." 
                  : 'You have no messages or announcements at this time.'}
              </p>
            </div>
          ) : (
            /* Notification Groups */
            <div className="space-y-4">
              {todayList.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">
                    Today
                  </div>
                  <div className="space-y-2.5">
                    {todayList.map(renderNotificationCard)}
                  </div>
                </div>
              )}

              {yesterdayList.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">
                    Yesterday
                  </div>
                  <div className="space-y-2.5">
                    {yesterdayList.map(renderNotificationCard)}
                  </div>
                </div>
              )}

              {earlierList.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">
                    Earlier
                  </div>
                  <div className="space-y-2.5">
                    {earlierList.map(renderNotificationCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer for Admin quick-nav to Communication Center */}
        {currentUser?.role === 'admin' && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              onClick={() => {
                setAdminTab('notifications');
                onClose();
              }}
              className="text-xs font-semibold text-[#087F7A] hover:text-[#075E5B] flex items-center justify-center gap-1.5 w-full py-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open Admin Communication Center</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
