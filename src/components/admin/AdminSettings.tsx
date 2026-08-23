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
  X
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { products, customers, orders, purchases, collections, addToast, wipeAllData, resetDemoData, companySettings, saveCompanySettings } = useApp();
  const { currentUser } = useAuth();

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

  // Robust Admin check
  const isAdmin = !currentUser || currentUser.role === 'admin' || currentUser?.email?.includes('admin') || currentUser?.email === 'rakibseohub@gmail.com';

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

        <div className="flex items-center gap-2">
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
                className="text-slate-400 hover:text-slate-600 p-1"
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

    </div>
  );
};
