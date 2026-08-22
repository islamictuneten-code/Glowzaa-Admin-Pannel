import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  CheckCircle2, 
  PackageCheck, 
  Truck, 
  Calendar, 
  MapPin, 
  User, 
  Building2, 
  Eye, 
  UserPlus, 
  Clock, 
  ChevronRight, 
  AlertCircle, 
  ListChecks
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order, OrderItem } from '../../types';
import { Badge } from '../shared/Badge';
import { AssignDeliveryModal } from '../delivery/AssignDeliveryModal';
import { EmptyState } from '../shared/EmptyState';

export const AdminPacking: React.FC = () => {
  const { 
    orders, 
    markOrderPacking, 
    markOrderReadyForDelivery, 
    setViewingOrder, 
    formatBDT, 
    addToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'packing' | 'ready'>('all');
  const [assignModalOrder, setAssignModalOrder] = useState<Order | null>(null);
  const [checkedItemsState, setCheckedItemsState] = useState<Record<string, Record<string, boolean>>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Filter orders related to warehouse/packing stage
  const packingOrders = useMemo(() => {
    return orders.filter(order => {
      const status = order.orderStatus;
      const delStatus = order.deliveryStatus;

      const isPackingCandidate = 
        status === 'confirmed' || 
        status === 'packing' || 
        status === 'ready_for_delivery' ||
        delStatus === 'packing' ||
        delStatus === 'ready_for_delivery';

      if (!isPackingCandidate) return false;

      if (activeTab === 'confirmed') return status === 'confirmed';
      if (activeTab === 'packing') return status === 'packing' || delStatus === 'packing';
      if (activeTab === 'ready') return status === 'ready_for_delivery' || delStatus === 'ready_for_delivery';

      return true;
    });
  }, [orders, activeTab]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return packingOrders;
    const q = searchQuery.toLowerCase().trim();
    return packingOrders.filter(o => 
      o.orderNumber.toLowerCase().includes(q) ||
      o.shopName.toLowerCase().includes(q) ||
      o.ownerName.toLowerCase().includes(q) ||
      (o.deliveryStaffName && o.deliveryStaffName.toLowerCase().includes(q))
    );
  }, [packingOrders, searchQuery]);

  const toggleItemCheck = (orderId: string, sku: string) => {
    setCheckedItemsState(prev => {
      const orderChecks = prev[orderId] || {};
      return {
        ...prev,
        [orderId]: {
          ...orderChecks,
          [sku]: !orderChecks[sku]
        }
      };
    });
  };

  const handleStartPacking = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      await markOrderPacking(orderId);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      await markOrderReadyForDelivery(orderId);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const counts = useMemo(() => {
    const all = orders.filter(o => 
      o.orderStatus === 'confirmed' || 
      o.orderStatus === 'packing' || 
      o.orderStatus === 'ready_for_delivery'
    ).length;
    const confirmed = orders.filter(o => o.orderStatus === 'confirmed').length;
    const packing = orders.filter(o => o.orderStatus === 'packing' || o.deliveryStatus === 'packing').length;
    const ready = orders.filter(o => o.orderStatus === 'ready_for_delivery' || o.deliveryStatus === 'ready_for_delivery').length;

    return { all, confirmed, packing, ready };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none p-6 flex items-center">
          <Boxes className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-3">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Step 9 Wholesale Fulfillment Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Warehouse Packing & Preparation
          </h1>
          <p className="text-purple-100/80 text-sm leading-relaxed">
            Verify wholesale order line-items, check off packed cartons, and flag consignments as Ready for Delivery prior to driver assignment and dispatch.
          </p>
        </div>
      </div>

      {/* Stats & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <span>All Queue</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'all' ? 'bg-purple-700 text-purple-100' : 'bg-slate-200 text-slate-700'}`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('confirmed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Waiting to Pack</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'confirmed' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
              {counts.confirmed}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('packing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'packing'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Packing In Progress</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'packing' ? 'bg-purple-700 text-purple-100' : 'bg-slate-200 text-slate-700'}`}>
              {counts.packing}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ready')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ready'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready for Delivery</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'ready' ? 'bg-teal-700 text-teal-100' : 'bg-slate-200 text-slate-700'}`}>
              {counts.ready}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order #, Shop, Owner..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

      </div>

      {/* Orders Grid / List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="p-4 bg-purple-50 rounded-2xl w-fit mx-auto text-purple-600">
            <PackageCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Orders in Packing Queue</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery 
              ? `No matching orders found for "${searchQuery}".` 
              : 'There are currently no orders waiting for packing or warehouse verification.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const isUpdating = updatingOrderId === order.id;
            const orderChecks = checkedItemsState[order.id] || {};
            const totalItemCount = order.items.length;
            const checkedCount = order.items.filter(item => orderChecks[item.sku]).length;
            const isAllChecked = totalItemCount > 0 && checkedCount === totalItemCount;

            const isPacking = order.orderStatus === 'packing' || order.deliveryStatus === 'packing';
            const isReady = order.orderStatus === 'ready_for_delivery' || order.deliveryStatus === 'ready_for_delivery';
            const isConfirmed = order.orderStatus === 'confirmed' && !isPacking && !isReady;

            return (
              <div 
                key={order.id} 
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-200 transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Order Top Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                        #{order.orderNumber}
                      </span>
                      <Badge status={order.orderStatus} size="sm" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {formatBDT(order.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.shopName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.area}, {order.district}</span>
                    </div>
                  </div>

                  {order.deliveryStaffName && (
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60 w-fit">
                      <Truck className="w-3 h-3 text-purple-500" />
                      <span>Assigned Driver: <strong className="font-bold">{order.deliveryStaffName}</strong></span>
                    </div>
                  )}
                </div>

                {/* Items Checklist Body */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                    <span className="flex items-center gap-1.5">
                      <ListChecks className="w-4 h-4 text-purple-600" />
                      Packing Item Checklist ({checkedCount}/{totalItemCount} packed)
                    </span>
                    {isAllChecked && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        ✓ All Items Verified
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {order.items.map((item: OrderItem, idx: number) => {
                      const isChecked = !!orderChecks[item.sku];
                      const orderedQty = item.orderedQuantity ?? item.quantity;
                      const deliveredQty = item.deliveredQuantity ?? 0;
                      const remainingQty = item.remainingQuantity ?? orderedQty;

                      return (
                        <div 
                          key={idx}
                          onClick={() => toggleItemCheck(order.id, item.sku)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isChecked 
                              ? 'bg-purple-50/60 border-purple-200 text-purple-900 font-medium' 
                              : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent onClick
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{item.productName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                              {orderedQty} {item.unit || 'pcs'}
                            </span>
                            {deliveredQty > 0 && (
                              <div className="text-[10px] text-emerald-700 mt-0.5 font-semibold">
                                Delivered so far: {deliveredQty}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    <button
                      onClick={() => setAssignModalOrder(order)}
                      className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-semibold flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{order.deliveryStaffName ? 'Reassign Staff' : 'Assign Staff'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirmed && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStartPacking(order.id)}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Boxes className="w-3.5 h-3.5" />
                        <span>{isUpdating ? 'Updating...' : 'Start Packing'}</span>
                      </button>
                    )}

                    {isPacking && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleMarkReady(order.id)}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isUpdating ? 'Updating...' : 'Mark Ready for Delivery'}</span>
                      </button>
                    )}

                    {isReady && (
                      <div className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Ready for Driver Pickup</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Assign Delivery Staff Modal */}
      {assignModalOrder && (
        <AssignDeliveryModal
          order={assignModalOrder}
          onClose={() => setAssignModalOrder(null)}
        />
      )}
    </div>
  );
};
