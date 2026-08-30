import React from 'react';
import { 
  ExecutiveKPI, 
  SalesProfitTrendPoint, 
  ProfitWaterfallStep, 
  ExecutiveAIInsight, 
  ProductProfitabilityItem, 
  SellerExecutiveSummary, 
  RegionalSalesSummary,
  DateRangeFilter 
} from '../../../types';
import { formatBDT } from '../../../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  Users, 
  Package, 
  Sparkles, 
  Award, 
  Compass, 
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';

interface ExecutiveOverviewTabProps {
  kpis: ExecutiveKPI[];
  trendPoints: SalesProfitTrendPoint[];
  waterfallSteps: ProfitWaterfallStep[];
  aiInsights: ExecutiveAIInsight[];
  productProfitability: ProductProfitabilityItem[];
  sellerSummaries: SellerExecutiveSummary[];
  regionalSummaries: RegionalSalesSummary[];
  dateFilter: DateRangeFilter;
  onSelectKPI: (kpi: ExecutiveKPI) => void;
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveOverviewTab: React.FC<ExecutiveOverviewTabProps> = ({
  kpis,
  trendPoints,
  waterfallSteps,
  aiInsights,
  productProfitability,
  sellerSummaries,
  regionalSummaries,
  dateFilter,
  onSelectKPI,
  onNavigateTab
}) => {
  return (
    <div className="space-y-6">
      
      {/* Top 8 Executive KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {kpis.map(kpi => {
          const isUp = kpi.changeAmount !== null && kpi.changeAmount > 0;
          const isDown = kpi.changeAmount !== null && kpi.changeAmount < 0;

          return (
            <div
              key={kpi.id}
              onClick={() => onSelectKPI(kpi)}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-teal-300 hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span className="truncate pr-1">{kpi.title}</span>
                  {kpi.statusLabel && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                      kpi.statusColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      kpi.statusColor === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      kpi.statusColor === 'rose' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {kpi.statusLabel}
                    </span>
                  )}
                </div>

                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5 group-hover:text-teal-700 transition-colors">
                  {kpi.unit === 'BDT' && kpi.currentValue !== null ? formatBDT(kpi.currentValue) :
                   kpi.unit === 'PERCENT' && kpi.currentValue !== null ? `${kpi.currentValue}%` :
                   kpi.currentValue !== null ? kpi.currentValue.toLocaleString() : 'N/A'}
                </div>
              </div>

              <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                {kpi.changePercent !== null ? (
                  <span className={`inline-flex items-center gap-0.5 font-bold ${
                    (isUp && kpi.isPositive) || (isDown && !kpi.isPositive)
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}>
                    {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : isDown ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                    {isUp ? '+' : ''}{kpi.changePercent}%
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Current state</span>
                )}

                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {kpi.subtitle || 'Click to inspect'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Analytics Row: Sales & Gross Profit Trend + Executive AI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales & Profit Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Wholesale Revenue & Gross Profit Trajectory</h2>
              <p className="text-xs text-slate-500">Daily trajectory of finalized wholesale sales vs authoritative gross profit.</p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-teal-600 inline-block" />
                <span className="font-semibold text-slate-600">Net Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="font-semibold text-slate-600">Gross Profit</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  formatter={(val: any, name: any) => [formatBDT(Number(val)), name === 'netSalesBDT' ? 'Net Sales' : 'Gross Profit']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#F8FAFC', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="netSalesBDT" 
                  stroke="#0F766E" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="grossProfitBDT" 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Executive AI Insights & Summary (1 Col) */}
        <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-5 rounded-2xl text-white shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold tracking-tight text-white">Executive Intelligence</h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                AI Brief
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {aiInsights.slice(0, 2).map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="text-xs font-bold text-teal-300 block">{item.title}</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.insight}</p>
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {item.facts.map((fact, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
                        {fact}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">Data synchronized with Firestore</span>
            <button
              onClick={() => onNavigateTab('profitability')}
              className="inline-flex items-center gap-1 font-bold text-teal-300 hover:text-teal-200 transition-colors"
            >
              <span>Explore Margins</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Profit Waterfall Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Executive Profit Waterfall (Gross Revenue to EBITDA)</h2>
            <p className="text-xs text-slate-500">
              Clear breakdown of wholesale deductions, COGS, operating expenses, and net operating profit.
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Authoritative Accounting Stack
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {waterfallSteps.map((step, idx) => (
            <div 
              key={idx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                step.type === 'total' ? 'bg-teal-50 border-teal-200' :
                step.type === 'deduction' ? 'bg-slate-50/70 border-slate-200' :
                'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Step {idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-800 block line-clamp-1" title={step.label}>
                  {step.label}
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100">
                <div className={`text-base sm:text-lg font-extrabold tracking-tight ${
                  step.type === 'deduction' ? 'text-rose-600' :
                  step.type === 'total' ? 'text-teal-900' :
                  'text-slate-900'
                }`}>
                  {step.type === 'deduction' ? `-${formatBDT(step.amountBDT)}` : formatBDT(step.amountBDT)}
                </div>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5" title={step.tooltip}>
                  {step.tooltip}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Level Ranking Teasers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Top Product Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Revenue Product</h3>
            </div>
            <button 
              onClick={() => onNavigateTab('profitability')}
              className="text-[11px] font-bold text-teal-700 hover:underline"
            >
              View all
            </button>
          </div>
          {productProfitability.length > 0 ? (
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="font-bold text-sm text-slate-900 truncate">{productProfitability[0].productName}</div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Sales: {formatBDT(productProfitability[0].netSalesBDT)}</span>
                <span className="font-semibold text-emerald-700">{productProfitability[0].grossMarginPercent || 0}% margin</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">No product sales in this period</div>
          )}
        </div>

        {/* Top Seller Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Sales Officer</h3>
            </div>
            <button 
              onClick={() => onNavigateTab('sellers')}
              className="text-[11px] font-bold text-teal-700 hover:underline"
            >
              View all
            </button>
          </div>
          {sellerSummaries.length > 0 ? (
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="font-bold text-sm text-slate-900 truncate">{sellerSummaries[0].sellerName}</div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Sales: {formatBDT(sellerSummaries[0].netSalesBDT)}</span>
                <span className="font-semibold text-teal-700">{sellerSummaries[0].ordersCount} orders</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">No seller data in this period</div>
          )}
        </div>

        {/* Top Region Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Territory</h3>
            </div>
            <button 
              onClick={() => onNavigateTab('geography')}
              className="text-[11px] font-bold text-teal-700 hover:underline"
            >
              View all
            </button>
          </div>
          {regionalSummaries.length > 0 ? (
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="font-bold text-sm text-slate-900 truncate">{regionalSummaries[0].regionName}</div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Sales: {formatBDT(regionalSummaries[0].netSalesBDT)}</span>
                <span className="font-semibold text-slate-700">{regionalSummaries[0].activeCustomersCount} retailers</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">No regional data in this period</div>
          )}
        </div>

      </div>

    </div>
  );
};
