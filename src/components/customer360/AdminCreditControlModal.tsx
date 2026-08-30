import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Lock, Calendar, FileText, X } from 'lucide-react';
import { Customer, CreditCheckMode } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatBDT } from '../../utils/formatters';

interface AdminCreditControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

export const AdminCreditControlModal: React.FC<AdminCreditControlModalProps> = ({
  isOpen,
  onClose,
  customer
}) => {
  const { updateCustomerCreditControl, addToast } = useApp();
  const { currentUser } = useAuth();

  const [creditLimit, setCreditLimit] = useState<number>(customer.creditLimit || 100000);
  const [creditCheckMode, setCreditCheckMode] = useState<CreditCheckMode>(customer.creditCheckMode || 'NONE');
  const [creditHold, setCreditHold] = useState<boolean>(customer.creditHold || false);
  const [creditHoldReason, setCreditHoldReason] = useState<string>(customer.creditHoldReason || '');
  const [creditReviewDate, setCreditReviewDate] = useState<string>(customer.creditReviewDate || '');
  const [creditNote, setCreditNote] = useState<string>(customer.creditNote || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 text-center shadow-xl">
          <Shield className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
          <p className="text-sm text-slate-600 mt-2">
            Only designated Administrators have permission to modify credit limits, enforcement modes, or hold status.
          </p>
          <button
            onClick={onClose}
            className="mt-5 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creditHold && !creditHoldReason.trim()) {
      addToast({
        type: 'warning',
        title: 'Hold Reason Required',
        message: 'Please provide a clear reason for placing this customer on Credit Hold.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateCustomerCreditControl(
        customer.id,
        {
          creditLimit: Math.max(0, Number(creditLimit) || 0),
          creditCheckMode,
          creditHold,
          creditHoldReason: creditHold ? creditHoldReason.trim() : '',
          creditReviewDate,
          creditNote: creditNote.trim()
        },
        customer
      );

      if (res.success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-[#0F766E] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Shield className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Admin Smart Credit Control</h2>
              <p className="text-xs text-teal-100/90 font-medium">
                {customer.shopName} • ID: {customer.customerId || customer.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-sm">
          {/* Current Ledger Summary Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 block text-[11px] font-medium">Current Outstanding Due</span>
              <span className="font-bold text-rose-600 text-base">{formatBDT(customer.currentDue || 0)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px] font-medium">Total Lifetime Purchase</span>
              <span className="font-semibold text-slate-900 text-sm">{formatBDT(customer.totalPurchase || 0)}</span>
            </div>
          </div>

          {/* Credit Limit Field */}
          <div>
            <label className="block font-semibold text-slate-800 text-xs mb-1.5 flex items-center justify-between">
              <span>Maximum Credit Limit (৳ BDT)</span>
              <span className="text-slate-500 text-[11px] font-normal">0 = Strict Cash-on-Booking</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Math.max(0, Number(e.target.value)))}
                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-[#0F766E] focus:border-transparent outline-hidden"
                placeholder="e.g. 150000"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Available Credit: <strong className="text-emerald-700">{formatBDT(Math.max(0, creditLimit - (customer.currentDue || 0)))}</strong>
            </p>
          </div>

          {/* Credit Check Enforcement Mode */}
          <div>
            <label className="block font-semibold text-slate-800 text-xs mb-2">
              Credit Check Enforcement Mode
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  id: 'NONE',
                  label: 'NONE',
                  desc: 'No restriction'
                },
                {
                  id: 'WARNING',
                  label: 'WARNING',
                  desc: 'Prompt seller'
                },
                {
                  id: 'BLOCK',
                  label: 'BLOCK',
                  desc: 'Block over-limit'
                }
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setCreditCheckMode(m.id as CreditCheckMode)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    creditCheckMode === m.id
                      ? 'border-[#0F766E] bg-teal-50/80 ring-2 ring-[#0F766E]/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs ${creditCheckMode === m.id ? 'text-[#0F766E]' : 'text-slate-800'}`}>
                      {m.label}
                    </span>
                    {creditCheckMode === m.id && <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {creditCheckMode === 'BLOCK' && '⚠️ Orders creating balance over limit will be hard-blocked unless overridden by an Admin.'}
              {creditCheckMode === 'WARNING' && 'ℹ️ Sellers receive a prominent credit warning with exposure breakdown before order placement.'}
              {creditCheckMode === 'NONE' && '✓ Standard flexible credit without automated order locking.'}
            </p>
          </div>

          {/* Administrative Credit Hold */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-lg ${creditHold ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Administrative Credit Hold</span>
                  <span className="text-[11px] text-slate-500">Completely freezes credit order booking for all sales staff</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={creditHold}
                  onChange={(e) => setCreditHold(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {creditHold && (
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-rose-900 mb-1">
                  Reason for Credit Hold (Mandatory) *
                </label>
                <input
                  type="text"
                  value={creditHoldReason}
                  onChange={(e) => setCreditHoldReason(e.target.value)}
                  placeholder="e.g. Overdue payment over 45 days / Dishonored cheque"
                  className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-hidden"
                  required={creditHold}
                />
              </div>
            )}
          </div>

          {/* Credit Review Date */}
          <div>
            <label className="block font-semibold text-slate-800 text-xs mb-1.5 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Next Credit Review Date</span>
            </label>
            <input
              type="date"
              value={creditReviewDate}
              onChange={(e) => setCreditReviewDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#0F766E] outline-hidden"
            />
          </div>

          {/* Internal Credit Note */}
          <div>
            <label className="block font-semibold text-slate-800 text-xs mb-1.5 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Internal Credit Evaluation Notes</span>
            </label>
            <textarea
              rows={2}
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
              placeholder="e.g. Approved ৳150k credit limit based on 6-month consistent repayment history."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#0F766E] outline-hidden resize-none"
            />
          </div>

          {/* Audit Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              All adjustments to credit limits, hold flags, and enforcement modes are permanently recorded in the system audit trail with your admin credentials.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-slate-400 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Saving Policy...</span>
              ) : (
                <span>Save Credit Policy</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
