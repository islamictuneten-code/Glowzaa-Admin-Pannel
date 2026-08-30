import React, { useState, useMemo } from 'react';
import { Search, Calendar, Filter, ShoppingBag, Eye, ArrowUpDown } from 'lucide-react';
import { Order } from '../../../types';
import { formatBDT } from '../../../utils/formatters';

interface OrdersTabProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ orders, onViewOrder }) => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    let list = [...orders];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o => 
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.id || '').toLowerCase().includes(q) ||
        (o.salesUserName || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(o => o.orderStatus === statusFilter || o.paymentStatus === statusFilter);
    }

    // Date filter
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      list = list.filter(o => (o.createdDate || o.createdAt || '').startsWith(todayStr));
    } else if (dateFilter === 'this_week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      list = list.filter(o => {
        const d = (o.createdDate || o.createdAt || '').split('T')[0];
        return d >= sevenDaysAgo && d <= todayStr;
      });
    } else if (dateFilter === 'this_month') {
      const currentMonthPrefix = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      list = list.filter(o => (o.createdDate || o.createdAt || '').startsWith(currentMonthPrefix));
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      list = list.filter(o => {
        const d = (o.createdDate || o.createdAt || '').split('T')[0];
        return d >= customStart && d <= customEnd;
      });
    }

    return list;
  }, [orders, search, dateFilter, customStart, customEnd, statusFilter]);

  const totalValue = filteredOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);
  const totalPaid = filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalDue = filteredOrders.reduce((sum, o) => sum + (o.dueAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order # or Sales Officer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0F766E] outline-hidden"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDateFilter(p.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  dateFilter === p.id
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
            />
          </div>
        )}

        {/* Summary Mini Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-600 font-medium">
            Showing <strong>{filteredOrders.length}</strong> of {orders.length} orders
          </span>
          <div className="flex items-center space-x-3 font-semibold">
            <span>Total: <strong className="text-slate-900">{formatBDT(totalValue)}</strong></span>
            <span>Paid: <strong className="text-emerald-700">{formatBDT(totalPaid)}</strong></span>
            <span>Due: <strong className="text-rose-700">{formatBDT(totalDue)}</strong></span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No orders found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onViewOrder(order)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {order.createdDate || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '')}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {order.salesUserName || 'Direct'}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {order.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      {formatBDT(order.grandTotal || order.totalAmount || 0)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                      {formatBDT(order.paidAmount || 0)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 font-extrabold">
                      {formatBDT(order.dueAmount || 0)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.orderStatus === 'confirmed' || order.orderStatus === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        order.orderStatus === 'cancelled' ? 'bg-slate-100 text-slate-600' :
                        order.orderStatus === 'returned' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {order.orderStatus?.toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewOrder(order);
                        }}
                        className="p-1 text-[#0F766E] hover:bg-teal-50 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
