import React, { useState, useMemo } from 'react';
import { Search, DollarSign, CheckCircle2, RotateCcw, CreditCard } from 'lucide-react';
import { Payment } from '../../../types';
import { formatBDT } from '../../../utils/formatters';

interface PaymentsTabProps {
  payments: Payment[];
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({ payments }) => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const filteredPayments = useMemo(() => {
    let list = [...payments];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.paymentNumber || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q) ||
        (p.collectedByUserName || '').toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q)
      );
    }

    if (methodFilter !== 'all') {
      list = list.filter(p => p.paymentMethod === methodFilter);
    }

    return list;
  }, [payments, search, methodFilter]);

  const totalCollected = filteredPayments.reduce((sum, p) => p.isReversed ? sum : sum + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Payment #, Collector, Reference..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0F766E] outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-1 w-full sm:w-auto">
            {['all', 'Cash', 'bKash', 'Nagad', 'Bank Transfer', 'Cheque'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  methodFilter === m
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {m === 'all' ? 'All Methods' : m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-medium">
          <span className="text-slate-600">
            Total Collections: <strong>{filteredPayments.length}</strong>
          </span>
          <span className="text-slate-900">
            Total Reconciled Amount: <strong className="text-emerald-700 font-extrabold">{formatBDT(totalCollected)}</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No payment records found for this customer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4">Reference / Note</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {filteredPayments.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {pmt.paymentNumber || pmt.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {pmt.date || (pmt.createdAt ? new Date(pmt.createdAt).toLocaleDateString() : '')}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                      +{formatBDT(pmt.amount || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {pmt.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {pmt.collectedByUserName || 'Direct'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {pmt.reference || pmt.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {pmt.isReversed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Reversed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Cleared
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
