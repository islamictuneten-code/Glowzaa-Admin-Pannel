import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Payment, PaymentMethodOption, PaymentTypeOption, Customer } from '../../types';
import { Modal } from '../shared/Modal';
import { DateRangeFilter } from '../shared/DateRangeFilter';
import { DateRangeState, DEFAULT_DATE_RANGE, isWithinDateRange } from '../../lib/dateUtils';
import { 
  CreditCard, 
  Receipt, 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  DollarSign,
  Filter,
  RotateCcw,
  Eye,
  FileText,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Badge } from '../shared/Badge';

export const AdminPayments: React.FC = () => {
  const { 
    payments, 
    customers, 
    orders,
    recordPayment, 
    reversePayment,
    setViewingCustomer,
    formatBDT, 
    isPaymentsLoading,
    role
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'reversed'>('all');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [reversingPayment, setReversingPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Record Payment
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentTypeOption>('due_collection');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('bkash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isAdvance, setIsAdvance] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize selected customer when modal opens
  const openAddModal = (preselectedCustomerId?: string) => {
    const custId = preselectedCustomerId || (customers[0]?.id ?? '');
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c.id === custId);
    if (cust && cust.currentDue > 0) {
      setAmount(String(cust.currentDue));
      setPaymentType('due_collection');
      setIsAdvance(false);
    } else {
      setAmount('');
      setPaymentType('advance_payment');
      setIsAdvance(true);
    }
    setSelectedOrderId('');
    setReferenceNumber('');
    setNotes('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const selectedCustomerObj = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const customerUnpaidOrders = useMemo(() => {
    if (!selectedCustomerId) return [];
    return orders.filter(o => o.customerId === selectedCustomerId && o.orderStatus !== 'cancelled' && (o.dueAmount > 0 || o.paymentStatus !== 'paid'));
  }, [orders, selectedCustomerId]);

  // Financial KPI calculations
  const nonReversedPayments = useMemo(() => payments.filter(p => !p.isReversed), [payments]);
  const totalCollected = useMemo(() => nonReversedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0), [nonReversedPayments]);
  const advanceCollected = useMemo(() => nonReversedPayments.filter(p => p.paymentType === 'advance_payment' || p.isAdvance).reduce((sum, p) => sum + (Number(p.amount) || 0), 0), [nonReversedPayments]);
  const totalReversedAmount = useMemo(() => payments.filter(p => p.isReversed).reduce((sum, p) => sum + (Number(p.amount) || 0), 0), [payments]);
  const reversedCount = useMemo(() => payments.filter(p => p.isReversed).length, [payments]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pNum = p.paymentNumber || '';
      const cName = p.customerName || '';
      const pRef = p.referenceNumber || '';
      const notesStr = p.notes || '';
      const recBy = p.receivedByName || '';
      
      const searchTarget = `${pNum} ${cName} ${pRef} ${notesStr} ${recBy}`.toLowerCase();
      const matchesSearch = !search || searchTarget.includes(search.toLowerCase());

      const matchesMethod = selectedMethod === 'all' || p.paymentMethod === selectedMethod;
      const matchesType = selectedType === 'all' || p.paymentType === selectedType;
      
      let matchesStatus = true;
      if (selectedStatus === 'active') matchesStatus = !p.isReversed;
      if (selectedStatus === 'reversed') matchesStatus = !!p.isReversed;

      return matchesSearch && matchesMethod && matchesType && matchesStatus;
    });
  }, [payments, search, selectedMethod, selectedType, selectedStatus]);

  const handleCustomerChange = (newCustId: string) => {
    setSelectedCustomerId(newCustId);
    const cust = customers.find(c => c.id === newCustId);
    if (cust && cust.currentDue > 0) {
      setAmount(String(cust.currentDue));
      setPaymentType('due_collection');
      setIsAdvance(false);
    } else {
      setPaymentType('advance_payment');
      setIsAdvance(true);
      setAmount('');
    }
    setSelectedOrderId('');
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = Math.round(Number(amount));
    if (!selectedCustomerId) {
      setFormError('Please select a retail shop / customer.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Payment amount must be greater than ৳0.');
      return;
    }

    const cust = customers.find(c => c.id === selectedCustomerId);
    const currentDue = cust?.currentDue || 0;

    // Check if collection exceeds due and advance is not checked
    if (numAmount > currentDue && !isAdvance && paymentType !== 'advance_payment') {
      const confirmAdvance = window.confirm(
        `The amount (৳${numAmount.toLocaleString()}) exceeds the customer's current due (৳${currentDue.toLocaleString()}).\n\nWould you like to post the remaining balance as an Advance Payment for future orders?`
      );
      if (!confirmAdvance) {
        setFormError(`Amount exceeds current due (৳${currentDue.toLocaleString()}). Check 'Mark as Advance Payment' to proceed.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderObj = selectedOrderId ? orders.find(o => o.id === selectedOrderId) : null;
      const res = await recordPayment({
        customerId: selectedCustomerId,
        customerName: cust?.shopName || cust?.ownerName,
        amount: numAmount,
        paymentMethod,
        paymentType: isAdvance ? 'advance_payment' : paymentType,
        orderId: selectedOrderId || null,
        orderNumber: orderObj?.orderNumber || null,
        notes: notes.trim() || undefined,
        isAdvance: isAdvance || paymentType === 'advance_payment'
      });

      if (res.success) {
        setIsAddModalOpen(false);
      } else {
        setFormError(res.error || 'Failed to record payment transaction.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingPayment) return;
    if (!reversalReason.trim()) {
      alert('Please provide a valid audit reason for reversing this payment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reversePayment(reversingPayment.id, reversalReason.trim());
      if (res.success) {
        setReversingPayment(null);
        setReversalReason('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodBadgeClass = (m: string) => {
    switch (m) {
      case 'bkash':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'nagad':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rocket':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'bank_transfer':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cheque':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'cash':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getMethodLabel = (m: string) => {
    switch (m) {
      case 'bkash': return 'bKash';
      case 'nagad': return 'Nagad';
      case 'rocket': return 'Rocket';
      case 'bank_transfer': return 'Bank Transfer';
      case 'cheque': return 'Cheque';
      case 'cash': return 'Cash';
      default: return m.toUpperCase();
    }
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'due_collection': return 'Due Collection';
      case 'order_payment': return 'Order Payment';
      case 'advance_payment': return 'Advance Payment';
      default: return t || 'Payment';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Payments & Collection Ledger</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {payments.length} Firestore Vouchers
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time multi-channel collection receipts, customer credit settlements, and bank reconciliation.
          </p>
        </div>

        <button
          id="btn-record-payment"
          onClick={() => openAddModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Customer Payment</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Active Collections</span>
            <div className="text-xl font-extrabold text-emerald-700 mt-1">{formatBDT(totalCollected)}</div>
            <span className="text-[11px] text-slate-500">{nonReversedPayments.length} verified transactions</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Advance Deposits</span>
            <div className="text-xl font-extrabold text-blue-700 mt-1">{formatBDT(advanceCollected)}</div>
            <span className="text-[11px] text-slate-500">Credited to customer balances</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Customers</span>
            <div className="text-xl font-extrabold text-slate-900 mt-1">{customers.length} Retailers</div>
            <span className="text-[11px] text-rose-600 font-medium">
              {customers.filter(c => c.currentDue > 0).length} with outstanding dues
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Reversed Adjustments</span>
            <div className="text-xl font-extrabold text-slate-700 mt-1">{formatBDT(totalReversedAmount)}</div>
            <span className="text-[11px] text-amber-700 font-medium">{reversedCount} audited reversals</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-payments"
            type="text"
            placeholder="Search voucher #, shop, TrxID, collector..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Method Filter */}
          <select
            id="filter-payment-method"
            value={selectedMethod}
            onChange={e => setSelectedMethod(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash on Delivery / Field Cash</option>
            <option value="bkash">bKash Merchant / Personal</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="bank_transfer">Bank Wire Transfer</option>
            <option value="cheque">Cheque</option>
          </select>

          {/* Type Filter */}
          <select
            id="filter-payment-type"
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
          >
            <option value="all">All Transaction Types</option>
            <option value="due_collection">Due Collection</option>
            <option value="order_payment">Order Payment</option>
            <option value="advance_payment">Advance Payment</option>
          </select>

          {/* Status Filter */}
          <select
            id="filter-payment-status"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (Verified)</option>
            <option value="reversed">Reversed Only</option>
          </select>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Voucher # & Date</th>
                <th className="py-3 px-4">Retail Shop & Client</th>
                <th className="py-3 px-4">Method & Trx Ref</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Collected By</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map(p => {
                const customer = customers.find(c => c.id === p.customerId);
                return (
                  <tr key={p.id} className={`hover:bg-slate-50/70 transition-colors ${p.isReversed ? 'bg-slate-50/40 text-slate-400' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 block">{p.paymentNumber}</span>
                        {p.isAdvance && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                            ADVANCE
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {p.createdAt ? p.createdAt.replace('T', ' ').slice(0, 16) : 'N/A'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => customer && setViewingCustomer(customer)}
                        className="font-bold text-slate-900 hover:text-rose-600 text-left block"
                      >
                        {p.customerName || customer?.shopName || 'Unknown Shop'}
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {customer ? `${customer.ownerName} • ${customer.phone}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getMethodBadgeClass(p.paymentMethod)}`}>
                          {getMethodLabel(p.paymentMethod)}
                        </span>
                      </div>
                      {p.referenceNumber && (
                        <span className="font-mono text-[10px] text-slate-500 block mt-0.5">
                          Ref: {p.referenceNumber}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {getTypeLabel(p.paymentType)}
                      </span>
                      {p.orderNumber && (
                        <span className="font-mono text-[10px] text-slate-500 block mt-0.5">
                          Order: {p.orderNumber}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-medium text-slate-900 block">{p.receivedByName || 'Central HQ'}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{p.receivedByRole || 'admin'}</span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className={`font-extrabold text-sm ${p.isReversed ? 'line-through text-slate-400' : 'text-emerald-700'}`}>
                        {formatBDT(p.amount)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {p.isReversed ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            REVERSED
                          </span>
                          {p.reversalReason && (
                            <span className="text-[9px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={p.reversalReason}>
                              {p.reversalReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          VERIFIED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingPayment(p)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="View Payment Voucher"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {role === 'admin' && !p.isReversed && (
                          <button
                            onClick={() => {
                              setReversingPayment(p);
                              setReversalReason('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Reverse Payment (Admin Audit)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && !isPaymentsLoading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No payment records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing your search terms or record a new customer collection.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title="Record Customer Due Collection & Payment"
        subtitle="Atomically updates customer ledger, balances, and payment voucher"
        maxWidth="lg"
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
          
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Retail Shop / Customer *</label>
            <select
              id="select-customer-payment"
              value={selectedCustomerId}
              onChange={e => handleCustomerChange(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="">-- Select Retail Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.shopName} ({c.ownerName}) — Current Due: {formatBDT(c.currentDue)} {c.advanceBalance > 0 ? `| Adv: ${formatBDT(c.advanceBalance)}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Customer Financial Snapshot */}
          {selectedCustomerObj && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Purchases</span>
                <div className="font-bold text-slate-900">{formatBDT(selectedCustomerObj.totalPurchase || 0)}</div>
              </div>
              <div>
                <span className="text-[10px] text-rose-600 uppercase font-semibold">Current Due</span>
                <div className="font-extrabold text-rose-700">{formatBDT(selectedCustomerObj.currentDue || 0)}</div>
              </div>
              <div>
                <span className="text-[10px] text-blue-600 uppercase font-semibold">Advance Balance</span>
                <div className="font-extrabold text-blue-700">{formatBDT(selectedCustomerObj.advanceBalance || 0)}</div>
              </div>
            </div>
          )}

          {/* Payment Type & Linked Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Collection Purpose *</label>
              <select
                id="select-payment-type"
                value={paymentType}
                onChange={e => {
                  const val = e.target.value as PaymentTypeOption;
                  setPaymentType(val);
                  if (val === 'advance_payment') setIsAdvance(true);
                  if (val === 'due_collection') setIsAdvance(false);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="due_collection">Outstanding Due Recovery</option>
                <option value="order_payment">Specific Order Prepayment</option>
                <option value="advance_payment">Advance Deposit</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Link to Order (Optional)</label>
              <select
                id="select-order-link"
                value={selectedOrderId}
                onChange={e => {
                  setSelectedOrderId(e.target.value);
                  const ord = customerUnpaidOrders.find(o => o.id === e.target.value);
                  if (ord) {
                    setAmount(String(ord.dueAmount || ord.totalAmount));
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">-- General Account Balance (No specific order) --</option>
                {customerUnpaidOrders.map(ord => (
                  <option key={ord.id} value={ord.id}>
                    {ord.orderNumber} ({ord.createdDate.split(' ')[0]}) — Due: {formatBDT(ord.dueAmount)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Collection Amount (৳ BDT) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                <input
                  id="input-payment-amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-base text-emerald-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Method *</label>
              <select
                id="select-payment-method-modal"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethodOption)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="cash">Cash on Hand (Direct / Field)</option>
                <option value="bkash">bKash Merchant / App Transfer</option>
                <option value="nagad">Nagad Merchant / Personal</option>
                <option value="rocket">DBBL Rocket</option>
                <option value="bank_transfer">Bank Wire (EFT / RTGS / Deposit)</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>
          </div>

          {/* Advance checkbox toggle */}
          <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
            <input
              id="checkbox-is-advance"
              type="checkbox"
              checked={isAdvance}
              onChange={e => setIsAdvance(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="checkbox-is-advance" className="text-xs text-blue-900 font-medium cursor-pointer">
              Mark as Advance Payment (stores excess as credit balance on customer's account)
            </label>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Transaction Ref / Cheque # / TrxID</label>
              <input
                id="input-payment-ref"
                type="text"
                placeholder="e.g. 9J2834KSD or CHQ-4492"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Internal Notes & Description</label>
              <input
                id="input-payment-notes"
                type="text"
                placeholder="e.g. Paid during shop visit / Net invoice clearance"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Post & Credit Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Payment Voucher Modal */}
      {viewingPayment && (
        <Modal
          isOpen={!!viewingPayment}
          onClose={() => setViewingPayment(null)}
          title={`Payment Voucher: ${viewingPayment.paymentNumber}`}
          subtitle={`Verified B2B Money Receipt • ${viewingPayment.createdAt?.replace('T', ' ').slice(0, 16) || ''}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {viewingPayment.isReversed && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block font-bold">This payment has been reversed in audit</strong>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Reason: {viewingPayment.reversalReason || 'Administrative reversal'} (Reversed at {viewingPayment.reversedAt})
                  </p>
                </div>
              </div>
            )}

            {/* Voucher Header Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block">Glowzaa Central Accounts</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatBDT(viewingPayment.amount)}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getMethodBadgeClass(viewingPayment.paymentMethod)}`}>
                  {getMethodLabel(viewingPayment.paymentMethod)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                  {getTypeLabel(viewingPayment.paymentType)}
                </span>
              </div>
            </div>

            {/* Details Breakdown */}
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-white">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Retail Shop / Account</span>
                <span className="font-bold text-slate-900">{viewingPayment.customerName || 'N/A'}</span>
              </div>

              {viewingPayment.referenceNumber && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Transaction Ref / TrxID</span>
                  <span className="font-mono font-bold text-slate-900">{viewingPayment.referenceNumber}</span>
                </div>
              )}

              {viewingPayment.orderNumber && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Allocated Order #</span>
                  <span className="font-mono font-semibold text-slate-800">{viewingPayment.orderNumber}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Collected / Processed By</span>
                <span className="font-medium text-slate-800">{viewingPayment.receivedByName || 'Central Accounts'} ({viewingPayment.receivedByRole})</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Audit Status</span>
                <span className={`font-semibold ${viewingPayment.isReversed ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {viewingPayment.isReversed ? 'Reversed & Nullified' : 'Active & Banked'}
                </span>
              </div>

              {viewingPayment.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Notes</span>
                  <p className="text-slate-700 mt-0.5">{viewingPayment.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reverse Payment Confirmation Modal */}
      {reversingPayment && (
        <Modal
          isOpen={!!reversingPayment}
          onClose={() => !isSubmitting && setReversingPayment(null)}
          title="Reverse Payment (Admin Audit Action)"
          subtitle={`Voucher: ${reversingPayment.paymentNumber} • Amount: ${formatBDT(reversingPayment.amount)}`}
          maxWidth="md"
        >
          <form onSubmit={handleReverseSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
              <strong className="block font-bold">Important Audit Warning:</strong>
              <p className="text-[11px] text-amber-800 mt-1">
                This will NOT delete the payment record. It will mark the payment as reversed, post an offsetting <span className="font-mono font-bold">ADJUSTMENT</span> debit to the customer ledger, and restore the customer's outstanding due balance.
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Reason for Payment Reversal *</label>
              <textarea
                id="textarea-reversal-reason"
                required
                rows={3}
                placeholder="e.g. Bank cheque bounced / Duplicate entry posted by sales officer / Wrong customer credited"
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setReversingPayment(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reversalReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Execute Reversal</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
