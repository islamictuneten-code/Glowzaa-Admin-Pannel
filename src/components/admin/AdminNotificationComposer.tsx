import React, { useState } from 'react';
import { 
  Send, 
  Sparkles, 
  Smartphone, 
  Laptop, 
  AlertTriangle, 
  Users, 
  UserCheck, 
  Truck, 
  Briefcase, 
  CheckCircle2, 
  Info,
  Clock,
  Layers,
  Megaphone,
  ShoppingBag,
  DollarSign,
  MapPin,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  sendCommunicationNotification, 
  SendCommunicationNotificationPayload 
} from '../../services/notificationService';
import { 
  CommunicationNotificationType, 
  CommunicationActionType, 
  AuthUser 
} from '../../types';

interface TemplateOption {
  label: string;
  category: CommunicationNotificationType;
  priority: 'normal' | 'important' | 'urgent';
  recipientRole: string;
  actionType: CommunicationActionType;
  title: string;
  body: string;
}

const NOTIFICATION_TEMPLATES: TemplateOption[] = [
  {
    label: 'Daily Field Target Kickoff',
    category: 'field',
    priority: 'normal',
    recipientRole: 'sales',
    actionType: 'field_tracking',
    title: 'Daily Field Duty Kickoff 🚀',
    body: 'Good morning Sales Team! Today territory targets and retail shop visits are active. Please check-in to your assigned shops on time.'
  },
  {
    label: 'Urgent Delivery Dispatch Alert',
    category: 'delivery',
    priority: 'urgent',
    recipientRole: 'delivery',
    actionType: 'delivery',
    title: 'Urgent Priority Delivery Assigned ⚡',
    body: 'A priority wholesale dispatch order has been scheduled for fast delivery. Check your route and invoice immediately.'
  },
  {
    label: 'Payment & Due Collection Directive',
    category: 'payment',
    priority: 'important',
    recipientRole: 'sales',
    actionType: 'payment',
    title: 'Overdue Credit Collection Reminder 💳',
    body: 'Please follow up on outstanding credit balances with assigned retail shops during today field visits.'
  },
  {
    label: 'Warehouse Inventory Restock Update',
    category: 'announcement',
    priority: 'normal',
    recipientRole: 'all',
    actionType: 'none',
    title: 'New Wholesale Stock Arrival 📦',
    body: 'Fresh cosmetic inventory batch received at central hub. Catalog stock counts and pricing have been updated.'
  },
  {
    label: 'System Maintenance Notice',
    category: 'system',
    priority: 'important',
    recipientRole: 'all',
    actionType: 'none',
    title: 'Scheduled System Sync Update ⚙️',
    body: 'System ledger and server reconciliation will occur tonight at 11:30 PM. Please ensure all cash handovers are submitted.'
  }
];

interface AdminNotificationComposerProps {
  onSuccess?: () => void;
  staffUsers: AuthUser[];
}

