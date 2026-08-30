import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Users, 
  MessageSquare, 
  CheckCheck, 
  TrendingUp, 
  Truck, 
  ShieldCheck, 
  Circle,
  Filter,
  Sparkles,
  Phone
} from 'lucide-react';
import { AuthUser, CommunicationConversation, CommunicationDevice } from '../../types';
import { UserAvatar } from '../shared/UserAvatar';
import { PresenceBadge, getStaffOnlineStatus } from './PresenceBadge';

interface ConversationListProps {
  currentUserId: string;
  currentUserRole: string;
  staffUsers: AuthUser[];
  conversations: CommunicationConversation[];
  selectedStaffId: string | null;
  devices: CommunicationDevice[];
  onSelectStaff: (staffUser: AuthUser) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  currentUserId,
  currentUserRole,
  staffUsers,
  conversations,
  selectedStaffId,
  devices,
  onSelectStaff
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'sales' | 'delivery' | 'unread' | 'online'>('all');

  // Map conversation by staff UID
  const conversationByStaffId = useMemo(() => {
    const map = new Map<string, CommunicationConversation>();
    conversations.forEach((conv) => {
      // Find the other participant who is not current user
      const otherId = conv.participantIds.find((id) => id !== currentUserId) || conv.participantIds[0];
      if (otherId) {
        map.set(otherId, conv);
      }
    });
    return map;
  }, [conversations, currentUserId]);

