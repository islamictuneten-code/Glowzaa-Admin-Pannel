import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { 
  GoodsReceipt, GoodsReceiptItem, PurchaseOrder, 
  PurchaseOrderItem, GoodsReceiptStatus 
} from '../../../types';
import { 
  getGoodsReceipts, getGoodsReceiptItems, postGoodsReceipt, 
  cancelGoodsReceipt, reconcilePurchaseOrder, getReceivingExceptions,
  ReceivingException, getPurchaseOrderReceivingHistory, POReceivingHistorySummary
} from '../../../services/grnService';
import { getPurchaseOrders, getPurchaseOrderItems } from '../../../services/purchaseOrderService';
import { Modal } from '../../shared/Modal';
import { Badge } from '../../shared/Badge';
import { 
  Package, Search, CheckCircle2, XCircle, Clock, Truck, 
  FileText, Loader2, AlertTriangle, List, ArrowRight,
  ShieldCheck, ShieldAlert, History, Filter, RefreshCw,
  TrendingDown, Check, X, AlertCircle
} from 'lucide-react';
import { GoodsReceiptForm } from './GoodsReceiptForm';

export const GoodsReceivingDashboard: React.FC = () => {
  const { formatBDT, products } = useApp();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'receipts' | 'active_pos' | 'exceptions' | 'history'>('receipts');
  
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [exceptions, setExceptions] = useState<ReceivingException[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [viewingReceipt, setViewingReceipt] = useState<GoodsReceipt | null>(null);
  const [viewingReceiptItems, setViewingReceiptItems] = useState<GoodsReceiptItem[]>([]);
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [confirmingPostGrn, setConfirmingPostGrn] = useState<GoodsReceipt | null>(null);
  const [confirmingPostItems, setConfirmingPostItems] = useState<GoodsReceiptItem[]>([]);
  
  // History tab PO selection
  const [selectedHistoryPoId, setSelectedHistoryPoId] = useState<string>('');
  const [historySummary, setHistorySummary] = useState<POReceivingHistorySummary | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedReceipts, fetchedPos, fetchedExceptions] = await Promise.all([
        getGoodsReceipts(),
        getPurchaseOrders(),
        getReceivingExceptions()
      ]);
      setReceipts(fetchedReceipts);
      setPos(fetchedPos.filter(p => ['approved', 'sent_to_supplier', 'supplier_confirmed', 'in_transit', 'partially_received', 'received'].includes(p.status)));
      setExceptions(fetchedExceptions);
    } catch (err) {
      console.error('Error loading goods receiving data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.uid]);

  // Load history summary when selectedHistoryPoId changes
  useEffect(() => {
    if (!selectedHistoryPoId) {
      setHistorySummary(null);
      return;
    }
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const summary = await getPurchaseOrderReceivingHistory(selectedHistoryPoId);
        setHistorySummary(summary);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [selectedHistoryPoId]);

  const openPostConfirmation = async (receipt: GoodsReceipt) => {
    setConfirmingPostGrn(receipt);
    const items = await getGoodsReceiptItems(receipt.id);
    setConfirmingPostItems(items);
  };

  const handleExecutePost = async () => {
    if (!currentUser || !confirmingPostGrn) return;
    
    setActionLoading(true);
    try {
      const res = await postGoodsReceipt(confirmingPostGrn.id, currentUser);
      if (res.success) {
        setFeedback({ 
          type: 'success', 
          message: `Goods Receipt ${confirmingPostGrn.grnNumber} posted successfully! Inventory has been updated.` 
        });
        setConfirmingPostGrn(null);
        setViewingReceipt(null);
        fetchData();
      } else {
        setFeedback({ 
          type: 'error', 
          message: res.error || 'Failed to post Goods Receipt.' 
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelGrn = async (grnId: string) => {
    if (!currentUser) return;
    const reason = window.prompt('Enter reason for cancelling this Goods Receipt:');
    if (!reason) return;
    
    setActionLoading(true);
    try {
      const res = await cancelGoodsReceipt(grnId, reason, currentUser);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Goods Receipt cancelled.' });
        setViewingReceipt(null);
        fetchData();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to cancel Goods Receipt.' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const loadReceiptDetails = async (receipt: GoodsReceipt) => {
    setViewingReceipt(receipt);
    const items = await getGoodsReceiptItems(receipt.id);
    setViewingReceiptItems(items);
  };

  const handleReconcile = async (poId: string, poNumber: string) => {
    if (!currentUser) return;
    if (!window.confirm(`Reconcile and close Purchase Order ${poNumber}? Any short delivery variance will be permanently preserved.`)) {
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await reconcilePurchaseOrder(poId, currentUser);
      if (res.success) {
        setFeedback({ type: 'success', message: `PO ${poNumber} reconciled and closed successfully.` });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to reconcile PO.' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Top KPIs calculations
  const pendingReceipts = receipts.filter(r => r.status === 'pending_post' || r.status === 'draft');
  const partialReceipts = receipts.filter(r => r.totalAcceptedQuantity < r.totalOrderedQuantity);
  const todayStr = new Date().toDateString();
  const receivedToday = receipts.filter(r => new Date(r.createdAt).toDateString() === todayStr);
  const totalDamagedUnits = receipts.reduce((sum, r) => sum + (r.totalDamagedQuantity || 0), 0);
  const totalShortExceptions = exceptions.filter(e => e.discrepancyType === 'short' || e.discrepancyType === 'mixed').length;
  const totalReceivingValueBDT = receipts.reduce((sum, r) => sum + (r.subtotalReceivedValueBDT || 0), 0);

  // Filtered receipts
  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = 
      r.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-[#0F766E]/10 rounded-xl text-[#0F766E]">
              <Package className="w-6 h-6" />
            </div>
            Goods Receiving & Inventory Reconciliation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Glowzaa B2B ERP — Atomic stock-in, line item verification, and variance reconciliation.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('receipts')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'receipts' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All GRNs ({receipts.length})
          </button>
          <button 
            onClick={() => setActiveTab('active_pos')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'active_pos' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active POs & Receive ({pos.length})
          </button>
          <button 
            onClick={() => setActiveTab('exceptions')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'exceptions' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exceptions ({exceptions.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'history' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PO History
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm font-semibold ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6 Executive Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Pending Receipts</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingReceipts.length}</p>
          <span className="text-[11px] text-slate-400">Awaiting post</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Partial Receipts</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">{partialReceipts.length}</p>
          <span className="text-[11px] text-slate-400">Split delivery</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Received Today</p>
          <p className="text-2xl font-bold text-[#0F766E] mt-1">{receivedToday.length}</p>
          <span className="text-[11px] text-slate-400">Past 24 hours</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Damaged Units</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{totalDamagedUnits}</p>
          <span className="text-[11px] text-slate-400">Excluded from stock</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Short Deliveries</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{totalShortExceptions}</p>
          <span className="text-[11px] text-slate-400">Variances recorded</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Receiving Value</p>
          <p className="text-lg font-bold text-slate-900 mt-1 truncate">{formatBDT(totalReceivingValueBDT)}</p>
          <span className="text-[11px] text-slate-400">Total accepted BDT</span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
          <p className="text-sm font-medium text-slate-500">Synchronizing procurement records & stock transactions...</p>
        </div>
      ) : activeTab === 'receipts' ? (
        /* TAB 1: ALL GRNS */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search GRN number, PO number, or supplier..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-[#0F766E]"
              >
                <option value="all">All Statuses</option>
                <option value="pending_post">Pending Post</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted (Stock-In)</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button 
                onClick={fetchData} 
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 rounded-lg border border-slate-200"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table of GRNs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">GRN Number</th>
                    <th className="py-3.5 px-4">PO Reference</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-3 text-right">Received</th>
                    <th className="py-3.5 px-3 text-right">Accepted</th>
                    <th className="py-3.5 px-3 text-right">Damaged/Rejected</th>
                    <th className="py-3.5 px-3 text-right">Accepted Value</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                        No goods receipts found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map(receipt => (
                      <tr key={receipt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{receipt.grnNumber}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{receipt.poNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{receipt.supplierName}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">{receipt.totalReceivedQuantity}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40">
                          {receipt.totalAcceptedQuantity}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-rose-600">
                          {(receipt.totalDamagedQuantity || 0) + (receipt.totalRejectedQuantity || 0)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">
                          {formatBDT(receipt.subtotalReceivedValueBDT)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                            receipt.status === 'posted' ? 'bg-emerald-100 text-emerald-800' :
                            receipt.status === 'pending_post' || receipt.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {receipt.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(receipt.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button 
                            onClick={() => loadReceiptDetails(receipt)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#0F766E] bg-[#0F766E]/10 rounded hover:bg-[#0F766E]/20"
                          >
                            View Details
                          </button>
                          {(receipt.status === 'pending_post' || receipt.status === 'draft') && currentUser?.role === 'admin' && (
                            <button 
                              onClick={() => openPostConfirmation(receipt)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-[#0F766E] rounded shadow-sm hover:bg-[#0d645d]"
                            >
                              Post Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'active_pos' ? (
        /* TAB 2: ACTIVE POS & RECEIVE */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Purchase Orders Ready for Receiving</h2>
              <p className="text-xs text-slate-500">Receive whole or partial delivery shipments into GRN.</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-full">{pos.length} Active Orders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-3 text-center">Ordered</th>
                  <th className="py-3.5 px-3 text-center">Received</th>
                  <th className="py-3.5 px-3 text-center">Remaining</th>
                  <th className="py-3.5 px-4">Receiving Progress</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pos.map(po => {
                  const progress = po.totalOrderedQuantity > 0 ? (po.totalReceivedQuantity / po.totalOrderedQuantity) * 100 : 0;
                  const isComplete = po.totalRemainingQuantity === 0;

                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{po.supplierName}</td>
                      <td className="py-3.5 px-3 text-center font-semibold text-slate-500">{po.totalOrderedQuantity}</td>
                      <td className="py-3.5 px-3 text-center font-bold text-emerald-700">{po.totalReceivedQuantity}</td>
                      <td className="py-3.5 px-3 text-center font-bold text-amber-700">{po.totalRemainingQuantity}</td>
                      <td className="py-3.5 px-4">
                        <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full ${isComplete ? 'bg-emerald-600' : 'bg-[#0F766E]'}`} 
                            style={{ width: `${Math.min(100, progress)}%` }} 
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={po.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {po.status !== 'closed' && po.totalRemainingQuantity > 0 && (
                          <button 
                            onClick={() => setReceivingPo(po)}
                            className="px-3 py-1.5 bg-[#0F766E] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#0d645d] transition-colors"
                          >
                            Receive Goods
                          </button>
                        )}
                        {(po.status === 'partially_received' || po.status === 'received') && currentUser?.role === 'admin' && (
                          <button 
                            onClick={() => handleReconcile(po.id, po.poNumber)}
                            className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors"
                          >
                            Reconcile & Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'exceptions' ? (
        /* TAB 3: RECEIVING EXCEPTIONS */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Receiving Discrepancies & Quality Exceptions</h2>
              <p className="text-xs text-slate-500">Audit trail of short deliveries, over deliveries, damaged shipments, and wrong products.</p>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
              {exceptions.length} Exceptions Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">GRN #</th>
                  <th className="py-3.5 px-4">PO #</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-3 text-center">Ordered</th>
                  <th className="py-3.5 px-3 text-center">Received</th>
                  <th className="py-3.5 px-3 text-center">Accepted</th>
                  <th className="py-3.5 px-3 text-center">Damaged / Rejected</th>
                  <th className="py-3.5 px-4">Discrepancy Type</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exceptions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      No receiving discrepancies or quality issues recorded. All shipments 100% compliant.
                    </td>
                  </tr>
                ) : (
                  exceptions.map(exc => (
                    <tr key={exc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{exc.grnNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{exc.poNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{exc.supplierName}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{exc.productName}</td>
                      <td className="py-3 px-3 text-center text-slate-500 font-semibold">{exc.orderedQuantity}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{exc.receivedQuantity}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700">{exc.acceptedQuantity}</td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">
                        {exc.damagedQuantity + exc.rejectedQuantity}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          exc.discrepancyType === 'damaged' ? 'bg-rose-100 text-rose-800' :
                          exc.discrepancyType === 'short' ? 'bg-amber-100 text-amber-800' :
                          exc.discrepancyType === 'wrong_product' ? 'bg-purple-100 text-purple-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {exc.discrepancyType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{exc.notes || exc.discrepancyReason || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(exc.receivedDate).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 4: PO RECEIVING HISTORY */
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
              Select Purchase Order:
            </label>
            <select 
              value={selectedHistoryPoId}
              onChange={e => setSelectedHistoryPoId(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-[#0F766E]"
            >
              <option value="">-- Choose a Purchase Order --</option>
              {pos.map(po => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} — {po.supplierName} ({po.status})
                </option>
              ))}
            </select>
          </div>

          {historyLoading ? (
            <div className="p-12 flex justify-center bg-white rounded-xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
            </div>
          ) : historySummary ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Ordered</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{historySummary.totalOrderedQuantity} Units</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Received Total</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{historySummary.totalReceivedQuantity} Units</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Accepted (Stocked)</span>
                  <p className="text-xl font-bold text-emerald-700 mt-0.5">{historySummary.totalAcceptedQuantity} Units</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Damaged / Rejected</span>
                  <p className="text-xl font-bold text-rose-600 mt-0.5">{historySummary.totalDamagedQuantity + historySummary.totalRejectedQuantity} Units</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Variance</span>
                  <p className="text-xl font-bold text-amber-700 mt-0.5">{historySummary.varianceQuantity} Units</p>
                </div>
              </div>

              {/* GRN Sessions */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Receiving Sessions (GRNs) for {historySummary.poNumber}
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {historySummary.receipts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">
                      No Goods Receipts created yet for this Purchase Order.
                    </div>
                  ) : (
                    historySummary.receipts.map(rec => (
                      <div key={rec.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">{rec.grnNumber}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              rec.status === 'posted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {rec.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Received on {new Date(rec.receivedAt).toLocaleString()} by {rec.receivedByUserName}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 text-xs">
                          <div>
                            <span className="text-slate-400 block">Accepted</span>
                            <span className="font-bold text-emerald-700 text-sm">{rec.totalAcceptedQuantity} Units</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Damaged</span>
                            <span className="font-bold text-rose-600 text-sm">{rec.totalDamagedQuantity} Units</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Stock Value</span>
                            <span className="font-bold text-slate-900 text-sm">{formatBDT(rec.subtotalReceivedValueBDT)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm font-medium">
              Please select a Purchase Order from the dropdown above to view its historical receiving trail.
            </div>
          )}
        </div>
      )}

      {/* GRN View Details Modal */}
      <Modal 
        isOpen={!!viewingReceipt} 
        onClose={() => !actionLoading && setViewingReceipt(null)} 
        title={`Goods Receipt: ${viewingReceipt?.grnNumber}`} 
        maxWidth="4xl"
      >
        {viewingReceipt && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-medium">PO Reference</span>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{viewingReceipt.poNumber}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Supplier</span>
                <p className="font-semibold text-slate-900 text-sm mt-0.5">{viewingReceipt.supplierName}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Status</span>
                <p className="font-bold uppercase text-[#0F766E] text-sm mt-0.5">{viewingReceipt.status.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Received By</span>
                <p className="font-medium text-slate-900 text-sm mt-0.5">{viewingReceipt.receivedByUserName}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-right">Received</th>
                      <th className="py-2.5 px-3 text-right">Accepted</th>
                      <th className="py-2.5 px-3 text-right">Damaged</th>
                      <th className="py-2.5 px-3 text-right">Rejected</th>
                      <th className="py-2.5 px-3 text-right">Stock Value</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingReceiptItems.map(item => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.productName}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{item.receivedQuantity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40">{item.acceptedQuantity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">{item.damagedQuantity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-700">{item.rejectedQuantity}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatBDT(item.acceptedValueBDT)}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                {viewingReceipt.deliveryNoteNumber && <span>Challan: {viewingReceipt.deliveryNoteNumber} | </span>}
                {viewingReceipt.supplierInvoiceNumber && <span>Invoice: {viewingReceipt.supplierInvoiceNumber}</span>}
              </div>
              <div className="flex gap-2">
                {(viewingReceipt.status === 'draft' || viewingReceipt.status === 'pending_post') && currentUser?.role === 'admin' && (
                  <>
                    <button 
                      onClick={() => handleCancelGrn(viewingReceipt.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-100 text-rose-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                    >
                      Cancel GRN
                    </button>
                    <button 
                      onClick={() => {
                        const rec = viewingReceipt;
                        setViewingReceipt(null);
                        openPostConfirmation(rec);
                      }}
                      disabled={actionLoading}
                      className="px-5 py-2 bg-[#0F766E] text-white text-xs font-bold rounded-lg shadow hover:bg-[#0d645d]"
                    >
                      Post & Update Inventory
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal Before Posting (Mandatory Rule #19) */}
      <Modal 
        isOpen={!!confirmingPostGrn} 
        onClose={() => !actionLoading && setConfirmingPostGrn(null)} 
        title="Post Goods Receipt?" 
        maxWidth="md"
      >
        {confirmingPostGrn && (
          <div className="space-y-5">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <span>Permanent Inventory Stock-In</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Once posted, inventory will be updated and this receipt cannot be edited directly.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">GRN Number:</span>
                <span className="font-mono font-bold text-slate-900">{confirmingPostGrn.grnNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PO Number:</span>
                <span className="font-mono font-bold text-slate-900">{confirmingPostGrn.poNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Received:</span>
                <span className="font-bold text-slate-900">{confirmingPostGrn.totalReceivedQuantity} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Accepted (Stock-In):</span>
                <span className="font-bold text-emerald-700 text-sm">+{confirmingPostGrn.totalAcceptedQuantity} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Damaged:</span>
                <span className="font-bold text-rose-600">{confirmingPostGrn.totalDamagedQuantity} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Rejected:</span>
                <span className="font-bold text-amber-700">{confirmingPostGrn.totalRejectedQuantity} Units</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                <span>Estimated Stock Increase Value:</span>
                <span className="text-[#0F766E]">{formatBDT(confirmingPostGrn.subtotalReceivedValueBDT)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setConfirmingPostGrn(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button 
                onClick={handleExecutePost}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#0d645d] flex items-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Confirm & Post Inventory</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Receiving Flow Modal */}
      {receivingPo && (
        <GoodsReceiptForm 
          purchaseOrder={receivingPo} 
          onClose={() => setReceivingPo(null)} 
          onSuccess={() => {
            setReceivingPo(null);
            fetchData();
            setFeedback({ type: 'success', message: 'Goods Receipt draft created successfully. Proceed to Post to update inventory.' });
          }}
        />
      )}
    </div>
  );
};
