import React from 'react';
import { ExecutiveKPI, Order, Product, Customer, Expense } from '../../../types';
import { formatBDT } from '../../../utils/formatters';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Users, 
  DollarSign, 
  Package, 
  Building2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ExecutiveKPIDrilldownDrawerProps {
  kpi: ExecutiveKPI | null;
  onClose: () => void;
  orders: Order[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveKPIDrilldownDrawer: React.FC<ExecutiveKPIDrilldownDrawerProps> = ({
  kpi,
  onClose,
  orders,
  products,
  customers,
  expenses,
  onNavigateTab
}) => {
  if (!kpi) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200">
        
        {/* Drawer Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">{kpi.title}</h2>
              {kpi.statusLabel && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  {kpi.statusLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">Authoritative Ledger & Line-Item Drilldown</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Value Card */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 block">Current Period Metric</span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {kpi.unit === 'BDT' && kpi.currentValue !== null ? formatBDT(kpi.currentValue) :
               kpi.unit === 'PERCENT' && kpi.currentValue !== null ? `${kpi.currentValue}%` :
               kpi.currentValue !== null ? kpi.currentValue.toLocaleString() : 'N/A'}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">{kpi.subtitle}</span>
          </div>

          {kpi.changePercent !== null && (
            <div className={`p-3 rounded-2xl border text-right ${
              (kpi.changePercent > 0 && kpi.isPositive) || (kpi.changePercent < 0 && !kpi.isPositive)
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="text-xs font-semibold">Change</div>
              <div className="text-lg font-bold">
                {kpi.changePercent > 0 ? '+' : ''}{kpi.changePercent}%
              </div>
            </div>
          )}
        </div>

        {/* Content Body based on KPI ID */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {kpi.id === 'net_sales' || kpi.id === 'total_orders' ? (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Recent Contributing Wholesale Orders
              </span>
              <div className="space-y-2">
                {orders.slice(0, 15).map(o => (
                  <div key={o.id} className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{o.shopName}</div>
                      <div className="text-[11px] text-slate-500">Order #{o.orderNumber} • {o.items?.length || 0} items</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-teal-700">{formatBDT(o.grandTotal ?? o.totalAmount)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{(o.createdAt || o.createdDate || '').slice(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : kpi.id === 'customer_due' ? (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Top Market Receivables
              </span>
              <div className="space-y-2">
                {customers.filter(c => c.currentDue > 0).sort((a, b) => b.currentDue - a.currentDue).slice(0, 15).map(c => (
                  <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{c.shopName}</div>
                      <div className="text-[11px] text-slate-500">{c.ownerName} • {c.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-700">{formatBDT(c.currentDue)}</div>
                      <div className="text-[10px] text-slate-400">Limit: {formatBDT(c.creditLimit)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : kpi.id === 'inventory_value' ? (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                High-Value Warehouse Inventory
              </span>
              <div className="space-y-2">
                {products.sort((a, b) => (b.currentStock * b.purchasePrice) - (a.currentStock * a.purchasePrice)).slice(0, 15).map(p => (
                  <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">SKU: {p.sku} • Stock: {p.currentStock} {p.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatBDT(p.currentStock * p.purchasePrice)}</div>
                      <div className="text-[10px] text-slate-400">Cost: {formatBDT(p.purchasePrice)}/unit</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Detailed breakdown computed dynamically in the Executive Command Center sub-tabs.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              if (kpi.drilldownTab) onNavigateTab(kpi.drilldownTab);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <span>Open {kpi.drilldownTab?.toUpperCase() || 'DETAILS'} Tab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