  // Filter staff based on search and selected filter
  const filteredStaff = useMemo(() => {
    return staffUsers.filter((staff) => {
      // Exclude current user from their own list
      if (staff.uid === currentUserId || staff.id === currentUserId) return false;

      // Only show Sales and Delivery staff for Admin; or Admin for staff
      if (currentUserRole === 'admin') {
        if (staff.role !== 'sales' && staff.role !== 'delivery') return false;
      }

      // Search match
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const nameMatch = (staff.name || '').toLowerCase().includes(q);
        const loginMatch = (staff.loginId || '').toLowerCase().includes(q);
        const phoneMatch = (staff.phone || '').toLowerCase().includes(q);
        const roleMatch = (staff.role || '').toLowerCase().includes(q);
        const territoryMatch = (staff.territory || staff.assignedArea || '').toLowerCase().includes(q);
        if (!nameMatch && !loginMatch && !phoneMatch && !roleMatch && !territoryMatch) {
          return false;
        }
      }

      const conv = conversationByStaffId.get(staff.uid || staff.id || '');
      const unread = conv?.unreadCounts?.[currentUserId] || 0;
      const { status } = getStaffOnlineStatus(staff.uid || staff.id || '', devices);

      if (roleFilter === 'sales') return staff.role === 'sales';
      if (roleFilter === 'delivery') return staff.role === 'delivery';
      if (roleFilter === 'unread') return unread > 0;
      if (roleFilter === 'online') return status === 'online';

      return true;
    }).sort((a, b) => {
      const aId = a.uid || a.id || '';
      const bId = b.uid || b.id || '';
      const aConv = conversationByStaffId.get(aId);
      const bConv = conversationByStaffId.get(bId);

      const aUnread = aConv?.unreadCounts?.[currentUserId] || 0;
      const bUnread = bConv?.unreadCounts?.[currentUserId] || 0;

      // Prioritize unread conversations
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;

      // Next sort by latest activity
      const aTime = aConv?.lastMessageAt ? new Date(aConv.lastMessageAt).getTime() : 0;
      const bTime = bConv?.lastMessageAt ? new Date(bConv.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [staffUsers, currentUserId, currentUserRole, searchQuery, roleFilter, conversationByStaffId, devices]);

  // Format relative time helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHrs < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unreadCounts?.[currentUserId] || 0), 0);
  }, [conversations, currentUserId]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 text-left">
      
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] flex items-center justify-center text-white shadow-2xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#102A2A] tracking-tight">
                Staff Conversations
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">
                {currentUserRole === 'admin' ? 'Private Real-Time Messaging' : 'HQ Admin Direct Chat'}
              </p>
            </div>
          </div>

          {totalUnreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#087F7A] text-white rounded-full shadow-2xs animate-pulse">
              {totalUnreadCount} unread
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-[#102A2A] placeholder-slate-400 focus:outline-none focus:border-[#087F7A] focus:ring-1 focus:ring-[#087F7A] transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              roleFilter === 'all'
                ? 'bg-[#087F7A] text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Staff ({staffUsers.length})
          </button>

          <button
            onClick={() => setRoleFilter('sales')}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              roleFilter === 'sales'
                ? 'bg-[#087F7A] text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Sellers</span>
          </button>

          <button
            onClick={() => setRoleFilter('delivery')}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              roleFilter === 'delivery'
                ? 'bg-[#087F7A] text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3 h-3" />
            <span>Delivery</span>
          </button>

          <button
            onClick={() => setRoleFilter('unread')}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              roleFilter === 'unread'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Unread
          </button>

          <button
            onClick={() => setRoleFilter('online')}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              roleFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Online</span>
          </button>
        </div>
      </div>

      {/* Staff Conversation Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredStaff.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No staff members found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery ? 'Try matching another name or keyword' : 'Select a different filter above'}
            </p>
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const staffUid = staff.uid || staff.id || '';
            const isSelected = selectedStaffId === staffUid;
            const conv = conversationByStaffId.get(staffUid);
            const unreadCount = conv?.unreadCounts?.[currentUserId] || 0;
            const isTyping = conv?.typing?.[staffUid]?.isTyping;
            const { status } = getStaffOnlineStatus(staffUid, devices);

            return (
              <div
                key={staffUid}
                role="button"
                tabIndex={0}
                onClick={() => onSelectStaff(staff)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectStaff(staff);
                  }
                }}
                className={`w-full p-3 sm:p-3.5 flex items-start gap-3 transition-all text-left cursor-pointer relative ${
                  isSelected
                    ? 'bg-teal-50/80 border-l-4 border-[#087F7A]'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Avatar with live status dot */}
                <div className="relative shrink-0 mt-0.5">
                  <UserAvatar
                    src={staff.photoURL}
                    name={staff.name || 'Staff'}
                    fallbackInitials={staff.avatar}
                    size="md"
                    role={staff.role}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 bg-white p-0.5 rounded-full">
                    <PresenceBadge devices={devices} userId={staffUid} showText={false} size="sm" />
                  </div>
                </div>

                {/* Info & Message Snippet */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-extrabold text-xs sm:text-sm text-[#102A2A] truncate">
                        {staff.name}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${
                          staff.role === 'sales'
                            ? 'bg-teal-50 text-[#087F7A] border-teal-200'
                            : staff.role === 'delivery'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {staff.role}
                      </span>
                    </div>

                    {/* Last Message Time */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv?.lastMessageAt && (
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Territory / Area Tag if present */}
                  {(staff.territory || staff.assignedArea) && (
                    <p className="text-[10px] text-slate-400 font-medium truncate mb-1">
                      📍 {staff.territory || staff.assignedArea}
                    </p>
                  )}

                  {/* Message Preview or Typing State */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs truncate text-slate-500 flex-1">
                      {isTyping ? (
                        <span className="text-[#087F7A] font-bold italic animate-pulse">
                          Typing a message...
                        </span>
                      ) : conv?.lastMessage ? (
                        <span>
                          {conv.lastMessageSenderId === currentUserId && (
                            <span className="text-slate-400 mr-1 font-medium">You:</span>
                          )}
                          {conv.lastMessage}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">No messages yet</span>
                      )}
                    </p>

                    {/* Unread Counter Badge */}
                    {unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold rounded-full bg-[#087F7A] text-white flex items-center justify-center shadow-2xs shrink-0">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
