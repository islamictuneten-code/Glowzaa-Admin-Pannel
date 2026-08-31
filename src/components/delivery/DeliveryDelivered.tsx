import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isOrderAssignedToDeliveryUser } from '../../utils/deliveryUtils';
import { Badge } from '../shared/Badge';
import { 
  PackageCheck, 
  Search, 
  Eye, 
  MapPin, 
  Phone, 
  DollarSign, 
  CheckCircle2, 
  Calendar
} from 'lucide-react';

export const DeliveryDelivered: React.FC = () => {
  const { orders, currentDeliveryUser, setViewingOrder, formatBDT } = useApp();
  const [search, setSearch] = useState('');

  const { currentUser } = useAuth();

  if (!currentDeliveryUser && !currentUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center p-6">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Syncing delivery completion history...</p>
      </div>
    );
  }

  const deliveredOrders = orders.filter(
    o => isOrderAssignedToDeliveryUser(o, currentDeliveryUser, currentUser) && 
    (o.deliveryStatus === 'delivered' || o.orderStatus === 'delivered' || o.deliveryStatus === 'partially_delivered')
  );

  const filteredOrders = deliveredOrders.filter(o =>
    o && (
      (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.shopName || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.area || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalDeliveredValue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCollectedCOD = deliveredOrders.reduce((sum, o) => sum + o.paidAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Delivered Orders History</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {deliveredOrders.length} Successfully Completed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Confirmed delivery drop-offs, receiver signatures, and collected COD proceeds.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Delivered Consignments</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(totalDeliveredValue)}</div>
          <span className="text-[11px] text-slate-500">{deliveredOrders.length} orders delivered</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total Cash on Delivery Collected</span>
          <div className="text-xl font-extrabold text-emerald-800 mt-1">{formatBDT(totalCollectedCOD)}</div>
          <span className="text-[11px] text-emerald-700">Remitted from shop owners</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search delivered consignments..."
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
                <th className="py-3 px-4">Order # & Date</th>
                <th className="py-3 px-4">Retail Shop</th>
                <th className="py-3 px-4">Received By</th>
                <th className="py-3 px-4 text-right">Order Value</th>
                <th className="py-3 px-4 text-right">COD Collected</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Challan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 block">{order.orderNumber}</span>
                    <span className="text-[11px] text-slate-400">{order.createdDate.split(' ')[0]}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{order.shopName}</span>
                    <span className="text-[11px] text-slate-500">{order.area}</span>
                  </td>

                  <td className="py-3 px-4 text-slate-700 font-medium">
                    <span className="font-bold text-emerald-800 block">✓ {order.receiverName || order.ownerName}</span>
                    <span className="text-[10px] text-slate-400">{order.deliveryNotes || 'Signature verified'}</span>
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatBDT(order.totalAmount)}</td>

                  <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                    {formatBDT(order.paidAmount)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <Badge status="delivered" size="sm" />
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
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
