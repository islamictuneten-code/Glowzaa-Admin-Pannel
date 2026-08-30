import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Check, 
  CheckCheck, 
  ShieldCheck, 
  MessageSquare, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Building2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  CommunicationConversation, 
  CommunicationMessage, 
  CommunicationDevice, 
  AuthUser 
} from '../../types';
import { 
  getOrCreateCommunicationConversation, 
  sendCommunicationMessage, 
  subscribeToCommunicationMessages, 
  subscribeToCommunicationConversations,
  markAllConversationMessagesSeen, 
  setConversationTypingState,
  getUserCandidateIds
} from '../../services/communicationService';
import { UserAvatar } from '../shared/UserAvatar';
import { PresenceBadge } from './PresenceBadge';

interface StaffChatInterfaceProps {
  adminUser?: AuthUser | null;
  devices?: CommunicationDevice[];
}

export const StaffChatInterface: React.FC<StaffChatInterfaceProps> = ({
  adminUser,
  devices = []
}) => {
  const { currentUser } = useAuth();

  const [conversation, setConversation] = useState<CommunicationConversation | null>(null);
  const [allMatchingConvIds, setAllMatchingConvIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = currentUser?.uid || (currentUser as any)?.id || '';
  const adminUid = adminUser?.uid || 'admin_hq';
  const adminName = adminUser?.name || 'Glowzaa HQ Administration';

  // Role-specific Staff Quick Prompts
  const quickTemplates = useMemo(() => {
    if (currentUser?.role === 'sales') {
      return [
        'Confirmed bulk order for retail shop, submitting now.',
        'Customer requested special wholesale discount confirmation.',
        'Collected overdue payment receipt from shop owner.',
        'Visited target retail area, completed 5 shop visits today.',
        'Need urgent stock availability update on top SKU.'
      ];
    } else if (currentUser?.role === 'delivery') {
      return [
        'Arrived at delivery location, meeting shop owner.',
        'Order successfully delivered, full cash collected in hand.',
        'Customer was closed/unavailable, rescheduling delivery.',
        'Returning to central warehouse for cash handover.',
        'Vehicle breakdown / transit delay reported on route.'
      ];
    }
    return [
      'Task updated in system.',
      'Checking with customer now.',
      'Thank you for the update.'
    ];
  }, [currentUser?.role]);

  const userCandidateIds = useMemo(() => {
    if (!currentUser) return [];
    return getUserCandidateIds(currentUser);
  }, [currentUser]);

  // Load or create 1-on-1 conversation with Admin, and subscribe to real-time conversation updates
  useEffect(() => {
    if (!currentUser || !currentUserId) return;

    let isMounted = true;
    const initConv = async () => {
      try {
        setLoading(true);
        const conv = await getOrCreateCommunicationConversation(
          adminUser || {
            uid: adminUid,
            name: adminName,
            role: 'admin'
          },
          currentUser
        );
        if (isMounted) {
          setConversation(conv);
        }
      } catch (err) {
        console.error('Error initializing staff conversation:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initConv();

    // Subscribe to all conversations involving this staff user
    const idsToSubscribe = userCandidateIds.length > 0 ? userCandidateIds : [currentUserId];
    const unsubConvs = subscribeToCommunicationConversations(idsToSubscribe, currentUser?.role || 'staff', (convs) => {
      if (!isMounted) return;
      if (convs && convs.length > 0) {
        // Find all conversations matching any candidate ID
        const matchingConvs = convs.filter(c => c.participantIds.some(id => idsToSubscribe.includes(id)));
        const primaryConv = matchingConvs[0] || convs[0];
        setConversation(primaryConv);
        const matchingIds = Array.from(new Set(matchingConvs.map(c => c.id)));
        setAllMatchingConvIds(matchingIds);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubConvs();
    };
  }, [currentUser, adminUser, adminUid, adminName, currentUserId, userCandidateIds]);

  // Subscribe to live messages across all matching conversation IDs
  useEffect(() => {
    const targetConvIds = allMatchingConvIds.length > 0 ? allMatchingConvIds : (conversation?.id ? [conversation.id] : []);
    if (targetConvIds.length === 0 || !currentUserId) return;

    targetConvIds.forEach(cId => markAllConversationMessagesSeen(cId, currentUserId));

    const unsub = subscribeToCommunicationMessages(targetConvIds, currentUserId, (msgs) => {
      setMessages(msgs);
      targetConvIds.forEach(cId => markAllConversationMessagesSeen(cId, currentUserId));
    });

    return () => {
      unsub();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (conversation?.id) setConversationTypingState(conversation.id, currentUserId, false);
    };
  }, [allMatchingConvIds, conversation?.id, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversation?.typing]);

  // Typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (!conversation?.id) return;

    setConversationTypingState(conversation.id, currentUserId, true, currentUser?.name);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setConversationTypingState(conversation.id, currentUserId, false);
    }, 3000);
  };

  // Target receiver UID (actual admin or fallback)
  const actualReceiverUid = useMemo(() => {
    if (!conversation) return adminUid;
    const otherParticipant = conversation.participantIds.find(id => id !== currentUserId);
    return otherParticipant || adminUid;
  }, [conversation, currentUserId, adminUid]);

  // Receiver user object for VoiceCallButton
  const adminReceiver: AuthUser = useMemo(() => {
    return adminUser || {
      uid: actualReceiverUid || 'admin_hq',
      id: actualReceiverUid || 'admin_hq',
      name: adminName || 'Admin HQ',
      email: 'admin@glowzaa.com',
      role: 'admin',
      phone: '01700000000'
    };
  }, [adminUser, actualReceiverUid, adminName]);

  // Send message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isSending || !conversation?.id || !currentUser) return;

    setIsSending(true);
    try {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setConversationTypingState(conversation.id, currentUserId, false);

      await sendCommunicationMessage({
        conversationId: conversation.id,
        sender: {
          uid: currentUserId,
          name: currentUser.name || 'Staff',
          role: currentUser.role || 'sales'
        },
        receiver: {
          uid: actualReceiverUid,
          name: adminName,
          role: 'admin'
        },
        text: textToSend
      });

      if (!customText) {
        setInputText('');
      }
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending staff message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const isAdminTyping = conversation?.typing?.[actualReceiverUid]?.isTyping;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[calc(100dvh-130px)] sm:h-[calc(100vh-140px)] min-h-[380px] max-w-5xl mx-auto text-left mb-16 sm:mb-0">
      
      {/* Top Header - Auto Responsive for Mobile */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-teal-950 via-[#087F7A] to-teal-900 text-white flex items-center justify-between gap-2 shadow-md shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-xs sm:text-base tracking-tight truncate">
                HQ Administration
              </h2>
              <span className="text-[8px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wide shrink-0 hidden xs:inline-block">
                Support
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-teal-100/80 flex items-center gap-1 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">Glowzaa B2B HQ</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
              showTemplates
                ? 'bg-white text-[#087F7A] shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            title="Quick response templates"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Templates</span>
          </button>
        </div>
      </div>

      {/* Quick Templates Drawer */}
      {showTemplates && (
        <div className="bg-slate-900 text-white p-3.5 border-b border-slate-800 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              One-Tap Field Updates ({currentUser?.role?.toUpperCase()})
            </span>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {quickTemplates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputText(tpl);
                  setShowTemplates(false);
                  inputRef.current?.focus();
                }}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-xl border border-slate-700 transition-all text-left cursor-pointer"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-[#F8FAFB]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#087F7A]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-14 h-14 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 shadow-2xs">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-base text-[#102A2A]">Direct Line to Admin HQ</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
              Ask questions about orders, payments, dispatch schedules, or send live updates directly to HQ.
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
                {!isMine && (
                  <span className="text-[10px] text-slate-400 font-bold mb-1 pl-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#087F7A]" />
                    {msg.senderName} (Admin HQ)
                  </span>
                )}

                <div className="relative max-w-[85%] sm:max-w-md">
                  <div
                    className={`p-3.5 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs break-words ${
                      isMine
                        ? 'bg-gradient-to-r from-[#087F7A] to-[#0a938e] text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-[#102A2A] rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
                        isMine ? 'text-teal-100/90' : 'text-slate-400'
                      }`}
                    >
                      <span>{timeFormatted}</span>

                      {isMine && (
                        <span>
                          {msg.status === 'seen' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-200" title="Seen by HQ" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-teal-200" title="Delivered" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-teal-300/80" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyMessage(msg.id, msg.text)}
                    className={`absolute top-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-xs cursor-pointer ${
                      isMine ? '-left-8' : '-right-8'
                    }`}
                    title="Copy text"
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

        {/* Admin Typing Indicator */}
        {isAdminTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-2 rounded-2xl rounded-tl-xs border border-slate-200 w-fit shadow-2xs animate-in fade-in">
            <span className="font-semibold text-[#087F7A]">HQ Admin</span> is typing
            <div className="flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F7A] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F7A] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F7A] animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Composer */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-[#087F7A] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#087F7A] transition-all shadow-2xs">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or update to HQ Admin... (Press Enter to send)"
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
          {isSending && <span className="text-[#087F7A] font-bold">Transmitting message...</span>}
        </div>
      </div>

    </div>
  );
};
