import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus } from '../../types';
import { Badge } from '../shared/Badge';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import { DateRangeFilter } from '../shared/DateRangeFilter';
import { DateRangeState, DEFAULT_DATE_RANGE, isWithinDateRange } from '../../lib/dateUtils';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Eye, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  UserCheck,
  ChevronDown,
  XCircle,
  RotateCcw,
  Package,
  Layers,
  MapPin
} from 'lucide-react';

export const AdminOrders: React.FC = () => {
  const { 
    orders, 
    deliveryStaff, 
    updateOrderStatus, 
    confirmOrder, 
    cancelOrder, 
    returnOrder, 
    assignDeliveryToOrder,
    setViewingOrder, 
    addToast,
    formatBDT 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeState>(DEFAULT_DATE_RANGE);
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  
  // Modals for Cancellation & Return
  const [actionOrder, setActionOrder] = useState<{ order: Order; action: 'cancel' | 'return' } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                          (o.shopName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (o.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (o.salesSellerName || o.salesUserName || '').toLowerCase().includes(search.toLowerCase()) ||
                          (o.deliveryStaffName && o.deliveryStaffName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = selectedStatus === 'all' || o.orderStatus === selectedStatus;
    const matchesDate = isWithinDateRange(o.createdDate || o.createdAt, dateRange);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const openAssignModal = (order: Order) => {
    const activeDrivers = deliveryStaff.filter(d => d.status === 'on_duty' || d.status === 'available' || d.status === 'active');
    if (activeDrivers.length === 0) {
      addToast({ type: 'warning', title: 'Dispatch Notice', message: 'No active delivery staff available.' });
      return;
    }
    setAssigningOrder(order);
    setSelectedDriverId(order.deliveryStaffId || activeDrivers[0]?.id || '');
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder || !selectedDriverId) return;

    const res = await assignDeliveryToOrder(assigningOrder.id, selectedDriverId);
    if (res.success) {
      setAssigningOrder(null);
      setSelectedDriverId('');
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    await confirmOrder(orderId);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionOrder) return;

    setIsProcessingAction(true);
    try {
      if (actionOrder.action === 'cancel') {
        await cancelOrder(actionOrder.order.id, actionReason || 'Cancelled by Admin');
      } else if (actionOrder.action === 'return') {
        await returnOrder(actionOrder.order.id, actionReason || 'Customer shop returned consignment');
      }
      setActionOrder(null);
      setActionReason('');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-[#102A2A] tracking-tight">Wholesale Orders & Dispatch</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#DDF7EE] text-[#087F7A] border border-teal-200">
              {orders.length} Total Bookings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Order lifecycle management, stock deduction, courier dispatch routing, commercial invoice printing, and returns handling.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order #, shop, or sales rep..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-[#F8FAFB] border border-slate-200 rounded-xl text-[#102A2A] focus:outline-none focus:bg-white focus:border-[#087F7A]"
            />
          </div>

          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            totalCount={orders.length}
            filteredCount={filteredOrders.length}
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStatus === 'all' ? 'bg-[#087F7A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setSelectedStatus('pending')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStatus === 'pending' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({orders.filter(o => o.orderStatus === 'pending').length})
          </button>
          <button
            onClick={() => setSelectedStatus('confirmed')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Confirmed ({orders.filter(o => o.orderStatus === 'confirmed').length})
          </button>
          <button
            onClick={() => setSelectedStatus('processing')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStatus === 'processing' ? 'bg-teal-100 text-teal-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Packing
          </button>
          <button
            onClick={() => setSelectedStatus('dispatched')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStatus === 'dispatched' ? 'bg-teal-100 text-teal-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Transit
          </button>
          <button
            onClick={() => setSelectedStatus('delivered')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStatus === 'delivered' ? 'bg-[#087F7A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Delivered
          </button>
          <button
            onClick={() => setSelectedStatus('returned')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStatus === 'returned' ? 'bg-orange-100 text-orange-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Returned
          </button>
          <button
            onClick={() => setSelectedStatus('cancelled')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStatus === 'cancelled' ? 'bg-red-100 text-red-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Orders List for Mobile / Cards (< md) */}
      <div className="block md:hidden space-y-3.5">
        {filteredOrders.length === 0 ? (
          <EmptyState
            type="orders"
            title="No Orders Found"
            description="No wholesale orders match your current filter or search criteria."
          />
        ) : (
          filteredOrders.map(order => (
            <div key={`mob-${order.id}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-sm">{order.orderNumber}</span>
                  <p className="text-[11px] text-slate-400">{order.createdDate || 'Today'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge status={order.orderStatus} size="sm" />
                  <span className="text-[10px] font-semibold text-slate-500">
                    {order.deliveryStatus ? order.deliveryStatus.toUpperCase() : 'UNASSIGNED'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900">{order.shopName}</span>
                  <span className="text-[11px] text-slate-500">{order.area}, {order.district}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                  <span>Seller: {order.salesSellerName || order.salesUserName || 'Sales Desk'}</span>
                  <span>Driver: {order.deliveryStaffName || 'Unassigned'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#E8F7F5]/60 border border-teal-100 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Grand Total</span>
                  <span className="font-extrabold text-[#102A2A] text-sm">{formatBDT(order.totalAmount || order.grandTotal || 0)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Due Amount</span>
                  <span className={`font-extrabold text-sm ${order.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatBDT(order.dueAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                {order.orderStatus === 'pending' && (
                  <button
                    onClick={() => handleConfirmOrder(order.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                  </button>
                )}

                {(order.orderStatus === 'confirmed' || order.orderStatus === 'processing') && !order.deliveryStaffId && (
                  <button
                    onClick={() => openAssignModal(order)}
                    className="px-3 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" /> Assign Courier
                  </button>
                )}

                <button
                  onClick={() => setViewingOrder(order)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" /> Invoice
                </button>

                {order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered' && order.orderStatus !== 'returned' && (
                  <button
                    onClick={() => setActionOrder({ order, action: 'cancel' })}
                    className="px-2.5 py-1.5 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Orders Desktop Table (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <EmptyState
            type="orders"
            title="No Orders Found"
            description="No wholesale orders match your current filter or search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order # & Date</th>
                  <th className="py-3 px-4">Retail Shop</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4">Courier / Driver</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Due Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Stock State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{order.orderNumber}</span>
                      <span className="text-[11px] text-slate-400">{order.createdDate || (order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : 'Today')}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{order.shopName}</span>
                      <span className="text-[11px] text-slate-500">{order.area}, {order.district}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {order.salesSellerName || order.salesUserName || 'Sales Desk'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {order.deliveryStaffName ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              <Truck className="w-3 h-3 text-slate-500" />
                              {order.deliveryStaffName}
                            </span>
                            {(order.orderStatus === 'confirmed' || order.orderStatus === 'processing') && (
                              <button
                                onClick={() => openAssignModal(order)}
                                className="text-[10px] font-semibold text-[#7C3AED] hover:text-[#5B21B6] underline cursor-pointer"
                              >
                                Reassign
                              </button>
                            )}
                          </div>
                        ) : (
                          order.orderStatus === 'confirmed' || order.orderStatus === 'processing' ? (
                            <button
                              onClick={() => openAssignModal(order)}
                              className="text-[11px] font-bold text-[#7C3AED] hover:text-[#5B21B6] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Truck className="w-3 h-3" /> Assign Delivery
                            </button>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )
                        )}
                        <div>
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            order.deliveryStatus === 'assigned' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            order.deliveryStatus === 'in_transit' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            order.deliveryStatus === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            Delivery: {order.deliveryStatus ? order.deliveryStatus.toUpperCase() : 'UNASSIGNED'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatBDT(order.totalAmount || order.grandTotal || 0)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className={`font-extrabold ${order.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatBDT(order.dueAmount)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Badge status={order.orderStatus} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-center">
                      {order.stockDeducted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Stock Deducted
                        </span>
                      ) : order.stockRestored ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <RotateCcw className="w-3 h-3 text-purple-600" /> Stock Restored
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Not Deducted
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {/* Confirm Order (Reduces stock atomically) */}
                      {order.orderStatus === 'pending' && (
                        <button
                          onClick={() => handleConfirmOrder(order.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Confirm order and reduce warehouse stock"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm</span>
                        </button>
                      )}

                      {/* Pack / Processing */}
                      {order.orderStatus === 'confirmed' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'processing')}
                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#7C3AED] font-bold text-[11px] cursor-pointer"
                        >
                          Pack
                        </button>
                      )}

                      {/* Dispatch */}
                      {(order.orderStatus === 'confirmed' || order.orderStatus === 'processing') && !order.deliveryStaffId && (
                        <button
                          onClick={() => {
                            setAssigningOrder(order);
                            setSelectedDriverId(deliveryStaff[0]?.id || '');
                          }}
                          className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] cursor-pointer"
                        >
                          Dispatch
                        </button>
                      )}

                      {/* Cancel Order */}
                      {order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered' && order.orderStatus !== 'returned' && (
                        <button
                          onClick={() => setActionOrder({ order, action: 'cancel' })}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] cursor-pointer"
                          title="Cancel order and restore stock if confirmed"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Return Order */}
                      {(order.orderStatus === 'dispatched' || order.orderStatus === 'delivered' || order.orderStatus === 'confirmed' || order.orderStatus === 'processing') && (
                        <button
                          onClick={() => setActionOrder({ order, action: 'return' })}
                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[11px] cursor-pointer"
                          title="Return order and restore inventory"
                        >
                          Return
                        </button>
                      )}

                      {/* Invoice */}
                      <button
                        onClick={() => setViewingOrder(order)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        title="Commercial Wholesale Invoice"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Driver Modal */}
      <Modal
        isOpen={!!assigningOrder}
        onClose={() => setAssigningOrder(null)}
        title={`Assign Delivery Driver for ${assigningOrder?.orderNumber}`}
        subtitle={`Destination: ${assigningOrder?.shopName} (${assigningOrder?.area}, ${assigningOrder?.district})`}
        maxWidth="md"
      >
        <form onSubmit={handleAssignDriver} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Delivery Courier *</label>
            <select
              value={selectedDriverId}
              onChange={e => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
            >
              {deliveryStaff.filter(d => d.status === 'on_duty' || d.status === 'available' || d.status === 'active').map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.vehicleNumber} ({(d.assignedZones || [d.assignedArea || 'Zone']).join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block">Dispatch Note:</span>
            <p className="text-slate-600">Assigning a delivery courier will allocate this order consignment and set delivery status to <span className="font-semibold text-indigo-700">Assigned</span> without affecting inventory or financial ledgers.</p>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setAssigningOrder(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-bold shadow-xs cursor-pointer"
            >
              Assign Delivery
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel or Return Confirmation Modal */}
      <Modal
        isOpen={!!actionOrder}
        onClose={() => setActionOrder(null)}
        title={actionOrder?.action === 'cancel' ? `Cancel Order ${actionOrder.order.orderNumber}` : `Process Return for ${actionOrder?.order.orderNumber}`}
        subtitle={`Retail Shop: ${actionOrder?.order.shopName}`}
        maxWidth="md"
      >
        <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              {actionOrder?.action === 'cancel' ? <XCircle className="w-4 h-4 text-rose-600" /> : <RotateCcw className="w-4 h-4 text-purple-600" />}
              <span>{actionOrder?.action === 'cancel' ? 'Cancellation Inventory Impact' : 'Return Stock Restoration'}</span>
            </div>
            <p className="text-slate-600 text-xs">
              {actionOrder?.order.stockDeducted 
                ? 'Because this order previously deducted stock, executing this action will automatically restore all reserved product quantities back into warehouse inventory.'
                : 'This order was not confirmed yet, so warehouse inventory was not deducted.'}
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Reason for {actionOrder?.action === 'cancel' ? 'Cancellation' : 'Return'} *</label>
            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              placeholder={actionOrder?.action === 'cancel' ? 'e.g., Customer requested cancellation prior to van loading.' : 'e.g., Shop counter refused delivery or damaged packaging.'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActionOrder(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={isProcessingAction}
              className={`px-4 py-2 rounded-xl text-white font-bold shadow-xs cursor-pointer ${actionOrder?.action === 'cancel' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {isProcessingAction ? 'Updating Firestore...' : actionOrder?.action === 'cancel' ? 'Confirm Cancellation' : 'Confirm Return'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

