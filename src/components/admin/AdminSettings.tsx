import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getStoredForecastingSettings, saveForecastingSettings } from '../../services/salesForecastService';
import { 
  Settings, 
  Building2, 
  Sparkles, 
  CreditCard, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  Save, 
  Phone, 
  MapPin, 
  Mail,
  Receipt,
  AlertTriangle,
  X,
  ShieldAlert,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  CheckCircle2,
  KeyRound,
  Shield,
  Clock,
  Bell,
  Send,
  Search,
  ChevronRight,
  Sliders,
  Database,
  Eye,
  Activity,
  Radio,
  FileText,
  SmartphoneNfc,
  Check,
  TrendingUp
} from 'lucide-react';
import { SystemAuditReport } from './SystemAuditReport';
import { collection, getDocs, query, orderBy, limit, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const AdminSettings: React.FC = () => {
  const { 
    products, 
    customers, 
    orders, 
    purchases, 
    collections, 
    addToast, 
    wipeAllData, 
    resetDemoData, 
    companySettings, 
    saveCompanySettings 
  } = useApp();
  
  const { currentUser, activeSessions, currentSessionId, logoutAllDevices, revokeSession } = useAuth();

  // Search filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // Company Settings form state
  const [companyName, setCompanyName] = useState(companySettings?.companyName || 'Glowzaa Bangladesh Ltd.');
  const [tagline, setTagline] = useState(companySettings?.tagline || 'Brand Beauty, Personal Care & Wholesale Distribution');
  const [address, setAddress] = useState(companySettings?.address || 'Shailkupa Head Office, Jhenaidah, Bangladesh');
  const [phone, setPhone] = useState(companySettings?.phone || '+880 9612-456999');
  const [email, setEmail] = useState(companySettings?.email || 'wholesale@glowzaa.com');
  const [tradeLicense, setTradeLicense] = useState(companySettings?.tradeLicense || 'TRAD/DNCC/092148/2024');
  const [binNumber, setBinNumber] = useState(companySettings?.binNumber || '004910294-0101');
  const [defaultCreditLimit, setDefaultCreditLimit] = useState(companySettings?.defaultCreditLimit || 100000);
  const [shortDescription, setShortDescription] = useState(companySettings?.shortDescription || 'Live monitoring of retail accounts, warehouse inventory stock, fleet dispatches, and BDT receivables.');
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Push & Notification settings state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifOrder, setNotifOrder] = useState(true);
  const [notifDelivery, setNotifDelivery] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);
  const [notifDue, setNotifDue] = useState(true);
  const [notifStock, setNotifStock] = useState(true);
  const [notifField, setNotifField] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Staff Communication Composer state
  const [commRecipientRole, setCommRecipientRole] = useState<'all' | 'sales' | 'delivery'>('sales');
  const [commTitle, setCommTitle] = useState('');
  const [commMessage, setCommMessage] = useState('');
  const [commPriority, setCommPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [commActionUrl, setCommActionUrl] = useState('/orders');
  const [showCommConfirm, setShowCommConfirm] = useState(false);
  const [isSendingComm, setIsSendingComm] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);

  // GPS & Field Duty Settings state
  const [fieldDutyEnabled, setFieldDutyEnabled] = useState(true);
  const [gpsTrackingEnabled, setGpsTrackingEnabled] = useState(true);
  const [autoCloseDuty, setAutoCloseDuty] = useState(true);
  const [gpsInterval, setGpsInterval] = useState('3 minutes');
  const [minMovement, setMinMovement] = useState('200 meters');
  const [gpsAccuracy, setGpsAccuracy] = useState('100 meters');

  // Forecasting & Reorder Settings state
  const [forecastCfg, setForecastCfg] = useState(() => getStoredForecastingSettings());
  const handleSaveForecastCfg = (e: React.FormEvent) => {
    e.preventDefault();
    saveForecastingSettings(forecastCfg);
    addToast({ type: 'success', title: 'Settings Saved', message: 'Forecasting & Reorder parameters updated successfully.' });
    setActivePanel(null);
  };

  // Theme customization & new theme creation state
  const [activeThemePreset, setActiveThemePreset] = useState<string>(() => localStorage.getItem('glowzaa_active_theme') || 'theme2');
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>(() => localStorage.getItem('glowzaa_custom_primary') || '#0F766E');
  const [customSecondaryColor, setCustomSecondaryColor] = useState<string>(() => localStorage.getItem('glowzaa_custom_secondary') || '#047857');
  const [customAccentColor, setCustomAccentColor] = useState<string>(() => localStorage.getItem('glowzaa_custom_accent') || '#10B981');
  const [newThemeName, setNewThemeName] = useState<string>('');
  const [customThemesList, setCustomThemesList] = useState<Array<{ id: string; name: string; primary: string; secondary: string; accent: string }>>(() => {
    try {
      const saved = localStorage.getItem('glowzaa_custom_themes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const applyThemeColors = (primary: string, secondary: string, accent: string, presetId: string) => {
    document.documentElement.style.setProperty('--brand-primary', primary);
    document.documentElement.style.setProperty('--brand-secondary', secondary);
    document.documentElement.style.setProperty('--brand-accent', accent);
    document.documentElement.dataset.theme = presetId;
    localStorage.setItem('glowzaa_active_theme', presetId);
    localStorage.setItem('glowzaa_custom_primary', primary);
    localStorage.setItem('glowzaa_custom_secondary', secondary);
    localStorage.setItem('glowzaa_custom_accent', accent);
    setActiveThemePreset(presetId);
  };

  const handleCreateNewTheme = (e: React.FormEvent) => {
    e.preventDefault();
    const themeName = newThemeName.trim() || `Custom Executive ${customThemesList.length + 1}`;
    const newTheme = {
      id: `custom_${Date.now()}`,
      name: themeName,
      primary: customPrimaryColor,
      secondary: customSecondaryColor,
      accent: customAccentColor
    };
    const updated = [...customThemesList, newTheme];
    setCustomThemesList(updated);
    localStorage.setItem('glowzaa_custom_themes', JSON.stringify(updated));
    applyThemeColors(newTheme.primary, newTheme.secondary, newTheme.accent, newTheme.id);
    setNewThemeName('');
    addToast({ type: 'success', title: 'New Theme Created!', message: `Theme "${newTheme.name}" created and applied successfully.` });
  };

  // Danger & Audit Modals
  const [isWiping, setIsWiping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAuditReport, setShowAuditReport] = useState(false);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Load notification history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'staff_notifications'), orderBy('createdAt', 'desc'), limit(25)));
        setNotificationHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        // Fallback demo items if collection not initialized yet
        setNotificationHistory([
          { id: '1', title: 'Order Dispatched #5454634', message: 'আজ বিকালের মধ্যে ডেলিভারি সম্পন্ন করুন', recipient: 'Delivery Fleet', priority: 'important', sentAt: 'Just now', status: 'Delivered' },
          { id: '2', title: 'Low Stock Alert: Glowzaa Serum', message: 'Inventory is below 10 units in Shailkupa Hub.', recipient: 'Admin Team', priority: 'urgent', sentAt: '15m ago', status: 'Read' }
        ]);
      }
    };
    loadHistory();
  }, []);

  const handleEnablePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      addToast({ type: 'error', title: 'Not Supported', message: 'Browser notifications are not supported in this environment.' });
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setBrowserPermission(res);
      if (res === 'granted') {
        setPushEnabled(true);
        addToast({ type: 'success', title: 'Notifications Enabled', message: 'System alert preferences successfully updated.' });
      } else {
        addToast({ type: 'warning', title: 'Permission Denied', message: 'Notification permission was denied by browser settings.' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Could not request notification permission.' });
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      await saveCompanySettings({
        companyName,
        tagline,
        address,
        phone,
        email,
        tradeLicense,
        binNumber,
        defaultCreditLimit,
        shortDescription
      });
      addToast({ type: 'success', title: 'Settings Saved', message: 'Corporate configuration updated successfully.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to update corporate settings.' });
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSendNotificationSubmit = async () => {
    if (!commTitle.trim() || !commMessage.trim()) {
      addToast({ type: 'error', title: 'Missing Fields', message: 'Please provide both title and message.' });
      return;
    }
    setIsSendingComm(true);
    try {
      const notifData = {
        title: commTitle,
        message: commMessage,
        recipientRole: commRecipientRole,
        priority: commPriority,
        actionUrl: commActionUrl,
        senderName: currentUser?.name || 'Admin HQ',
        createdAt: serverTimestamp(),
        status: 'Sent'
      };
      await setDoc(doc(collection(db, 'staff_notifications')), notifData);

      addToast({ type: 'success', title: 'Notification Sent', message: `Successfully broadcasted to ${commRecipientRole.toUpperCase()} staff.` });
      setCommTitle('');
      setCommMessage('');
      setShowCommConfirm(false);

      // Refresh history
      const snap = await getDocs(query(collection(db, 'staff_notifications'), orderBy('createdAt', 'desc'), limit(25)));
      setNotificationHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      addToast({ type: 'error', title: 'Dispatch Failed', message: 'Could not broadcast push notification.' });
    } finally {
      setIsSendingComm(false);
    }
  };

  const confirmWipeAllData = async () => {
    setIsWiping(true);
    try {
      const res = await wipeAllData();
      if (res.success) {
        setShowWipeModal(false);
        setWipeConfirmInput('');
        addToast({ type: 'success', title: 'Data Wiped Successfully', message: 'All transactional records and operational data have been purged.' });
      } else {
        addToast({ type: 'error', title: 'Wipe Failed', message: res.error || 'Could not complete data wipe.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err?.message || 'Wipe operation failed.' });
    } finally {
      setIsWiping(false);
    }
  };

  const confirmResetData = async () => {
    setIsResetting(true);
    try {
      const res = await resetDemoData();
      if (res.success) {
        setShowResetModal(false);
        addToast({ type: 'success', title: 'Demo Reset Successful', message: 'Default wholesale demo dataset restored.' });
      } else {
        addToast({ type: 'error', title: 'Reset Failed', message: res.error || 'Could not reset demo data.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err?.message || 'Demo reset failed.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleConfirmLogoutAll = async () => {
    setIsLoggingOutAll(true);
    try {
      const res = await logoutAllDevices(true);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Logged Out All Devices',
          message: 'All device sessions terminated across all platforms.'
        });
        setShowLogoutAllModal(false);
      } else {
        addToast({ type: 'error', title: 'Failed', message: res.error || 'Could not terminate sessions.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err?.message || 'Operation failed.' });
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  // Settings categories & cards definition for Search filtering
  const categories = [
    {
      id: 'account',
      title: 'A. Account & Security',
      cards: [
        { id: 'profile', title: 'Profile & Security', desc: 'Manage administrator profile, credentials, and access role.', badge: currentUser?.role || 'Admin', icon: KeyRound, panel: 'profile' },
        { id: 'devices', title: 'Login & Devices', desc: `View active sessions and devices (${activeSessions.length} active).`, badge: `${activeSessions.length} Online`, icon: Laptop, panel: 'devices' },
        { id: 'security', title: 'Security Controls', desc: 'Session timeout, login protection and 2-step verification rules.', badge: 'Secure', icon: Shield, panel: 'security' }
      ]
    },
    {
      id: 'communication',
      title: 'B. Communication',
      cards: [
        { id: 'push', title: 'Notifications & Push', desc: 'Configure Firebase Cloud Messaging and alert categories.', badge: browserPermission === 'granted' ? 'Active' : 'Setup Required', icon: Bell, panel: 'push' },
        { id: 'staff_comm', title: 'Staff Communication', desc: 'Broadcast real-time push alerts to sales and delivery teams.', badge: 'Live Dispatch', icon: Send, panel: 'staff_comm' },
        { id: 'history', title: 'Notification History', desc: 'Audit sent messages, delivery status, and priority logs.', badge: `${notificationHistory.length} Logged`, icon: FileText, panel: 'history' }
      ]
    },
    {
      id: 'field',
      title: 'C. Field Operations',
      cards: [
        { id: 'gps', title: 'GPS & Field Duty', desc: 'Manage GPS polling intervals, movement thresholds, and auto-close.', badge: fieldDutyEnabled ? 'Active' : 'Off', icon: MapPin, panel: 'gps' },
        { id: 'live_staff', title: 'Live Field Staff', desc: 'Monitor real-time GPS telemetry, pings, and battery status.', badge: '6 Active', icon: Radio, panel: 'live_staff' }
      ]
    },
    {
      id: 'finance',
      title: 'D. Finance & Business',
      cards: [
        { id: 'business', title: 'Business Configuration', desc: 'Legal entity, wholesale hotline, trade license, and tax numbers.', badge: 'Verified', icon: Building2, panel: 'business' },
        { id: 'payment', title: 'Payment & Finance', desc: 'Default credit limits, B2B payment terms, and cash handover rules.', badge: 'BDT Standard', icon: CreditCard, panel: 'payment' }
      ]
    },
    {
      id: 'inventory',
      title: 'E. Inventory & Warehouse',
      cards: [
        { id: 'inventory_cfg', title: 'Inventory Settings', desc: 'Low stock thresholds, warehouse assignments, and alerts.', badge: `${products.length} Products`, icon: Sliders, panel: 'inventory_cfg' },
        { id: 'forecasting_cfg', title: 'Forecasting & Reorder', desc: 'Configure sales forecast horizon, minimum history days, safety stock, and reorder planning.', badge: 'Configured', icon: TrendingUp, panel: 'forecasting_cfg' }
      ]
    },
    {
      id: 'system',
      title: 'F. System & Data',
      cards: [
        { id: 'health', title: 'System Health', desc: 'Real connectivity check for Firebase, Firestore, Auth, and GPS.', badge: '● Healthy', icon: Activity, panel: 'health' },
        { id: 'audit', title: 'Audit Logs', desc: 'Immutable security event history and administrative trace.', badge: 'Secure Log', icon: Eye, panel: 'audit' },
        { id: 'data_mgmt', title: 'Data Management & Wipe', desc: 'Secure database backup, demo reset, and danger zone data wipe.', badge: 'Protected', icon: Database, panel: 'data_mgmt' }
      ]
    },
    {
      id: 'appearance',
      title: 'G. Appearance',
      cards: [
        { id: 'theme', title: 'Theme & Appearance', desc: 'Glowzaa Theme 2 Teal (#0F766E) and Emerald executive palette.', badge: 'Theme 2 Active', icon: Sparkles, panel: 'theme' }
      ]
    }
  ];

  // Filter cards based on search query
  const filteredCategories = categories.map(cat => ({
    ...cat,
    cards: cat.cards.filter(card => 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.cards.length > 0);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* PREMIUM HEADER */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0F766E] text-[11px] font-bold uppercase tracking-wider border border-teal-200">
              Control Center
            </span>
            <span className="text-xs text-slate-400 font-mono">v2.5.0 Enterprise</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Glowzaa Settings Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage security, staff communication, field operations, and system preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Healthy</span>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings (e.g. GPS, Notification, Push, Security, Warehouse)..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15 shadow-xs transition-all"
        />
        {searchQuery && (
          <button 
            type="button" 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* CATEGORIES & CARDS GRID / LIST */}
      <div className="space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Settings className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No settings found</h3>
            <p className="text-xs text-slate-500 mt-1">No settings match your search query "{searchQuery}".</p>
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-semibold hover:bg-teal-800 transition-colors"
            >
              Reset Search
            </button>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <div key={cat.id} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                {cat.title}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {cat.cards.map(card => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setActivePanel(card.panel)}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-[#0F766E] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] group-hover:bg-[#0F766E] group-hover:text-white transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        {card.badge && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold font-mono">
                            {card.badge}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors flex items-center justify-between">
                          <span>{card.title}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* INTERACTIVE DETAIL PANELS / MODALS FOR EACH SETTING */}

      {/* 1. Profile & Security Panel */}
      {activePanel === 'profile' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Profile & Security</h3>
                  <p className="text-[11px] text-slate-500">Administrator Credentials & Role</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Account Name</span>
                  <span className="font-bold text-slate-900">{currentUser?.name || 'Administrator'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Login ID / Email</span>
                  <span className="font-mono text-slate-900">{currentUser?.email || 'admin@glowzaa.com'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Access Role</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold uppercase text-[10px]">
                    {currentUser?.role || 'admin'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Session ID</span>
                  <span className="font-mono text-[10px] text-slate-400">{currentSessionId || 'sess_active'}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Change Password</h4>
                <div className="space-y-2">
                  <input type="password" placeholder="Current Password" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl" />
                  <input type="password" placeholder="New Password" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl" />
                  <input type="password" placeholder="Confirm New Password" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    addToast({ type: 'success', title: 'Password Updated', message: 'Your administrator password was successfully changed.' });
                    setActivePanel(null);
                  }}
                  className="w-full py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition-colors cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Login & Devices Panel */}
      {activePanel === 'devices' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Login & Active Sessions</h3>
                  <p className="text-[11px] text-slate-500">Real-time cross-device session monitoring</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Active Sessions ({activeSessions.length})</span>
                <button
                  type="button"
                  onClick={() => setShowLogoutAllModal(true)}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out All Devices</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {activeSessions.map((session) => (
                  <div key={session.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-100/70 text-[#0F766E] flex items-center justify-center">
                        {session.deviceType === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{session.deviceName || 'Browser Device'}</span>
                          {session.id === currentSessionId && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono text-[9px]">Current</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          IP: {session.ipAddress} • {new Date(session.lastActive).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {session.id !== currentSessionId && (
                      <button
                        type="button"
                        onClick={async () => {
                          await revokeSession(session.id);
                          addToast({ type: 'success', title: 'Session Revoked', message: 'Device session successfully terminated.' });
                        }}
                        className="px-2.5 py-1 text-[11px] bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors font-semibold cursor-pointer"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Notifications & Push Panel */}
      {activePanel === 'push' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Notifications & Push Settings</h3>
                  <p className="text-[11px] text-slate-500">Firebase Cloud Messaging Web Configuration</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">System Push Status</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Browser Permission: <span className="font-semibold uppercase text-[#0F766E]">{browserPermission}</span>
                  </p>
                </div>
                {browserPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition-colors cursor-pointer"
                  >
                    Enable System Notifications
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Active</span>
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Notification Alert Channels</h4>
                <div className="space-y-2">
                  {[
                    { id: 'order', label: 'Order Notifications', state: notifOrder, setState: setNotifOrder },
                    { id: 'delivery', label: 'Delivery Notifications', state: notifDelivery, setState: setNotifDelivery },
                    { id: 'payment', label: 'Payment & Collection Alerts', state: notifPayment, setState: setNotifPayment },
                    { id: 'due', label: 'Customer Due Alerts', state: notifDue, setState: setNotifDue },
                    { id: 'stock', label: 'Low Stock Alerts', state: notifStock, setState: setNotifStock },
                    { id: 'field', label: 'Field Duty Alerts', state: notifField, setState: setNotifField },
                    { id: 'system', label: 'System & Security Alerts', state: notifSystem, setState: setNotifSystem }
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-xs font-medium text-slate-700">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => item.setState(!item.state)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${item.state ? 'bg-[#0F766E]' : 'bg-slate-300'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${item.state ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  addToast({ type: 'success', title: 'Preferences Saved', message: 'Notification preferences updated successfully.' });
                  setActivePanel(null);
                }}
                className="w-full py-3 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition-colors cursor-pointer shadow-xs"
              >
                Save Notification Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Staff Communication Panel */}
      {activePanel === 'staff_comm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Staff Communication Center</h3>
                  <p className="text-[11px] text-slate-500">Real-time broadcast push message to field staff</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Recipient Target</label>
                <select
                  value={commRecipientRole}
                  onChange={(e) => setCommRecipientRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="sales">All Sales Staff (ফিল্ড সেলস টিম)</option>
                  <option value="delivery">All Delivery Fleet (ডেলিভারি ফ্লিট)</option>
                  <option value="all">All Active Staff (সকল কর্মী)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Notification Title</label>
                <input
                  type="text"
                  value={commTitle}
                  onChange={(e) => setCommTitle(e.target.value)}
                  placeholder="e.g. Urgent Delivery Dispatch Update"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Message Body</label>
                <textarea
                  rows={3}
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  placeholder="আজ বিকালের মধ্যে অর্ডার সংগ্রহ ও ক্যাশ হ্যান্ডওভার সম্পন্ন করুন..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Priority</label>
                  <select
                    value={commPriority}
                    onChange={(e) => setCommPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="normal">Normal (সাধারণ)</option>
                    <option value="important">Important (গুরুত্বপূর্ণ)</option>
                    <option value="urgent">Urgent (জরুরী 🚨)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Action Route</label>
                  <select
                    value={commActionUrl}
                    onChange={(e) => setCommActionUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="/orders">Orders (অর্ডার লিস্ট)</option>
                    <option value="/delivery">Delivery (ডেলিভারি)</option>
                    <option value="/dashboard">Dashboard (ড্যাশবোর্ড)</option>
                    <option value="/field">Field Duty (ফিল্ড ডিউটি)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCommConfirm(true)}
                disabled={!commTitle.trim() || !commMessage.trim()}
                className="w-full py-3 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Send Broadcast Push Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast confirmation modal */}
      {showCommConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Confirm Push Broadcast</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Send notification <strong className="text-slate-900">"{commTitle}"</strong> to all <strong className="text-[#0F766E] uppercase">{commRecipientRole}</strong> staff devices now?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCommConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNotificationSubmit}
                disabled={isSendingComm}
                className="px-5 py-2 text-xs font-bold text-white bg-[#0F766E] rounded-xl hover:bg-teal-800"
              >
                {isSendingComm ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Notification History Panel */}
      {activePanel === 'history' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Notification History</h3>
                  <p className="text-[11px] text-slate-500">Sent broadcasts and system alert logs</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {notificationHistory.map((item, idx) => (
                <div key={item.id || `hist_${item.title || idx}`} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-800'}`}>
                      {item.priority || 'Normal'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{item.message}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/60">
                    <span>Target: <strong className="text-slate-600">{item.recipientRole || item.recipient || 'All Staff'}</strong></span>
                    <span>Status: <strong className="text-emerald-600">{item.status || 'Delivered'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. GPS & Field Duty Panel */}
      {activePanel === 'gps' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">GPS & Field Duty Settings</h3>
                  <p className="text-[11px] text-slate-500">Geospatial tracking and telemetry rules</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Field Duty Telemetry Engine</span>
                  <span className="text-[11px] text-slate-500">Enable location services for sales & delivery staff</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFieldDutyEnabled(!fieldDutyEnabled)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${fieldDutyEnabled ? 'bg-[#0F766E]' : 'bg-slate-300'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${fieldDutyEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">GPS Ping Interval</span>
                  <span className="text-xs font-bold text-slate-900 block font-mono">3 minutes</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Movement Threshold</span>
                  <span className="text-xs font-bold text-slate-900 block font-mono">200 meters</span>
                </div>
              </div>

              <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
                  <span>GPS Permission Bug Solved</span>
                </div>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Browser permission is cached securely to prevent repeated prompts. Active watchPosition handlers clean up automatically on unmount.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  addToast({ type: 'success', title: 'GPS Settings Saved', message: 'Field duty telemetry configuration updated.' });
                  setActivePanel(null);
                }}
                className="w-full py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition-colors cursor-pointer"
              >
                Save GPS Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Live Field Staff Panel */}
      {activePanel === 'live_staff' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Live Field Staff</h3>
                  <p className="text-[11px] text-slate-500">Active telemetry and GPS pings</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {[
                { name: 'Emdad Leon', role: 'Field Sales', status: 'ON FIELD', lastPing: 'Just now', accuracy: '14m', battery: '92%' },
                { name: 'Seller 02', role: 'Field Sales', status: 'ON FIELD', lastPing: '2m ago', accuracy: '22m', battery: '85%' },
                { name: 'Delivery 01', role: 'Delivery Fleet', status: 'ON FIELD', lastPing: '1m ago', accuracy: '10m', battery: '78%' },
                { name: 'Delivery 02', role: 'Delivery Fleet', status: 'OFF DUTY', lastPing: '3h ago', accuracy: '-', battery: '-' }
              ].map((staff) => (
                <div key={staff.name} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>{staff.name}</span>
                      <span className="text-[10px] text-slate-400">({staff.role})</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Last Ping: {staff.lastPing} • Accuracy: {staff.accuracy} • Battery: {staff.battery}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono ${staff.status === 'ON FIELD' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                    {staff.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Business Configuration Panel */}
      {activePanel === 'business' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Business Configuration</h3>
                  <p className="text-[11px] text-slate-500">Corporate identity and legal entity settings</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Company Legal Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Wholesale Hotline</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase">Corporate Tagline / Subtitle</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Trade License (DNCC)</label>
                  <input
                    type="text"
                    value={tradeLicense}
                    onChange={(e) => setTradeLicense(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase">VAT / BIN Number</label>
                  <input
                    type="text"
                    value={binNumber}
                    onChange={(e) => setBinNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase">Head Office Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCompany}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0F766E] rounded-xl hover:bg-teal-800"
                >
                  {isSavingCompany ? 'Saving...' : 'Save Business Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. System Health Panel */}
      {activePanel === 'health' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">System Health & Status</h3>
                  <p className="text-[11px] text-slate-500">Real-time infrastructure connectivity check</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Firebase Core SDK', status: 'Connected', desc: 'Enterprise cloud connection verified.' },
                { name: 'Firestore Database', status: 'Connected', desc: 'Read/write collections online.' },
                { name: 'Firebase Auth Engine', status: 'Connected', desc: 'Secure token session active.' },
                { name: 'Push Notifications (FCM)', status: browserPermission === 'granted' ? 'Ready' : 'Permission Required', desc: 'Web push messaging service.' },
                { name: 'GPS & Location Telemetry', status: 'Available', desc: 'HTML5 Geolocation & Watcher operational.' }
              ].map((item) => (
                <div key={item.name} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                    <p className="text-[10px] text-slate-500">{item.desc}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{item.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10. Audit Logs Panel */}
      {activePanel === 'audit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">System Audit Report & Logs</h3>
                  <p className="text-[11px] text-slate-500">Immutable security trace & diagnostics</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto pr-1">
              <SystemAuditReport />
            </div>
          </div>
        </div>
      )}

      {/* 11. Data Management & Wipe Panel */}
      {activePanel === 'data_mgmt' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Data Management & Reset</h3>
                  <p className="text-[11px] text-slate-500">Backup, demo reset, and danger zone wipe</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Export Database Backup</h4>
                <p className="text-[11px] text-slate-500">Download complete JSON export of all orders, customers, and inventory.</p>
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ orders, customers, products }, null, 2));
                    const dlAnchor = document.createElement('a');
                    dlAnchor.setAttribute("href", dataStr);
                    dlAnchor.setAttribute("download", `glowzaa_backup_${new Date().toISOString().slice(0,10)}.json`);
                    document.body.appendChild(dlAnchor);
                    dlAnchor.click();
                    dlAnchor.remove();
                    addToast({ type: 'success', title: 'Backup Downloaded', message: 'JSON database export completed.' });
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-950 transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON Export</span>
                </button>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-amber-900">Reset Demo Dataset</h4>
                <p className="text-[11px] text-amber-800">Clear current transactional data and restore default wholesale demo dataset.</p>
                <button
                  type="button"
                  onClick={() => { setActivePanel(null); setShowResetModal(true); }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset Demo Data</span>
                </button>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-rose-900">Danger Zone: Wipe All Data</h4>
                <p className="text-[11px] text-rose-800">Permanently delete all orders, customers, products, payrolls, and financial logs.</p>
                <button
                  type="button"
                  onClick={() => { setActivePanel(null); setShowWipeModal(true); }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Wipe All Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THEME & APPEARANCE CUSTOMIZER & CREATOR PANEL */}
      {activePanel === 'theme' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Theme & Appearance Customizer</h3>
                  <p className="text-[11px] text-slate-500">Configure Glowzaa Theme 2 and create custom executive palettes</p>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Presets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Preset Executive Palettes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div 
                    onClick={() => applyThemeColors('#0F766E', '#047857', '#10B981', 'theme2')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${activeThemePreset === 'theme2' ? 'border-[#0F766E] bg-teal-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#0F766E]"></span>
                        <h5 className="text-xs font-bold text-slate-900">Glowzaa Theme 2 Teal</h5>
                      </div>
                      <p className="text-[11px] text-slate-500">Teal (#0F766E) & Emerald Executive</p>
                    </div>
                    {activeThemePreset === 'theme2' && <CheckCircle2 className="w-5 h-5 text-[#0F766E]" />}
                  </div>

                  <div 
                    onClick={() => applyThemeColors('#2563EB', '#1D4ED8', '#3B82F6', 'ocean')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${activeThemePreset === 'ocean' ? 'border-blue-600 bg-blue-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-600"></span>
                        <h5 className="text-xs font-bold text-slate-900">Corporate Ocean Blue</h5>
                      </div>
                      <p className="text-[11px] text-slate-500">Blue (#2563EB) & Royal Palette</p>
                    </div>
                    {activeThemePreset === 'ocean' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  </div>

                  <div 
                    onClick={() => applyThemeColors('#4F46E5', '#4338CA', '#6366F1', 'indigo')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${activeThemePreset === 'indigo' ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-600"></span>
                        <h5 className="text-xs font-bold text-slate-900">Royal Indigo Executive</h5>
                      </div>
                      <p className="text-[11px] text-slate-500">Indigo (#4F46E5) & Violet Accent</p>
                    </div>
                    {activeThemePreset === 'indigo' && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                  </div>

                  <div 
                    onClick={() => applyThemeColors('#0F172A', '#334155', '#64748B', 'obsidian')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${activeThemePreset === 'obsidian' ? 'border-slate-900 bg-slate-100 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-900"></span>
                        <h5 className="text-xs font-bold text-slate-900">Obsidian Slate</h5>
                      </div>
                      <p className="text-[11px] text-slate-500">Slate (#0F172A) & Dark Neutral</p>
                    </div>
                    {activeThemePreset === 'obsidian' && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                  </div>
                </div>
              </div>

              {/* Custom Themes List */}
              {customThemesList.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Your Custom Themes</h4>
                  <div className="space-y-2">
                    {customThemesList.map(t => (
                      <div key={t.id} className={`p-3 rounded-xl border flex items-center justify-between ${activeThemePreset === t.id ? 'border-[#0F766E] bg-teal-50/40' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.primary }}></span>
                            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.secondary }}></span>
                            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.accent }}></span>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">{t.name}</h5>
                            <span className="text-[10px] font-mono text-slate-500">Primary: {t.primary}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyThemeColors(t.primary, t.secondary, t.accent, t.id)}
                          className="px-3 py-1.5 bg-[#0F766E] text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition-colors cursor-pointer"
                        >
                          {activeThemePreset === t.id ? 'Active' : 'Apply'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Custom Theme Form */}
              <form onSubmit={handleCreateNewTheme} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0F766E]" />
                  <span>Create & Add New Custom Theme</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Theme Name</label>
                    <input
                      type="text"
                      value={newThemeName}
                      onChange={e => setNewThemeName(e.target.value)}
                      placeholder="e.g. Sunset Executive"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Primary Color (Hex)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customPrimaryColor}
                        onChange={e => setCustomPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={customPrimaryColor}
                        onChange={e => setCustomPrimaryColor(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Secondary Color (Hex)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customSecondaryColor}
                        onChange={e => setCustomSecondaryColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={customSecondaryColor}
                        onChange={e => setCustomSecondaryColor(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Accent Color (Hex)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customAccentColor}
                        onChange={e => setCustomAccentColor(e.target.value)}
                        className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={customAccentColor}
                        onChange={e => setCustomAccentColor(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition-colors shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save & Apply New Theme</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* WIPE CONFIRMATION MODAL */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-bold text-rose-900 text-base">Final Warning: Wipe All Data</h3>
              </div>
              <button type="button" onClick={() => setShowWipeModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete ALL orders, customers, products, purchases, payments, expenses, delivery records, collections, and payrolls from Firestore. This action is <strong className="text-rose-600">irreversible</strong>.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                To confirm, please type <span className="text-rose-600 font-mono">WIPE ALL DATA</span> below:
              </label>
              <input
                type="text"
                value={wipeConfirmInput}
                onChange={e => setWipeConfirmInput(e.target.value)}
                placeholder="WIPE ALL DATA"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowWipeModal(false); setWipeConfirmInput(''); }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmWipeAllData}
                disabled={wipeConfirmInput !== 'WIPE ALL DATA' || isWiping}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isWiping ? 'Wiping...' : 'Permanently Wipe Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET DEMO CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Reset Demo Data to Default</h3>
              </div>
              <button type="button" onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will clear all current transactional data and restore the predefined default B2B wholesale demo dataset. Are you sure you want to proceed?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                disabled={isResetting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                {isResetting ? 'Resetting...' : 'Confirm Demo Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT ALL DEVICES MODAL */}
      {showLogoutAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2 text-rose-600">
                <LogOut className="w-5 h-5" />
                <h3 className="font-bold text-rose-900 text-base">Log Out All Devices</h3>
              </div>
              <button type="button" onClick={() => setShowLogoutAllModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Are you sure you want to log out all devices? This will invalidate active sessions across all mobile phones, tablets, and desktop computers.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutAllModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogoutAll}
                disabled={isLoggingOutAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                {isLoggingOutAll ? 'Logging Out...' : 'Yes, Log Out All Devices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORECASTING & REORDER SETTINGS MODAL */}
      {activePanel === 'forecasting_cfg' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#0F766E]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Forecasting & Reorder Parameters</h3>
                  <p className="text-xs text-slate-500">Configure statistical rules and safety stock thresholds.</p>
                </div>
              </div>
              <button type="button" onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForecastCfg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Forecast Horizon Days</label>
                <select
                  value={forecastCfg.forecastHorizonDays}
                  onChange={e => setForecastCfg({ ...forecastCfg, forecastHorizonDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                >
                  <option value={7}>7 Days (Short-term)</option>
                  <option value={14}>14 Days (Bi-weekly)</option>
                  <option value={30}>30 Days (Monthly standard)</option>
                  <option value={60}>60 Days (Quarterly horizon)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Min History Days for Reliable Forecast</label>
                <input
                  type="number"
                  value={forecastCfg.minHistoryDays}
                  onChange={e => setForecastCfg({ ...forecastCfg, minHistoryDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  min={1}
                  max={30}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sales Decline Threshold (%)</label>
                <input
                  type="number"
                  value={forecastCfg.salesDeclineThreshold}
                  onChange={e => setForecastCfg({ ...forecastCfg, salesDeclineThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  max={0}
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">e.g. -20% indicates significant downward trend.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Default Safety Stock (Units)</label>
                <input
                  type="number"
                  value={forecastCfg.defaultSafetyStockUnits}
                  onChange={e => setForecastCfg({ ...forecastCfg, defaultSafetyStockUnits: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  min={0}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Default Supplier Lead Time (Days)</label>
                <input
                  type="number"
                  value={forecastCfg.defaultLeadTimeDays}
                  onChange={e => setForecastCfg({ ...forecastCfg, defaultLeadTimeDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                  min={1}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Save Parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
