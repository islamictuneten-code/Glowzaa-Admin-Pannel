import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { 
  Receipt, 
  Search, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Building2,
  DollarSign
} from 'lucide-react';

export const DeliveryCollectionHistory: React.FC = () => {
  const { collections, currentDeliveryUser, formatBDT } = useApp();
  const [search, setSearch] = useState('');

  if (!currentDeliveryUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center p-6">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Syncing personal collection history...</p>
      </div>
    );
  }

  const myCollections = collections.filter(c => c && currentDeliveryUser && (c.collectorId === currentDeliveryUser.id || c.collectorId === (currentDeliveryUser as any).uid));

  const filteredCollections = myCollections.filter(c =>
    c && (
      (c.collectionNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.shopName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.referenceNo && c.referenceNo.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const totalCollected = myCollections.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Driver Collection History & Receipts</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {myCollections.length} Receipts Issued
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete transaction record of all retail payments and cash on delivery collections logged by {currentDeliveryUser.name}.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Lifetime Remitted</span>
          <span className="text-lg font-extrabold text-emerald-700">{formatBDT(totalCollected)}</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by receipt #, shop, or trx ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt # & Timestamp</th>
                <th className="py-3 px-4">Retail Shop & Owner</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Transaction Ref / Cheque</th>
                <th className="py-3 px-4 text-right">Amount Collected</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCollections.map(col => (
                <tr key={col.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 block">{col.collectionNumber}</span>
                    <span className="text-[11px] text-slate-400">{col.collectedAt}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{col.shopName}</span>
                    <span className="text-[11px] text-slate-500">Proprietor: {col.ownerName}</span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {col.paymentMethod}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-600">
                    {col.referenceNo || 'Cash on Delivery'}
                  </td>

                  <td className="py-3 px-4 text-right font-extrabold text-emerald-700 text-sm">
                    {formatBDT(col.amount)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      col.reconciledWithAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {col.reconciledWithAdmin ? 'Reconciled at HQ' : 'Pending Vault'}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredCollections.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No collection history records match your search.
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
