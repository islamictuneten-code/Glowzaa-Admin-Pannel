import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Award, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Calendar, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  Printer 
} from 'lucide-react';

export const SalesSummary: React.FC = () => {
  const { orders, currentSalesUser, formatBDT } = useApp();

  const myOrders = orders.filter(o => o.salesSellerId === currentSalesUser.id);
  const totalBookedRevenue = myOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalRealizedPaid = myOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalPendingDue = myOrders.reduce((sum, o) => sum + o.dueAmount, 0);
  const averageOrderSize = myOrders.length > 0 ? totalBookedRevenue / myOrders.length : 0;

  const achievementPct = Math.round((currentSalesUser.achievedSales / currentSalesUser.monthlyTarget) * 100);
  const earnedCommission = Math.round(currentSalesUser.achievedSales * (currentSalesUser.commissionRate / 100));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Sales & Commission Performance</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              August 2026 Fiscal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Personal sales metrics, target achievement status, and commission payout estimation for {currentSalesUser.name}.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* Quota & Commission Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-1.5 p-4 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Monthly Quota Target</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{formatBDT(currentSalesUser.monthlyTarget)}</div>
          <span className="text-xs text-slate-500">Assigned for {currentSalesUser.territory}</span>
        </div>

        <div className="space-y-1.5 p-4 rounded-lg bg-teal-50/50 border border-teal-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] block">Achieved Invoiced Sales</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#0F766E]">{formatBDT(currentSalesUser.achievedSales)}</div>
          <span className="text-xs font-semibold text-teal-700">{achievementPct}% of monthly quota reached</span>
        </div>

        <div className="space-y-1.5 p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">Accrued Commission ({currentSalesUser.commissionRate}%)</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">{formatBDT(earnedCommission)}</div>
          <span className="text-xs text-emerald-600">Disbursed on 1st of next month</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Orders Booked</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{myOrders.length} Invoices</div>
          <span className="text-[11px] text-slate-500">Avg: {formatBDT(averageOrderSize)}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Lifetime Booked Volume</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{formatBDT(totalBookedRevenue)}</div>
          <span className="text-[11px] text-slate-500">Gross retail value</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Cash Realized</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-1">{formatBDT(totalRealizedPaid)}</div>
          <span className="text-[11px] text-slate-500">Settled without dispute</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Market Credit Receivables</span>
          <div className="text-lg sm:text-xl font-bold text-red-600 mt-1">{formatBDT(totalPendingDue)}</div>
          <span className="text-[11px] text-slate-500">Awaiting field collection</span>
        </div>
      </div>

      {/* Target Progress Detailed Visual */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3.5">
        <h2 className="font-bold text-slate-900 text-sm">Monthly Quota Milestone Progress</h2>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">Progress: {formatBDT(currentSalesUser.achievedSales)}</span>
            <span className="text-[#0F766E]">{achievementPct}% of {formatBDT(currentSalesUser.monthlyTarget)}</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#0F766E] h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, achievementPct)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-400 block">Tier 1 Target (60%)</span>
            <span className="font-bold text-slate-800">{formatBDT(currentSalesUser.monthlyTarget * 0.6)}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {currentSalesUser.achievedSales >= currentSalesUser.monthlyTarget * 0.6 ? '✓ Achieved' : 'In Progress'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-400 block">Tier 2 Target (80%)</span>
            <span className="font-bold text-slate-800">{formatBDT(currentSalesUser.monthlyTarget * 0.8)}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {currentSalesUser.achievedSales >= currentSalesUser.monthlyTarget * 0.8 ? '✓ Achieved' : 'In Progress'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-400 block">100% Star Performer</span>
            <span className="font-bold text-slate-800">{formatBDT(currentSalesUser.monthlyTarget)}</span>
            <span className="text-[10px] text-[#0F766E] font-semibold block mt-0.5">
              Bonus: ৳5,000 Cash Incentive
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
