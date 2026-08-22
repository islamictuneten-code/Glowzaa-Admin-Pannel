import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, PaymentMethodOption, PaymentTypeOption } from '../../types';
import { Modal } from '../shared/Modal';
import { 
  AlertCircle, 
  Search, 
  Phone, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Building2,
  Receipt,
  MessageSquare,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

export const SalesCustomerDue: React.FC = () => {
  const { customers, currentSalesUser, recordPayment, setViewingCustomer, formatBDT } = useApp();
  const [search, setSearch] = useState('');
  const [collectingCust, setCollectingCust] = useState<Customer | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethodOption>('cash');
  const [refNo, setRefNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Match customers assigned to this sales representative
  const myCustomers = useMemo(() => {
    return customers.filter(c => 
      c.assignedSalesSellerId === currentSalesUser.id || 
      c.assignedSalesUserId === currentSalesUser.id ||
      c.assignedSalesUserName?.toLowerCase() === currentSalesUser.name.toLowerCase() ||
      c.assignedSalesSellerName?.toLowerCase() === currentSalesUser.name.toLowerCase()
    );
  }, [customers, currentSalesUser]);

  const myDueCustomers = useMemo(() => {
    return myCustomers.filter(c => c.currentDue > 0);
  }, [myCustomers]);

  const totalMyDue = useMemo(() => {
    return myDueCustomers.reduce((sum, c) => sum + c.currentDue, 0);
  }, [myDueCustomers]);

  const totalMyAdvance = useMemo(() => {
    return myCustomers.reduce((sum, c) => sum + (c.advanceBalance || 0), 0);
  }, [myCustomers]);

  const filteredCustomers = useMemo(() => {
    return myCustomers.filter(c => {
      const searchTarget = `${c.shopName} ${c.ownerName} ${c.phone} ${c.area} ${c.district}`.toLowerCase();
      const matchesSearch = !search || searchTarget.includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [myCustomers, search]);

  const openCollectModal = (cust: Customer) => {
    setCollectingCust(cust);
    setAmount(cust.currentDue > 0 ? String(cust.currentDue) : '');
    setMethod('cash');
    setRefNo('');
    setNotes('');
    setFormError(null);
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingCust) return;
    setFormError(null);

    const numAmount = Math.round(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a collection amount greater than ৳0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isAdvance = numAmount > collectingCust.currentDue;
      const res = await recordPayment({
        customerId: collectingCust.id,
        customerName: collectingCust.shopName,
        amount: numAmount,
        paymentMethod: method,
        paymentType: isAdvance ? 'advance_payment' : 'due_collection',
        notes: notes.trim() || undefined,
        isAdvance
      });

      if (res.success) {
        setCollectingCust(null);
      } else {
        setFormError(res.error || 'Failed to record field payment.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Portfolio Customer Due Tracker</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              {myDueCustomers.length} Outstandings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track and collect market credit dues from client retail shops in your assigned territory ({currentSalesUser.territory}).
          </p>
        </div>
      </div>

      {/* Due KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-red-600 block tracking-wider">Total Route Outstanding Due</span>
          <div className="text-xl font-extrabold text-red-700 mt-1">{formatBDT(totalMyDue)}</div>
          <span className="text-[11px] text-red-600 font-medium">Pending recovery from {myDueCustomers.length} client shops</span>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-blue-600 block tracking-wider">Client Advance Balances</span>
          <div className="text-xl font-extrabold text-blue-700 mt-1">{formatBDT(totalMyAdvance)}</div>
          <span className="text-[11px] text-blue-600 font-medium">Pre-paid deposit credit held</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Portfolio Accounts</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{myCustomers.length} Retailers</div>
          <span className="text-[11px] text-slate-500">In your assigned territory</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-sales-due"
            type="text"
            placeholder="Search by shop, owner, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          />
        </div>
      </div>

      {/* Dues Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Retail Shop & Owner</th>
                <th className="py-2.5 px-3">Area & Phone</th>
                <th className="py-2.5 px-3 text-right">Lifetime Purchases</th>
                <th className="py-2.5 px-3 text-right">Credit Limit</th>
                <th className="py-2.5 px-3 text-right">Current Due (BDT)</th>
                <th className="py-2.5 px-3 text-center">Credit Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(cust => {
                const isOverLimit = cust.currentDue > (cust.creditLimit || 100000);
                const hasAdvance = (cust.advanceBalance || 0) > 0;
                const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
                const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('880') ? cleanPhone : '880' + cleanPhone.replace(/^0+/, '')}` : null;

                return (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => setViewingCustomer(cust)}
                        className="font-bold text-slate-900 hover:text-[#0F766E] text-left block cursor-pointer transition-colors"
                      >
                        {cust.shopName}
                      </button>
                      <span className="text-[11px] text-slate-500">{cust.ownerName}</span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800 block">{cust.area || cust.district}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a 
                          href={`tel:${cust.phone}`}
                          className="text-[11px] text-slate-600 hover:text-[#0F766E] font-mono flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-400" /> {cust.phone}
                        </a>
                        {waUrl && (
                          <a 
                            href={waUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      {formatBDT(cust.totalPurchase || 0)}
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                      {formatBDT(cust.creditLimit || 0)}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {cust.currentDue > 0 ? (
                        <span className="font-extrabold text-red-600 text-sm block">
                          {formatBDT(cust.currentDue)}
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-600 text-xs block">
                          ৳0 (Settled)
                        </span>
                      )}

                      {hasAdvance && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded inline-block mt-0.5 border border-blue-200">
                          Adv: {formatBDT(cust.advanceBalance || 0)}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {isOverLimit ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                          ⚠️ Limit Exceeded
                        </span>
                      ) : cust.currentDue > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                          Active Due
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          Settled
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        onClick={() => openCollectModal(cust)}
                        className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>Collect Due</span>
                      </button>
                      <button
                        onClick={() => setViewingCustomer(cust)}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer transition-colors"
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <p className="font-semibold text-slate-700">No client accounts in portfolio have active dues</p>
                    <p className="text-xs text-slate-400 mt-1">All accounts are settled.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Modal */}
      {collectingCust && (
        <Modal
          isOpen={!!collectingCust}
          onClose={() => !isSubmitting && setCollectingCust(null)}
          title={`Field Collection: ${collectingCust.shopName}`}
          subtitle={`Proprietor: ${collectingCust.ownerName} • Outstanding: ${formatBDT(collectingCust.currentDue)}`}
          maxWidth="md"
        >
          <form onSubmit={handleCollect} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Amount Collected (৳) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                <input
                  id="input-sales-collect-amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-base text-emerald-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
              <select
                id="select-sales-collect-method"
                value={method}
                onChange={e => setMethod(e.target.value as PaymentMethodOption)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 cursor-pointer"
              >
                <option value="cash">Cash on Hand (Direct from Shop Owner)</option>
                <option value="bkash">bKash Merchant / Personal</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
                <option value="bank_transfer">Bank Wire / Deposit Slip</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Transaction Ref / Cheque No / TrxID</label>
              <input
                id="input-sales-collect-ref"
                type="text"
                placeholder="e.g. TRX-992348"
                value={refNo}
                onChange={e => setRefNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Internal Notes</label>
              <input
                id="input-sales-collect-notes"
                type="text"
                placeholder="e.g. Collected during morning route visit"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCollectingCust(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirm & Post Payment</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
