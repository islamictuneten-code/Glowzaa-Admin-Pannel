import React, { useState } from 'react';
import { ExecutiveBISettings, AuthUser } from '../../../types';
import { saveExecutiveBISettings } from '../../../services/executiveBIService';
import { 
  Settings, 
  X, 
  Save, 
  Percent, 
  Calendar, 
  DollarSign, 
  ShieldAlert,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface ExecutiveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ExecutiveBISettings;
  onSaved: (updated: ExecutiveBISettings) => void;
  currentUser: AuthUser;
}

export const ExecutiveSettingsModal: React.FC<ExecutiveSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaved,
  currentUser
}) => {
  const [form, setForm] = useState<ExecutiveBISettings>({ ...settings });
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await saveExecutiveBISettings(form, currentUser);
      onSaved(form);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Executive BI & Profit Thresholds</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure organizational margin rules, alert triggers, and customer dormancy thresholds.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50">
          
          {/* Section 1: Margin & Profitability Thresholds */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Gross Margin & Profit Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Low Gross Margin Threshold (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.lowMarginThresholdPercent}
                    onChange={e => setForm({ ...form, lowMarginThresholdPercent: Number(e.target.value) })}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Products with margin below this % trigger low margin warnings.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  High Wholesale Discount Alert (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.highDiscountThresholdPercent}
                    onChange={e => setForm({ ...form, highDiscountThresholdPercent: Number(e.target.value) })}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Orders or line items with trade discounts exceeding this % are flagged.
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                High-Volume Sales Threshold (BDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5000"
                  step="5000"
                  value={form.highSalesVolumeThresholdBDT}
                  onChange={e => setForm({ ...form, highSalesVolumeThresholdBDT: Number(e.target.value) })}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
                <span className="text-xs font-bold text-slate-400 absolute right-3 top-2">৳</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Products generating sales above this value with low margins trigger priority action cards.
              </span>
            </div>
          </div>

          {/* Section 2: Customer Dormancy & Target Thresholds */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Customer Retention & Sales Targets
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Inactive Customer Threshold (Days)
                </label>
                <select
                  value={form.inactiveCustomerDays}
                  onChange={e => setForm({ ...form, inactiveCustomerDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value={30}>30 Days (High Sensitivity)</option>
                  <option value={45}>45 Days</option>
                  <option value={60}>60 Days (Standard B2B)</option>
                  <option value={90}>90 Days (Quarterly)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Retailers with no orders for N days are classified as dormant.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Target Warning Level (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="50"
                    max="95"
                    value={form.targetWarningThresholdPercent}
                    onChange={e => setForm({ ...form, targetWarningThresholdPercent: Number(e.target.value) })}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Sales officers below this % benchmark receive Watch status.
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save BI Policies'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
