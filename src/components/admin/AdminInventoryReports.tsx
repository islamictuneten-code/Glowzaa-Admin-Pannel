import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileSpreadsheet, 
  Boxes, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Printer, 
  ArrowUpRight,
  PackageCheck
} from 'lucide-react';
import { Badge } from '../shared/Badge';

export const AdminInventoryReports: React.FC = () => {
  const { products, formatBDT } = useApp();

  const totalStockUnits = products.reduce((sum, p) => sum + p.currentStock, 0);
  const totalCostValuation = products.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);
  const totalWholesaleValuation = products.reduce((sum, p) => sum + (p.currentStock * p.wholesalePrice), 0);
  const totalPotentialMargin = totalWholesaleValuation - totalCostValuation;

  const lowStockItems = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock');
  const healthyStockItems = products.filter(p => p.status === 'in_stock');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Inventory Valuation & Stock Reports</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Warehouse Audit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Asset cost valuation, gross margin projection, safety buffer monitoring, and replenishment schedules.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Inventory Report</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Warehouse Count</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalStockUnits.toLocaleString()} Pcs</div>
          <span className="text-[11px] text-slate-500">Across {products.length} SKU bays</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Inventory Asset Cost</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(totalCostValuation)}</div>
          <span className="text-[11px] text-slate-500">Procured asset balance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Wholesale Value</span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{formatBDT(totalWholesaleValuation)}</div>
          <span className="text-[11px] text-slate-500">Gross receivable potential</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Inventory Margin</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{formatBDT(totalPotentialMargin)}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {totalCostValuation > 0 ? Math.round((totalPotentialMargin / totalCostValuation) * 100) : 0}% Markup
          </span>
        </div>
      </div>

      {/* Stock Valuation Table by SKU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Product-by-Product Valuation & Margin Sheet</h2>
          <span className="text-xs text-slate-500">{products.length} items logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU Code & Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">In Stock</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Wholesale Price</th>
                <th className="py-3 px-4 text-right">Total Cost Value</th>
                <th className="py-3 px-4 text-right">Total Wholesale Value</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map(p => {
                const costVal = p.currentStock * p.purchasePrice;
                const wholesaleVal = p.currentStock * p.wholesalePrice;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{p.name}</span>
                      <span className="font-mono text-[11px] text-slate-400">{p.sku} • {p.warehouseLocation}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{p.currentStock} {p.unit}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">{formatBDT(p.purchasePrice)}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">{formatBDT(p.wholesalePrice)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatBDT(costVal)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-rose-600">{formatBDT(wholesaleVal)}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={p.status} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
