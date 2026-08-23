import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Receipt, 
  Banknote, 
  CheckCircle2, 
  Building, 
  Clock, 
  CreditCard, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Send,
  Loader2,
  XCircle
} from 'lucide-react';

export const DeliveryMoneyCollected: React.FC = () => {
  const { 
    collections, 
    currentDeliveryUser, 
    cashHandovers, 
    submitCashHandover, 
    formatBDT 
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentDeliveryUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Accessing cash pouch records...</p>
      </div>
    );
  }

  // Driver collections matching current driver
  const myCollections = collections.filter(c => 
    (c && currentDeliveryUser && (
      c.collectorId === currentDeliveryUser.id || 
      c.collectorId === currentDeliveryUser.uid ||
      (currentDeliveryUser.id === 'deliv-01' && c.collectedByRole === 'delivery')
    ))
  );

  // Active pending handover for this driver
  const pendingHandover = cashHandovers.find(h => 
    (h && currentDeliveryUser && (
      h.driverId === currentDeliveryUser.id || h.driverId === currentDeliveryUser.uid || currentDeliveryUser.id === 'deliv-01'
    )) && h.status === 'pending'
  );

  // Financial calculations
  const myCashInHand = currentDeliveryUser.cashInHand || 0;

  const pendingHandoverAmount = pendingHandover ? pendingHandover.amount : 0;

  const reconciledAmount = collections
    .filter(c => 
      (c && currentDeliveryUser && (
        c.collectorId === currentDeliveryUser.id || c.collectorId === currentDeliveryUser.uid || currentDeliveryUser.id === 'deliv-01'
      )) && 
      c.paymentMethod?.toLowerCase() === 'cash' && 
      c.reconciledWithAdmin
    )
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const handleHandoverSubmit = async () => {
    if (myCashInHand <= 0 || pendingHandover) return;
    setIsSubmitting(true);
    try {
      await submitCashHandover(currentDeliveryUser.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-teal-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Driver Cash Pouch & Collections</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Courier Cash Desk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Reconciliation of Cash on Delivery and physical collections. Handovers use atomic transactions.
          </p>
        </div>
      </div>

      {/* 3 Financial Cards (Teal & Emerald Theme) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Current Cash in Driver Pouch */}
        <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-900">Current Cash in Driver Pouch</span>
              <div className="p-2 bg-teal-100 rounded-xl text-teal-700">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-950 mt-1">{formatBDT(myCashInHand)}</div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Physical cash in pouch ready for HQ cashier deposit.
          </p>
        </div>

        {/* Card 2: Pending HQ Handover */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Pending HQ Handover</span>
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">{formatBDT(pendingHandoverAmount)}</div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            {pendingHandover 
              ? 'Handover submitted. Awaiting cashier verification.' 
              : 'No pending handover requests currently.'}
          </p>
        </div>

        {/* Card 3: Reconciled / Handed to HQ */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Reconciled / Handed to HQ</span>
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">{formatBDT(reconciledAmount)}</div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Verified and banked into Glowzaa master vault.
          </p>
        </div>

      </div>

      {/* Main Action Banner */}
      <div className="bg-teal-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-300">HQ Cash Reconciliation Action</span>
            {pendingHandover && (
              <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full">
                VERIFICATION PENDING
              </span>
            )}
          </div>
          <div className="text-xl font-bold text-white">
            {pendingHandover ? `Submitted Handover: ${formatBDT(pendingHandover.amount)}` : `Cash Available to Deposit: ${formatBDT(myCashInHand)}`}
          </div>
          <p className="text-xs text-teal-100/80">
            {pendingHandover 
              ? `Handover request submitted on ${new Date(pendingHandover.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Driver pouch balance is held until HQ Cashier confirms.`
              : myCashInHand > 0 
                ? 'Clicking handover creates a persistent record in Firestore and locks receipts for verification.'
                : 'All collected cash has been handed over or verified.'}
          </p>
        </div>

        <div>
          {pendingHandover ? (
            <button
              disabled
              className="px-5 py-3 rounded-xl bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold text-xs shrink-0 flex items-center gap-2 cursor-not-allowed"
            >
              <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Handover Pending — Awaiting HQ Verification</span>
            </button>
          ) : myCashInHand > 0 ? (
            <button
              onClick={handleHandoverSubmit}
              disabled={isSubmitting}
              className="px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-extrabold text-sm shadow-md transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Send className="w-4 h-4 text-slate-950" />
              )}
              <span>Handover Cash to HQ Cashier</span>
            </button>
          ) : (
            <button
              disabled
              className="px-5 py-3 rounded-xl bg-white/10 text-teal-200/60 border border-white/10 font-medium text-xs shrink-0 flex items-center gap-2 cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4 text-teal-300/50" />
              <span>No cash available for handover</span>
            </button>
          )}
        </div>
      </div>

      {/* Driver Handover Requests History */}
      {cashHandovers.filter(h => h.driverId === currentDeliveryUser.id || h.driverId === currentDeliveryUser.uid || currentDeliveryUser.id === 'deliv-01').length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">Driver Cash Handover Submissions</h2>
            <span className="text-xs text-slate-500">Firestore Audit Log</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Handover ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Reviewed By</th>
                  <th className="py-3 px-4">Notes / Rejection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashHandovers
                  .filter(h => h.driverId === currentDeliveryUser.id || h.driverId === currentDeliveryUser.uid || currentDeliveryUser.id === 'deliv-01')
                  .map(h => (
                    <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-900 font-bold">{h.id.substring(0, 10)}...</td>
                      <td className="py-3 px-4 font-extrabold text-teal-800">{formatBDT(h.amount)}</td>
                      <td className="py-3 px-4">
                        {h.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending HQ Review
                          </span>
                        )}
                        {h.status === 'accepted' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Accepted & Vaulted
                          </span>
                        )}
                        {h.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(h.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {h.reviewedByUserName || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {h.rejectionReason || h.notes || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Driver Receipts Issued Today */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Receipts Issued by Driver</h2>
          <span className="text-xs text-slate-500">{myCollections.length} total receipts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Retail Shop</th>
                <th className="py-3 px-4">Method & Ref</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myCollections.map(col => (
                <tr key={col.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{col.collectionNumber}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{col.shopName}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {col.paymentMethod} {col.referenceNo && `(${col.referenceNo})`}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{col.collectedAt}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-teal-800">{formatBDT(col.amount)}</td>
                  <td className="py-3 px-4 text-center">
                    {col.reconciledWithAdmin ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Reconciled
                      </span>
                    ) : col.handoverStatus === 'pending' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Pending Verification
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        In Pouch
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {myCollections.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No cash collections recorded yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
