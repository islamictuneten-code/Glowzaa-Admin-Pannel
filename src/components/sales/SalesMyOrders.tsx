import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { 
  PackageCheck, 
  Search, 
  Eye, 
  PlusCircle, 
  Calendar, 
  Truck,
  Filter,
  DollarSign
} from 'lucide-react';

export const SalesMyOrders: React.FC = () => {
  const { orders, currentSalesUser, setViewingOrder, setSalesTab, formatBDT } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const myOrders = orders.filter(o => 
    o.salesSellerId === currentSalesUser.id || 
    o.salesUserId === currentSalesUser.id || 
    o.createdBy === currentSalesUser.id ||
    !o.salesSellerId // Fallback if general order
  );

  const filteredOrders = myOrders.filter(o => {
    const matchesSearch = (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                          (o.shopName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (o.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (o.phone || '').includes(search);
    const matchesStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">My Booked Orders</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              {myOrders.length} Invoices
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track status of consignments booked by you in {currentSalesUser.territory}.
          </p>
        </div>

        <button
          onClick={() => setSalesTab('create_order')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-teal-200" />
          <span>New Wholesale Order</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order #, shop, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 cursor-pointer"
          >
            <option value="all">All Order Statuses</option>
            <option value="pending">Pending Warehouse</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Picking & Packing</option>
            <option value="dispatched">On Delivery Van</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Order # & Date</th>
                <th className="py-2.5 px-3">Retail Shop & Area</th>
                <th className="py-2.5 px-3">Items Count</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Due</th>
                <th className="py-2.5 px-3 text-center">Order Status</th>
                <th className="py-2.5 px-3 text-center">Delivery Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-900 block">{order.orderNumber}</span>
                    <span className="text-[11px] text-slate-400">{order.createdDate || (order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : 'Today')}</span>
                  </td>

                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-900 block">{order.shopName}</span>
                    <span className="text-[11px] text-slate-500">{order.area}, {order.district}</span>
                  </td>

                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                    {(order.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} pcs ({(order.items || []).length} SKUs)
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatBDT(order.totalAmount || order.grandTotal || 0)}
                  </td>

                  <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                    {formatBDT(order.paidAmount || 0)}
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-bold ${(order.dueAmount || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {formatBDT(order.dueAmount || 0)}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <Badge status={order.orderStatus} size="sm" />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <Badge status={order.deliveryStatus} size="sm" />
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Invoice</span>
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
