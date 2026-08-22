import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../shared/StatCard';
import { Badge } from '../shared/Badge';
import { UserAvatar } from '../shared/UserAvatar';
import { 
  Truck, 
  PackageCheck, 
  Clock, 
  DollarSign, 
  MapPin, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Receipt,
  Eye,
  Navigation
} from 'lucide-react';

export const DeliveryOverview: React.FC = () => {
  const { 
    orders, 
    currentDeliveryUser, 
    setDeliveryTab, 
    setViewingOrder, 
    recordCollection,
    handoverDeliveryCash,
    formatBDT 
  } = useApp();

  // Assigned Orders
  const myAssignedOrders = orders.filter(o => 
    o.deliveryStaffId === currentDeliveryUser.id || 
    (currentDeliveryUser as any).uid === o.deliveryStaffId ||
    (o.deliveryStaffName && o.deliveryStaffName.toLowerCase() === currentDeliveryUser.name.toLowerCase())
  );
  const todayRuns = myAssignedOrders.filter(o => o.orderStatus !== 'cancelled');
  const deliveredOrders = myAssignedOrders.filter(o => o.deliveryStatus === 'delivered');
  const pendingRuns = myAssignedOrders.filter(o => o.deliveryStatus === 'pending' || o.deliveryStatus === 'out_for_delivery');

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <UserAvatar
            src={currentDeliveryUser.photoURL}
            name={currentDeliveryUser.name}
            fallbackInitials={currentDeliveryUser.avatar}
            size="lg"
            role="delivery"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Fleet Logistics Workspace</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                {currentDeliveryUser.vehicleNumber} ({currentDeliveryUser.vehicleType})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5 text-white">
              Hello, {currentDeliveryUser.name}
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
              Route coverage: <span className="font-semibold text-white">{(currentDeliveryUser.assignedZones || [currentDeliveryUser.assignedArea || 'Dhaka Metro']).join(', ')}</span>. Deliver beauty orders, verify received signatures, and collect COD cash.
            </p>
          </div>
        </div>

        <button
          onClick={() => setDeliveryTab('today')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Truck className="w-4 h-4" />
          <span>Open Today's Delivery Run ({pendingRuns.length})</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Assigned Consignments"
          value={myAssignedOrders.length.toString()}
          subtitle="Total route manifests"
          icon={<Truck className="w-5 h-5 text-emerald-600" />}
          onClick={() => setDeliveryTab('assigned')}
        />

        <StatCard
          title="Delivered Successfully"
          value={deliveredOrders.length.toString()}
          subtitle="Signed and dropped"
          icon={<PackageCheck className="w-5 h-5 text-teal-600" />}
          onClick={() => setDeliveryTab('delivered')}
        />

        <StatCard
          title="Pending Route Stops"
          value={pendingRuns.length.toString()}
          subtitle="Awaiting drop-off today"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          onClick={() => setDeliveryTab('pending')}
        />

        <StatCard
          title="Route Cash in Hand"
          value={formatBDT(currentDeliveryUser.cashInHand)}
          subtitle="Collected COD funds"
          icon={<Receipt className="w-5 h-5 text-emerald-600" />}
          onClick={() => setDeliveryTab('money_collected')}
        />
      </div>

      {/* Cash In Hand Handover Alert Banner */}
      {currentDeliveryUser.cashInHand > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Cash in Hand for Glowzaa Cash Desk</h3>
              <p className="text-slate-600 text-xs">
                You have collected <span className="font-bold text-emerald-800">{formatBDT(currentDeliveryUser.cashInHand)}</span> in Cash on Delivery from retail shops today.
              </p>
            </div>
          </div>

          <button
            onClick={() => handoverDeliveryCash(currentDeliveryUser.id)}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            Handover to HQ Cashier
          </button>
        </div>
      )}

      {/* Active Route Stops & Recent Delivered */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Route Deliveries */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Active Delivery Stops (Today)</h2>
              <p className="text-xs text-slate-500">Scheduled drops for retail salons & cosmetics shops</p>
            </div>
            <button
              onClick={() => setDeliveryTab('today')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View Route</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingRuns.map(order => (
              <div key={order.id} className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{order.shopName}</span>
                    <span className="text-[11px] text-slate-500">Proprietor: {order.ownerName}</span>
                  </div>
                  <Badge status={order.deliveryStatus} size="sm" />
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-[11px]">{order.address}, {order.area}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-slate-700 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="font-semibold">{order.phone}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Collect on Delivery:</span>
                    <span className="font-extrabold text-emerald-700 text-sm">{formatBDT(order.dueAmount)}</span>
                  </div>
                </div>
              </div>
            ))}

            {pendingRuns.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 stroke-1" />
                <p className="text-xs font-semibold text-slate-700">All Scheduled Drops Completed!</p>
                <span className="text-[11px]">No pending orders on your route manifest right now.</span>
              </div>
            )}
          </div>
        </div>

        {/* Recently Completed Drops */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Completed Drops History</h2>
              <p className="text-xs text-slate-500">Delivered wholesale cartons and verified payments</p>
            </div>
            <button
              onClick={() => setDeliveryTab('delivered')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {deliveredOrders.slice(0, 5).map(order => (
              <div key={order.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{order.shopName}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{order.orderNumber} • {order.area}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                    ✓ Handed to: {order.receiverName || order.ownerName}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-slate-900 text-sm block">{formatBDT(order.totalAmount)}</span>
                  <button
                    onClick={() => setViewingOrder(order)}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold"
                  >
                    View Challan
                  </button>
                </div>
              </div>
            ))}

            {deliveredOrders.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No deliveries marked completed yet today.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
