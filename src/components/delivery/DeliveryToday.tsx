import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, DeliveryStatus } from '../../types';
import { Badge } from '../shared/Badge';
import { EmptyState } from '../shared/EmptyState';
import { DeliveryStatusConfirmModal } from './DeliveryStatusConfirmModal';
import { DeliveryPaymentModal } from './DeliveryPaymentModal';
import { DeliveryPodModal } from './DeliveryPodModal';
import { 
  Truck, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  FileText, 
  Navigation, 
  Sparkles,
  Receipt,
  UserCheck,
  RotateCcw,
  Play,
  Banknote
} from 'lucide-react';

export const DeliveryToday: React.FC = () => {
  const { 
    orders, 
    currentDeliveryUser, 
    updateDeliveryStatus,
    setViewingOrder, 
    formatBDT 
  } = useApp();

  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null);
  const [targetActionStatus, setTargetActionStatus] = useState<DeliveryStatus | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [podModalOrder, setPodModalOrder] = useState<Order | null>(null);

  if (!currentDeliveryUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading route manifests...</p>
      </div>
    );
  }

  const todayRuns = orders.filter(
    o => (o && currentDeliveryUser && (
          o.deliveryStaffId === currentDeliveryUser.id || 
          o.deliveryStaffId === currentDeliveryUser.uid || 
          (o.deliveryStaffName && o.deliveryStaffName.toLowerCase() === currentDeliveryUser.name?.toLowerCase())
    )) && o.orderStatus !== 'cancelled'
  );

  const pendingRuns = todayRuns.filter(o => o.deliveryStatus !== 'delivered' && o.deliveryStatus !== 'returned' && o.deliveryStatus !== 'failed');
  const completedRuns = todayRuns.filter(o => o.deliveryStatus === 'delivered' || o.deliveryStatus === 'returned' || o.deliveryStatus === 'failed');

  const handleActionClick = (order: Order, status: DeliveryStatus) => {
    if (status === 'delivered') {
      setPodModalOrder(order);
      return;
    }
    setSelectedOrderForAction(order);
    setTargetActionStatus(status);
  };

  const handleConfirmStatusChange = async (orderId: string, newStatus: DeliveryStatus) => {
    await updateDeliveryStatus(orderId, newStatus);
    setSelectedOrderForAction(null);
    setTargetActionStatus(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Today's Delivery Route Run</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {pendingRuns.length} Pending Stops • {completedRuns.length} Delivered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time delivery sequence for <span className="font-bold text-slate-700">{currentDeliveryUser.name}</span> ({currentDeliveryUser.vehicleNumber || 'Vehicle Assigned'}).
          </p>
        </div>
      </div>

      {/* Pending Delivery Stops List */}
      <div className="space-y-4">
        <h2 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#7C3AED]" />
          Active Route Consignments ({pendingRuns.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingRuns.map((order, idx) => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-200 transition-all">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-[#7C3AED] font-extrabold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{order.shopName}</h3>
                      <span className="font-mono text-[11px] text-slate-400">{order.orderNumber}</span>
                    </div>
                  </div>
                  <Badge status={order.deliveryStatus || 'pending'} size="sm" />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="font-medium">{order.address}, {order.area}, {order.district}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/80">
                    <span className="text-slate-600 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" /> {order.ownerName}
                    </span>
                    <a 
                      href={`tel:${order.phone}`} 
                      className="text-emerald-700 font-mono font-bold flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" /> {order.phone}
                    </a>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#7C3AED] uppercase font-bold block">Cash on Delivery (COD)</span>
                    <span className="font-extrabold text-[#7C3AED] text-sm">{formatBDT(order.dueAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Total Order</span>
                    <span className="font-bold text-slate-800">{formatBDT(order.grandTotal || order.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setViewingOrder(order)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    View Challan
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentModalOrder(order)}
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center gap-1 border border-emerald-200 cursor-pointer"
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Collect Payment</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {(order.deliveryStatus === 'assigned' || !order.deliveryStatus) && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleActionClick(order, 'in_transit')}
                        className="px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Delivery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionClick(order, 'failed')}
                        className="px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Failed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionClick(order, 'returned')}
                        className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Returned
                      </button>
                    </>
                  )}

                  {order.deliveryStatus === 'in_transit' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleActionClick(order, 'delivered')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Delivered</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionClick(order, 'failed')}
                        className="px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Failed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionClick(order, 'returned')}
                        className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Returned
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {pendingRuns.length === 0 && (
            <div className="col-span-2">
              <EmptyState 
                type="deliveries"
                title="All Active Stops Processed!"
                description="You have updated all pending consignments on your schedule today. Great job completing the run!"
              />
            </div>
          )}
        </div>
      </div>

      {/* Completed Deliveries / Finished Stops Today */}
      {completedRuns.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Processed Consignments Today ({completedRuns.length})
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Retail Shop</th>
                    <th className="py-3 px-4">Owner / Contact</th>
                    <th className="py-3 px-4 text-right">Order Value</th>
                    <th className="py-3 px-4 text-right">COD Due Amount</th>
                    <th className="py-3 px-4 text-center">Delivery Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedRuns.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{order.shopName}</span>
                        <span className="text-[11px] text-slate-400">{order.area}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {order.ownerName}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatBDT(order.grandTotal || order.totalAmount)}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700">{formatBDT(order.dueAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge status={order.deliveryStatus || 'delivered'} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                          >
                            Challan
                          </button>
                          {order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned' && (
                            <button
                              onClick={() => setPaymentModalOrder(order)}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200"
                            >
                              Collect Payment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Status Transition Confirmation Modal */}
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

    </div>
  );
};
