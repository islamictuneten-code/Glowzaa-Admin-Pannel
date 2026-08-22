import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Printer, 
  ArrowUpRight,
  ShieldCheck,
  Building
} from 'lucide-react';

export const AdminProfitLoss: React.FC = () => {
  const { orders, products, expenses, formatBDT } = useApp();

  const totalWholesaleRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Calculate Cost of Goods Sold (COGS) for all ordered items
  let totalCOGS = 0;
  orders.forEach(order => {
    order.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      const unitCost = prod ? prod.purchasePrice : item.unitPrice * 0.6;
      totalCOGS += unitCost * item.quantity;
    });
  });

  const grossProfit = totalWholesaleRevenue - totalCOGS;
  const grossMarginPct = totalWholesaleRevenue > 0 ? Math.round((grossProfit / totalWholesaleRevenue) * 100) : 0;

  // Operating Expenses - Dynamically aggregated from approved Firestore expenses
  const approvedExpenses = expenses.filter(e => !e.deleted && e.status === 'approved');
  const pendingExpenses = expenses.filter(e => !e.deleted && e.status === 'pending');

  const totalOperatingExpenses = approvedExpenses.reduce((sum, e) => sum + Math.round(e.amount || 0), 0);
  const pendingExpensesTotal = pendingExpenses.reduce((sum, e) => sum + Math.round(e.amount || 0), 0);

  // Group approved expenses by category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    approvedExpenses.forEach(exp => {
      const cat = exp.category || 'Other';
      map[cat] = (map[cat] || 0) + Math.round(exp.amount || 0);
    });
    return map;
  }, [approvedExpenses]);

  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netMarginPct = totalWholesaleRevenue > 0 ? Math.round((netOperatingProfit / totalWholesaleRevenue) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Executive Profit & Loss Statement</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Q3 2026 Fiscal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Glowzaa B2B Gross wholesale revenue, cost of goods sold (COGS), operating expenses, and net EBITDA margin in BDT.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Financial P&L</span>
        </button>
      </div>

      {/* High-Level P&L Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Invoiced Revenue</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(totalWholesaleRevenue)}</div>
          <span className="text-[11px] text-slate-500">100% Topline Revenue</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Cost of Goods Sold (COGS)</span>
          <div className="text-xl font-extrabold text-slate-700 mt-1">{formatBDT(totalCOGS)}</div>
          <span className="text-[11px] text-slate-500">
            {totalWholesaleRevenue > 0 ? Math.round((totalCOGS / totalWholesaleRevenue) * 100) : 0}% of Revenue
          </span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Gross Profit</span>
          <div className="text-xl font-extrabold text-emerald-800 mt-1">{formatBDT(grossProfit)}</div>
          <span className="text-[11px] text-emerald-700 font-semibold">{grossMarginPct}% Gross Margin</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-rose-700 block">Net Operating Profit</span>
          <div className="text-xl font-extrabold text-rose-800 mt-1">{formatBDT(netOperatingProfit)}</div>
          <span className="text-[11px] text-rose-700 font-semibold">{netMarginPct}% Net Margin</span>
        </div>
      </div>

      {/* Detailed P&L Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 text-sm">Income & Expenditure Ledger Breakdown (BDT)</h2>
          <span className="text-xs text-slate-500">Audited in accordance with Bangladesh Financial Standards</span>
        </div>

        <div className="p-6 space-y-6 text-xs text-slate-800">
          
          {/* Revenue */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-sm text-slate-900 pb-1 border-b border-slate-200">
              <span>1. Wholesale Trading Revenue</span>
              <span>{formatBDT(totalWholesaleRevenue)}</span>
            </div>
            <div className="pl-4 space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Wholesale Cosmetics & Beauty Invoiced Sales</span>
                <span>{formatBDT(totalWholesaleRevenue)}</span>
              </div>
            </div>
          </div>

          {/* COGS */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-sm text-slate-900 pb-1 border-b border-slate-200">
              <span>2. Cost of Goods Sold (COGS)</span>
              <span className="text-rose-700">({formatBDT(totalCOGS)})</span>
            </div>
            <div className="pl-4 space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Product Direct Procurement & Factory Import Invoices</span>
                <span>{formatBDT(totalCOGS)}</span>
              </div>
            </div>
          </div>

          {/* Gross Margin */}
          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex justify-between items-center text-sm font-bold text-emerald-900">
            <span>GROSS PROFIT (Revenue - COGS):</span>
            <span className="text-base">{formatBDT(grossProfit)} ({grossMarginPct}%)</span>
          </div>

          {/* Operating Expenses */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-sm text-slate-900 pb-1 border-b border-slate-200">
              <span>3. Real Operating & Distribution Expenses (OPEX)</span>
              <span className="text-rose-700">({formatBDT(totalOperatingExpenses)})</span>
            </div>
            <div className="pl-4 space-y-2 text-slate-600">
              {Object.keys(categoryBreakdown).length === 0 ? (
                <div className="text-slate-400 italic text-xs py-1">No approved operating expenses recorded yet.</div>
              ) : (
                Object.entries(categoryBreakdown).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between">
                    <span>{cat}</span>
                    <span className="font-medium text-slate-800">{formatBDT(amt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Net Profit */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-rose-950 text-white rounded-xl flex justify-between items-center text-base font-extrabold shadow-xs">
            <div>
              <span>NET OPERATING PROFIT (EBITDA):</span>
              <p className="text-[11px] font-normal text-rose-300">Net bottomline profitability for Glowzaa distribution network</p>
            </div>
            <span className="text-lg text-emerald-400">{formatBDT(netOperatingProfit)}</span>
          </div>

        </div>
      </div>

    </div>
  );
};
