import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { subscribeToCommunicationConversations } from '../../services/communicationService';
import { ChatDrawer } from './ChatDrawer';
import { AuthUser } from '../../types';

interface HeaderMessageButtonProps {
  staffUsers?: AuthUser[];
}

export const HeaderMessageButton: React.FC<HeaderMessageButtonProps> = ({ staffUsers = [] }) => {
  const { currentUser, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentUserId = currentUser?.uid || (currentUser as any)?.id || '';

  useEffect(() => {
    if (!currentUserId) return;

    const unsub = subscribeToCommunicationConversations(currentUserId, role || 'staff', (conversations) => {
      const totalUnread = conversations.reduce(
        (sum, conv) => sum + (conv.unreadCounts?.[currentUserId] || 0),
        0
      );
      setUnreadCount(totalUnread);
    });

    return () => unsub();
  }, [currentUserId, role]);

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          unreadCount > 0
            ? 'bg-teal-50/80 border-teal-300 text-[#087F7A] hover:bg-teal-100/80 shadow-2xs'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        aria-label={`Staff Messages (${unreadCount} unread)`}
        title={unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Private Messaging'}
      >
        <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold rounded-full bg-[#087F7A] text-white border-2 border-white flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Slide-Over Drawer */}
      <ChatDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        staffUsers={staffUsers}
      />
    </>
  );
};
