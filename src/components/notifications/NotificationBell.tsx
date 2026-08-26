import React, { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { NotificationCenter } from './NotificationCenter';

export const NotificationBell: React.FC = () => {
  const { unreadCount, notifications } = useNotification();
  const [isOpen, setIsOpen] = useState(false);

  const hasUrgent = notifications.some(n => !n.isRead && (n.priority === 'urgent' || n.priority === 'important'));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          unreadCount > 0 
            ? 'bg-teal-50/80 border-teal-200 text-[#087F7A] hover:bg-teal-100/80 shadow-2xs' 
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        aria-label={`Notifications (${unreadCount} unread)`}
        title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
      >
        {hasUrgent ? (
          <BellRing className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-600 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        )}

        {unreadCount > 0 && (
          <span 
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold rounded-full flex items-center justify-center text-white border-2 border-white shadow-xs ${
              hasUrgent ? 'bg-rose-600' : 'bg-[#087F7A]'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over Notification Center */}
      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
