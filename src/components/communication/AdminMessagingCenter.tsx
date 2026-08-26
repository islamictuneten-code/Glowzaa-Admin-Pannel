import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Sparkles, 
  Send, 
  TrendingUp, 
  Truck, 
  ShieldCheck, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthUser, CommunicationConversation, CommunicationDevice } from '../../types';
import { 
  subscribeToCommunicationConversations, 
  getOrCreateCommunicationConversation, 
  getUserCandidateIds 
} from '../../services/communicationService';
import { subscribeCommunicationDevices } from '../../services/notificationService';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';

interface AdminMessagingCenterProps {
  staffUsers: AuthUser[];
}

export const AdminMessagingCenter: React.FC<AdminMessagingCenterProps> = ({ staffUsers }) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<CommunicationConversation[]>([]);
  const [devices, setDevices] = useState<CommunicationDevice[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<AuthUser | null>(null);
  const [activeConversation, setActiveConversation] = useState<CommunicationConversation | null>(null);
  const [loading, setLoading] = useState(false);

  const currentUserId = currentUser?.uid || (currentUser as any)?.id || 'admin';

  // Real-time subscription to conversations
  useEffect(() => {
    if (!currentUserId) return;
    const unsubConv = subscribeToCommunicationConversations(currentUserId, 'admin', (list) => {
      setConversations(list);
    });

    const unsubDevices = subscribeCommunicationDevices((devList) => {
      setDevices(devList);
    });

    return () => {
      unsubConv();
      unsubDevices();
    };
  }, [currentUserId]);

  // Keep active conversation reference in sync
  useEffect(() => {
    if (!selectedStaff) {
      setActiveConversation(null);
      return;
    }

    const candidateIds = getUserCandidateIds(selectedStaff);
    const matching = conversations.find(c => c.participantIds.some(id => candidateIds.includes(id)));
    if (matching) {
      setActiveConversation(matching);
    }
  }, [conversations, selectedStaff]);

  // Handler to select staff and load/create conversation
  const handleSelectStaff = async (staff: AuthUser) => {
    setSelectedStaff(staff);
    setLoading(true);

    try {
      const conv = await getOrCreateCommunicationConversation(
        currentUser || {
          uid: currentUserId,
          name: currentUser?.name || 'Admin HQ',
          role: 'admin'
        },
        staff
      );
      setActiveConversation(conv);
    } catch (err) {
      console.error('Error selecting staff conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[550px]">
      
      {/* 2-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
        
        {/* Left Panel: Conversation & Staff List */}
        <div
          className={`lg:col-span-5 xl:col-span-4 h-full ${
            selectedStaff ? 'hidden lg:block' : 'block'
          }`}
        >
          <ConversationList
            currentUserId={currentUserId}
            currentUserRole="admin"
            staffUsers={staffUsers}
            conversations={conversations}
            selectedStaffId={selectedStaff?.uid || selectedStaff?.id || null}
            devices={devices}
            onSelectStaff={handleSelectStaff}
          />
        </div>

        {/* Right Panel: Conversation View or Empty State */}
        <div
          className={`lg:col-span-7 xl:col-span-8 h-full bg-[#F8FAFB] ${
            selectedStaff ? 'block' : 'hidden lg:flex lg:flex-col lg:items-center lg:justify-center'
          }`}
        >
          {selectedStaff && currentUser ? (
            <ConversationView
              currentUser={currentUser}
              staffUser={selectedStaff}
              conversation={activeConversation}
              devices={devices}
              onBackMobile={() => setSelectedStaff(null)}
            />
          ) : (
            <div className="p-8 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] text-white flex items-center justify-center mx-auto shadow-xl mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#102A2A]">
                Select a Staff Member
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Choose a Sales Representative or Delivery Staff member from the list to start a real-time private conversation, send instant instructions, or view messages.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#087F7A]" />
                  Sales Reps Direct
                </span>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  Delivery Drivers Direct
                </span>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  End-to-End Logged
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
