import React, { useState, useMemo } from 'react';
import { SellerExecutiveSummary, ExecutiveBISettings } from '../../../types';
import { formatBDT } from '../../../utils/formatters';
import { exportExecutiveReportCSV } from '../../../services/executiveBIService';
import { 
  Award, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Download, 
  Search, 
  Users, 
  ShoppingBag,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface SellerExecutiveTabProps {
  summaries: SellerExecutiveSummary[];
  settings: ExecutiveBISettings;
}

export const SellerExecutiveTab: React.FC<SellerExecutiveTabProps> = ({
  summaries,
  settings
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'sales' | 'profit' | 'margin' | 'target' | 'gap'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      const matchSearch = 
        s.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.territory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.sellerLoginId && s.sellerLoginId.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchStatus = statusFilter === 'all' || s.targetStatus === statusFilter;

      return matchSearch && matchStatus;
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
      } else if (sortBy === 'target') {
        valA = a.targetAchievementPercent || 0;
        valB = b.targetAchievementPercent || 0;
      } else if (sortBy === 'gap') {
        valA = a.targetGapBDT;
        valB = b.targetGapBDT;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [summaries, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleExportCSV = () => {
    exportExecutiveReportCSV('sellers', { sellers: filteredSummaries });
  };

  return (
    <div className="space-y-5">
      
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search sales officer or territory..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">All Target Statuses</option>
            <option value="on_track">On Track (&ge; 80%)</option>
            <option value="watch">Watch (60-80%)</option>
            <option value="at_risk">At Risk (&lt; 60%)</option>
            <option value="no_target">No Monthly Target</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

      </div>

      {/* Seller Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Sales Officer</th>
                <th className="py-3.5 px-3">Territory</th>
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
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'target') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('target'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Target Progress</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'gap') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('gap'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Target Gap</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3 text-right">Req. Daily</th>
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
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No sales officers found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map(seller => (
                  <tr key={seller.sellerId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{seller.sellerName}</span>
                        {seller.salesRank === 1 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            #1 Sales
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {seller.sellerLoginId ? `@${seller.sellerLoginId}` : 'ID: ' + seller.sellerId.slice(0, 6)} • {seller.ordersCount} orders • {seller.activeCustomersCount} shops
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-semibold">{seller.territory}</td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">{formatBDT(seller.netSalesBDT)}</td>
                    <td className="py-3.5 px-3 text-right">
                      {seller.monthlyTargetBDT > 0 ? (
                        <div>
                          <div className="font-bold text-slate-900">{seller.targetAchievementPercent}%</div>
                          <div className="text-[10px] text-slate-400">Target: {formatBDT(seller.monthlyTargetBDT)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No target</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-700">
                      {seller.targetGapBDT > 0 ? formatBDT(seller.targetGapBDT) : '৳0'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {seller.requiredDailySalesBDT !== null && seller.requiredDailySalesBDT > 0 
                        ? formatBDT(seller.requiredDailySalesBDT) 
                        : '৳0'}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-bold ${
                      seller.grossProfitBDT !== null && seller.grossProfitBDT > 0 ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {seller.grossProfitBDT !== null ? formatBDT(seller.grossProfitBDT) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {seller.grossMarginPercent !== null ? (
                        <span className="font-mono font-bold text-teal-700">
                          {seller.grossMarginPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        seller.targetStatus === 'on_track' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        seller.targetStatus === 'watch' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        seller.targetStatus === 'at_risk' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {seller.targetStatus.replace('_', ' ')}
                      </span>
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
