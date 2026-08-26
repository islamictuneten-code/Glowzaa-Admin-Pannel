import React from 'react';
import { 
  Bell, 
  AlertTriangle, 
  ShoppingBag, 
  Truck, 
  DollarSign, 
  Megaphone, 
  MapPin, 
  Info, 
  X, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useApp } from '../../context/AppContext';
import { CommunicationNotification } from '../../types';

export const NotificationToast: React.FC = () => {
  const { foregroundToast, dismissToast, markAsRead } = useNotification();
  const { orders, setViewingOrder, setAdminTab, setSalesTab, setDeliveryTab, role } = useApp();

  if (!foregroundToast) return null;

  const handleAction = async () => {
    await markAsRead(foregroundToast.id);
    
    // Route action based on notification actionType or target
    if (foregroundToast.actionType === 'order' || foregroundToast.relatedId) {
      if (foregroundToast.relatedId) {
        const targetOrder = orders.find(o => o.id === foregroundToast.relatedId || o.orderNumber === foregroundToast.relatedId);
        if (targetOrder) {
          setViewingOrder(targetOrder);
        } else if (role === 'admin') {
          setAdminTab('orders');
        } else if (role === 'sales') {
          setSalesTab('my_orders');
        } else if (role === 'delivery') {
          setDeliveryTab('assigned_orders');
        }
      } else if (role === 'admin') {
        setAdminTab('orders');
      } else if (role === 'sales') {
        setSalesTab('my_orders');
      } else if (role === 'delivery') {
        setDeliveryTab('assigned_orders');
      }
    } else if (foregroundToast.actionType === 'delivery') {
      if (role === 'delivery') setDeliveryTab('assigned_orders');
      else if (role === 'admin') setAdminTab('orders');
    } else if (foregroundToast.actionType === 'payment') {
      if (role === 'sales') setSalesTab('customer_due');
      else if (role === 'delivery') setDeliveryTab('due_collection');
      else if (role === 'admin') setAdminTab('payments');
    } else if (foregroundToast.actionType === 'field_tracking') {
      if (role === 'admin') setAdminTab('field_tracking');
      else if (role === 'sales') setSalesTab('dashboard');
    } else if (foregroundToast.actionType === 'announcement' || foregroundToast.actionType === 'communication') {
      if (role === 'admin') setAdminTab('notifications');
    }

    dismissToast();
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />;
      case 'order':
        return <ShoppingBag className="w-5 h-5 text-emerald-600" />;
      case 'delivery':
        return <Truck className="w-5 h-5 text-teal-600" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-amber-600" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-indigo-600" />;
      case 'field':
        return <MapPin className="w-5 h-5 text-emerald-600" />;
      default:
        return <Bell className="w-5 h-5 text-teal-700" />;
    }
  };

  const isUrgent = foregroundToast.priority === 'urgent';
  const isImportant = foregroundToast.priority === 'important';

  return (
    <div 
      className="fixed top-20 right-3 sm:right-6 z-50 max-w-md w-[calc(100vw-1.5rem)] sm:w-96 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div 
        className={`rounded-2xl p-4 bg-white border shadow-2xl transition-all ${
          isUrgent 
            ? 'border-rose-300 ring-2 ring-rose-400/30 shadow-rose-500/10' 
            : isImportant 
            ? 'border-amber-300 ring-1 ring-amber-400/20' 
            : 'border-teal-200 ring-1 ring-teal-500/10'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Leading Icon Bubble */}
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isUrgent 
                ? 'bg-rose-50 border border-rose-200' 
                : isImportant 
                ? 'bg-amber-50 border border-amber-200' 
                : 'bg-teal-50 border border-teal-200'
            }`}
          >
            {getToastIcon(foregroundToast.type)}
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0 pr-1" onClick={handleAction} role="button" tabIndex={0}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                isUrgent 
                  ? 'bg-rose-100 text-rose-800 border-rose-300' 
                  : isImportant 
                  ? 'bg-amber-100 text-amber-800 border-amber-300' 
                  : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}>
                {foregroundToast.priority}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Just now</span>
            </div>

            <h4 className="text-xs font-bold text-[#102A2A] truncate">
              {foregroundToast.title}
            </h4>

            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
              {foregroundToast.body}
            </p>

            <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#087F7A] hover:underline cursor-pointer">
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Dismiss notification alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
