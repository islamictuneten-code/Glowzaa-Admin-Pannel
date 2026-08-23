import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { Order, DeliveryStatus } from '../../types';
import { DeliveryStatusConfirmModal } from './DeliveryStatusConfirmModal';
import { DeliveryPaymentModal } from './DeliveryPaymentModal';
import { DeliveryPodModal } from './DeliveryPodModal';
import { DeliveryPartialModal } from './DeliveryPartialModal';
import { 
  Truck, 
  Search, 
  Eye, 
  Phone, 
  MapPin, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  RotateCcw,
  XCircle,
  Play,
  Banknote
} from 'lucide-react';

export const DeliveryAssignedOrders: React.FC = () => {
  const { orders, currentDeliveryUser, setViewingOrder, updateDeliveryStatus, formatBDT } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // State for confirmation modal
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null);
  const [targetActionStatus, setTargetActionStatus] = useState<DeliveryStatus | null>(null);

  // State for payment collection modal
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);

  // State for POD modal
  const [podModalOrder, setPodModalOrder] = useState<Order | null>(null);

  // State for Partial / Full Delivery modal
  const [partialModalOrder, setPartialModalOrder] = useState<Order | null>(null);

  if (!currentDeliveryUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center p-6">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Syncing fleet dispatch manifests...</p>
      </div>
    );
  }

  const myAssignedOrders = orders.filter(o => 
    (o && currentDeliveryUser && (
      o.deliveryStaffId === currentDeliveryUser.id || 
      o.deliveryStaffId === currentDeliveryUser.uid ||
      (o.deliveryStaffName && o.deliveryStaffName.toLowerCase() === currentDeliveryUser.name?.toLowerCase())
    ))
  );

  const filteredOrders = myAssignedOrders.filter(o => {
    const matchesSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
                          o.shopName.toLowerCase().includes(search.toLowerCase()) ||
                          o.ownerName.toLowerCase().includes(search.toLowerCase()) ||
                          o.phone.includes(search) ||
                          o.area.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.deliveryStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const handleActionClick = (order: Order, status: DeliveryStatus) => {
    if (status === 'delivered' || status === 'partially_delivered') {
      setPartialModalOrder(order);
      return;
    }
    setSelectedOrderForAction(order);
    setTargetActionStatus(status);
  };

  const handleConfirmStatusChange = async (orderId: string, newStatus: DeliveryStatus, options?: { failureReason?: string }) => {
    await updateDeliveryStatus(orderId, newStatus, options);
    setSelectedOrderForAction(null);
    setTargetActionStatus(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Assigned Delivery Orders</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {myAssignedOrders.length} Consignments
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manifest of wholesale packages allocated to vehicle <span className="font-semibold text-slate-900">{currentDeliveryUser.vehicleNumber}</span>.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order #, shop name, area..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <option value="all">All Delivery Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="returned">Returned</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {myAssignedOrders.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders assigned to you.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no wholesale consignments assigned for delivery. New dispatches from admin will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order # & Date</th>
                  <th className="py-3 px-4">Retail Shop & Address</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4 text-right">Order Total</th>
                  <th className="py-3 px-4 text-right">COD Due Amount</th>
                  <th className="py-3 px-4 text-center">Delivery Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedOrders.map(order => {
                  const currentStatus = order.deliveryStatus || 'assigned';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{order.orderNumber}</span>
                        <span className="text-[11px] text-slate-400">{order.createdDate?.split(' ')[0] || 'Today'}</span>
                      </td>

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

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatBDT(order.grandTotal || order.totalAmount)}
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                        {formatBDT(order.dueAmount)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Badge status={currentStatus} size="sm" />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                          >
                            Challan
                          </button>

                          {order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned' && (
                            <button
                              onClick={() => setPaymentModalOrder(order)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition-colors flex items-center gap-1 border border-emerald-200/80"
                            >
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                              Collect Payment
                            </button>
                          )}

                          {(currentStatus === 'assigned' || currentStatus === 'ready_for_delivery') && (
                            <>
                              <button
                                onClick={() => handleActionClick(order, 'in_transit')}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Start Trip
                              </button>
                              <button
                                onClick={() => handleActionClick(order, 'delivered')}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Record Delivery
                              </button>
                              <button
                                onClick={() => handleActionClick(order, 'failed')}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Failed
                              </button>
                            </>
                          )}

                          {(currentStatus === 'in_transit' || currentStatus === 'partially_delivered') && (
                            <>
                              <button
                                onClick={() => handleActionClick(order, 'delivered')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {currentStatus === 'partially_delivered' ? 'Complete / Deliver Remaining' : 'Record Delivery'}
                              </button>
                              <button
                                onClick={() => handleActionClick(order, 'failed')}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Failed
                              </button>
                              <button
                                onClick={() => handleActionClick(order, 'returned')}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Return
                              </button>
                            </>
                          )}

                          {currentStatus === 'failed' && (
                            <>
                              <button
                                onClick={() => handleActionClick(order, 'in_transit')}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Retry Delivery
                              </button>
                              <button
                                onClick={() => handleActionClick(order, 'returned')}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Return
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <DeliveryStatusConfirmModal
        order={selectedOrderForAction}
        targetStatus={targetActionStatus}
        onClose={() => {
          setSelectedOrderForAction(null);
          setTargetActionStatus(null);
        }}
        onConfirm={handleConfirmStatusChange}
      />

      {/* Payment Collection Modal */}
      <DeliveryPaymentModal
        isOpen={!!paymentModalOrder}
        order={paymentModalOrder}
        onClose={() => setPaymentModalOrder(null)}
      />

      {/* Proof of Delivery Modal */}
      <DeliveryPodModal
        isOpen={!!podModalOrder}
        order={podModalOrder}
        onClose={() => setPodModalOrder(null)}
      />

      {/* Partial / Full Item Delivery Modal */}
      {partialModalOrder && (
        <DeliveryPartialModal
          order={partialModalOrder}
          onClose={() => setPartialModalOrder(null)}
        />
      )}

    </div>
  );
};

