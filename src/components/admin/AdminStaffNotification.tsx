import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Bell, 
  BellRing, 
  Smartphone, 
  Laptop, 
  Globe, 
  ShieldAlert, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Search, 
  Filter, 
  Sparkles, 
  Truck, 
  ShoppingBag, 
  DollarSign, 
  Megaphone, 
  FileText,
  Plus,
  Zap,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  StaffNotification, 
  StaffPushToken, 
  NotificationType, 
  NotificationPriority, 
  AuthUser 
} from '../../types';
import { 
  sendStaffNotificationInFirestore, 
  subscribeStaffNotifications, 
  subscribeStaffPushTokens, 
  deleteNotificationInFirestore,
  requestNotificationPermissionAndRegisterToken,
  playNotificationSound
} from '../../services/notificationService';
import { fetchStaffUsersFromFirestore } from '../../services/staffAuthService';

// Native date formatting helpers
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

export const AdminStaffNotification: React.FC = () => {
  const { currentUser } = useAuth();
  const { orders, customers } = useApp();

  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'devices'>('send');
  
  // Data States
  const [notificationsHistory, setNotificationsHistory] = useState<StaffNotification[]>([]);
  const [pushTokens, setPushTokens] = useState<StaffPushToken[]>([]);
  const [staffList, setStaffList] = useState<AuthUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Form States
  const [recipientTarget, setRecipientTarget] = useState<'all' | 'role:sales' | 'role:delivery' | string>('all');
  const [selectedStaffUid, setSelectedStaffUid] = useState<string>('');
  const [notifType, setNotifType] = useState<NotificationType>('admin_note');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [relatedOrderNumber, setRelatedOrderNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

  // Filter States for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyPriorityFilter, setHistoryPriorityFilter] = useState<'all' | NotificationPriority>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | NotificationType>('all');

  // Load staff list & subscribe to tokens and history
  useEffect(() => {
    let isMounted = true;
    const loadStaff = async () => {
      setIsLoadingStaff(true);
      try {
        const staff = await fetchStaffUsersFromFirestore();
        if (isMounted) setStaffList(staff);
      } catch (e) {
        console.warn('Load staff list notice:', e);
      } finally {
        if (isMounted) setIsLoadingStaff(false);
      }
    };
    loadStaff();

    if (currentUser) {
      const unsubNotifs = subscribeStaffNotifications(currentUser, (list) => {
        if (isMounted) setNotificationsHistory(list);
      });
      const unsubTokens = subscribeStaffPushTokens((tokens) => {
        if (isMounted) setPushTokens(tokens);
      });

      return () => {
        isMounted = false;
        unsubNotifs();
        unsubTokens();
      };
    }
  }, [currentUser]);

  // Apply Quick Template Presets
  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'urgent_delivery':
        setNotifType('delivery_instruction');
        setPriority('urgent');
        setRecipientTarget('role:delivery');
        setTitle('🚨 Urgent Order Delivery Dispatch');
        setMessage('Priority wholesale order dispatch assigned to delivery team. Please inspect active invoice and proceed immediately.');
        break;
      case 'payment_due':
        setNotifType('payment_reminder');
        setPriority('important');
        setRecipientTarget('role:sales');
        setTitle('💰 Retailer Outstanding Payment Collection');
        setMessage('Assigned retail shop has overdue balances exceeding credit term limits. Please collect cash or bKash remittance on today field visit.');
        break;
      case 'route_task':
        setNotifType('field_task');
        setPriority('normal');
        setRecipientTarget('role:sales');
        setTitle('📍 Daily Field Territory Visit Directive');
        setMessage('Ensure all scheduled merchant visits in assigned territory are completed and GPS check-ins logged before shift end.');
        break;
      case 'announcement':
        setNotifType('announcement');
        setPriority('normal');
        setRecipientTarget('all');
        setTitle('📢 Glowzaa B2B Wholesale Staff Update');
        setMessage('New product category stock has arrived at Central Warehouse. Updated wholesale price list is now live in catalog.');
        break;
      case 'packing_ready':
        setNotifType('order_instruction');
        setPriority('important');
        setRecipientTarget('role:delivery');
        setTitle('📦 Order Packing Complete - Ready for Pickup');
        setMessage('Wholesale order items packed and verified by HQ Warehouse. Delivery driver please collect cash pouch and invoice parcel.');
        break;
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendSuccessMsg(null);
    setSendErrorMsg(null);

    if (!currentUser) {
      setSendErrorMsg('Authenticated admin profile is required.');
      return;
    }
    if (!title.trim() || !message.trim()) {
      setSendErrorMsg('Please fill in both title and message content.');
      return;
    }

    setIsSending(true);
    try {
      let recipientId = recipientTarget;
      let recipientRole = 'all';
      let recipientUserName = 'All Staff';

      if (recipientTarget === 'role:sales') {
        recipientRole = 'sales';
        recipientUserName = 'Sales Staff Team';
      } else if (recipientTarget === 'role:delivery') {
        recipientRole = 'delivery';
        recipientUserName = 'Delivery Courier Fleet';
      } else if (recipientTarget.startsWith('user:')) {
        const uid = recipientTarget.replace('user:', '');
        const targetStaff = staffList.find(s => s.uid === uid || s.id === uid);
        recipientId = uid;
        recipientRole = targetStaff?.role || 'staff';
        recipientUserName = targetStaff?.name || 'Selected Staff Member';
      }

      let matchedOrderId: string | undefined = undefined;
      if (relatedOrderNumber.trim()) {
        const matched = orders.find(o => o.orderNumber?.toLowerCase() === relatedOrderNumber.trim().toLowerCase());
        if (matched) matchedOrderId = matched.id;
      }

      const res = await sendStaffNotificationInFirestore(currentUser, {
        recipientUserId: recipientId,
        recipientUserName,
        recipientRole,
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        priority: priority,
        relatedOrderNumber: relatedOrderNumber.trim() || undefined,
        relatedOrderId: matchedOrderId
      });

      if (res.success) {
        setSendSuccessMsg(`Push notification dispatched successfully to ${recipientUserName}!`);
        setTitle('');
        setMessage('');
        setRelatedOrderNumber('');
        playNotificationSound(priority);
      } else {
        setSendErrorMsg(res.error || 'Failed to dispatch notification.');
      }
    } catch (err: any) {
      setSendErrorMsg(err.message || 'Error occurred while sending notification.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (confirm('Are you sure you want to delete this notification record?')) {
      await deleteNotificationInFirestore(id);
    }
  };

  // Filtered History
  const filteredHistory = notificationsHistory.filter(n => {
    const matchesSearch = 
      n.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      n.message.toLowerCase().includes(historySearch.toLowerCase()) ||
      n.senderUserName.toLowerCase().includes(historySearch.toLowerCase()) ||
      (n.recipientUserName && n.recipientUserName.toLowerCase().includes(historySearch.toLowerCase()));

    const matchesPriority = historyPriorityFilter === 'all' || n.priority === historyPriorityFilter;
    const matchesType = historyTypeFilter === 'all' || n.type === historyTypeFilter;

    return matchesSearch && matchesPriority && matchesType;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner Header - Glowzaa Corporate B2B Theme */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-2xs relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10 min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              FCM Push Dispatch System
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">
              Live Field & Warehouse Push
            </span>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            Staff Push Notification Command Center
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Dispatch real-time system push notifications to Sales Staff & Delivery Courier mobile panels — even when the app is closed or running in background.
          </p>
        </div>

        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 bg-teal-50/60 border border-teal-100 p-3 rounded-xl shrink-0">
          <div className="text-left md:text-right">
            <p className="text-[11px] font-semibold text-slate-600">Registered FCM Devices</p>
            <p className="text-lg font-bold text-[#0F766E]">{pushTokens.length} Active Devices</p>
          </div>
          <div className="p-2.5 bg-[#0F766E] rounded-lg shrink-0 text-white shadow-2xs">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Touch-Friendly Horizontally Scrollable Tabs Bar */}
      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap -mx-1 px-1">
        <button
          onClick={() => setActiveTab('send')}
          className={`shrink-0 pb-3 px-3.5 sm:px-4 font-semibold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'send'
              ? 'border-[#0F766E] text-[#0F766E] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4 shrink-0" />
          <span>Dispatch Notification</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`shrink-0 pb-3 px-3.5 sm:px-4 font-semibold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'border-[#0F766E] text-[#0F766E] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Notification History Log ({notificationsHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`shrink-0 pb-3 px-3.5 sm:px-4 font-semibold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'devices'
              ? 'border-[#0F766E] text-[#0F766E] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>Staff Push Tokens Registry ({pushTokens.length})</span>
        </button>
      </div>

      {/* ======================================================================== */}
      {/* TAB 1: DISPATCH NOTIFICATION FORM */}
      {/* ======================================================================== */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Main Form */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-2xs border border-slate-200">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <BellRing className="w-5 h-5 text-[#0F766E] shrink-0" />
                <span>Create Staff Notification Payload</span>
              </h2>

              {/* Alert Messages */}
              {sendSuccessMsg && (
                <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{sendSuccessMsg}</span>
                </div>
              )}
              {sendErrorMsg && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{sendErrorMsg}</span>
                </div>
              )}

              {/* Quick Template Presets - Horizontally Scrollable on Mobile */}
              <div className="mb-5 sm:mb-6">
                <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Quick operational presets:
                </label>
                <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none whitespace-nowrap -mx-1 px-1">
                  <button
                    type="button"
                    onClick={() => applyPreset('urgent_delivery')}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-all flex items-center space-x-1.5"
                  >
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>Urgent Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('payment_due')}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 transition-all flex items-center space-x-1.5"
                  >
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span>Due Remind</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('route_task')}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl border border-teal-200 transition-all flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Field Directive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('announcement')}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 transition-all flex items-center space-x-1.5"
                  >
                    <Megaphone className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                    <span>Broadcast Notice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('packing_ready')}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-all flex items-center space-x-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                    <span>Order Ready</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-4">
                {/* Recipient Target & Priority Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Recipient Target */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient Audience Target *
                    </label>
                    <select
                      value={recipientTarget}
                      onChange={(e) => setRecipientTarget(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] text-slate-900 font-medium"
                    >
                      <option value="all">🌐 Broadcast to All Staff Members</option>
                      <option value="role:sales">💼 Sales Staff Team Only</option>
                      <option value="role:delivery">🚚 Delivery Courier Fleet Only</option>
                      <optgroup label="Direct Individual Staff Member">
                        {staffList.map((s) => (
                          <option key={s.uid || s.id} value={`user:${s.uid || s.id}`}>
                            👤 {s.name} ({s.role.toUpperCase()} - {s.loginId || s.staffId})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notification Priority *
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setPriority('normal')}
                        className={`py-2 px-2 sm:px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                          priority === 'normal'
                            ? 'bg-[#0F766E] text-white border-[#0F766E] font-bold shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority('important')}
                        className={`py-2 px-2 sm:px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                          priority === 'important'
                            ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Important
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority('urgent')}
                        className={`py-2 px-2 sm:px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                          priority === 'urgent'
                            ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs animate-pulse'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        🚨 Urgent
                      </button>
                    </div>
                  </div>
                </div>

                {/* Type & Invoice Link */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Message Category Type
                    </label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value as NotificationType)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] text-slate-900 font-medium"
                    >
                      <option value="admin_note">📌 HQ Admin Executive Note</option>
                      <option value="order_instruction">📦 Order Packing / Item Instruction</option>
                      <option value="delivery_instruction">🚚 Delivery Logistics Directive</option>
                      <option value="field_task">📍 Sales Territory Task</option>
                      <option value="payment_reminder">💰 Payment Collection Reminder</option>
                      <option value="announcement">📢 General Staff Announcement</option>
                      <option value="urgent">🚨 Urgent Emergency Alert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Related Invoice / Order # (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ORD-2026-1001"
                      value={relatedOrderNumber}
                      onChange={(e) => setRelatedOrderNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] text-slate-900 font-medium"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notification Headline Title *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Urgent Delivery Dispatch Assigned"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] text-slate-900 font-semibold"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Message Content Body *
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {message.length} / 500 chars
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    maxLength={500}
                    placeholder="Enter detailed staff instructions..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] text-slate-900 leading-relaxed font-normal"
                  />
                </div>

                {/* Submit Action Button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSending || !title.trim() || !message.trim()}
                    className="w-full sm:w-auto px-6 py-3 bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Dispatching Push Tokens...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Dispatch FCM Push Notification</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Live Mobile Notification Mockup */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300">Android System Panel Preview</span>
                </div>
                <Smartphone className="w-4 h-4 text-[#0F766E]" />
              </div>

              {/* Mock Notification Card */}
              <div className="bg-slate-800/90 rounded-xl p-4 border border-slate-700/80 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-[#0F766E] rounded-lg text-white">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">GLOWZAA B2B</p>
                      <p className="text-[10px] text-slate-400">Just now • System Push</p>
                    </div>
                  </div>
                  {priority === 'urgent' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full uppercase tracking-wider animate-pulse">
                      Urgent
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {title || 'Headline Title Sample'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">
                    {message || 'Your push notification body content will be rendered here for Sales & Delivery staff.'}
                  </p>
                </div>

                {relatedOrderNumber && (
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-teal-300 font-semibold">
                    <span>Invoice #{relatedOrderNumber}</span>
                    <span className="text-[10px] bg-teal-950 px-2 py-0.5 rounded text-teal-300 border border-teal-800">Tap to open</span>
                  </div>
                )}
              </div>

              <div className="mt-4 text-[11px] text-slate-400 text-center leading-relaxed">
                Appears on Android lock screen & notification tray even when PWA web app is not active in foreground.
              </div>
            </div>

            {/* FCM Token Health Summary Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-[#0F766E]" />
                <span>Device Token Status</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium">Total Registered Staff Devices</span>
                  <span className="font-bold text-slate-900">{pushTokens.length}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium">Android Mobiles Connected</span>
                  <span className="font-bold text-emerald-700">
                    {pushTokens.filter(t => t.deviceType === 'android').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium">Desktop / Web PWAs</span>
                  <span className="font-bold text-[#0F766E]">
                    {pushTokens.filter(t => t.deviceType === 'desktop' || t.deviceType === 'mobile_browser').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* TAB 2: DISPATCH HISTORY AUDIT LOG */}
      {/* ======================================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={historyPriorityFilter}
                onChange={(e) => setHistoryPriorityFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="important">Important</option>
                <option value="normal">Normal</option>
              </select>

              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="all">All Categories</option>
                <option value="admin_note">Admin Note</option>
                <option value="order_instruction">Order Instruction</option>
                <option value="delivery_instruction">Delivery Directive</option>
                <option value="field_task">Field Task</option>
                <option value="payment_reminder">Payment Reminder</option>
                <option value="announcement">Announcement</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Mobile Card List View (Visible on < md) */}
          <div className="block md:hidden space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200 shadow-2xs">
                <Bell className="w-8 h-8 mx-auto mb-2 stroke-1 opacity-40 text-slate-400" />
                <p className="font-medium text-slate-600 text-xs">No dispatch records found</p>
              </div>
            ) : (
              filteredHistory.map((h) => (
                <div
                  key={h.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          h.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-700'
                            : h.priority === 'important'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-50 text-[#0F766E]'
                        }`}>
                          {h.priority}
                        </span>
                        <span className="text-[10px] text-slate-600 capitalize bg-slate-100 px-2 py-0.5 rounded font-medium">
                          {h.type.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{h.title}</h4>
                    </div>

                    <button
                      onClick={() => handleDeleteHistory(h.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                      title="Delete log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {h.message}
                  </p>

                  {h.relatedOrderNumber && (
                    <div className="inline-block px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-[10px] font-semibold text-[#0F766E]">
                      Invoice #{h.relatedOrderNumber}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div>
                      Target: <strong className="text-slate-800">{h.recipientUserName || h.recipientUserId}</strong>
                    </div>
                    <div>
                      {h.createdAt ? formatDistanceToNowHelper(new Date(h.createdAt)) : 'N/A'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tablet & Desktop Table (Visible on >= md) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Title & Message</th>
                    <th className="py-3 px-4">Target Audience</th>
                    <th className="py-3 px-4">Priority & Type</th>
                    <th className="py-3 px-4">Dispatched By</th>
                    <th className="py-3 px-4">Sent Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 stroke-1 opacity-40 text-slate-400" />
                        <p className="font-medium text-slate-600">No dispatch records found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{h.title}</p>
                          <p className="text-slate-500 line-clamp-1 mt-0.5">{h.message}</p>
                          {h.relatedOrderNumber && (
                            <span className="mt-1 inline-block text-[10px] font-semibold text-[#0F766E]">
                              Order #{h.relatedOrderNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {h.recipientUserName || h.recipientUserId}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase w-max ${
                              h.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-700'
                                : h.priority === 'important'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-teal-50 text-[#0F766E]'
                            }`}>
                              {h.priority}
                            </span>
                            <span className="text-[10px] text-slate-500 capitalize">{h.type.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{h.senderUserName}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{h.senderRole}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {h.createdAt ? formatDistanceToNowHelper(new Date(h.createdAt)) : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteHistory(h.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* TAB 3: STAFF PUSH TOKEN REGISTRY */}
      {/* ======================================================================== */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-between shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Staff Push Tokens</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registered Android phones & browsers configured to receive FCM background push alerts.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-full">
              {pushTokens.length} Devices Online
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pushTokens.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                <Smartphone className="w-10 h-10 mx-auto mb-2 opacity-40 stroke-1 text-slate-400" />
                <p className="font-medium text-slate-600">No staff devices registered yet</p>
                <p className="text-xs mt-1 text-slate-400">When staff log in and accept push permissions, their device token will appear here.</p>
              </div>
            ) : (
              pushTokens.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-xl ${
                        t.deviceType === 'android' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-teal-50 text-[#0F766E] border border-teal-200'
                      }`}>
                        {t.deviceType === 'android' ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{t.userName || 'Staff Device'}</h4>
                        <p className="text-xs text-slate-500 capitalize">{t.role} Staff • {t.userLoginId || 'User'}</p>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Active FCM Token" />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span>Browser / OS:</span>
                      <strong className="text-slate-900">{t.browser}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Device Category:</span>
                      <span className="capitalize font-semibold text-[#0F766E]">{t.deviceType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Activity:</span>
                      <span>{t.updatedAt ? formatDistanceToNowHelper(new Date(t.updatedAt)) : 'Active'}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-mono bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-500 truncate">
                      Token: {t.token}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
