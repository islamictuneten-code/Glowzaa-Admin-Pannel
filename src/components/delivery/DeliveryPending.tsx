import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { 
  Clock, 
  Search, 
  MapPin, 
  Phone, 
  Eye, 
  Truck, 
  ArrowRight,
  DollarSign
} from 'lucide-react';

export const DeliveryPending: React.FC = () => {
  const { orders, currentDeliveryUser, setViewingOrder, setDeliveryTab, formatBDT } = useApp();
  const [search, setSearch] = useState('');

  if (!currentDeliveryUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center p-6">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Filtering pending consignments...</p>
      </div>
    );
  }

  const pendingOrders = orders.filter(
    o => (o && currentDeliveryUser && (
      o.deliveryStaffId === currentDeliveryUser.id || 
      o.deliveryStaffId === currentDeliveryUser.uid || 
      (o.deliveryStaffName && o.deliveryStaffName.toLowerCase() === currentDeliveryUser.name?.toLowerCase())
    )) && 
    o.deliveryStatus !== 'delivered' && 
    o.orderStatus !== 'cancelled'
  );

  const filteredOrders = pendingOrders.filter(o =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.shopName.toLowerCase().includes(search.toLowerCase()) ||
    o.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    o.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Pending Consignments</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {pendingOrders.length} In Transit / Queued
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Undelivered parcels awaiting dispatch to retail clients in {(currentDeliveryUser.assignedZones || [currentDeliveryUser.assignedArea || 'Dhaka Metro']).join(', ')}.
          </p>
        </div>

        <button
          onClick={() => setDeliveryTab('today')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
        >
          <Truck className="w-4 h-4" />
          <span>Execute Today's Drops</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search pending consignments..."
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
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Retail Shop & Address</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4 text-right">Order Total</th>
                <th className="py-3 px-4 text-right">COD Due Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{order.orderNumber}</td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{order.shopName}</span>
                    <span className="text-[11px] text-slate-500">{order.address}, {order.area}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 block">{order.ownerName}</span>
                    <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {order.phone}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatBDT(order.totalAmount)}</td>

                  <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                    {formatBDT(order.dueAmount)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <Badge status={order.deliveryStatus} size="sm" />
                  </td>

                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                    >
                      Challan
                    </button>
                    <button
                      onClick={() => setDeliveryTab('today')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px]"
                    >
                      Deliver
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
