import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from './Modal';
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Banknote, 
  Calendar, 
  Clock, 
  Receipt,
  ShoppingCart,
  Eye,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Mail,
  FileText,
  MessageSquare,
  ExternalLink,
  Store,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { Badge } from './Badge';
import { PaymentMethodOption } from '../../types';

export const CustomerDetailModal: React.FC = () => {
  const { 
    viewingCustomer, 
    setViewingCustomer, 
    orders, 
    payments,
    customerLedger,
    recordPayment,
    formatBDT, 
    setViewingOrder, 
    role, 
    setSalesTab 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'orders' | 'payments'>('overview');
  
  // Quick Collect State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethodOption>('bkash');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectRef, setCollectRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerOrders = useMemo(() => {
    if (!viewingCustomer) return [];
    return orders
      .filter(o => o.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.createdDate || b.createdAt || 0).getTime() - new Date(a.createdDate || a.createdAt || 0).getTime());
  }, [orders, viewingCustomer]);

  const customerPayments = useMemo(() => {
    if (!viewingCustomer) return [];
    return payments
      .filter(p => p.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, viewingCustomer]);

  const customerLedgerEntries = useMemo(() => {
    if (!viewingCustomer) return [];
    return customerLedger
      .filter(l => l.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [customerLedger, viewingCustomer]);

  if (!viewingCustomer) return null;

  const cleanPhone = viewingCustomer.phone.replace(/[^0-9]/g, '');
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('880') ? cleanPhone : '880' + cleanPhone.replace(/^0+/, '')}` : null;
  const isLimitExceeded = (viewingCustomer.currentDue || 0) > (viewingCustomer.creditLimit || 100000);

  const handleQuickCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Math.round(Number(collectAmount));
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const isAdvance = numAmount > viewingCustomer.currentDue;
      const res = await recordPayment({
        customerId: viewingCustomer.id,
        customerName: viewingCustomer.shopName,
        amount: numAmount,
        paymentMethod: collectMethod,
        paymentType: isAdvance ? 'advance_payment' : 'due_collection',
        notes: collectNotes.trim() || undefined,
        isAdvance
      });

      if (res.success) {
        setIsCollectModalOpen(false);
        setCollectAmount('');
        setCollectNotes('');
        setCollectRef('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLedgerTypeBadge = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">INVOICE DEBIT</span>;
      case 'PAYMENT':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">PAYMENT CREDIT</span>;
      case 'RETURN':
        return <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200">RETURN CREDIT</span>;
      case 'ADJUSTMENT':
        return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">ADJUSTMENT</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">{type}</span>;
    }
  };

  return (
    <Modal
      isOpen={!!viewingCustomer}
      onClose={() => setViewingCustomer(null)}
      title={viewingCustomer.shopName}
      subtitle={`Proprietor: ${viewingCustomer.ownerName} • ID: ${viewingCustomer.customerId || viewingCustomer.id.slice(0, 8)}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs text-slate-800">
        
        {/* Top Financial Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">Total Purchases</span>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{formatBDT(viewingCustomer.totalPurchase || 0)}</div>
            <span className="text-[10px] text-slate-500">{customerOrders.length} B2B orders</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">Total Collections</span>
            <div className="text-sm sm:text-base font-bold text-emerald-600 mt-0.5">{formatBDT(viewingCustomer.totalPaid || 0)}</div>
            <span className="text-[10px] text-emerald-600">{customerPayments.length} payments</span>
          </div>

          <div className="bg-red-50/50 p-3 rounded-lg border border-red-200">
            <span className="text-[10px] font-bold uppercase text-red-500 block tracking-wider">Current Due</span>
            <div className="text-sm sm:text-base font-extrabold text-red-700 mt-0.5">{formatBDT(viewingCustomer.currentDue || 0)}</div>
            <span className="text-[10px] text-red-600 font-medium">Terms: Net {viewingCustomer.paymentTermDays || 15}d</span>
          </div>

          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200">
            <span className="text-[10px] font-semibold uppercase text-blue-500 block tracking-wider">Advance Credit Held</span>
            <div className="text-sm sm:text-base font-bold text-blue-700 mt-0.5">{formatBDT(viewingCustomer.advanceBalance || 0)}</div>
            <span className="text-[10px] text-blue-600">Pre-paid balance</span>
          </div>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Account Overview
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Ledger Statement ({customerLedgerEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Orders ({customerOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Payment Vouchers ({customerPayments.length})
            </button>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={() => {
                setCollectAmount(viewingCustomer.currentDue > 0 ? String(viewingCustomer.currentDue) : '');
                setIsCollectModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Collect Payment</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-3.5">
            {/* Shop Location & Contact Info */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Shop Location & Address
                </span>
                <p className="font-semibold text-slate-900 text-xs">{viewingCustomer.address}</p>
                <p className="text-slate-600 text-xs mt-0.5">
                  Area / Market: <span className="font-medium text-slate-800">{viewingCustomer.area || 'N/A'}</span>
                </p>
                <p className="text-slate-600 text-xs">
                  District & City: <span className="font-medium text-slate-800">{viewingCustomer.city || viewingCustomer.district}, {viewingCustomer.district}</span>
                </p>
                {viewingCustomer.tradeLicenseNo && (
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Trade Lic / BIN: {viewingCustomer.tradeLicenseNo}
                  </p>
                )}
              </div>

              <div className="sm:border-l sm:border-slate-100 sm:pl-3.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Contact & Sales Officer
                </span>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`tel:${viewingCustomer.phone}`} className="font-bold text-slate-900 hover:text-[#0F766E] underline font-mono">
                      {viewingCustomer.phone}
                    </a>
                  </div>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold inline-flex items-center gap-1 border border-emerald-200 cursor-pointer"
                    >
                      <MessageSquare className="w-2.5 h-2.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                {viewingCustomer.alternatePhone && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-300" />
                    <span className="font-mono text-[11px]">Alt: {viewingCustomer.alternatePhone}</span>
                  </div>
                )}

                {viewingCustomer.email && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px]">{viewingCustomer.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-slate-600 pt-1 border-t border-slate-100">
                  <User className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Assigned Seller: <strong className="text-slate-900">{viewingCustomer.assignedSalesUserName || viewingCustomer.assignedSalesSellerName || 'Unassigned'}</strong></span>
                </div>
              </div>
            </div>

            {/* Credit Ceiling & Terms */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Credit Limit & Terms</span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  Limit: {formatBDT(viewingCustomer.creditLimit || 0)} • Terms: Net {viewingCustomer.paymentTermDays || 15} Days
                </div>
              </div>
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isLimitExceeded ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isLimitExceeded ? '⚠️ Credit Ceiling Exceeded' : '✓ Good Credit Standing'}
                </span>
              </div>
            </div>

            {/* Merchant Notes */}
            {viewingCustomer.notes && (
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-amber-900">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-700 mb-0.5">Internal Notes</span>
                <p className="text-xs text-amber-900">{viewingCustomer.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Customer Ledger Statement */}
        {activeTab === 'ledger' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs">
                Real-time double-entry transaction record. Running balance updates after each order, payment, return, or adjustment.
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description & Ref #</th>
                    <th className="py-2.5 px-3 text-right">Debit (+Due)</th>
                    <th className="py-2.5 px-3 text-right">Credit (-Due)</th>
                    <th className="py-2.5 px-3 text-right">Running Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerLedgerEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {entry.createdAt ? entry.createdAt.replace('T', ' ').slice(0, 16) : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3">
                        {getLedgerTypeBadge(entry.type)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        <span className="font-medium block">{entry.description}</span>
                        {entry.referenceNumber && (
                          <span className="text-[10px] font-mono text-slate-400">Ref: {entry.referenceNumber}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-600">
                        {entry.debit > 0 ? formatBDT(entry.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                        {entry.credit > 0 ? formatBDT(entry.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        {formatBDT(entry.runningBalance !== undefined ? entry.runningBalance : (entry.balanceAfterTransaction || 0))}
                      </td>
                    </tr>
                  ))}

                  {customerLedgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No ledger transactions recorded yet for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Orders History */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Order #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Items</th>
                    <th className="py-2 px-3 text-right">Total Amount</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-center">Payment</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{order.createdDate ? order.createdDate.split(' ')[0] : 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{order.items?.length || 0} items</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatBDT(order.totalAmount || order.grandTotal || 0)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge status={order.orderStatus} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(order.paymentStatus || 'unpaid').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setViewingCustomer(null);
                            setViewingOrder(order);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                          title="View Order Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customerOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No orders recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Payment Vouchers */}
        {activeTab === 'payments' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Voucher #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Method & Trx Ref</th>
                    <th className="py-2 px-3">Collector</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerPayments.map(pmt => (
                    <tr key={pmt.id} className={`hover:bg-slate-50 ${pmt.isReversed ? 'bg-slate-50/50 text-slate-400' : ''}`}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{pmt.paymentNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{pmt.createdAt ? pmt.createdAt.slice(0, 10) : 'N/A'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                          {pmt.paymentMethod}
                        </span>
                        {pmt.referenceNumber && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{pmt.referenceNumber}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{pmt.receivedByName || 'Central Accounts'}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                        <span className={pmt.isReversed ? 'line-through text-slate-400' : ''}>
                          {formatBDT(pmt.amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {pmt.isReversed ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                            REVERSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            VERIFIED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {customerPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No payment vouchers recorded for this customer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Badge status={viewingCustomer.status} size="md" />
            <span className="text-[11px] text-slate-500">
              Payment Terms: Net {viewingCustomer.paymentTermDays || 15} Days
            </span>
          </div>

          <button
            type="button"
            onClick={() => setViewingCustomer(null)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-2xs cursor-pointer"
          >
            Close Profile
          </button>
        </div>

      </div>

      {/* Embedded Quick Collect Modal */}
      {isCollectModalOpen && (
        <Modal
          isOpen={isCollectModalOpen}
          onClose={() => !isSubmitting && setIsCollectModalOpen(false)}
          title={`Collect Payment: ${viewingCustomer.shopName}`}
          subtitle={`Current Due: ${formatBDT(viewingCustomer.currentDue)}`}
          maxWidth="md"
        >
          <form onSubmit={handleQuickCollect} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Collection Amount (৳) *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={collectAmount}
                onChange={e => setCollectAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-base text-emerald-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
              <select
                value={collectMethod}
                onChange={e => setCollectMethod(e.target.value as PaymentMethodOption)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer"
              >
                <option value="cash">Cash on Hand</option>
                <option value="bkash">bKash Merchant</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
                <option value="bank_transfer">Bank Wire</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Transaction Ref / TrxID</label>
              <input
                type="text"
                placeholder="e.g. 8K239103"
                value={collectRef}
                onChange={e => setCollectRef(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Notes</label>
              <input
                type="text"
                placeholder="e.g. Cleared pending invoice balance"
                value={collectNotes}
                onChange={e => setCollectNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCollectModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Post Payment to Ledger</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};
