import React, { useState } from 'react';
import { RegionalSalesSummary, CategoryExecutiveSummary } from '../../../types';
import { formatBDT } from '../../../utils/formatters';
import { exportExecutiveReportCSV } from '../../../services/executiveBIService';
import { 
  Compass, 
  Layers, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  PieChart as PieIcon,
  BarChart3,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';

interface GeographicCategoryTabProps {
  regionalSummaries: RegionalSalesSummary[];
  categorySummaries: CategoryExecutiveSummary[];
}

export const GeographicCategoryTab: React.FC<GeographicCategoryTabProps> = ({
  regionalSummaries,
  categorySummaries
}) => {
  const [activeSubView, setActiveSubView] = useState<'geography' | 'category'>('geography');

  const handleExportCSV = () => {
    exportExecutiveReportCSV('regions', {
      regions: regionalSummaries
    });
  };

  const COLORS = ['#0F766E', '#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];

  return (
    <div className="space-y-6">
      
      {/* Top Toggle & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setActiveSubView('geography')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubView === 'geography'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Regional & District Territories</span>
          </button>

          <button
            onClick={() => setActiveSubView('category')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubView === 'category'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Category Profit Mix</span>
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export {activeSubView === 'geography' ? 'Territory' : 'Category'} CSV</span>
        </button>
      </div>

      {activeSubView === 'geography' ? (
        <div className="space-y-6">
          
          {/* Regional Sales Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Territory Wholesale Sales Distribution</h3>
            
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalSummaries.slice(0, 10)} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="regionName" tick={{ fontSize: 10, fill: '#64748B' }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(val: any) => [formatBDT(Number(val)), 'Net Sales']}
                    contentStyle={{ backgroundColor: '#0F172A', color: '#F8FAFC', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="netSalesBDT" radius={[6, 6, 0, 0]}>
                    {regionalSummaries.slice(0, 10).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">District / Territory</th>
                    <th className="py-3.5 px-3 text-right">Wholesale Net Sales</th>
                    <th className="py-3.5 px-3 text-right">Share of Revenue</th>
                    <th className="py-3.5 px-3 text-right">Orders</th>
                    <th className="py-3.5 px-3 text-right">Active Retailers</th>
                    <th className="py-3.5 px-3 text-right">Gross Profit</th>
                    <th className="py-3.5 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {regionalSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No regional data found in this period.
                      </td>
                    </tr>
                  ) : (
                    regionalSummaries.map(reg => (
                      <tr key={reg.regionName} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{reg.regionName}</span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900">{formatBDT(reg.netSalesBDT)}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">{reg.percentageOfTotalSales}%</td>
                        <td className="py-3.5 px-3 text-right font-mono">{reg.ordersCount}</td>
                        <td className="py-3.5 px-3 text-right font-mono">{reg.activeCustomersCount}</td>
                        <td className={`py-3.5 px-3 text-right font-bold ${
                          reg.grossProfitBDT !== null && reg.grossProfitBDT > 0 ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          {reg.grossProfitBDT !== null ? formatBDT(reg.grossProfitBDT) : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-700">
                          {reg.grossMarginPercent !== null ? `${reg.grossMarginPercent}%` : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Category Sales vs Profit Disparity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {categorySummaries.map((cat, idx) => {
              const disparity = cat.shareOfGrossProfitPercent - cat.shareOfSalesPercent;
              return (
                <div key={cat.categoryName} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                      />
                      <h4 className="font-bold text-sm text-slate-900">{cat.categoryName}</h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {cat.unitsSold.toLocaleString()} units
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Sales</span>
                      <div className="font-bold text-sm text-slate-900 mt-0.5">{formatBDT(cat.netSalesBDT)}</div>
                      <span className="text-[11px] text-slate-500">{cat.shareOfSalesPercent}% of company sales</span>
                    </div>

                    <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl">
                      <span className="text-[10px] font-bold text-teal-800 uppercase block">Gross Profit</span>
                      <div className="font-bold text-sm text-teal-950 mt-0.5">
                        {cat.grossProfitBDT !== null ? formatBDT(cat.grossProfitBDT) : 'N/A'}
                      </div>
                      <span className="text-[11px] text-teal-700 font-semibold">{cat.grossMarginPercent}% margin</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Sales vs Profit Mix Disparity:</span>
                    <span className={`font-mono font-bold ${disparity >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {disparity >= 0 ? `+${disparity.toFixed(1)}% profit lift` : `${disparity.toFixed(1)}% profit drag`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
