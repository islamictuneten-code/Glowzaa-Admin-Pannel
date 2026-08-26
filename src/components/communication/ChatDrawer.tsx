import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  ChevronLeft, 
  ShieldCheck, 
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { AuthUser, CommunicationConversation, CommunicationDevice } from '../../types';
import { 
  subscribeToCommunicationConversations, 
  getOrCreateCommunicationConversation 
} from '../../services/communicationService';
import { subscribeCommunicationDevices } from '../../services/notificationService';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { StaffChatInterface } from './StaffChatInterface';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  staffUsers?: AuthUser[];
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  staffUsers = []
}) => {
  const { currentUser, role } = useAuth();
  const { setAdminTab, setSalesTab, setDeliveryTab } = useApp();

  const [conversations, setConversations] = useState<CommunicationConversation[]>([]);
  const [devices, setDevices] = useState<CommunicationDevice[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<AuthUser | null>(null);
  const [activeConversation, setActiveConversation] = useState<CommunicationConversation | null>(null);

  const currentUserId = currentUser?.uid || (currentUser as any)?.id || '';

  // Subscribe when drawer is open
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const unsubConv = subscribeToCommunicationConversations(currentUserId, role || 'staff', (list) => {
      setConversations(list);
    });

    const unsubDev = subscribeCommunicationDevices((devs) => {
      setDevices(devs);
    });

    return () => {
      unsubConv();
      unsubDev();
    };
  }, [isOpen, currentUserId, role]);

  // Sync conversation reference
  useEffect(() => {
    if (!selectedStaff) {
      setActiveConversation(null);
      return;
    }
    const staffUid = selectedStaff.uid || selectedStaff.id || '';
    const matching = conversations.find(c => c.participantIds.includes(staffUid));
    if (matching) {
      setActiveConversation(matching);
    }
  }, [conversations, selectedStaff]);

  if (!isOpen) return null;

  const handleSelectStaff = async (staff: AuthUser) => {
    setSelectedStaff(staff);
    try {
      const conv = await getOrCreateCommunicationConversation(
        {
          uid: currentUserId,
          name: currentUser?.name || 'Admin',
          role: 'admin'
        },
        {
          uid: staff.uid || staff.id || '',
          name: staff.name,
          role: staff.role
        }
      );
      setActiveConversation(conv);
    } catch (err) {
      console.error('Error selecting staff in drawer:', err);
    }
  };

  const handleOpenFullPage = () => {
    if (role === 'admin') {
      setAdminTab('messages');
    } else if (role === 'sales') {
      setSalesTab('messages');
    } else if (role === 'delivery') {
      setDeliveryTab('messages');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden text-left">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          
          {/* Top Bar */}
          <div className="p-3.5 bg-gradient-to-r from-teal-950 via-[#087F7A] to-teal-900 text-white flex items-center justify-between gap-3 shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <MessageSquare className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">
                  {role === 'admin' ? 'Private Staff Messaging' : 'HQ Admin Direct Chat'}
                </h3>
                <p className="text-[10px] text-teal-200 font-medium">
                  {role === 'admin' ? 'Real-Time Communication' : 'Official Glowzaa Support'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenFullPage}
                className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Expand to Full Page"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-hidden">
            {role === 'admin' ? (
              selectedStaff && currentUser ? (
                <div className="h-full flex flex-col">
                  <ConversationView
                    currentUser={currentUser}
                    staffUser={selectedStaff}
                    conversation={activeConversation}
                    devices={devices}
                    onBackMobile={() => setSelectedStaff(null)}
                  />
                </div>
              ) : (
                <ConversationList
                  currentUserId={currentUserId}
                  currentUserRole="admin"
                  staffUsers={staffUsers}
                  conversations={conversations}
                  selectedStaffId={selectedStaff?.uid || null}
                  devices={devices}
                  onSelectStaff={handleSelectStaff}
                />
              )
            ) : (
              <div className="h-full flex flex-col p-2">
                <StaffChatInterface devices={devices} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