export const AdminNotificationComposer: React.FC<AdminNotificationComposerProps> = ({ 
  onSuccess,
  staffUsers
}) => {
  const { currentUser } = useAuth();
  const { orders } = useApp();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<CommunicationNotificationType>('announcement');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [targetType, setTargetType] = useState<'all' | 'sales' | 'delivery' | 'individual'>('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [actionType, setActionType] = useState<CommunicationActionType>('none');
  const [relatedOrderId, setRelatedOrderId] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);

  // Apply template
  const handleApplyTemplate = (tmpl: TemplateOption) => {
    setTitle(tmpl.title);
    setBody(tmpl.body);
    setType(tmpl.category);
    setPriority(tmpl.priority);
    setActionType(tmpl.actionType);
    if (tmpl.recipientRole === 'all') setTargetType('all');
    else if (tmpl.recipientRole === 'sales') setTargetType('sales');
    else if (tmpl.recipientRole === 'delivery') setTargetType('delivery');
  };

  const handleSend = async () => {
    if (!currentUser) return;
    if (!title.trim() || !body.trim()) {
      setErrorMessage('Please enter both title and message body.');
      return;
    }

    if (targetType === 'individual' && !selectedUserId) {
      setErrorMessage('Please select an individual recipient staff member.');
      return;
    }

    // Require confirmation modal for urgent broadcast to ALL staff
    if (targetType === 'all' && priority === 'urgent' && !showBroadcastConfirm) {
      setShowBroadcastConfirm(true);
      return;
    }

    setShowBroadcastConfirm(false);
    setIsSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let recipientUserId = 'all';
      let recipientRole = 'all';
      let recipientUserName = 'All Staff';

      if (targetType === 'sales') {
        recipientUserId = 'role:sales';
        recipientRole = 'sales';
        recipientUserName = 'Sales Team';
      } else if (targetType === 'delivery') {
        recipientUserId = 'role:delivery';
        recipientRole = 'delivery';
        recipientUserName = 'Delivery Fleet';
      } else if (targetType === 'individual') {
        const found = staffUsers.find(u => u.uid === selectedUserId || u.id === selectedUserId);
        recipientUserId = selectedUserId;
        recipientRole = found?.role || 'staff';
        recipientUserName = found?.name || 'Staff Member';
      }

      const payload: SendCommunicationNotificationPayload = {
        recipientUserId,
        recipientRole,
        recipientUserName,
        title: title.trim(),
        body: body.trim(),
        type,
        priority,
        actionType,
        actionTarget: relatedOrderId || undefined,
        relatedId: relatedOrderId || null
      };

      const res = await sendCommunicationNotification(currentUser, payload);

      if (res.success) {
        setSuccessMessage(`Notification successfully dispatched to ${recipientUserName}!`);
        setTitle('');
        setBody('');
        setRelatedOrderId('');
        if (onSuccess) onSuccess();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(res.error || 'Failed to dispatch notification.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while sending.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
      
      {/* LEFT COLUMN: Composer Form */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-5">
        
        {/* Header & Template Quick Fill */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#102A2A]">Compose Push Notification</h3>
              <p className="text-xs text-slate-500">Dispatch instant push alerts, sounds, and directives to staff devices</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-[#087F7A] border border-teal-200 px-2 py-0.5 rounded-full">
              Live Push Engine
            </span>
          </div>

          {/* Preset Templates */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-1.5">
              {NOTIFICATION_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-[#087F7A] hover:border-teal-300 text-slate-700 border border-slate-200 transition-colors font-medium cursor-pointer"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          
          {/* Target Audience */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Target Audience
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  targetType === 'all'
                    ? 'bg-[#087F7A] text-white border-[#087F7A] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Staff</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('sales')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  targetType === 'sales'
                    ? 'bg-[#087F7A] text-white border-[#087F7A] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Sales Team</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('delivery')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  targetType === 'delivery'
                    ? 'bg-[#087F7A] text-white border-[#087F7A] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery Fleet</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('individual')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  targetType === 'individual'
                    ? 'bg-[#087F7A] text-white border-[#087F7A] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Direct Staff</span>
              </button>
            </div>

            {/* Individual staff selector */}
            {targetType === 'individual' && (
              <div className="mt-2.5">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">Select individual staff member...</option>
                  {staffUsers.map((u) => (
                    <option key={u.uid || u.id} value={u.uid || u.id}>
                      {u.name} ({u.role?.toUpperCase()} • {u.loginId || u.email || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Type & Priority Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Category Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CommunicationNotificationType)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="announcement">Announcement / Notice</option>
                <option value="urgent">Urgent Operational Alert</option>
                <option value="order">Wholesale Order Instruction</option>
                <option value="delivery">Delivery Dispatch Update</option>
                <option value="payment">Payment & Credit Reminder</option>
                <option value="field">Field Sales Directive</option>
                <option value="message">Direct Admin Note</option>
                <option value="system">System Notification</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Priority Level & Alert Sound
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                    priority === 'normal'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('important')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                    priority === 'important'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  Important
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                    priority === 'urgent'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  Urgent ⚡
                </button>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Notification Title</label>
              <span className="text-[10px] text-slate-400">{title.length}/60</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 60))}
              placeholder="e.g. Fresh stock arrival at central warehouse..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold text-[#102A2A]"
            />
          </div>

          {/* Message Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Message Body</label>
              <span className="text-[10px] text-slate-400">{body.length}/240</span>
            </div>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 240))}
              placeholder="Provide clear, actionable details for field and delivery staff..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Interactive Action Routing */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#087F7A]" />
                <span>Tap Action Destination (Deep-Link)</span>
              </label>
              <span className="text-[10px] text-slate-400">Routes user upon clicking</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActionType('none')}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                  actionType === 'none' ? 'bg-teal-50 border-teal-300 text-[#087F7A] font-bold' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                No Action (Dismiss)
              </button>
              <button
                type="button"
                onClick={() => setActionType('order')}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                  actionType === 'order' ? 'bg-teal-50 border-teal-300 text-[#087F7A] font-bold' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Open Order
              </button>
              <button
                type="button"
                onClick={() => setActionType('delivery')}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                  actionType === 'delivery' ? 'bg-teal-50 border-teal-300 text-[#087F7A] font-bold' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Delivery Queue
              </button>
              <button
                type="button"
                onClick={() => setActionType('payment')}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                  actionType === 'payment' ? 'bg-teal-50 border-teal-300 text-[#087F7A] font-bold' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Due Collection
              </button>
              <button
                type="button"
                onClick={() => setActionType('field_tracking')}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                  actionType === 'field_tracking' ? 'bg-teal-50 border-teal-300 text-[#087F7A] font-bold' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Field Duty
              </button>
              <button
                type="button"
                onClick={() => setActionType('announcement')}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                  actionType === 'announcement' ? 'bg-teal-50 border-teal-300 text-[#087F7A] font-bold' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                HQ Notice
              </button>
            </div>

            {actionType === 'order' && (
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Select Associated Wholesale Order
                </label>
                <select
                  value={relatedOrderId}
                  onChange={(e) => setRelatedOrderId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Select order...</option>
                  {orders.slice(0, 30).map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      #{ord.orderNumber || ord.id.slice(-6)} • {ord.customerName} • ৳{(ord.totalAmount || 0).toLocaleString()} ({ord.orderStatus})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !title.trim() || !body.trim()}
            className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#087F7A] hover:bg-[#075E5B] text-white shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Dispatching Push Notification...' : 'Send Push Notification Now'}</span>
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Live Android & Desktop Device Preview */}
      <div className="lg:col-span-5 space-y-5">
        
        {/* Device Preview Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold tracking-wide uppercase text-slate-300">Android & Lockscreen Preview</h4>
            </div>
            <span className="text-[10px] bg-slate-800 text-teal-400 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
              FCM v1
            </span>
          </div>

          {/* Simulated Mobile Notification Card */}
          <div className="bg-slate-800/90 rounded-2xl p-3.5 border border-slate-700/80 shadow-inner backdrop-blur-xs text-left">
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#087F7A] text-white flex items-center justify-center text-[9px] font-extrabold">
                  G
                </div>
                <span className="text-[11px] font-semibold text-slate-300">GLOWZAA WHOLESALE</span>
                <span className="text-[10px] text-slate-500">• now</span>
              </div>

              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                priority === 'urgent' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                priority === 'important' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              }`}>
                {priority}
              </span>
            </div>

            <h5 className="text-xs font-bold text-white mb-1">
              {title || 'Notification Headline...'}
            </h5>

            <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
              {body || 'Notification message text will appear right here as it is typed in the composer...'}
            </p>

            {actionType !== 'none' && (
              <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px]">
                <span className="text-teal-400 font-semibold">Action: {actionType.replace('_', ' ').toUpperCase()}</span>
                <span className="text-slate-400">Tap to open ›</span>
              </div>
            )}
          </div>

          {/* Audio Chime Info */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Alert Tone:</span>
            <span className="text-teal-400 font-semibold">
              {priority === 'urgent' ? 'High Pitch Siren Dual-Tone + Heavy Vibration' :
               priority === 'important' ? 'Important Notice 2-Step Chime' :
               'Standard Clean Notice Chime'}
            </span>
          </div>
        </div>

        {/* Operational Guardrails Card */}
        <div className="bg-teal-50/70 border border-teal-200/90 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#087F7A]">
            <Info className="w-4 h-4 shrink-0" />
            <h5 className="text-xs font-bold">Push Notification Delivery Protocol</h5>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Notifications are synchronized in real-time across Web Push (FCM), Android Service Worker, and Firestore live streams. Staff devices with permissions will ring with audio chimes even when running in the background.
          </p>
        </div>

      </div>

      {/* Urgent Broadcast Confirmation Modal */}
      {showBroadcastConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-left animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-sm font-bold text-slate-900">
              Confirm Urgent Broadcast to All Staff?
            </h4>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              You are about to send an <strong>URGENT</strong> push notification with high-priority audio siren chime to <strong>all registered staff devices</strong> across the entire company.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl my-4 text-xs space-y-1">
              <p className="font-bold text-slate-800">{title}</p>
              <p className="text-slate-600 text-[11px] line-clamp-2">{body}</p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBroadcastConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                {isSending ? 'Broadcasting...' : 'Yes, Dispatch Urgent Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
