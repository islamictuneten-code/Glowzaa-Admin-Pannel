import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Check, 
  CheckCheck, 
  Phone, 
  Sparkles, 
  ChevronLeft, 
  Clock, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  Truck,
  MessageSquare,
  Paperclip,
  Smile,
  AlertCircle
} from 'lucide-react';
import { 
  AuthUser, 
  CommunicationConversation, 
  CommunicationMessage, 
  CommunicationDevice 
} from '../../types';
import { 
  sendCommunicationMessage, 
  subscribeToCommunicationMessages, 
  markAllConversationMessagesSeen, 
  setConversationTypingState 
} from '../../services/communicationService';
import { UserAvatar } from '../shared/UserAvatar';
import { PresenceBadge, getStaffOnlineStatus } from './PresenceBadge';
import { useNotification } from '../../context/NotificationContext';
import { VoiceCallButton } from './VoiceCallButton';

interface ConversationViewProps {
  currentUser: AuthUser;
  staffUser: AuthUser;
  conversation: CommunicationConversation | null;
  devices: CommunicationDevice[];
  onBackMobile?: () => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  currentUser,
  staffUser,
  conversation,
  devices,
  onBackMobile
}) => {
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playChime } = useNotification();

  const conversationId = conversation?.id || '';
  const currentUserId = currentUser.uid || (currentUser as any).id || '';
  const staffUserId = staffUser.uid || staffUser.id || '';

  // Quick Action Templates based on Staff Role
  const templates = useMemo(() => {
    if (staffUser.role === 'sales') {
      return [
        'Please follow up with customer regarding pending due amount.',
        'Order confirmed! Packed & dispatched from warehouse.',
        'Please verify retail shop stock before placing bulk quantity order.',
        'Great job on closing today’s sales targets!',
        'Kindly submit your daily field visit notes by 6:00 PM.'
      ];
    } else if (staffUser.role === 'delivery') {
      return [
        'New emergency delivery batch assigned to your route.',
        'Please collect exact cash on delivery and issue receipt.',
        'Confirm handover with HQ cashier once returned to warehouse.',
        'Customer requested delivery between 2:00 PM - 4:00 PM.',
        'Please update order status to delivered after cash receipt.'
      ];
    }
    return [
      'Hello, how can I assist with your workflow today?',
      'Please check your assigned task in the system.',
      'Thank you for the quick update.'
    ];
  }, [staffUser.role]);

  // Subscribe to real-time messages for active conversation
  useEffect(() => {
    if (!conversationId) return;

    // Mark messages as seen when opening conversation
    markAllConversationMessagesSeen(conversationId, currentUserId);

    const unsub = subscribeToCommunicationMessages(conversationId, currentUserId, (msgs) => {
      setMessages(msgs);
      // Mark seen immediately if we are viewing
      markAllConversationMessagesSeen(conversationId, currentUserId);
    });

    return () => {
      unsub();
      // Clear typing on unmount
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setConversationTypingState(conversationId, currentUserId, false);
    };
  }, [conversationId, currentUserId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversation?.typing]);

  // Handle typing presence with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (!conversationId) return;

    // Send typing state
    setConversationTypingState(conversationId, currentUserId, true, currentUser.name);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setConversationTypingState(conversationId, currentUserId, false);
    }, 3000);
  };

  // Send message handler
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isSending || !conversationId) return;

    setIsSending(true);
    try {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setConversationTypingState(conversationId, currentUserId, false);

      await sendCommunicationMessage({
        conversationId,
        sender: {
          uid: currentUserId,
          name: currentUser.name || 'User',
          role: currentUser.role || 'staff'
        },
        receiver: {
          uid: staffUserId,
          name: staffUser.name || 'Staff Member',
          role: staffUser.role || 'staff'
        },
        text: textToSend
      });

      if (!customText) {
        setInputText('');
      }
      playChime('normal').catch(() => {});
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard Enter handler (Enter sends, Shift+Enter new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy message text helper
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const isStaffTyping = conversation?.typing?.[staffUserId]?.isTyping;
  const staffTypingName = conversation?.typing?.[staffUserId]?.userName || staffUser.name;
  const { status: onlineStatus } = getStaffOnlineStatus(staffUserId, devices);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFB] text-left">
      
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-2xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          
          {/* Back Button for mobile */}
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Back to staff list"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Staff Avatar with live status */}
          <div className="relative shrink-0">
            <UserAvatar
              src={staffUser.photoURL}
              name={staffUser.name || 'Staff'}
              fallbackInitials={staffUser.avatar}
              size="md"
              role={staffUser.role}
            />
            <div className="absolute -bottom-0.5 -right-0.5 bg-white p-0.5 rounded-full">
              <PresenceBadge devices={devices} userId={staffUserId} showText={false} size="sm" />
            </div>
          </div>

          {/* Staff Name & Status */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-[#102A2A] truncate">
                {staffUser.name}
              </h2>
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                  staffUser.role === 'sales'
                    ? 'bg-teal-50 text-[#087F7A] border-teal-200'
                    : staffUser.role === 'delivery'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {staffUser.role}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <PresenceBadge devices={devices} userId={staffUserId} showText={true} size="sm" />
              {(staffUser.phone) && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
                  • {staffUser.phone}
                </span>
              )}
              {(staffUser.territory || staffUser.assignedArea) && (
                <span className="text-[11px] text-slate-400 font-medium truncate hidden md:inline-block">
                  • 📍 {staffUser.territory || staffUser.assignedArea}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <VoiceCallButton receiver={staffUser} conversationId={conversationId || undefined} className="border border-slate-200" />
          
          {staffUser.phone && (
            <a
              href={`tel:${staffUser.phone}`}
              className="p-2 text-slate-600 hover:text-[#087F7A] hover:bg-teal-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              title={`Call ${staffUser.name} (${staffUser.phone}) via mobile network`}
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`p-2 rounded-xl transition-colors border text-xs font-bold flex items-center gap-1 cursor-pointer ${
              showTemplates
                ? 'bg-[#087F7A] text-white border-[#087F7A] shadow-2xs'
                : 'text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Quick response templates"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </button>
        </div>
      </div>

      {/* Quick Templates Drawer / Shelf */}
      {showTemplates && (
        <div className="bg-teal-900/95 text-white p-3 border-b border-teal-800 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              Quick Dispatch Templates for {staffUser.role.toUpperCase()}
            </span>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-xs text-teal-300 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputText(tpl);
                  setShowTemplates(false);
                  inputRef.current?.focus();
                }}
                className="text-xs bg-teal-800/90 hover:bg-teal-700 text-teal-50 px-3 py-1.5 rounded-xl border border-teal-600/50 transition-all text-left cursor-pointer"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#087F7A] mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-[#102A2A]">Direct Conversation Ready</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Send your first message to {staffUser.name}. All messages and delivery notices are securely logged and delivered in real-time.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUserId;
            const timeFormatted = new Date(msg.sentAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Name if not mine */}
                {!isMine && (
                  <span className="text-[10px] text-slate-400 font-bold mb-1 pl-1">
                    {msg.senderName} • {msg.senderRole.toUpperCase()}
                  </span>
                )}

                {/* Message Bubble */}
                <div className="relative max-w-[85%] sm:max-w-md">
                  <div
                    className={`p-3 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs break-words ${
                      isMine
                        ? 'bg-gradient-to-r from-[#087F7A] to-[#0a938e] text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-[#102A2A] rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Timestamp & Status checks */}
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                        isMine ? 'text-teal-100/90' : 'text-slate-400'
                      }`}
                    >
                      <span>{timeFormatted}</span>

                      {isMine && (
                        <span>
                          {msg.status === 'seen' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-200" title="Seen by staff" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-teal-200" title="Delivered" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-teal-300/80" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Copy Button on Hover */}
                  <button
                    onClick={() => handleCopyMessage(msg.id, msg.text)}
                    className={`absolute top-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-xs cursor-pointer ${
                      isMine ? '-left-8' : '-right-8'
                    }`}
                    title="Copy message"
                  >
                    {copiedMessageId === msg.id ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Real-time Typing Bubble */}
        {isStaffTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-2 rounded-2xl rounded-tl-xs border border-slate-200 w-fit shadow-2xs animate-in fade-in">
            <span className="font-semibold text-[#087F7A]">{staffTypingName}</span> is typing
            <div className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F7A] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F7A] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F7A] animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-[#087F7A] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#087F7A] transition-all shadow-2xs">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Type a message to ${staffUser.name}... (Press Enter to send)`}
            rows={1}
            className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm text-[#102A2A] placeholder-slate-400 focus:outline-none max-h-32 p-1.5 leading-relaxed"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
          <span>Shift + Enter for new line • Enter to send</span>
          {isSending && <span className="text-[#087F7A] font-bold">Sending message...</span>}
        </div>
      </div>

    </div>
  );
};
