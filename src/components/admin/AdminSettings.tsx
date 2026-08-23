import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
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
  Clock
} from 'lucide-react';
import { SystemAuditReport } from './SystemAuditReport';

export const AdminSettings: React.FC = () => {
  const { products, customers, orders, purchases, collections, addToast, wipeAllData, resetDemoData, companySettings, saveCompanySettings } = useApp();
  const { currentUser, activeSessions, currentSessionId, logoutAllDevices, revokeSession } = useAuth();

  const [companyName, setCompanyName] = useState(companySettings?.companyName || 'Glowzaa Bangladesh Ltd.');
  const [tagline, setTagline] = useState(companySettings?.tagline || 'Brand Beauty, Personal Care & Wholesale Distribution');
  const [address, setAddress] = useState(companySettings?.address || 'Shailkupa Head Office, Jhenaidah, Bangladesh');
  const [phone, setPhone] = useState(companySettings?.phone || '+880 9612-456999');
  const [email, setEmail] = useState(companySettings?.email || 'wholesale@glowzaa.com');
  const [tradeLicense, setTradeLicense] = useState(companySettings?.tradeLicense || 'TRAD/DNCC/092148/2024');
  const [binNumber, setBinNumber] = useState(companySettings?.binNumber || '004910294-0101');
  const [defaultCreditLimit, setDefaultCreditLimit] = useState(companySettings?.defaultCreditLimit || 100000);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(15);
  const [shortDescription, setShortDescription] = useState(companySettings?.shortDescription || 'Live monitoring of retail accounts, warehouse inventory stock, fleet dispatches, and BDT receivables.');
  
  React.useEffect(() => {
    if (companySettings) {
      setCompanyName(companySettings.companyName);
      setTagline(companySettings.tagline);
      setAddress(companySettings.address);
      setPhone(companySettings.phone);
      setEmail(companySettings.email);
      setTradeLicense(companySettings.tradeLicense);
      setBinNumber(companySettings.binNumber);
      setDefaultCreditLimit(companySettings.defaultCreditLimit);
      setShortDescription(companySettings.shortDescription);
    }
  }, [companySettings]);
  
  const [isWiping, setIsWiping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Modal states for mobile-friendly confirmations (replacing window.prompt/confirm which get blocked in mobile iframes)
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAuditReport, setShowAuditReport] = useState(false);

  // Cross-device session management states
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [isRevokingSessionId, setIsRevokingSessionId] = useState<string | null>(null);

  // Robust Admin check
  const isAdmin = !currentUser || currentUser.role === 'admin' || currentUser?.email?.includes('admin') || currentUser?.email === 'rakibseohub@gmail.com';

  const handleConfirmLogoutAll = async () => {
    setIsLoggingOutAll(true);
    try {
      const res = await logoutAllDevices(true);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Logged Out All Devices',
          message: 'All device sessions terminated across all platforms. (সমস্ত ডিভাইস থেকে সফলভাবে লগআউট সম্পন্ন হয়েছে)'
        });
        setShowLogoutAllModal(false);
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Log Out Devices',
          message: res.error || 'Could not terminate sessions.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'An unexpected error occurred.'
      });
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const handleLogoutOtherDevices = async () => {
    setIsLoggingOutAll(true);
    try {
      const res = await logoutAllDevices(false);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Other Devices Logged Out',
          message: 'All other active sessions have been terminated. Current device remains active. (অন্যান্য সকল ডিভাইস থেকে লগআউট সম্পন্ন হয়েছে)'
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: res.error || 'Could not logout other devices.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Error occurred.'
      });
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const handleRevokeSingleSession = async (sessionId: string, deviceName: string) => {
    setIsRevokingSessionId(sessionId);
    try {
      const res = await revokeSession(sessionId);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Device Session Revoked',
          message: `Logged out session for "${deviceName}". (ডিভাইস থেকে লগআউট সম্পন্ন)`
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: res.error || 'Could not revoke session.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to revoke session.'
      });
    } finally {
      setIsRevokingSessionId(null);
    }
  };

  if (showAuditReport) {
    return (
      <SystemAuditReport onBack={() => setShowAuditReport(false)} />
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCompanySettings({
      companyName, tagline, address, phone, email, tradeLicense, binNumber, defaultCreditLimit, shortDescription
    });
  };

  const handleExportData = () => {
    const fullBackup = {
      brand: 'Glowzaa B2B',
      exportedAt: new Date().toISOString(),
      products,
      customers,
      orders,
      purchases,
      collections
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `glowzaa_b2b_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addToast({
      type: 'info',
      title: 'Database Exported',
      message: 'Glowzaa complete B2B state exported as JSON file.'
    });
  };

  const confirmWipeAllData = async () => {
    if (wipeConfirmInput !== 'WIPE ALL DATA') {
      addToast({
        type: 'warning',
        title: 'Action Cancelled',
        message: 'Confirmation text did not match "WIPE ALL DATA".'
      });
      return;
    }

    setShowWipeModal(false);
    setIsWiping(true);
    try {
      console.log('[UI WIPE] EXECUTING wipeAllData()...');
      const res = await wipeAllData();
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Data Wiped Successfully',
          message: 'All application data has been permanently deleted.'
        });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        addToast({
          type: 'error',
          title: 'Wipe Failed',
          message: res.error || 'Failed to wipe application data.'
        });
      }
    } catch (err: any) {
      console.error('[UI WIPE ERROR]', err);
      addToast({
        type: 'error',
        title: 'Wipe Failed',
        message: err.message || 'An unexpected error occurred during data wipe.'
      });
    } finally {
      setIsWiping(false);
      setWipeConfirmInput('');
    }
  };

  const confirmResetData = async () => {
    setShowResetModal(false);
    setIsResetting(true);
    try {
      console.log('[UI RESET] EXECUTING resetDemoData()...');
      const res = await resetDemoData();
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Demo Data Reset',
          message: 'Demo data has been reset successfully.'
        });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        addToast({
          type: 'error',
          title: 'Reset Failed',
          message: res.error || 'Failed to reset demo data.'
        });
      }
    } catch (err: any) {
      console.error('[UI RESET ERROR]', err);
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: err.message || 'An unexpected error occurred during demo reset.'
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">System & Corporate Settings</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Glowzaa HQ Configuration
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure business identity, trade license numbers, currency parameters, and system backup archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAuditReport(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Full System Audit</span>
          </button>

          <button
            type="button"
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Database JSON</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Company Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-rose-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Company & Trade Registration</h2>
              <p className="text-[11px] text-slate-500">Printed on official B2B wholesale invoices & delivery challans</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Company Legal Entity *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Brand Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Corporate Hotline</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Wholesale Inquiries Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Central Warehouse & HQ Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Dashboard Short Description</label>
              <textarea
                value={shortDescription}
                onChange={e => setShortDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                rows={2}
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Trade License Number (DNCC)</label>
              <input
                type="text"
                value={tradeLicense}
                onChange={e => setTradeLicense(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">VAT / BIN Registration #</label>
              <input
                type="text"
                value={binNumber}
                onChange={e => setBinNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Commercial Credit Terms */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <CreditCard className="w-5 h-5 text-rose-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Wholesale Credit & Policy Defaults</h2>
              <p className="text-[11px] text-slate-500">Standard parameters applied to newly registered retail resellers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Default Credit Ceiling (৳)</label>
              <input
                type="number"
                value={defaultCreditLimit}
                onChange={e => setDefaultCreditLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Default Payment Term (Days)</label>
              <select
                value={defaultPaymentTerms}
                onChange={e => setDefaultPaymentTerms(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
              >
                <option value={0}>0 Days (COD)</option>
                <option value={7}>Net 7 Days</option>
                <option value={15}>Net 15 Days</option>
                <option value={30}>Net 30 Days</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Operational Currency</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-900">
                BDT (৳) - Bangladeshi Taka
              </div>
            </div>
          </div>
        </div>

        {/* Device & Session Security (লগইন ডিভাইস ও সেশন সিকিউরিটি) */}
        <div id="device-session-management-card" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#087F7A] shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">Device & Session Security (ডিভাইস ও সেশন সিকিউরিটি)</h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-[#087F7A] border border-teal-200">
                    Real-Time RBAC Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor active device logins, terminate remote sessions, or logout from all devices across your account.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                {activeSessions.length > 0 ? `${activeSessions.length} Active Session${activeSessions.length > 1 ? 's' : ''}` : '1 Active Session'}
              </span>
            </div>
          </div>

          {/* Device list */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Currently Logged-In Devices (বর্তমান লগইনকৃত ডিভাইসসমূহ):</span>
              <span className="text-[11px] text-slate-400 font-normal">Auto-synced via Firestore live presence</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {activeSessions.length === 0 ? (
                // Fallback display if activeSessions is loading or empty
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-[#087F7A]">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Current Device / Web Browser</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          This Device (বর্তমান ডিভাইস)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Active right now • Session Verified</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Current Session</span>
                </div>
              ) : (
                activeSessions.map((sess) => {
                  const isThisDevice = sess.sessionId === currentSessionId || sess.isCurrent;
                  const isRevoking = isRevokingSessionId === sess.sessionId;

                  return (
                    <div 
                      key={sess.sessionId}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                        isThisDevice 
                          ? 'border-teal-200 bg-teal-50/30 ring-1 ring-teal-200/50' 
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isThisDevice ? 'bg-teal-100 text-[#087F7A]' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {sess.deviceType === 'mobile' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : sess.deviceType === 'tablet' ? (
                            <Tablet className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {sess.deviceName || 'Web Browser'}
                            </span>
                            {isThisDevice ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                This Device (বর্তমান ডিভাইস)
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                Remote Device (অন্যান্য ডিভাইস)
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Last active: {sess.lastActiveAt ? new Date(sess.lastActiveAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'Active now'}
                            </span>
                            {sess.browser && sess.os && (
                              <span className="text-slate-400 hidden sm:inline">• {sess.browser} • {sess.os}</span>
                            )}
                            <span className="font-mono text-[10px] text-slate-400">ID: {sess.sessionId.slice(0, 12)}...</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isThisDevice ? (
                          <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Active Now</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRevokeSingleSession(sess.sessionId, sess.deviceName)}
                            disabled={isRevoking || isLoggingOutAll}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <LogOut className={`w-3.5 h-3.5 ${isRevoking ? 'animate-spin' : ''}`} />
                            <span>{isRevoking ? 'Logging out...' : 'Log Out Device (লগআউট)'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cross-device logout actions */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Account Logout Options:</span> Instant remote session termination
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {activeSessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleLogoutOtherDevices}
                  disabled={isLoggingOutAll}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Log Out All Other Devices (অন্যান্য সকল ডিভাইস)</span>
                </button>
              )}

              <button
                type="button"
                id="btn-logout-all-devices"
                onClick={() => setShowLogoutAllModal(true)}
                disabled={isLoggingOutAll}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out All Devices (সমস্ত ডিভাইস থেকে লগআউট)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone: Complete Data Reset / Wipe */}
        <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-rose-200/60">
            <ShieldCheck className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h2 className="font-bold text-rose-900 text-sm sm:text-base">Danger Zone: Complete Data Reset / Wipe</h2>
              <p className="text-[11px] text-rose-700/80">Permanent and irreversible data removal for production database</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-rose-800 font-medium leading-relaxed">
              Permanently clear all application data including orders, customers, products, purchases, payments, expenses, delivery records, collections, cash handovers, user accounts (except yourself), and other transactional/master records. This action is irreversible. Use with extreme caution.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!isAdmin) {
                    addToast({ type: 'error', title: 'Access Denied', message: 'Only administrators can execute data wipe.' });
                    return;
                  }
                  setShowWipeModal(true);
                }}
                disabled={isWiping}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isWiping ? 'animate-spin' : ''}`} />
                <span>{isWiping ? 'Wiping All Data...' : 'Wipe All Data'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reset Demo Data & Save Corporate Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Reset Demo Data to Default</h3>
              <p className="text-xs text-slate-500 mt-0.5">Clear current transactional data and restore default demo dataset</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  addToast({ type: 'error', title: 'Access Denied', message: 'Only administrators can reset demo data.' });
                  return;
                }
                setShowResetModal(true);
              }}
              disabled={isResetting}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Resetting Demo Data...' : 'Reset Demo Data'}</span>
            </button>
          </div>
        </div>

        {/* Save Corporate Configuration Action */}
        <div className="flex justify-end bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#087F7A] hover:bg-[#075E5B] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Corporate Configuration</span>
          </button>
        </div>

      </form>

      {/* WIPE CONFIRMATION MODAL (Mobile-Friendly & Bulletproof) */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-bold text-rose-900 text-base">Final Warning: Wipe All Data</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowWipeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete ALL orders, customers, products, purchases, payments, expenses, delivery records, collections, and financial records from Firestore. This action is <strong className="text-rose-600">irreversible</strong>.
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
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmInput('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmWipeAllData}
                disabled={wipeConfirmInput !== 'WIPE ALL DATA' || isWiping}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isWiping ? 'Wiping...' : 'Permanently Wipe Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET DEMO CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Reset Demo Data to Default</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
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
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                disabled={isResetting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Confirm Demo Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT ALL DEVICES CONFIRMATION MODAL */}
      {showLogoutAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2 text-rose-600">
                <LogOut className="w-5 h-5" />
                <h3 className="font-bold text-rose-900 text-base">Log Out All Devices (সমস্ত ডিভাইস থেকে লগআউট)</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowLogoutAllModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Are you sure you want to log out all devices? (আপনি কি নিশ্চিত যে সমস্ত ডিভাইস থেকে লগআউট করতে চান?)
              </p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Immediate Global Revocation</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  This action will invalidate active sessions across all mobile phones, tablets, and desktop computers (including this current browser). You will need to log back in with your username and password.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutAllModal(false)}
                disabled={isLoggingOutAll}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-logout-all-devices-btn"
                onClick={handleConfirmLogoutAll}
                disabled={isLoggingOutAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className={`w-4 h-4 ${isLoggingOutAll ? 'animate-spin' : ''}`} />
                <span>{isLoggingOutAll ? 'Logging Out All Devices...' : 'Yes, Log Out All Devices (লগআউট করুন)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
