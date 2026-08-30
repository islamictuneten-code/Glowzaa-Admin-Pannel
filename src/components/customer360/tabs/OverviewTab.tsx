import React from 'react';
import { 
  Building, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  Shield, 
  ShoppingBag, 
  DollarSign, 
  ArrowRight,
  Lock,
  FileText,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Customer, Order, Payment } from '../../../types';
import { formatBDT } from '../../../utils/formatters';

interface OverviewTabProps {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
  onSelectTab: (tab: string) => void;
  onViewOrder: (order: Order) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  customer,
  orders,
  payments,
  onSelectTab,
  onViewOrder
}) => {
  const recentOrders = orders.slice(0, 3);
  const recentPayments = payments.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 1. Two-Column Business & Credit Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Business & Location Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Building className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Business & Contact Profile</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Shop Name</span>
              <span className="font-semibold text-slate-900">{customer.shopName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Proprietor / Owner</span>
              <span className="font-semibold text-slate-900">{customer.ownerName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Primary Phone</span>
              <span className="font-semibold text-slate-900 font-mono">{customer.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Alternate Contact</span>
              <span className="font-semibold text-slate-900 font-mono">{customer.alternatePhone || 'None'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[11px]">Full Address</span>
              <span className="font-medium text-slate-800">{customer.address}, {customer.area || customer.district}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">District / Territory</span>
              <span className="font-semibold text-slate-900">{customer.district}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Trade License / BIN</span>
              <span className="font-mono text-slate-800 font-semibold">{customer.tradeLicenseNo || 'Not Provided'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Sales Officer</span>
              <span className="font-semibold text-slate-900">{customer.assignedSalesUserName || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Customer Since</span>
              <span className="font-medium text-slate-700">
                {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Credit & Terms Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Credit Terms & Policy</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">Allocated Credit Limit</span>
                <span className="font-bold text-slate-900 text-sm">{formatBDT(customer.creditLimit || 0)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Payment Terms</span>
                <span className="font-bold text-slate-900 text-sm">Net {customer.paymentTermDays || 15} Days</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Enforcement Mode</span>
                <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                  {customer.creditCheckMode || 'NONE'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Credit Hold Status</span>
                <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-md font-bold text-[11px] ${
                  customer.creditHold ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {customer.creditHold ? 'ON HOLD' : 'NORMAL'}
                </span>
              </div>
            </div>

            {customer.creditHold && customer.creditHoldReason && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                <span className="font-bold block text-[11px]">Hold Reason:</span>
                <span>{customer.creditHoldReason}</span>
              </div>
            )}

            {customer.creditReviewDate && (
              <div className="flex items-center space-x-2 text-slate-600 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Next Credit Review: <strong>{customer.creditReviewDate}</strong></span>
              </div>
            )}

            {customer.creditNote && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <span className="font-semibold block text-[11px] text-slate-500">Internal Evaluation Note:</span>
                <span>{customer.creditNote}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Recent Orders Snapshot */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Recent Orders</h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('orders')}
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center space-x-1"
          >
            <span>View All Orders ({orders.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No orders recorded for this customer yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => onViewOrder(order)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center font-bold text-xs">
                    #
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 block font-mono">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {order.createdDate || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '')} • {order.items?.length || 0} items
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-xs text-slate-900 block">
                    {formatBDT(order.grandTotal || order.totalAmount || 0)}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                    order.paymentStatus === 'partial' ? 'bg-amber-50 text-amber-800' :
                    'bg-rose-50 text-rose-700'
                  }`}>
                    {order.paymentStatus?.toUpperCase() || 'UNPAID'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Recent Payments Snapshot */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Recent Payments</h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('payments')}
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center space-x-1"
          >
            <span>View All Payments ({payments.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No payment collections logged for this customer yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentPayments.map((pmt) => (
              <div
                key={pmt.id}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ৳
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 block font-mono">
                      {pmt.paymentNumber || pmt.id.slice(0, 8)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {pmt.date || (pmt.createdAt ? new Date(pmt.createdAt).toLocaleDateString() : '')} • {pmt.paymentMethod}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-xs text-emerald-600 block">
                    +{formatBDT(pmt.amount || 0)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    By {pmt.collectedByUserName || 'Staff'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
