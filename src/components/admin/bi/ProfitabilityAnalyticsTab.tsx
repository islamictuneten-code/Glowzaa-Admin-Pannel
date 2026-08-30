import React, { useState, useMemo } from 'react';
import { ProductProfitabilityItem, ExecutiveBISettings } from '../../../types';
import { formatBDT } from '../../../utils/formatters';
import { exportExecutiveReportCSV } from '../../../services/executiveBIService';
import { 
  Search, 
  Filter, 
  Download, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Package, 
  ShieldAlert, 
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

interface ProfitabilityAnalyticsTabProps {
  items: ProductProfitabilityItem[];
  settings: ExecutiveBISettings;
}

export const ProfitabilityAnalyticsTab: React.FC<ProfitabilityAnalyticsTabProps> = ({
  items,
  settings
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [marginFilter, setMarginFilter] = useState<'all' | 'high_margin' | 'normal' | 'low_margin' | 'negative' | 'high_sales_low_margin'>('all');
  const [sortBy, setSortBy] = useState<'sales' | 'profit' | 'margin' | 'units'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.category) set.add(i.category); });
    return Array.from(set).sort();
  }, [items]);

  // Loss-making and high-sales low-margin counts
  const lossMakersCount = items.filter(i => i.isLossMaking).length;
  const highSalesLowMarginCount = items.filter(i => i.isHighSalesLowMargin).length;

  // Filtered & Sorted
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;

      let matchMargin = true;
      if (marginFilter === 'high_margin') matchMargin = item.marginClassification === 'high_margin';
      else if (marginFilter === 'normal') matchMargin = item.marginClassification === 'normal';
      else if (marginFilter === 'low_margin') matchMargin = item.marginClassification === 'low_margin';
      else if (marginFilter === 'negative') matchMargin = item.isLossMaking;
      else if (marginFilter === 'high_sales_low_margin') matchMargin = item.isHighSalesLowMargin;

      return matchSearch && matchCat && matchMargin;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === 'sales') {
        valA = a.netSalesBDT;
        valB = b.netSalesBDT;
      } else if (sortBy === 'profit') {
        valA = a.grossProfitBDT || -999999;
        valB = b.grossProfitBDT || -999999;
      } else if (sortBy === 'margin') {
        valA = a.grossMarginPercent || -999;
        valB = b.grossMarginPercent || -999;
      } else if (sortBy === 'units') {
        valA = a.unitsSold;
        valB = b.unitsSold;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [items, searchTerm, selectedCategory, marginFilter, sortBy, sortOrder]);

  const handleExportCSV = () => {
    exportExecutiveReportCSV('products', { products: filteredItems });
  };

  return (
    <div className="space-y-5">
      
      {/* Alert Banners for Loss-Making & High Sales Low Margin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Loss-Making Products Alert */}
        {lossMakersCount > 0 ? (
          <div 
            onClick={() => setMarginFilter(marginFilter === 'negative' ? 'all' : 'negative')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
              marginFilter === 'negative' 
                ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400' 
                : 'bg-rose-50 border-rose-200 hover:border-rose-300'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  Loss-Making Products
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-mono">
                  {lossMakersCount} SKUs
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-1">
                Products selling below supplier cost. Click to isolate loss-making catalog items.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-800">
              <span className="font-bold">No Loss-Making SKUs:</span> All products are currently selling at or above authoritative cost price.
            </div>
          </div>
        )}

        {/* High Sales Low Margin Alert */}
        {highSalesLowMarginCount > 0 && (
          <div 
            onClick={() => setMarginFilter(marginFilter === 'high_sales_low_margin' ? 'all' : 'high_sales_low_margin')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
              marginFilter === 'high_sales_low_margin' 
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400' 
                : 'bg-amber-50 border-amber-200 hover:border-amber-300'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  High Sales / Slim Margin
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                  {highSalesLowMarginCount} SKUs
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                High-volume items generating sales &gt; ৳{(settings.highSalesVolumeThresholdBDT / 1000).toFixed(0)}k with margins &lt; {settings.lowMarginThresholdPercent}%.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by SKU or product name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Category & Margin Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={marginFilter}
            onChange={e => setMarginFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">All Margin Types</option>
            <option value="high_margin">High Margin (&ge; 30%)</option>
            <option value="normal">Normal Margin (15-30%)</option>
            <option value="low_margin">Low Margin (&lt; 15%)</option>
            <option value="negative">Negative / Loss-Making</option>
            <option value="high_sales_low_margin">High Sales / Slim Margin</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

        </div>

      </div>

      {/* Product Profitability Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-3">Category</th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'units') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('units'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Units</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'sales') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('sales'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Net Sales</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3 text-right">Unit Cost</th>
                <th className="py-3.5 px-3 text-right">Total COGS</th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'profit') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('profit'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Gross Profit</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'margin') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('margin'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Gross Margin</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No products matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.productId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                      {item.rootCauseNotes.length > 0 && (
                        <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                          ⚠ {item.rootCauseNotes[0]}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">{item.category}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-semibold">{item.unitsSold.toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">{formatBDT(item.netSalesBDT)}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {item.unitCostBDT !== null ? formatBDT(item.unitCostBDT) : <span className="text-slate-400">N/A</span>}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {item.cogsBDT !== null ? formatBDT(item.cogsBDT) : <span className="text-slate-400">N/A</span>}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-bold ${
                      item.grossProfitBDT !== null && item.grossProfitBDT > 0 ? 'text-emerald-700' :
                      item.grossProfitBDT !== null && item.grossProfitBDT < 0 ? 'text-rose-700' :
                      'text-slate-500'
                    }`}>
                      {item.grossProfitBDT !== null ? formatBDT(item.grossProfitBDT) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {item.grossMarginPercent !== null ? (
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                          item.grossMarginPercent >= 30 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.grossMarginPercent >= 15 ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                          item.grossMarginPercent >= 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.grossMarginPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.isLossMaking ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 uppercase">
                          Loss Maker
                        </span>
                      ) : item.isHighSalesLowMargin ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                          Slim Margin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                          Standard
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
