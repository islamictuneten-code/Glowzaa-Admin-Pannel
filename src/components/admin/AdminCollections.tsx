import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  Clock, 
  Truck, 
  UserCheck, 
  Building2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export const AdminCollections: React.FC = () => {
  const { 
    collections, 
    deliveryStaff, 
    cashHandovers, 
    acceptCashHandover, 
    rejectCashHandover, 
    reconcileCollection, 
    formatBDT 
  } = useApp();

  const [search, setSearch] = useState('');
  const [collectorRoleFilter, setCollectorRoleFilter] = useState<'all' | 'delivery' | 'sales' | 'admin'>('all');
  const [processingHandoverId, setProcessingHandoverId] = useState<string | null>(null);

  const pendingHandovers = cashHandovers.filter(h => h.status === 'pending');

  const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);
  const totalReconciled = collections.filter(c => c.reconciledWithAdmin).reduce((sum, c) => sum + c.amount, 0);
  const totalInTransit = collections
    .filter(c => c.paymentMethod?.toLowerCase() === 'cash' && !c.reconciledWithAdmin && c.handoverStatus !== 'pending')
    .reduce((sum, c) => sum + c.amount, 0);
  const totalPendingHandoverAmount = pendingHandovers.reduce((sum, h) => sum + h.amount, 0);

  const filteredCollections = collections.filter(c => {
    const matchesSearch = (c.collectionNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.shopName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.collectorName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (c.referenceNo && c.referenceNo.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = collectorRoleFilter === 'all' || c.collectedByRole === collectorRoleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAcceptHandover = async (handoverId: string) => {
    setProcessingHandoverId(handoverId);
    try {
      await acceptCashHandover(handoverId);
    } finally {
      setProcessingHandoverId(null);
    }
  };

  const handleRejectHandover = async (handoverId: string) => {
    const reason = window.prompt('Please enter the rejection reason for driver cash handover:');
    if (!reason) return;

    setProcessingHandoverId(handoverId);
    try {
      await rejectCashHandover(handoverId, reason);
    } finally {
      setProcessingHandoverId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-teal-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Daily Cash & HQ Reconciliation Desk</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              HQ Cashier Audit Desk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit and verify driver cash handover deposits into Glowzaa HQ vault.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Collections Logged</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(totalCollected)}</div>
          <span className="text-[11px] text-slate-500">{collections.length} individual receipts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Reconciled to HQ Vault</span>
          <div className="text-xl font-extrabold text-emerald-800 mt-1">{formatBDT(totalReconciled)}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Banked & verified</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Pending HQ Verification</span>
          <div className="text-xl font-extrabold text-amber-700 mt-1">{formatBDT(totalPendingHandoverAmount)}</div>
          <span className="text-[11px] text-amber-800 font-medium">{pendingHandovers.length} handover requests</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-teal-800 block">In Driver Pouches</span>
          <div className="text-xl font-extrabold text-teal-900 mt-1">{formatBDT(totalInTransit)}</div>
          <span className="text-[11px] text-teal-800 font-medium">Awaiting driver drop</span>
        </div>
      </div>

      {/* Pending Cash Handover Requests Banner/Section */}
      {pendingHandovers.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-300 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
              <h2 className="font-extrabold text-amber-950 text-sm">
                Pending Driver Cash Handover Requests ({pendingHandovers.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-900">Requires HQ Cashier Verification</span>
          </div>

          <div className="space-y-3">
            {pendingHandovers.map(handover => (
              <div 
                key={handover.id} 
                className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{handover.driverName}</span>
                    <span className="text-xs font-mono text-slate-500">({handover.driverId})</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Submitted: {new Date(handover.submittedAt).toLocaleString()} • Receipts: {handover.collectionIds.length}
                  </div>
                  <div className="text-xs font-semibold text-amber-800 mt-0.5">
                    {handover.notes}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Handover Amount</span>
                    <span className="text-lg font-black text-emerald-800">{formatBDT(handover.amount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptHandover(handover.id)}
                      disabled={processingHandoverId === handover.id}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {processingHandoverId === handover.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Accept Cash</span>
                    </button>

                    <button
                      onClick={() => handleRejectHandover(handover.id)}
                      disabled={processingHandoverId === handover.id}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courier Handover Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h2 className="font-bold text-slate-900 text-xs sm:text-sm">Delivery Driver Active Pouch Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {deliveryStaff.map(driver => {
            const hasPending = pendingHandovers.some(h => h.driverId === driver.id || h.driverId === driver.uid || driver.id === 'deliv-01');
            return (
              <div key={driver.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">{driver.name}</span>
                  <span className="text-[10px] text-slate-500">{driver.vehicleNumber}</span>
                  <div className="text-xs font-extrabold text-teal-800 mt-1">
                    Cash in Pouch: {formatBDT(driver.cashInHand)}
                  </div>
                </div>

                {hasPending ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                    Handover Pending
                  </span>
                ) : driver.cashInHand > 0 ? (
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-teal-100 text-teal-800">
                    Awaiting Drop
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Pouch Cleared</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Collections Feed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipts or shops..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={collectorRoleFilter}
              onChange={e => setCollectorRoleFilter(e.target.value as any)}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Collectors</option>
              <option value="delivery">Delivery Couriers Only</option>
              <option value="sales">Sales Officers Only</option>
              <option value="admin">Direct HQ Deposits Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Retail Shop</th>
                <th className="py-3 px-4">Collected By</th>
                <th className="py-3 px-4">Method & Ref</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCollections.map(col => (
                <tr key={col.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{col.collectionNumber}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{col.shopName}</span>
                    <span className="text-[11px] text-slate-500">{col.ownerName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 block">{col.collectorName}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{col.collectedByRole} Role</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800 block">{col.paymentMethod}</span>
                    <span className="font-mono text-[11px] text-slate-400">{col.referenceNo}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{col.collectedAt}</td>
                  <td className="py-3 px-4 text-right font-bold text-teal-800">{formatBDT(col.amount)}</td>
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
                  <td className="py-3 px-4 text-right">
                    {!col.reconciledWithAdmin && col.handoverStatus !== 'pending' && (
                      <button
                        onClick={() => reconcileCollection(col.id)}
                        className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px]"
                      >
                        Accept Direct
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
