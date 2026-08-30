import React, { useMemo } from 'react';
import { BookOpen, ArrowDownLeft, ArrowUpRight, FileSpreadsheet } from 'lucide-react';
import { Customer, CustomerLedgerEntry } from '../../../types';
import { formatBDT } from '../../../utils/formatters';

interface LedgerTabProps {
  customer: Customer;
  ledgerEntries: CustomerLedgerEntry[];
}

export const LedgerTab: React.FC<LedgerTabProps> = ({ customer, ledgerEntries }) => {
  // Sort chronologically ascending to compute accurate running balance
  const sortedEntriesWithRunningBalance = useMemo(() => {
    const entries = [...ledgerEntries].sort((a, b) => {
      const dateA = a.date || a.createdAt || '';
      const dateB = b.date || b.createdAt || '';
      return dateA.localeCompare(dateB);
    });

    let running = 0;
    return entries.map((entry) => {
      const debit = Math.max(0, Number(entry.debit) || 0);
      const credit = Math.max(0, Number(entry.credit) || 0);
      running = running + debit - credit;
      return {
        ...entry,
        runningBalance: running
      };
    }).reverse(); // Display newest first in UI
  }, [ledgerEntries]);

  const totalDebit = ledgerEntries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
  const closingBalance = customer.currentDue || 0;

  return (
    <div className="space-y-4">
      {/* Ledger Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Debits (Invoiced)</span>
          </div>
          <span className="text-base font-extrabold text-slate-900">{formatBDT(totalDebit)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Credits (Paid / Returned)</span>
          </div>
          <span className="text-base font-extrabold text-emerald-600">{formatBDT(totalCredit)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs bg-slate-50/50">
          <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
            <BookOpen className="w-4 h-4 text-[#0F766E]" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Closing Balance (Current Due)</span>
          </div>
          <span className={`text-base font-black ${closingBalance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatBDT(closingBalance)}
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Canonical General Customer Ledger ({ledgerEntries.length} Transactions)
          </span>
          <span className="text-[11px] text-slate-500">
            Source: <strong className="text-slate-700 font-mono">/customerLedger</strong>
          </span>
        </div>

        {sortedEntriesWithRunningBalance.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No ledger transactions recorded for this customer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Debit (৳)</th>
                  <th className="py-3 px-4 text-right">Credit (৳)</th>
                  <th className="py-3 px-4 text-right">Running Balance (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {sortedEntriesWithRunningBalance.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {entry.date || (entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {entry.referenceNumber || entry.reference || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          entry.type === 'INVOICE' || entry.type === 'ORDER' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          entry.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          entry.type === 'RETURN' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {entry.type}
                        </span>
                        <span className="truncate max-w-xs">{entry.description || entry.notes || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {(entry.debit || 0) > 0 ? formatBDT(entry.debit) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {(entry.credit || 0) > 0 ? formatBDT(entry.credit) : '—'}
                    </td>
                    <td className={`py-3 px-4 text-right font-extrabold ${(entry.runningBalance || 0) > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                      {formatBDT(entry.runningBalance || 0)}
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
