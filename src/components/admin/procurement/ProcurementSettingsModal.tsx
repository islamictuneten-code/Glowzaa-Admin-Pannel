import React, { useState } from 'react';
import { X, ShieldAlert, Save, Sliders, AlertTriangle } from 'lucide-react';
import { ProcurementSettings, AuthUser } from '../../../types';
import { saveProcurementSettings } from '../../../services/smartProcurementService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: ProcurementSettings;
  currentUser: AuthUser;
  onSaved: () => void;
}

export const ProcurementSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  currentUser,
  onSaved
}) => {
  const [formData, setFormData] = useState<Partial<ProcurementSettings>>({
    highValueApprovalThresholdBDT: settings.highValueApprovalThresholdBDT || 50000,
    defaultLeadTimeDays: settings.defaultLeadTimeDays || 7,
    defaultSafetyStockDays: settings.defaultSafetyStockDays || 7,
    overstockThresholdDays: settings.overstockThresholdDays || 60,
    demandSpikeThresholdPercent: settings.demandSpikeThresholdPercent || 30,
    demandDropThresholdPercent: settings.demandDropThresholdPercent || -30
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await saveProcurementSettings(formData, currentUser);
      if (res.success) {
        onSaved();
        onClose();
      } else {
        setError(res.error || 'Failed to update settings');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#0F766E] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-800/60 rounded-xl">
              <Sliders className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Procurement Intelligence Settings</h2>
              <p className="text-xs text-teal-100/90">Thresholds, risk limits & approval rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                High-Value PO Approval Threshold (৳ BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-sm">৳</span>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={formData.highValueApprovalThresholdBDT}
                  onChange={e => setFormData({ ...formData, highValueApprovalThresholdBDT: Number(e.target.value) })}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Purchase recommendations above this amount will trigger an explicit high-value confirmation step.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Default Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.defaultLeadTimeDays}
                  onChange={e => setFormData({ ...formData, defaultLeadTimeDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Used if supplier lead time is unconfigured.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Safety Stock Buffer (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.defaultSafetyStockDays}
                  onChange={e => setFormData({ ...formData, defaultSafetyStockDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Days of daily demand reserved as safety buffer.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Overstock Threshold (Days)
                </label>
                <input
                  type="number"
                  min="15"
                  max="365"
                  value={formData.overstockThresholdDays}
                  onChange={e => setFormData({ ...formData, overstockThresholdDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Holding days exceeding this will flag overstock.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Demand Spike Sensitivity (%)
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={formData.demandSpikeThresholdPercent}
                  onChange={e => setFormData({ ...formData, demandSpikeThresholdPercent: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Sales velocity jump % triggering demand spike.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#0d645e] text-white text-sm font-semibold rounded-xl shadow-xs shadow-[#0F766E]/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
