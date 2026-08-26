import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  History, 
  Smartphone, 
  Settings, 
  Volume2, 
  AlertTriangle, 
  Users, 
  CheckCircle2, 
  Layers, 
  Sparkles,
  Radio,
  BellRing,
  MessageSquare,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { CommunicationNotification, CommunicationDevice, AuthUser } from '../../types';
import { 
  subscribeCommunicationNotifications, 
  subscribeCommunicationDevices 
} from '../../services/notificationService';
import { AdminNotificationComposer } from './AdminNotificationComposer';
import { AdminNotificationHistory } from './AdminNotificationHistory';
import { AdminDeviceManagement } from './AdminDeviceManagement';
import { AdminMessagingCenter } from '../communication/AdminMessagingCenter';
import { AdminGroupCallCreator } from './AdminGroupCallCreator';
import { AdminAnnouncementSender } from './AdminAnnouncementSender';
import { AdminCallManagement } from './AdminCallManagement';
import { AdminCommunicationSettings } from './AdminCommunicationSettings';

interface AdminCommunicationCenterProps {
  staffUsers: AuthUser[];
  defaultTab?: 'messages' | 'dashboard' | 'group_calls' | 'announcements' | 'composer' | 'history' | 'devices' | 'settings';
}

export const AdminCommunicationCenter: React.FC<AdminCommunicationCenterProps> = ({ 
  staffUsers,
  defaultTab = 'messages'
}) => {
  const { currentUser } = useAuth();
  const { testChimeAndAlert, preferences, updatePreferences } = useNotification();

  const [activeTab, setActiveTab] = useState<'messages' | 'dashboard' | 'group_calls' | 'announcements' | 'composer' | 'history' | 'devices' | 'settings'>(defaultTab);
  const [notifications, setNotifications] = useState<CommunicationNotification[]>([]);
  const [devices, setDevices] = useState<CommunicationDevice[]>([]);
  const [testTone, setTestTone] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [testActive, setTestActive] = useState(false);

  // Subscribe to live data for accurate metrics
  useEffect(() => {
    if (!currentUser) return;
    const unsubNotifs = subscribeCommunicationNotifications(currentUser, (list) => {
      setNotifications(list);
    });
    const unsubDevices = subscribeCommunicationDevices((devs) => {
      setDevices(devs);
    });

    return () => {
      unsubNotifs();
      unsubDevices();
    };
  }, [currentUser]);

  // Real KPIs calculations
  const totalSent = notifications.length;
  const activeDevicesCount = devices.filter(d => d.isActive).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent').length;
  const orderDirectivesCount = notifications.filter(n => n.type === 'order' || n.type === 'delivery').length;

  const handleTestSound = async (priority: 'normal' | 'important' | 'urgent') => {
    setTestTone(priority);
    setTestActive(true);
    await testChimeAndAlert(priority);
    setTimeout(() => setTestActive(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-gradient-to-r from-teal-900 via-[#087F7A] to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden text-left">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider bg-teal-800/80 text-teal-200 px-3 py-1 rounded-full border border-teal-600/60">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Live Communication Center
              </span>
              <span className="text-xs text-teal-100 font-medium">Step 15 • Phase 1 Push Foundation</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
              Staff Communication & Push Alerts
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-2xl leading-relaxed">
              Broadcast announcements, dispatch instant order and delivery tasks, trigger Web Audio chimes, and monitor active staff devices in real-time.
            </p>
          </div>

          {/* Quick Sound Chime Tester */}
          <div className="flex items-center gap-2 bg-teal-950/40 p-2 rounded-2xl border border-teal-700/50 backdrop-blur-xs shrink-0">
            <span className="text-[11px] font-bold text-teal-200 pl-2">Test Chimes:</span>
            <button
              onClick={() => handleTestSound('normal')}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              Normal
            </button>
            <button
              onClick={() => handleTestSound('important')}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 border border-amber-500/40 transition-colors cursor-pointer"
            >
              Important
            </button>
            <button
              onClick={() => handleTestSound('urgent')}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 border border-rose-500/40 transition-colors cursor-pointer"
            >
              Urgent ⚡
            </button>
          </div>
        </div>
      </div>

      {/* 4 Real Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Dispatched</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#087F7A] flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A2A]">{totalSent}</div>
          <p className="text-[11px] text-slate-400 mt-1">Notifications in audit history</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Staff Devices</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A2A]">{activeDevicesCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Subscribed for FCM web push</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Urgent Broadcasts</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A2A]">{urgentCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">High-priority siren alerts</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order / Dispatch Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#102A2A]">{orderDirectivesCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Direct interactive tasks</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'messages'
              ? 'bg-[#087F7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Private Messaging (Chat)</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-[#087F7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Call Dashboard & Queue</span>
        </button>

        <button
          onClick={() => setActiveTab('group_calls')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'group_calls'
              ? 'bg-[#087F7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Group Calls & Broadcast</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'announcements'
              ? 'bg-[#087F7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Text Announcements</span>
        </button>

        <button
          onClick={() => setActiveTab('composer')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'composer'
              ? 'bg-[#087F7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Compose Push Broadcast</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-[#087F7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Notification History ({notifications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'devices'
              ? 'bg-[#087F7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Registered Staff Devices ({devices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-[#087F7A] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div>
        {activeTab === 'messages' && (
          <AdminMessagingCenter staffUsers={staffUsers} />
        )}

        {activeTab === 'dashboard' && (
          <AdminCallManagement />
        )}

        {activeTab === 'group_calls' && (
          <AdminGroupCallCreator staffUsers={staffUsers} />
        )}

        {activeTab === 'announcements' && (
          <AdminAnnouncementSender staffUsers={staffUsers} />
        )}

        {activeTab === 'composer' && (
          <AdminNotificationComposer staffUsers={staffUsers} onSuccess={() => setActiveTab('history')} />
        )}

        {activeTab === 'history' && (
          <AdminNotificationHistory 
            notifications={notifications} 
            onSelectTemplate={(notif) => {
              setActiveTab('composer');
            }} 
          />
        )}

        {activeTab === 'devices' && (
          <AdminDeviceManagement />
        )}

        {activeTab === 'settings' && (
          <AdminCommunicationSettings />
        )}
      </div>

    </div>
  );
};
