import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download, 
  Printer, 
  Users, 
  ShoppingBag,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const { orders, customers, products, salesStaff, formatBDT } = useApp();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  const totalGrossSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrdersCount = orders.length;
  const averageOrderValue = totalOrdersCount > 0 ? totalGrossSales / totalOrdersCount : 0;
  const totalCollections = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalMarketDue = orders.reduce((sum, o) => sum + o.dueAmount, 0);

  // Sales by sales representative
  const repSales = salesStaff.map(staff => {
    const staffOrders = orders.filter(o => o.salesSellerId === staff.id);
    const amount = staffOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      name: staff.name,
      territory: staff.territory,
      ordersCount: staffOrders.length,
      amount,
      target: staff.monthlyTarget,
      achievement: Math.round((amount / staff.monthlyTarget) * 100)
    };
  });

  // Sales by category
  const categorySales: Record<string, { count: number; total: number }> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!categorySales[item.category]) {
        categorySales[item.category] = { count: 0, total: 0 };
      }
      categorySales[item.category].count += item.quantity;
      categorySales[item.category].total += item.totalPrice;
    });
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Commercial Sales Reports</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              August 2026 Audit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Revenue trends, sales officer performance metrics, territory distribution, and category revenue splits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Wholesale Revenue</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(totalGrossSales)}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">↑ 18.2% vs last month</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Wholesale Bookings</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalOrdersCount} Orders</div>
          <span className="text-[11px] text-slate-500">Avg. {formatBDT(averageOrderValue)} / order</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Cash & Digital Realized</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{formatBDT(totalCollections)}</div>
          <span className="text-[11px] text-slate-500">
            {Math.round((totalCollections / totalGrossSales) * 100)}% realization rate
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Market Credit Receivables</span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{formatBDT(totalMarketDue)}</div>
          <span className="text-[11px] text-slate-500">Customer due ledger</span>
        </div>
      </div>

      {/* Category Performance Breakdown & Sales Officer Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Officer Performance Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm tracking-tight">Sales Officer Target Achievement</h2>

          <div className="space-y-4">
            {repSales.map((rep, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-900 block">{rep.name}</span>
                    <span className="text-[11px] text-slate-500">{rep.territory}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">{formatBDT(rep.amount)}</span>
                    <span className="text-[11px] text-rose-600 font-semibold block">{rep.achievement}% of Quota</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-rose-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, rep.achievement)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Revenue Contribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm tracking-tight">Revenue by Product Category</h2>

          <div className="space-y-3 text-xs">
            {Object.entries(categorySales).map(([cat, data], idx) => {
              const share = totalGrossSales > 0 ? Math.round((data.total / totalGrossSales) * 100) : 0;
              return (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{cat}</span>
                    <span className="font-extrabold text-slate-900">{formatBDT(data.total)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{data.count} units sold</span>
                    <span>{share}% of revenue</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-pink-500 h-full rounded-full" 
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
