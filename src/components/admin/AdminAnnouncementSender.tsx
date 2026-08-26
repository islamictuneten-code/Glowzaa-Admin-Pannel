import React, { useState } from 'react';
import { Megaphone, Send, Users, ShieldAlert, Zap } from 'lucide-react';
import { AnnouncementAudience, AnnouncementPriority, AuthUser } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sendCommunicationNotification } from '../../services/notificationService';

interface AdminAnnouncementSenderProps {
  staffUsers: AuthUser[];
}

export const AdminAnnouncementSender: React.FC<AdminAnnouncementSenderProps> = ({ staffUsers }) => {
  const { currentUser } = useAuth();
  const { addToast } = useApp();
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [audience, setAudience] = useState<AnnouncementAudience>('all_staff');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!currentUser || !message.trim()) return;

    setIsSending(true);
    try {
      let targetUsers: AuthUser[] = [];
      if (audience === 'all_staff') targetUsers = staffUsers;
      else if (audience === 'all_sellers') targetUsers = staffUsers.filter(u => u.role === 'sales');
      else if (audience === 'all_delivery') targetUsers = staffUsers.filter(u => u.role === 'delivery');
      
      const targetUserIds = targetUsers.map(u => u.uid);
      
      if (targetUserIds.length === 0) {
        addToast({ title: 'No recipients', message: 'There are no users in the selected audience.', type: 'warning' });
        setIsSending(false);
        return;
      }

      const docRef = await addDoc(collection(db, 'communication_announcements'), {
        senderId: currentUser.uid,
        senderName: currentUser.name,
        message: message.trim(),
        priority,
        audience,
        recipientCount: targetUserIds.length,
        deliveredCount: 0,
        readCount: 0,
        sentAt: new Date().toISOString()
      });

      // Send push notifications
      const promises = targetUsers.map(user => 
        sendCommunicationNotification(currentUser, {
          recipientUserId: user.uid,
          recipientRole: user.role as any,
          recipientUserName: user.name,
          type: 'announcement' as any,
          title: `Announcement: ${priority.toUpperCase()}`,
          body: message.trim(),
          priority: priority === 'urgent' ? 'urgent' : 'high' as any,
          actionType: 'view_announcement' as any,
          actionTarget: docRef.id
        }).catch(err => console.warn('Failed to send announcement push to', user.uid, err))
      );

      await Promise.all(promises);

      addToast({ title: 'Announcement Sent', message: `Successfully sent to ${targetUserIds.length} staff members.`, type: 'success' });
      setMessage('');
      
    } catch (err: any) {
      addToast({ title: 'Error', message: err.message || 'Failed to send announcement', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Send Announcement</h2>
          <p className="text-sm text-gray-500">Broadcast important text messages to staff groups.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setAudience('all_staff')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                audience === 'all_staff' 
                  ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">All Staff</span>
            </button>
            <button
              onClick={() => setAudience('all_sellers')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                audience === 'all_sellers' 
                  ? 'border-[#087F7A] bg-teal-50 text-[#087F7A] ring-1 ring-[#087F7A]' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">All Sellers</span>
            </button>
            <button
              onClick={() => setAudience('all_delivery')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                audience === 'all_delivery' 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">All Delivery</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
          <div className="flex gap-4 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            <button
              onClick={() => setPriority('normal')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                priority === 'normal' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setPriority('important')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                priority === 'important' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ShieldAlert className="w-4 h-4" /> Important
            </button>
            <button
              onClick={() => setPriority('urgent')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                priority === 'urgent' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Zap className="w-4 h-4" /> Urgent
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none text-gray-800 placeholder-gray-400"
            placeholder="Type your announcement message here..."
          ></textarea>
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          Send Announcement
        </button>
      </div>
    </div>
  );
};
