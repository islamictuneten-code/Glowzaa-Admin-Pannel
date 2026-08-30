import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  computeProductForecasts, 
  ProductDemandForecast, 
  getStoredForecastingSettings 
} from '../../services/salesForecastService';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  Info, 
  BarChart3,
  ShieldAlert,
  ArrowUpDown,
  X
} from 'lucide-react';

interface SalesForecastDashboardProps {
  onNavigateToProduct?: (productId: string) => void;
  onNavigateToInventory?: () => void;
}

export const SalesForecastDashboard: React.FC<SalesForecastDashboardProps> = ({
  onNavigateToProduct,
  onNavigateToInventory
}) => {
  const { products, orders } = useApp();
  const settings = useMemo(() => getStoredForecastingSettings(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'demand' | 'stock' | 'growth' | 'decline'>('demand');
  const [selectedForecast, setSelectedForecast] = useState<ProductDemandForecast | null>(null);

  const forecasts = useMemo(() => {
    return computeProductForecasts(products, orders, settings);
  }, [products, orders, settings]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    forecasts.forEach(f => {
      if (f.categoryName) set.add(f.categoryName);
    });
    return Array.from(set);
  }, [forecasts]);

  // KPI calculations
  const kpis = useMemo(() => {
    let total7Day = 0;
    let total30Day = 0;
    let growingCount = 0;
    let decliningCount = 0;
    let slowCount = 0;
    let attentionCount = 0;

    forecasts.forEach(f => {
      total7Day += f.forecast7Days;
      total30Day += f.forecast30Days;
      if (f.status === 'growing') growingCount++;
      if (f.status === 'declining') decliningCount++;
      if (f.status === 'slow_moving') slowCount++;
      if (f.stockoutRisk7Days || f.stockoutRisk14Days) attentionCount++;
    });

    return {
      total7Day: Math.round(total7Day),
      total30Day: Math.round(total30Day),
      growingCount,
      decliningCount,
      slowCount,
      attentionCount
    };
  }, [forecasts]);

  // Filtered & sorted forecasts
  const filteredForecasts = useMemo(() => {
    return forecasts.filter(f => {
      const matchSearch = f.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'all' || f.categoryName === selectedCategory;
      let matchStatus = true;
      if (statusFilter === 'growing') matchStatus = f.status === 'growing';
      else if (statusFilter === 'stable') matchStatus = f.status === 'stable';
      else if (statusFilter === 'declining') matchStatus = f.status === 'declining';
      else if (statusFilter === 'slow_moving') matchStatus = f.status === 'slow_moving';
      else if (statusFilter === 'needs_reorder') matchStatus = f.stockoutRisk7Days || f.stockoutRisk14Days;
      else if (statusFilter === 'insufficient') matchStatus = f.status === 'insufficient_data';

      return matchSearch && matchCategory && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'demand') return b.forecast30Days - a.forecast30Days;
      if (sortBy === 'stock') return (a.currentStock) - (b.currentStock);
      if (sortBy === 'growth') return b.salesTrendPercent - a.salesTrendPercent;
      if (sortBy === 'decline') return a.salesTrendPercent - b.salesTrendPercent;
      return 0;
    });
  }, [forecasts, searchQuery, selectedCategory, statusFilter, sortBy]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-[#0F766E]" />
            Sales Forecasting & Demand Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic statistical demand forecasting based on real order velocity, moving averages, and historical trend weighting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToInventory}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-lg text-sm font-medium hover:bg-[#0D625C] transition-colors flex items-center gap-2 shadow-sm"
          >
            <Package className="w-4 h-4" />
            Inventory Intelligence
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">7-Day Sales Forecast</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.total7Day.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span></p>
          <div className="mt-2 text-xs text-[#0F766E] flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Next week projection
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">30-Day Sales Forecast</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.total30Day.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span></p>
          <div className="mt-2 text-xs text-[#0F766E] flex items-center gap-1 font-medium">
            <BarChart3 className="w-3.5 h-3.5" /> Monthly demand horizon
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Growing Products</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{kpis.growingCount}</p>
          <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Trend &gt; +15%
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Declining Products</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{kpis.decliningCount}</p>
          <div className="mt-2 text-xs text-rose-700 flex items-center gap-1 font-medium">
            <TrendingDown className="w-3.5 h-3.5" /> Trend &lt; {settings.salesDeclineThreshold}%
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Slow-Moving</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{kpis.slowCount}</p>
          <div className="mt-2 text-xs text-amber-700 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" /> Low daily velocity
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stockout Risks</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{kpis.attentionCount}</p>
          <div className="mt-2 text-xs text-red-700 flex items-center gap-1 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> Stock &lt; forecast
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products or categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          >
            <option value="all">All Statuses</option>
            <option value="growing">Growing</option>
            <option value="stable">Stable</option>
            <option value="declining">Declining</option>
            <option value="slow_moving">Slow Moving</option>
            <option value="needs_reorder">Needs Reorder / Stockout Risk</option>
            <option value="insufficient">Insufficient Data</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          >
            <option value="demand">Sort: Highest Demand</option>
            <option value="stock">Sort: Lowest Stock</option>
            <option value="growth">Sort: Fastest Growth</option>
            <option value="decline">Sort: Largest Decline</option>
          </select>
        </div>
      </div>

      {/* Forecast Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Avg Daily</th>
                <th className="py-3 px-4 text-right">7-Day Forecast</th>
                <th className="py-3 px-4 text-right">30-Day Forecast</th>
                <th className="py-3 px-4 text-center">Trend</th>
                <th className="py-3 px-4 text-right">Days of Stock</th>
                <th className="py-3 px-4 text-center">Confidence</th>
                <th className="py-3 px-4">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredForecasts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No products found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredForecasts.map(f => {
                  return (
                    <tr 
                      key={f.productId} 
                      onClick={() => setSelectedForecast(f)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {f.productName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {f.categoryName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          f.currentStock <= 0 ? 'bg-red-100 text-red-800' :
                          f.stockoutRisk7Days ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {f.currentStock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        {f.status === 'insufficient_data' ? '-' : f.averageDailyUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-[#0F766E]">
                        {f.status === 'insufficient_data' ? 'Insufficient Data' : `${f.forecast7Days}`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                        {f.status === 'insufficient_data' ? 'Insufficient History' : `${f.forecast30Days}`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {f.status === 'insufficient_data' ? (
                          <span className="text-xs text-slate-400">N/A</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            f.salesTrendPercent > 0 ? 'bg-emerald-50 text-emerald-700' :
                            f.salesTrendPercent < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {f.salesTrendPercent > 0 ? <TrendingUp className="w-3 h-3" /> :
                             f.salesTrendPercent < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                            {f.salesTrendPercent > 0 ? `+${f.salesTrendPercent}%` : `${f.salesTrendPercent}%`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {f.daysOfStock === null ? (
                          <span className="text-xs text-slate-400">No Velocity</span>
                        ) : (
                          <span className={`text-xs font-semibold ${f.daysOfStock <= 7 ? 'text-red-600' : f.daysOfStock <= 14 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {f.daysOfStock} days
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          f.confidence === 'High' ? 'bg-emerald-100 text-emerald-800' :
                          f.confidence === 'Medium' ? 'bg-teal-100 text-teal-800' :
                          f.confidence === 'Low' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {f.confidence}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {f.recommendedAction}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Drawer */}
      {selectedForecast && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">{selectedForecast.categoryName}</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">{selectedForecast.productName}</h2>
              </div>
              <button
                onClick={() => setSelectedForecast(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/65 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Current Status Banner */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-teal-900">Recommended Action</h4>
                  <p className="text-sm text-teal-800 mt-1">{selectedForecast.recommendedAction}</p>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500">Current Stock</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{selectedForecast.currentStock} units</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500">Avg Daily Sales</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{selectedForecast.averageDailyUnits} units</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500">Days of Stock</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {selectedForecast.daysOfStock !== null ? `${selectedForecast.daysOfStock} days` : 'No Velocity'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500">7-Day Forecast</span>
                  <p className="text-lg font-bold text-[#0F766E] mt-0.5">{selectedForecast.forecast7Days} units</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500">14-Day Forecast</span>
                  <p className="text-lg font-bold text-[#0F766E] mt-0.5">{selectedForecast.forecast14Days} units</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500">30-Day Forecast</span>
                  <p className="text-lg font-bold text-[#0F766E] mt-0.5">{selectedForecast.forecast30Days} units</p>
                </div>
              </div>

              {/* Trend & Data Quality */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0F766E]" />
                  Statistical Breakdown & Transparency
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Sales Trend (vs prev 7d):</span>
                    <span className={`font-semibold text-sm ${selectedForecast.salesTrendPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedForecast.salesTrendPercent >= 0 ? `+${selectedForecast.salesTrendPercent}%` : `${selectedForecast.salesTrendPercent}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Forecast Confidence:</span>
                    <span className="font-semibold text-sm text-slate-900">{selectedForecast.confidence}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Data Quality:</span>
                    <span className="font-semibold text-sm capitalize text-slate-900">{selectedForecast.dataQuality}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Units Sold (Hist):</span>
                    <span className="font-semibold text-sm text-slate-900">{selectedForecast.totalUnitsSold} units</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                  {selectedForecast.dataQualityNote}
                </div>
              </div>

              {/* Historical Timeline / Velocity Check */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Velocity & Recency</h4>
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Last Sale Date:</span>
                    <span className="font-medium text-slate-900">{selectedForecast.lastSaleDate ? new Date(selectedForecast.lastSaleDate).toLocaleDateString() : 'No Sales Recorded'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days Since Last Sale:</span>
                    <span className="font-medium text-slate-900">{selectedForecast.daysSinceLastSale !== null ? `${selectedForecast.daysSinceLastSale} days` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recent Daily Average (Last 7d):</span>
                    <span className="font-medium text-slate-900">{selectedForecast.recentAvgDaily} units/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Previous Daily Average (Prev 7d):</span>
                    <span className="font-medium text-slate-900">{selectedForecast.previousAvgDaily} units/day</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedForecast(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
