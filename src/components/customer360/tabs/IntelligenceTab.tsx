import React, { useMemo } from 'react';
import { 
  Customer, 
  Order, 
  Payment, 
  CustomerVisit 
} from '../../../types';
import { getCustomerIntelligence } from '../../../utils/salesIntelligenceEngine';
import { formatBDT } from '../../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShoppingBag,
  CreditCard,
  Compass,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
  Calendar,
  DollarSign,
  Percent,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface IntelligenceTabProps {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
  visits?: CustomerVisit[];
  onOpenOrder?: () => void;
  onOpenPayment?: () => void;
  onCheckIn?: () => void;
}

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({
  customer,
  orders,
  payments,
  visits = [],
  onOpenOrder,
  onOpenPayment,
  onCheckIn
}) => {
  const intel = useMemo(() => {
    return getCustomerIntelligence(customer, orders, payments, visits);
  }, [customer, orders, payments, visits]);

  // Format order trend data for recharts
  const chartData = useMemo(() => {
    const sorted = [...orders]
      .filter(o => o.orderStatus !== 'cancelled' && o.orderStatus !== 'Cancelled')
      .sort((a, b) => new Date(a.createdAt || a.createdDate || 0).getTime() - new Date(b.createdAt || b.createdDate || 0).getTime());

    if (sorted.length === 0) {
      return [];
    }

    return sorted.map((o, idx) => {
      const dateStr = o.createdDate || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : `Order ${idx + 1}`);
      return {
        name: dateStr,
        orderNumber: o.orderNumber || o.id.slice(0, 6),
        amount: Number(o.grandTotal ?? o.totalAmount) || 0,
        paid: Number(o.paidAmount) || 0
      };
    });
  }, [orders]);

  // Segment styling configuration
  const segmentBadge = useMemo(() => {
    switch (intel.segment) {
      case 'HIGH VALUE':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: Sparkles,
          desc: 'Top-tier account with exceptional purchase volume and high reliability.'
        };
      case 'GROWING':
        return {
          bg: 'bg-teal-100 text-[#0F766E] border-teal-300',
          icon: TrendingUp,
          desc: 'Rapidly expanding order frequency and increasing ticket size in the last 30 days.'
        };
      case 'STABLE':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: Activity,
          desc: 'Reliable customer with steady purchasing rhythm and consistent payment behavior.'
        };
      case 'DECLINING':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: TrendingDown,
          desc: 'Order volume has dropped by ≥25% recently. In-person sales intervention recommended.'
        };
      case 'AT RISK':
        return {
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: AlertTriangle,
          desc: 'No order activity in >45 days or critical credit exposure. High churn risk.'
        };
      case 'OVERDUE':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: AlertTriangle,
          desc: 'Outstanding balance has exceeded allowable credit terms or credit ceiling.'
        };
      case 'CREDIT HOLD':
        return {
          bg: 'bg-red-200 text-red-950 border-red-400 font-bold',
          icon: ShieldAlert,
          desc: 'Account locked under administrative credit hold. Credit orders blocked.'
        };
      case 'INACTIVE':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Clock,
          desc: 'Dormant account with no recent transactions logged.'
        };
    }
  }, [intel.segment]);

  const SegmentIcon = segmentBadge.icon;

  return (
    <div className="space-y-6">
      {/* 1. Master Customer Health Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a3734] to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                Customer Intelligence Matrix
              </span>
              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${segmentBadge.bg}`}>
                <SegmentIcon className="w-3.5 h-3.5 mr-1" />
                {intel.segment}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>{customer.shopName}</span>
              <span className="text-xs text-slate-400 font-normal">({customer.ownerName})</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              {segmentBadge.desc}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-right min-w-[120px]">
              <span className="text-[10px] text-teal-200 uppercase font-semibold block">30-Day Trend</span>
              <span className={`text-base font-extrabold flex items-center justify-end space-x-1 ${
                (intel.salesChangePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {(intel.salesChangePercent || 0) >= 0 ? <TrendingUp className="w-4 h-4 mr-0.5" /> : <TrendingDown className="w-4 h-4 mr-0.5" />}
                {intel.salesChangePercent !== null ? `${intel.salesChangePercent > 0 ? '+' : ''}${intel.salesChangePercent}%` : 'N/A'}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-right min-w-[120px]">
              <span className="text-[10px] text-teal-200 uppercase font-semibold block">AOV</span>
              <span className="text-base font-extrabold text-white">
                {formatBDT(intel.averageOrderValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Intelligence Metric Cards (6-Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Order Frequency */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="text-[11px] font-semibold">Order Frequency</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900">
            {intel.orderFrequencyDays ? `Every ${intel.orderFrequencyDays} days` : 'Periodic'}
          </div>
          <span className="text-[10px] text-slate-400">{orders.length} total orders</span>
        </div>

        {/* Days Since Last Order */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
            <span className="text-[11px] font-semibold">Last Order</span>
          </div>
          <div className={`text-sm font-extrabold ${
            (intel.daysSinceLastOrder || 0) > 30 ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {intel.daysSinceLastOrder !== null ? `${intel.daysSinceLastOrder} days ago` : 'No orders'}
          </div>
          <span className="text-[10px] text-slate-400">{intel.lastOrderDate || 'None recorded'}</span>
        </div>

        {/* 30-Day Sales Volume */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold">Last 30 Days</span>
          </div>
          <div className="text-sm font-extrabold text-emerald-700">
            {formatBDT(intel.salesCurrent30d)}
          </div>
          <span className="text-[10px] text-slate-400">Prev: {formatBDT(intel.salesPrevious30d)}</span>
        </div>

        {/* Credit Utilization */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
            <Percent className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-semibold">Credit Utilized</span>
          </div>
          <div className={`text-sm font-extrabold ${
            intel.creditUtilizationPercent >= 90 ? 'text-rose-600' :
            intel.creditUtilizationPercent >= 75 ? 'text-amber-600' : 'text-teal-700'
          }`}>
            {Math.round(intel.creditUtilizationPercent)}%
          </div>
          <span className="text-[10px] text-slate-400">Limit: {formatBDT(intel.creditLimit)}</span>
        </div>

        {/* Available Credit */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
            <CreditCard className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px] font-semibold">Available Credit</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900">
            {formatBDT(intel.availableCredit)}
          </div>
          <span className="text-[10px] text-slate-400">Due: {formatBDT(intel.currentDue)}</span>
        </div>

        {/* Field Visit Conversion */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-semibold">Visit Conversion</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900">
            {intel.conversionRate}%
          </div>
          <span className="text-[10px] text-slate-400">{intel.visitsCount} visits logged</span>
        </div>
      </div>

      {/* 3. Purchase Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Historical Purchase Velocity
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Lifetime Sales: <strong className="text-slate-900">{formatBDT(intel.totalSales)}</strong>
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="h-44 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            No order transaction history recorded yet.
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'Order Amount']}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `Order #${item.orderNumber} (${label})` : label;
                  }}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px', border: 'none' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#0F766E" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#salesGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Risk Indicators & Recommended Actions Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Risk Indicators */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Identified Risk Indicators
            </h3>
          </div>

          {intel.riskIndicators.length === 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">No Risk Flags Detected</span>
                <span>Account displays excellent payment discipline and steady ordering rhythm.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {intel.riskIndicators.map((risk, idx) => (
                <div 
                  key={idx} 
                  className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-slate-800"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{risk}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Actions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Lightbulb className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Smart Recommended Actions
            </h3>
          </div>

          <div className="space-y-2.5">
            {intel.recommendedActions.map((action, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl flex items-start space-x-2.5 text-xs text-slate-800"
              >
                <ArrowRight className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                <span className="font-medium text-slate-800">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
