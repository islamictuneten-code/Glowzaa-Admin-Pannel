import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../shared/StatCard';
import { Badge } from '../shared/Badge';
import { UserAvatar } from '../shared/UserAvatar';
import { 
  TrendingUp, 
  ShoppingCart, 
  Clock, 
  Users, 
  AlertCircle, 
  DollarSign, 
  PlusCircle, 
  ArrowRight,
  Eye,
  Award,
  Building2,
  MapPin
} from 'lucide-react';

export const SalesOverview: React.FC = () => {
  const { 
    orders, 
    customers, 
    products, 
    currentSalesUser, 
    setSalesTab, 
    setViewingOrder, 
    setViewingCustomer,
    formatBDT 
  } = useApp();

  // My Orders
  const myOrders = orders.filter(o => o.salesSellerId === currentSalesUser.id);
  const myTodayOrders = myOrders.filter(o => o.createdDate.includes('2026-08-18') || o.createdDate.includes('Today'));
  const myPendingOrders = myOrders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing');
  
  // My Customers
  const myCustomers = customers.filter(c => c.assignedSalesSellerId === currentSalesUser.id);
  const myCustomerTotalDue = myCustomers.reduce((sum, c) => sum + c.currentDue, 0);

  const achievementPct = Math.round((currentSalesUser.achievedSales / currentSalesUser.monthlyTarget) * 100);
  const earnedCommission = Math.round(currentSalesUser.achievedSales * (currentSalesUser.commissionRate / 100));

  return (
    <div className="space-y-5">
      
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-xl shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <UserAvatar
            src={currentSalesUser.photoURL}
            name={currentSalesUser.name}
            fallbackInitials={currentSalesUser.avatar}
            size="lg"
            role="sales"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E]">Sales & Field Accounts</span>
              <span className="text-[10px] bg-teal-50 text-[#0F766E] border border-teal-200 px-2 py-0.5 rounded font-semibold">
                {currentSalesUser.territory}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight mt-0.5 text-[#0F172A]">
              Welcome back, {currentSalesUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Track retail shop bookings, field market credit collections, and monitor monthly quota commission progress.
            </p>
          </div>
        </div>

        <button
          onClick={() => setSalesTab('create_order')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-teal-200" />
          <span>Book New Retail Order</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
        <StatCard
          title="Achieved Sales (Month)"
          value={formatBDT(currentSalesUser.achievedSales)}
          subtitle={`Target: ${formatBDT(currentSalesUser.monthlyTarget)}`}
          icon={<TrendingUp className="w-4 h-4 text-[#0F766E]" />}
          accentColor="teal"
          trend={{ value: `${achievementPct}% of Quota`, isPositive: achievementPct >= 50 }}
          onClick={() => setSalesTab('summary')}
        />

        <StatCard
          title="Today's Orders"
          value={myTodayOrders.length.toString()}
          subtitle="Booked in territory today"
          icon={<ShoppingCart className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
          onClick={() => setSalesTab('orders')}
        />

        <StatCard
          title="Assigned Retail Shops"
          value={myCustomers.length.toString()}
          subtitle="Active salon & shop network"
          icon={<Users className="w-4 h-4 text-slate-700" />}
          accentColor="slate"
          onClick={() => setSalesTab('customers')}
        />

        <StatCard
          title="Portfolio Customer Due"
          value={formatBDT(myCustomerTotalDue)}
          subtitle="Receivables to collect"
          icon={<AlertCircle className="w-4 h-4 text-red-600" />}
          accentColor="rose"
          onClick={() => setSalesTab('customer_due')}
        />
      </div>

      {/* Target Progress Bar Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E]">
              <Award className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Sales Quota & Commission</h2>
              <p className="text-[11px] text-slate-500">Commission rate: <span className="font-semibold text-slate-800">{currentSalesUser.commissionRate}%</span> on net settled sales</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-500 block">Estimated Commission Accrued:</span>
            <span className="text-base font-bold text-emerald-600">{formatBDT(earnedCommission)}</span>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">{formatBDT(currentSalesUser.achievedSales)} achieved</span>
            <span className="text-[#0F766E]">{achievementPct}% of {formatBDT(currentSalesUser.monthlyTarget)}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#0F766E] h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, achievementPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recent Bookings & Assigned Client Shops */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* My Recent Orders (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">My Recent Wholesale Bookings</h2>
              <p className="text-[11px] text-slate-500">Live order status from warehouse to delivery dispatch</p>
            </div>
            <button
              onClick={() => setSalesTab('my_orders')}
              className="text-xs font-semibold text-[#0F766E] hover:text-[#115E59] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All ({myOrders.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Retail Shop</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myOrders.slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 block">{order.shopName}</span>
                      <span className="text-[11px] text-slate-400">{order.area}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{order.createdDate.split(' ')[0]}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatBDT(order.totalAmount)}</td>
                    <td className="py-2.5 px-3">
                      <Badge status={order.orderStatus} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setViewingOrder(order)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="View Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Retail Client Dues (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Assigned Retail Shops</h2>
              <p className="text-[11px] text-slate-500">Portfolio due status</p>
            </div>
            <button
              onClick={() => setSalesTab('customers')}
              className="text-xs font-semibold text-[#0F766E] hover:text-[#115E59] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>All Shops</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {myCustomers.slice(0, 5).map(cust => (
              <div 
                key={cust.id} 
                onClick={() => setViewingCustomer(cust)}
                className="p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-slate-50/50 transition-all cursor-pointer space-y-1"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">{cust.shopName}</span>
                  <span className={`text-xs font-bold ${cust.currentDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {cust.currentDue > 0 ? formatBDT(cust.currentDue) : '✓ Settled'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{cust.ownerName}</span>
                  <span>{cust.area}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
