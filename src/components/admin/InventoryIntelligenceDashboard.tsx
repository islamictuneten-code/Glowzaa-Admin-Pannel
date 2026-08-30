import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  computeProductForecasts, 
  computeReorderRecommendations, 
  ReorderRecommendation, 
  getStoredForecastingSettings 
} from '../../services/salesForecastService';
import { 
  Boxes, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Search, 
  Package, 
  ArrowUpRight,
  Info
} from 'lucide-react';

interface InventoryIntelligenceDashboardProps {
  onNavigateToInventory?: () => void;
  onNavigateToForecasts?: () => void;
}

export const InventoryIntelligenceDashboard: React.FC<InventoryIntelligenceDashboardProps> = ({
  onNavigateToInventory,
  onNavigateToForecasts
}) => {
  const { products, orders } = useApp();
  const settings = useMemo(() => getStoredForecastingSettings(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const forecasts = useMemo(() => computeProductForecasts(products, orders, settings), [products, orders, settings]);
  const recommendations = useMemo(() => computeReorderRecommendations(products, forecasts, settings), [products, forecasts, settings]);

  // Group by priority
  const grouped = useMemo(() => {
    const critical: ReorderRecommendation[] = [];
    const high: ReorderRecommendation[] = [];
    const medium: ReorderRecommendation[] = [];
    const low: ReorderRecommendation[] = [];
    const none: ReorderRecommendation[] = [];

    recommendations.forEach(rec => {
      const matchSearch = rec.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rec.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rec.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return;

      if (rec.priority === 'critical') critical.push(rec);
      else if (rec.priority === 'high') high.push(rec);
      else if (rec.priority === 'medium') medium.push(rec);
      else if (rec.priority === 'low') low.push(rec);
      else none.push(rec);
    });

    return { critical, high, medium, low, none };
  }, [recommendations, searchQuery]);

  const totalActionNeeded = grouped.critical.length + grouped.high.length + grouped.medium.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-7 h-7 text-[#0F766E]" />
            Inventory & Reorder Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated stockout risk detection, safety stock policies, and supplier reorder point recommendations. Recommendation-only (no automatic purchasing).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToForecasts}
            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-xs"
          >
            Sales Forecasts
          </button>
          <button
            onClick={onNavigateToInventory}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-lg text-sm font-medium hover:bg-[#0D625C] transition-colors flex items-center gap-2 shadow-sm"
          >
            <Package className="w-4 h-4" />
            Manage Inventory
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs bg-gradient-to-br from-red-50/30 to-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Critical Reorders</p>
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900 mt-2">{grouped.critical.length}</p>
          <p className="text-xs text-red-600 mt-1">Imminent stockout or 0 stock</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-gradient-to-br from-amber-50/30 to-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">High Priority</p>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-900 mt-2">{grouped.high.length}</p>
          <p className="text-xs text-amber-600 mt-1">Stock at or below reorder point</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-xs bg-gradient-to-br from-teal-50/30 to-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Medium Priority</p>
            <Clock className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-3xl font-bold text-teal-900 mt-2">{grouped.medium.length}</p>
          <p className="text-xs text-teal-600 mt-1">Approaching reorder threshold</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Healthy Stock</p>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{grouped.none.length + grouped.low.length}</p>
          <p className="text-xs text-slate-500 mt-1">No immediate action required</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
          />
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#0F766E]" />
          Purchase orders must be manually created via the Inventory / Purchase workflow.
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {/* 1. Critical Reorders */}
        {grouped.critical.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
            <div className="bg-red-50 px-6 py-3 border-b border-red-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-red-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Critical Reorders ({grouped.critical.length})
              </h2>
              <span className="text-xs font-semibold bg-red-200 text-red-900 px-2.5 py-0.5 rounded-full">
                Action Required
              </span>
            </div>
            <ReorderTable recommendations={grouped.critical} onNavigateToInventory={onNavigateToInventory} />
          </div>
        )}

        {/* 2. High Priority */}
        {grouped.high.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
            <div className="bg-amber-50 px-6 py-3 border-b border-amber-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                High Priority Reorders ({grouped.high.length})
              </h2>
              <span className="text-xs font-semibold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                Stock at/below reorder point
              </span>
            </div>
            <ReorderTable recommendations={grouped.high} onNavigateToInventory={onNavigateToInventory} />
          </div>
        )}

        {/* 3. Medium Priority */}
        {grouped.medium.length > 0 && (
          <div className="bg-white rounded-xl border border-teal-200 shadow-xs overflow-hidden">
            <div className="bg-teal-50 px-6 py-3 border-b border-teal-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-teal-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#0F766E]" />
                Medium Priority / Planning Horizon ({grouped.medium.length})
              </h2>
              <span className="text-xs font-semibold bg-teal-200 text-teal-900 px-2.5 py-0.5 rounded-full">
                Approaching threshold
              </span>
            </div>
            <ReorderTable recommendations={grouped.medium} onNavigateToInventory={onNavigateToInventory} />
          </div>
        )}

        {/* 4. No Action Required / Healthy */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              No Action Required ({grouped.none.length + grouped.low.length})
            </h2>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              Healthy Stock
            </span>
          </div>
          <ReorderTable recommendations={[...grouped.none, ...grouped.low]} onNavigateToInventory={onNavigateToInventory} />
        </div>
      </div>
    </div>
  );
};

interface ReorderTableProps {
  recommendations: ReorderRecommendation[];
  onNavigateToInventory?: () => void;
}

const ReorderTable: React.FC<ReorderTableProps> = ({ recommendations, onNavigateToInventory }) => {
  if (recommendations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-400">
        No products in this category.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <th className="py-3 px-4">Product</th>
            <th className="py-3 px-4">Category</th>
            <th className="py-3 px-4 text-right">Current Stock</th>
            <th className="py-3 px-4 text-right">Avg Daily Demand</th>
            <th className="py-3 px-4 text-right">Days of Stock</th>
            <th className="py-3 px-4 text-right">Reorder Point</th>
            <th className="py-3 px-4 text-right font-bold text-[#0F766E]">Rec. Order Qty</th>
            <th className="py-3 px-4">Reason / Policy</th>
            <th className="py-3 px-4 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
          {recommendations.map(rec => (
            <tr key={rec.productId} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-3 px-4 font-medium text-slate-900">
                {rec.productName}
                <span className="block text-xs text-slate-400 font-mono">SKU: {rec.sku}</span>
              </td>
              <td className="py-3 px-4 text-xs text-slate-500">
                {rec.category}
              </td>
              <td className="py-3 px-4 text-right font-mono">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  rec.currentStock <= 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {rec.currentStock}
                </span>
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs">
                {rec.averageDailyDemand}
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs">
                {rec.daysOfStock !== null ? `${rec.daysOfStock} days` : 'N/A'}
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs">
                {rec.reorderPoint !== null ? rec.reorderPoint : <span className="text-amber-600 text-[11px]">Lead time req.</span>}
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold text-[#0F766E]">
                {rec.recommendedOrderQty > 0 ? `+${rec.recommendedOrderQty} units` : '0'}
              </td>
              <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                {rec.reason}
              </td>
              <td className="py-3 px-4 text-center">
                <button
                  onClick={onNavigateToInventory}
                  className="px-3 py-1 bg-slate-100 hover:bg-[#0F766E] hover:text-white text-slate-700 rounded text-xs font-medium transition-colors inline-flex items-center gap-1"
                >
                  View Product <ArrowUpRight className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
