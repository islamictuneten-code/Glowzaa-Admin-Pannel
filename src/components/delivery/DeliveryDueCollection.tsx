import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, PaymentMethod } from '../../types';
import { Modal } from '../shared/Modal';
import { 
  DollarSign, 
  Search, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Receipt,
  Building2
} from 'lucide-react';

export const DeliveryDueCollection: React.FC = () => {
  const { customers, currentDeliveryUser, recordCollection, formatBDT } = useApp();
  const [search, setSearch] = useState('');
  const [collectingCust, setCollectingCust] = useState<Customer | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [refNo, setRefNo] = useState('');

  if (!currentDeliveryUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center p-6">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Checking route territory collections...</p>
      </div>
    );
  }

  // Shops in my delivery zone that have outstanding due
  const assignedZonesList = currentDeliveryUser.assignedZones || [currentDeliveryUser.assignedArea || ''];
  const zoneCustomersWithDue = customers.filter(
    c => c && (assignedZonesList.length === 0 || assignedZonesList.some(z => !z || (c.area || '').toLowerCase().includes(z.toLowerCase()) || z.toLowerCase().includes((c.area || '').toLowerCase()))) && (c.currentDue || 0) > 0
  );

  const filteredCustomers = zoneCustomersWithDue.filter(c =>
    c && (
      (c.shopName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.area || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingCust || amount <= 0) return;

    recordCollection({
      customerId: collectingCust.id,
      amount: Number(amount),
      paymentMethod: method,
      referenceNo: refNo || `VAN-COL-${Date.now()}`
    });

    setCollectingCust(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">On-Route Customer Due Collection</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {zoneCustomersWithDue.length} Zone Shops
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Collect pending ledger credit from retail shops during your delivery run in {(currentDeliveryUser.assignedZones || [currentDeliveryUser.assignedArea || 'Dhaka Metro']).join(', ')}.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shops on route..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Retail Shop & Owner</th>
                <th className="py-3 px-4">Address / Area</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(cust => (
                <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{cust.shopName}</span>
                    <span className="text-[11px] text-slate-500">Proprietor: {cust.ownerName}</span>
                  </td>

                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {cust.address}, {cust.area}
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-mono">
                    {cust.phone}
                  </td>

                  <td className="py-3 px-4 text-right font-extrabold text-rose-600 text-sm">
                    {formatBDT(cust.currentDue)}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setCollectingCust(cust);
                        setAmount(cust.currentDue);
                        setRefNo(`VAN-COL-${Date.now()}`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                    >
                      Receive Cash
                    </button>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No outstanding customer dues found in your assigned route territory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Modal */}
      <Modal
        isOpen={!!collectingCust}
        onClose={() => setCollectingCust(null)}
        title={`Collect Payment: ${collectingCust?.shopName}`}
        subtitle={`Current Due: ${formatBDT(collectingCust?.currentDue || 0)}`}
        maxWidth="md"
      >
        <form onSubmit={handleCollect} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Amount Collected from Counter (৳) *</label>
            <input
              type="number"
              min="1"
              max={collectingCust?.currentDue}
              required
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-base text-emerald-700"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Collection Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
            >
              <option value="Cash">Cash (Added to Driver Pouch)</option>
              <option value="bKash">bKash Merchant Pay</option>
              <option value="Nagad">Nagad</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Receipt Note / Trx ID</label>
            <input
              type="text"
              value={refNo}
              onChange={e => setRefNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCollectingCust(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
            >
              Accept & Issue Receipt
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
