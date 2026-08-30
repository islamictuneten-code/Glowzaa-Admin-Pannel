import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  calculateOverallSalesIntelligence, 
  filterDataByDateRange 
} from '../../utils/salesIntelligenceEngine';
import { formatBDT } from '../../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  ShieldAlert, 
  Award, 
  Calendar, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  BarChart3, 
  PieChart, 
  Briefcase, 
  Package, 
  Layers, 
  ChevronRight, 
  RefreshCw,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell,
  PieChart as RechartsPie,
  Pie
} from 'recharts';

export const SalesIntelligenceDashboard: React.FC = () => {
  const { 
    customers = [], 
    orders = [], 
    payments = [], 
    products = [], 
    staffUsers = [], 
    visits = [], 
    fieldDutySessions = [],
    setViewingCustomer 
  } = useApp() || {};
  const { currentUser } = useAuth();

  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'all'>('30days');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('all');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'sellers' | 'customers' | 'products' | 'field' | 'alerts'>('overview');

  // RBAC check: if user is sales, filter only their own data
  const isSalesStaff = currentUser?.role === 'sales';
  const effectiveSellerId = isSalesStaff ? currentUser.uid : selectedSellerId;

  // Master Intelligence Calculation
  const intelligence = useMemo(() => {
    const safeOrders = orders || [];
    const safePayments = payments || [];
    const safeVisits = visits || [];
    const safeCustomers = customers || [];
    const safeStaffUsers = staffUsers || [];
    const safeProducts = products || [];
    const safeFieldDutySessions = fieldDutySessions || [];

    let filteredOrders = safeOrders;
    let filteredPayments = safePayments;
    let filteredVisits = safeVisits;
    let filteredCustomers = safeCustomers;

    if (isSalesStaff && currentUser) {
      filteredOrders = safeOrders.filter(o => 
        o.salesUserId === currentUser.uid || o.salesSellerId === currentUser.uid || o.salesUserName === currentUser.name
      );
      filteredPayments = safePayments.filter(p => 
        p.collectedByUserId === currentUser.uid || p.salesUserId === currentUser.uid
      );
      filteredCustomers = safeCustomers.filter(c => 
        c.assignedSalesUserId === currentUser.uid || c.assignedSalesUserName === currentUser.name
      );
      filteredVisits = safeVisits.filter(v => v.userId === currentUser.uid || v.userName === currentUser.name);
    } else if (selectedSellerId !== 'all') {
      const seller = safeStaffUsers.find(u => u.uid === selectedSellerId);
      filteredOrders = safeOrders.filter(o => o.salesUserId === selectedSellerId || o.salesSellerId === selectedSellerId || o.salesUserName === seller?.name);
      filteredPayments = safePayments.filter(p => p.collectedByUserId === selectedSellerId || p.salesUserId === selectedSellerId);
      filteredCustomers = safeCustomers.filter(c => c.assignedSalesUserId === selectedSellerId || c.assignedSalesUserName === seller?.name);
      filteredVisits = safeVisits.filter(v => v.userId === selectedSellerId || v.userName === seller?.name);
    }

    return calculateOverallSalesIntelligence(
      safeStaffUsers,
      filteredOrders,
      filteredPayments,
      filteredCustomers,
      safeProducts,
      filteredVisits,
      safeFieldDutySessions,
      dateRange
    );
  }, [staffUsers, orders, payments, customers, products, visits, fieldDutySessions, dateRange, isSalesStaff, currentUser, selectedSellerId]);

  // Territories list
  const territories = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.district) set.add(c.district);
      if (c.area) set.add(c.area);
    });
    return Array.from(set);
  }, [customers]);

  // Filtered customer intelligence for table
  const filteredCustomersList = useMemo(() => {
    return intelligence.topCustomers.filter(c => {
      const matchesSearch = customerSearch === '' || 
        c.shopName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.ownerName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch);
      
      const matchesSegment = customerSegmentFilter === 'all' || c.segment === customerSegmentFilter;
      const matchesTerritory = selectedTerritory === 'all' || c.district === selectedTerritory || c.territory === selectedTerritory;

      return matchesSearch && matchesSegment && matchesTerritory;
    });
  }, [intelligence.topCustomers, customerSearch, customerSegmentFilter, selectedTerritory]);

  const COLORS = ['#0F766E', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E]">
              {isSalesStaff ? 'Sales Officer Intelligence' : 'Enterprise B2B Executive Intelligence'}
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            {isSalesStaff ? `${currentUser?.name || 'Sales'} Performance Dashboard` : 'Sales & Customer Intelligence Hub'}
          </h1>
          <p className="text-xs text-slate-500">
            Real-time analytics, customer segment health, target vs achievement, and predictive business alerts.
          </p>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs font-semibold">
            {(['30days', '7days', 'this_month', 'last_month', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  dateRange === r ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === '30days' ? '30 Days' : r === '7days' ? '7 Days' : r === 'this_month' ? 'This Month' : r === 'last_month' ? 'Last Month' : 'All Time'}
              </button>
            ))}
          </div>

          {!isSalesStaff && (
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0F766E]"
            >
              <option value="all">All Sellers ({staffUsers.filter(u => u.role === 'sales').length})</option>
              {staffUsers.filter(u => u.role === 'sales').map(u => (
                <option key={u.uid || u.id} value={u.uid || u.id}>{u.name}</option>
              ))}
            </select>
          )}

          <select
            value={selectedTerritory}
            onChange={(e) => setSelectedTerritory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0F766E]"
          >
            <option value="all">All Districts & Territories</option>
            {territories.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-1 sm:space-x-2 bg-white border border-slate-200 p-1.5 rounded-xl overflow-x-auto no-scrollbar shadow-2xs">
        {[
          { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
          { id: 'sellers', label: `Seller Performance (${intelligence.topSellers.length})`, icon: Award },
          { id: 'customers', label: `Customer Intelligence (${intelligence.topCustomers.length})`, icon: Users },
          { id: 'products', label: `Product Intelligence (${intelligence.topProducts.length})`, icon: Package },
          { id: 'field', label: 'Field Sales & Visits', icon: Compass },
          { id: 'alerts', label: `Smart Alerts (${intelligence.businessAlerts.length})`, icon: AlertTriangle }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-[#0F766E] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE OVERVIEW TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 8 Enterprise KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Total Sales */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Sales</span>
              <div className="text-base font-extrabold text-slate-900">
                {formatBDT(intelligence.totalSales)}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> Valid Orders
              </span>
            </div>

            {/* Total Orders */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Orders</span>
              <div className="text-base font-extrabold text-slate-900">
                {intelligence.totalOrders}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
                AOV: {formatBDT(intelligence.averageOrderValue)}
              </span>
            </div>

            {/* Total Collections */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Collections</span>
              <div className="text-base font-extrabold text-emerald-700">
                {formatBDT(intelligence.totalCollections)}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                Received Receipts
              </span>
            </div>

            {/* Total Due */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Outstanding Due</span>
              <div className="text-base font-extrabold text-amber-700">
                {formatBDT(intelligence.totalDue)}
              </div>
              <span className="text-[10px] text-amber-600 font-semibold mt-1 block">
                Customer Receivables
              </span>
            </div>

            {/* Sales Achievement */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Achievement</span>
              <div className="text-base font-extrabold text-teal-800">
                {intelligence.hasTargetConfigured ? `${intelligence.totalAchievementPercent}%` : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
                Target: {intelligence.hasTargetConfigured ? formatBDT(intelligence.totalMonthlyTarget) : 'Not Configured'}
              </span>
            </div>

            {/* Active Sellers */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Active Sellers</span>
              <div className="text-base font-extrabold text-slate-900">
                {intelligence.activeSellersCount}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Field Officers</span>
            </div>

            {/* Active Customers */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Active Customers</span>
              <div className="text-base font-extrabold text-slate-900">
                {intelligence.activeCustomersCount}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">Wholesale Shops</span>
            </div>

            {/* Repeat Purchase Rate */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Repeat Rate</span>
              <div className="text-base font-extrabold text-indigo-700">
                {intelligence.repeatCustomerStats.repeatPurchaseRate}%
              </div>
              <span className="text-[10px] text-indigo-600 font-semibold mt-1 block">
                {intelligence.repeatCustomerStats.repeatCustomers} repeat buyers
              </span>
            </div>
          </div>

          {/* Sales & Collection Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-[#0F766E]" />
                    <span>Sales & Collection Trend Velocity</span>
                  </h3>
                  <p className="text-xs text-slate-500">Comparing gross confirmed sales vs cash/digital collections.</p>
                </div>
                <span className="text-xs bg-teal-50 text-[#0F766E] px-2.5 py-1 rounded-lg font-bold border border-teal-200">
                  Real Transactions
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intelligence.trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0F766E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(val: any, name: any) => [`৳${Number(val).toLocaleString()}`, name === 'sales' ? 'Sales Volume' : 'Collections']}
                      contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#0F766E" strokeWidth={2.5} fillOpacity={1} fill="url(#salesTrendGrad)" />
                    <Area type="monotone" dataKey="collections" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colTrendGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Repeat vs New Customer Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-[#0F766E]" />
                  <span>Customer Retention & Segments</span>
                </h3>
                <p className="text-xs text-slate-500">Repeat purchase loyalty metrics.</p>
              </div>

              <div className="space-y-4 py-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Repeat Purchase Rate</span>
                    <span className="text-[#0F766E]">{intelligence.repeatCustomerStats.repeatPurchaseRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#0F766E] h-full rounded-full" style={{ width: `${intelligence.repeatCustomerStats.repeatPurchaseRate}%` }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{intelligence.repeatCustomerStats.repeatCustomers} repeat customers out of {intelligence.repeatCustomerStats.totalCustomers} total</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>One-Time Customers</span>
                    <span className="text-amber-600">{intelligence.repeatCustomerStats.oneTimeCustomers}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (intelligence.repeatCustomerStats.oneTimeCustomers / Math.max(1, intelligence.repeatCustomerStats.totalCustomers)) * 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Zero Order / Dormant</span>
                    <span className="text-rose-600">{intelligence.repeatCustomerStats.zeroOrderCustomers}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (intelligence.repeatCustomerStats.zeroOrderCustomers / Math.max(1, intelligence.repeatCustomerStats.totalCustomers)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-xs text-teal-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#0F766E] shrink-0" />
                <span>High repeat purchase rate indicates strong B2B brand stickiness in wholesale cosmetic distribution.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SELLER PERFORMANCE TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'sellers' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Sales Officer Performance & Target Leaderboard</h3>
                <p className="text-xs text-slate-500">Ranked by actual delivered wholesale volume against assigned quotas.</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-bold">
                {intelligence.topSellers.length} Active Sellers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">Rank</th>
                    <th className="p-3">Seller Name</th>
                    <th className="p-3">Territory</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Sales</th>
                    <th className="p-3">Achievement</th>
                    <th className="p-3">Orders</th>
                    <th className="p-3">Collections</th>
                    <th className="p-3">Visits</th>
                    <th className="p-3">Conversion</th>
                    <th className="p-3">Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {intelligence.topSellers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        No sales staff performance records found.
                      </td>
                    </tr>
                  ) : (
                    intelligence.topSellers.map((seller) => (
                      <tr key={seller.sellerId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-extrabold">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            seller.rank === 1 ? 'bg-amber-100 text-amber-800 font-black' :
                            seller.rank === 2 ? 'bg-slate-200 text-slate-800 font-bold' :
                            seller.rank === 3 ? 'bg-orange-100 text-orange-800 font-bold' : 'text-slate-600'
                          }`}>
                            #{seller.rank}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {seller.sellerName}
                          <span className="block text-[10px] text-slate-400 font-normal">{seller.sellerLoginId}</span>
                        </td>
                        <td className="p-3 font-medium text-slate-700">{seller.territory}</td>
                        <td className="p-3 font-semibold text-slate-700">
                          {seller.hasTarget ? formatBDT(seller.monthlyTarget) : <span className="text-amber-600 italic">Not Configured</span>}
                        </td>
                        <td className="p-3 font-extrabold text-emerald-700">{formatBDT(seller.sales)}</td>
                        <td className="p-3">
                          {seller.hasTarget ? (
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold ${seller.achievementRate >= 100 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {seller.achievementRate}%
                              </span>
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${seller.achievementRate >= 100 ? 'bg-emerald-500' : 'bg-[#0F766E]'}`} 
                                  style={{ width: `${Math.min(100, seller.achievementRate)}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No Target</span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{seller.ordersCount}</td>
                        <td className="p-3 font-bold text-emerald-700">{formatBDT(seller.collections)}</td>
                        <td className="p-3 font-semibold text-slate-800">{seller.visitsCount}</td>
                        <td className="p-3 font-bold text-indigo-700">{seller.conversionRate}%</td>
                        <td className="p-3 font-medium text-slate-600">{seller.fieldDistanceKm} km</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CUSTOMER INTELLIGENCE TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'customers' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Customer Intelligence & Segment Analytics</h3>
                <p className="text-xs text-slate-500">Deterministic segmentation, sales trends, and financial exposure for wholesale accounts.</p>
              </div>

              {/* Search & Segment Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search shop, owner, phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-[#0F766E] w-56"
                  />
                </div>

                <select
                  value={customerSegmentFilter}
                  onChange={(e) => setCustomerSegmentFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#0F766E]"
                >
                  <option value="all">All Segments</option>
                  <option value="HIGH VALUE">HIGH VALUE</option>
                  <option value="GROWING">GROWING</option>
                  <option value="STABLE">STABLE</option>
                  <option value="DECLINING">DECLINING</option>
                  <option value="AT RISK">AT RISK</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="CREDIT HOLD">CREDIT HOLD</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">Shop / Owner</th>
                    <th className="p-3">Segment</th>
                    <th className="p-3">Total Purchase</th>
                    <th className="p-3">Current Due</th>
                    <th className="p-3">Credit Limit</th>
                    <th className="p-3">Utilization</th>
                    <th className="p-3">Last Order</th>
                    <th className="p-3">Orders</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomersList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No customers match the current search or segment filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomersList.map((c) => {
                      const fullCustomer = customers.find(item => item.id === c.customerId);
                      return (
                        <tr key={c.customerId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{c.shopName}</div>
                            <div className="text-[10px] text-slate-500">{c.ownerName} • {c.phone}</div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.segment === 'HIGH VALUE' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                              c.segment === 'GROWING' ? 'bg-teal-100 text-[#0F766E] border-teal-300' :
                              c.segment === 'DECLINING' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                              c.segment === 'OVERDUE' || c.segment === 'CREDIT HOLD' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                              'bg-slate-100 text-slate-700 border-slate-300'
                            }`}>
                              {c.segment}
                            </span>
                          </td>
                          <td className="p-3 font-extrabold text-emerald-700">{formatBDT(c.totalSales)}</td>
                          <td className="p-3 font-bold text-amber-700">{formatBDT(c.currentDue)}</td>
                          <td className="p-3 font-semibold text-slate-800">{formatBDT(c.creditLimit)}</td>
                          <td className="p-3">
                            <span className={`font-bold ${c.creditUtilizationPercent >= 85 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {Math.round(c.creditUtilizationPercent)}%
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{c.lastOrderDate || 'Never'}</td>
                          <td className="p-3 font-bold text-slate-900">{c.ordersCount}</td>
                          <td className="p-3">
                            {fullCustomer && (
                              <button
                                onClick={() => setViewingCustomer(fullCustomer)}
                                className="px-3 py-1 bg-teal-50 text-[#0F766E] hover:bg-[#0F766E] hover:text-white rounded-lg font-bold transition-all flex items-center space-x-1"
                              >
                                <span>Customer 360°</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRODUCT INTELLIGENCE TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Product Velocity & Revenue Performance</h3>
              <p className="text-xs text-slate-500">Top selling SKUs, fast moving items, and slow moving inventory catalogs.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Units Sold</th>
                    <th className="p-3">Revenue</th>
                    <th className="p-3">Stock Status</th>
                    <th className="p-3">Velocity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {intelligence.topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No product sales recorded in current timeframe.
                      </td>
                    </tr>
                  ) : (
                    intelligence.topProducts.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{p.productName}</td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">{p.sku}</td>
                        <td className="p-3 font-medium text-slate-700">{p.category}</td>
                        <td className="p-3 font-semibold text-slate-800">{formatBDT(p.wholesalePrice)}</td>
                        <td className="p-3 font-bold text-slate-900">{p.unitsSold} units</td>
                        <td className="p-3 font-extrabold text-emerald-700">{formatBDT(p.revenue)}</td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.stockStatus === 'in_stock' ? 'bg-emerald-100 text-emerald-800' :
                            p.stockStatus === 'low_stock' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.stockStatus.replace('_', ' ').toUpperCase()} ({p.currentStock})
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.velocity === 'fast' ? 'bg-teal-100 text-[#0F766E]' :
                            p.velocity === 'medium' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.velocity.toUpperCase()}
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
      )}

      {/* ========================================================================= */}
      {/* 5. FIELD SALES & VISITS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'field' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">Total Field Visits</span>
              <div className="text-2xl font-extrabold text-slate-900">{visits.length}</div>
              <span className="text-[11px] text-[#0F766E] font-semibold mt-1 block">GPS Shop Check-ins</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">Visit Conversion Rate</span>
              <div className="text-2xl font-extrabold text-emerald-700">
                {visits.length > 0 ? Math.round((visits.filter(v => v.visitOutcome === 'order_booked').length / visits.length) * 100) : 0}%
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Orders Booked on Visit</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">Active Field Duty Sessions</span>
              <div className="text-2xl font-extrabold text-indigo-700">{fieldDutySessions.length}</div>
              <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">Tracked Field Routes</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">Total Distance Traveled</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {Math.round(fieldDutySessions.reduce((sum, s) => sum + (Number(s.totalDistanceKm) || 0), 0))} km
              </div>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Field Officer Mileage</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Recent Field Check-In Activity</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">Sales Officer</th>
                    <th className="p-3">Shop Name</th>
                    <th className="p-3">Check-In Time</th>
                    <th className="p-3">GPS Status</th>
                    <th className="p-3">Outcome</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visits.slice(0, 15).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{v.userName}</td>
                      <td className="p-3 font-semibold text-slate-800">{v.shopName}</td>
                      <td className="p-3 text-slate-600">{new Date(v.checkInTime).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${v.isGpsVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {v.isGpsVerified ? 'Verified GPS' : 'Manual'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-[#0F766E]">{v.visitOutcome?.replace('_', ' ').toUpperCase() || 'COMPLETED'}</td>
                      <td className="p-3 text-slate-600 truncate max-w-xs">{v.notes || 'No notes'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SMART BUSINESS ALERTS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Proactive Business Alerts & Opportunities</h3>
                <p className="text-xs text-slate-500">Automatically generated from real-time customer receivables, credit thresholds, and sales trends.</p>
              </div>
              <span className="text-xs bg-rose-50 text-rose-700 px-3 py-1 rounded-lg font-bold border border-rose-200">
                {intelligence.businessAlerts.length} Active Alerts
              </span>
            </div>

            <div className="space-y-3">
              {intelligence.businessAlerts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  All systems operating normally. No critical business alerts detected.
                </div>
              ) : (
                intelligence.businessAlerts.map((alert) => {
                  const fullCustomer = alert.customerId ? customers.find(c => c.id === alert.customerId) : null;
                  return (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        alert.severity === 'critical' ? 'bg-rose-50/60 border-rose-200' :
                        alert.severity === 'warning' ? 'bg-amber-50/60 border-amber-200' :
                        'bg-teal-50/40 border-teal-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-xl mt-0.5 ${
                          alert.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                          alert.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                          'bg-teal-100 text-[#0F766E]'
                        }`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-extrabold text-slate-900">{alert.title}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              alert.severity === 'critical' ? 'bg-rose-200 text-rose-900' :
                              alert.severity === 'warning' ? 'bg-amber-200 text-amber-900' :
                              'bg-teal-200 text-teal-900'
                            }`}>
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{alert.description}</p>
                        </div>
                      </div>

                      {fullCustomer && (
                        <button
                          onClick={() => setViewingCustomer(fullCustomer)}
                          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-xs transition-all shrink-0 flex items-center space-x-1.5 self-start sm:self-center"
                        >
                          <span>{alert.actionLabel || 'View 360°'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
