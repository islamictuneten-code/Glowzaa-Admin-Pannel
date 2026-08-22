import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, PaymentMethodOption, PaymentTypeOption } from '../../types';
import { Badge } from '../shared/Badge';
import { Modal } from '../shared/Modal';
import { 
  AlertCircle, 
  Search, 
  Phone, 
  DollarSign, 
  Eye, 
  Clock, 
  CheckCircle2,
  ShieldAlert,
  Send,
  Building2,
  MessageSquare,
  ArrowUpRight,
  TrendingDown,
  FileSpreadsheet,
  PlusCircle,
  Filter
} from 'lucide-react';

export const AdminCustomerDue: React.FC = () => {
  const { customers, recordPayment, setViewingCustomer, formatBDT } = useApp();

  const [search, setSearch] = useState('');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterAdvanceOnly, setFilterAdvanceOnly] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  // Quick Collect Modal
  const [collectingCust, setCollectingCust] = useState<Customer | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethodOption>('bkash');
  const [paymentType, setPaymentType] = useState<PaymentTypeOption>('due_collection');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Financial Metrics
  const dueCustomers = useMemo(() => customers.filter(c => c.currentDue > 0), [customers]);
  const advanceCustomers = useMemo(() => customers.filter(c => (c.advanceBalance || 0) > 0), [customers]);
  const totalOutstandingDue = useMemo(() => dueCustomers.reduce((sum, c) => sum + c.currentDue, 0), [dueCustomers]);
  const totalAdvanceHeld = useMemo(() => advanceCustomers.reduce((sum, c) => sum + (c.advanceBalance || 0), 0), [advanceCustomers]);
  const creditLimitExceededCount = useMemo(() => dueCustomers.filter(c => c.currentDue > (c.creditLimit || 100000)).length, [dueCustomers]);

  // Unique districts for filter
  const districts = useMemo(() => {
    const dSet = new Set<string>();
    customers.forEach(c => {
      if (c.district) dSet.add(c.district);
    });
    return Array.from(dSet).sort();
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const searchTarget = `${c.shopName} ${c.ownerName} ${c.phone} ${c.area} ${c.district} ${c.assignedSalesSellerName || ''}`.toLowerCase();
      const matchesSearch = !search || searchTarget.includes(search.toLowerCase());
      
      let matchesDueOrAdvance = true;
      if (filterOverdueOnly) {
        matchesDueOrAdvance = c.currentDue > (c.creditLimit || 100000);
      } else if (filterAdvanceOnly) {
        matchesDueOrAdvance = (c.advanceBalance || 0) > 0;
      } else {
        // By default show all shops with either due or advance, or all if search is active
        matchesDueOrAdvance = search ? true : (c.currentDue > 0 || (c.advanceBalance || 0) > 0);
      }

      const matchesDistrict = selectedDistrict === 'all' || c.district === selectedDistrict;

      return matchesSearch && matchesDueOrAdvance && matchesDistrict;
    });
  }, [customers, search, filterOverdueOnly, filterAdvanceOnly, selectedDistrict]);

  const openQuickCollect = (cust: Customer) => {
    setCollectingCust(cust);
    setAmount(cust.currentDue > 0 ? String(cust.currentDue) : '');
    setMethod('bkash');
    setPaymentType(cust.currentDue > 0 ? 'due_collection' : 'advance_payment');
    setRefNo('');
    setNotes('');
    setFormError(null);
  };

  const handleQuickCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingCust) return;
    setFormError(null);

    const numAmount = Math.round(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid collection amount greater than ৳0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isAdvance = numAmount > collectingCust.currentDue || paymentType === 'advance_payment';
      const res = await recordPayment({
        customerId: collectingCust.id,
        customerName: collectingCust.shopName,
        amount: numAmount,
        paymentMethod: method,
        paymentType: isAdvance ? 'advance_payment' : paymentType,
        notes: notes.trim() || undefined,
        isAdvance
      });

      if (res.success) {
        setCollectingCust(null);
      } else {
        setFormError(res.error || 'Failed to process payment.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Customer Credit & Due Ledger</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {dueCustomers.length} Shops with Balance
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Accounts receivable aging, credit limit exposure, live ledger settlements, and collection tracking.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-rose-600 block tracking-wider">Total Outstanding Due</span>
          <div className="text-xl font-extrabold text-rose-700 mt-1">{formatBDT(totalOutstandingDue)}</div>
          <span className="text-[11px] text-rose-600 font-medium">Across {dueCustomers.length} active retail accounts</span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-blue-600 block tracking-wider">Customer Advance Balances</span>
          <div className="text-xl font-extrabold text-blue-700 mt-1">{formatBDT(totalAdvanceHeld)}</div>
          <span className="text-[11px] text-blue-600 font-medium">{advanceCustomers.length} retailers with credit</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Average Due per Shop</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatBDT(dueCustomers.length ? Math.round(totalOutstandingDue / dueCustomers.length) : 0)}
          </div>
          <span className="text-[11px] text-slate-500">Typical credit cycle balance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Credit Ceiling Breached</span>
          <div className="text-xl font-extrabold text-amber-700 mt-1">{creditLimitExceededCount} Shops</div>
          <span className="text-[11px] text-amber-700 font-medium">Exceeds authorized limit</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-customer-due"
            type="text"
            placeholder="Search shop, owner, phone, district..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* District filter */}
          <select
            id="filter-due-district"
            value={selectedDistrict}
            onChange={e => setSelectedDistrict(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="all">All 64 Districts</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Quick toggle filters */}
          <button
            onClick={() => {
              setFilterOverdueOnly(!filterOverdueOnly);
              if (!filterOverdueOnly) setFilterAdvanceOnly(false);
            }}
            className={`text-xs px-3 py-2 rounded-xl font-semibold border transition-colors ${
              filterOverdueOnly 
                ? 'bg-rose-600 text-white border-rose-600' 
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            ⚠️ Overdue Limit Exceeded
          </button>

          <button
            onClick={() => {
              setFilterAdvanceOnly(!filterAdvanceOnly);
              if (!filterAdvanceOnly) setFilterOverdueOnly(false);
            }}
            className={`text-xs px-3 py-2 rounded-xl font-semibold border transition-colors ${
              filterAdvanceOnly 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            💳 Advance Held ({advanceCustomers.length})
          </button>
        </div>
      </div>

      {/* Due Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Retail Shop & Proprietor</th>
                <th className="py-3 px-4">Location & Contact</th>
                <th className="py-3 px-4">Assigned Sales Officer</th>
                <th className="py-3 px-4 text-right">Lifetime Purchases</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Current Due (৳)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(cust => {
                const isOverLimit = cust.currentDue > (cust.creditLimit || 100000);
                const hasAdvance = (cust.advanceBalance || 0) > 0;
                const creditRatio = Math.min(100, Math.round((cust.currentDue / (cust.creditLimit || 100000)) * 100));

                const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
                const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('880') ? cleanPhone : '880' + cleanPhone.replace(/^0+/, '')}` : null;

                return (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setViewingCustomer(cust)}
                        className="font-bold text-slate-900 hover:text-rose-600 text-left block"
                      >
                        {cust.shopName}
                      </button>
                      <span className="text-[11px] text-slate-500">Proprietor: {cust.ownerName}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{cust.area || 'N/A'}, {cust.district}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a 
                          href={`tel:${cust.phone}`}
                          className="text-[11px] text-slate-600 hover:text-rose-600 font-mono flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          {cust.phone}
                        </a>
                        {waUrl && (
                          <a 
                            href={waUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-medium text-slate-900 block">
                        {cust.assignedSalesUserName || cust.assignedSalesSellerName || 'Unassigned'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatBDT(cust.totalPurchase || 0)}
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {formatBDT(cust.totalPaid || 0)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-slate-700 block">{formatBDT(cust.creditLimit || 0)}</span>
                      <div className="w-16 ml-auto bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full ${isOverLimit ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${creditRatio}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {cust.currentDue > 0 ? (
                        <span className="font-extrabold text-rose-700 text-sm block">
                          {formatBDT(cust.currentDue)}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 text-xs block">
                          ৳0 (Settled)
                        </span>
                      )}

                      {hasAdvance && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded inline-block mt-0.5 border border-blue-200">
                          Adv: {formatBDT(cust.advanceBalance || 0)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isOverLimit ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                          ⚠️ Over Limit
                        </span>
                      ) : cust.currentDue > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                          Active Due
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          Clear Balance
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openQuickCollect(cust)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Collect</span>
                        </button>
                        <button
                          onClick={() => setViewingCustomer(cust)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                        >
                          Ledger
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <p className="font-semibold text-slate-700">No overdue customer accounts match criteria</p>
                    <p className="text-xs text-slate-400 mt-1">All retail accounts are in good standing.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Collect Modal */}
      {collectingCust && (
        <Modal
          isOpen={!!collectingCust}
          onClose={() => !isSubmitting && setCollectingCust(null)}
          title={`Record Payment: ${collectingCust.shopName}`}
          subtitle={`Proprietor: ${collectingCust.ownerName} • Current Due: ${formatBDT(collectingCust.currentDue)}`}
          maxWidth="md"
        >
          <form onSubmit={handleQuickCollectSubmit} className="space-y-4 text-xs">
            
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Quick Balance Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Purchases</span>
                <div className="font-bold text-slate-900">{formatBDT(collectingCust.totalPurchase || 0)}</div>
              </div>
              <div>
                <span className="text-[10px] text-rose-600 uppercase font-semibold">Current Due</span>
                <div className="font-extrabold text-rose-700">{formatBDT(collectingCust.currentDue || 0)}</div>
              </div>
              <div>
                <span className="text-[10px] text-blue-600 uppercase font-semibold">Advance Held</span>
                <div className="font-extrabold text-blue-700">{formatBDT(collectingCust.advanceBalance || 0)}</div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Collection Amount (৳ BDT) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                <input
                  id="input-quick-amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-base text-emerald-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method *</label>
                <select
                  id="select-quick-method"
                  value={method}
                  onChange={e => setMethod(e.target.value as PaymentMethodOption)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="cash">Cash on Hand</option>
                  <option value="bkash">bKash Merchant</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">DBBL Rocket</option>
                  <option value="bank_transfer">Bank Wire Transfer</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Transaction Ref / TrxID</label>
                <input
                  id="input-quick-ref"
                  type="text"
                  placeholder="e.g. 8G12034K"
                  value={refNo}
                  onChange={e => setRefNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Internal Notes</label>
              <input
                id="input-quick-notes"
                type="text"
                placeholder="e.g. Market visit collection"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCollectingCust(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Post Payment to Ledger</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
