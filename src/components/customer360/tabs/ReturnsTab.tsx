import React from 'react';
import { RotateCcw, Package, AlertTriangle, FileText } from 'lucide-react';
import { Customer, Order, CustomerLedgerEntry } from '../../../types';
import { formatBDT } from '../../../utils/formatters';

interface ReturnsTabProps {
  customer: Customer;
  orders: Order[];
  ledgerEntries: CustomerLedgerEntry[];
  onViewOrder: (order: Order) => void;
}

export const ReturnsTab: React.FC<ReturnsTabProps> = ({
  customer,
  orders,
  ledgerEntries,
  onViewOrder
}) => {
  const returnOrders = orders.filter(o => o.orderStatus === 'returned' || o.deliveryStatus === 'returned');
  const returnLedgerEntries = ledgerEntries.filter(l => l.type === 'RETURN');
  const totalReturned = customer.totalReturned || returnLedgerEntries.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Return Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
            <RotateCcw className="w-4 h-4 text-purple-600" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Return Value Credited</span>
          </div>
          <span className="text-base font-extrabold text-purple-700">{formatBDT(totalReturned)}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1">
            <Package className="w-4 h-4 text-slate-500" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Returned Orders Count</span>
          </div>
          <span className="text-base font-extrabold text-slate-900">{returnOrders.length} order{returnOrders.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Returns List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Customer Return Orders & Restocked Shipments
          </span>
        </div>

        {returnOrders.length === 0 && returnLedgerEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No return transactions recorded for this customer.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {returnOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => onViewOrder(order)}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900">{order.orderNumber || order.id.slice(0, 8)}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      RETURNED
                    </span>
                  </div>
                  <p className="text-slate-500 mt-1">
                    Date: {order.createdDate || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '')} • {order.items?.length || 0} item lines
                  </p>
                  {order.notes && (
                    <p className="text-[11px] text-amber-900 mt-0.5 bg-amber-50/60 px-2 py-0.5 rounded inline-block">
                      Note: {order.notes}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-sm text-purple-700 block">
                    {formatBDT(order.grandTotal || order.totalAmount || 0)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    Stock Restored & Balance Adjusted
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
