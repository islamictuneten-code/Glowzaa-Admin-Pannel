import React from 'react';
import { 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  ShieldAlert, 
  Info,
  Calendar,
  ShoppingBag,
  RotateCcw,
  Clock
} from 'lucide-react';
import { Customer, Order, Payment } from '../../types';
import { 
  getCreditUtilizationInfo, 
  calculateCustomerRisk 
} from '../../utils/creditEngine';
import { formatBDT } from '../../utils/formatters';

interface Customer360KpisProps {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
}

export const Customer360Kpis: React.FC<Customer360KpisProps> = ({
  customer,
  orders,
  payments
}) => {
  const creditInfo = getCreditUtilizationInfo(customer.creditLimit, customer.currentDue);
  const riskInfo = calculateCustomerRisk(customer, orders, payments);

  const totalOrdersCount = orders.length;
  const lastOrderDate = customer.lastOrderDate || (orders[0]?.createdDate || 'None');
  const totalReturnedAmount = Math.max(0, Number(customer.totalReturned) || 0);

  return (
    <div className="space-y-3 sm:space-y-4 px-4 sm:px-6 py-4 bg-slate-50/60 border-b border-slate-200">
      {/* 1. Core Financial Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Purchase */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Purchase</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900">
            {formatBDT(customer.totalPurchase || 0)}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {totalOrdersCount} sales order{totalOrdersCount === 1 ? '' : 's'}
          </span>
        </div>

        {/* Total Paid */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Paid</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-emerald-600">
            {formatBDT(customer.totalPaid || 0)}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
            Collected & Reconciled
          </span>
        </div>

        {/* Current Due */}
        <div className={`bg-white border rounded-xl p-3 sm:p-3.5 shadow-2xs ${
          (customer.currentDue || 0) > 0 ? 'border-rose-300 bg-rose-50/30 ring-1 ring-rose-200/50' : 'border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Current Outstanding Due</span>
            <AlertCircle className={`w-3.5 h-3.5 ${(customer.currentDue || 0) > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <div className={`text-base sm:text-lg font-black ${(customer.currentDue || 0) > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {formatBDT(customer.currentDue || 0)}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Net Terms: {customer.paymentTermDays || 15} Days
          </span>
        </div>

        {/* Advance Balance / Returns */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Advance Balance</span>
            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-blue-600">
            {formatBDT(customer.advanceBalance || 0)}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Returns: {formatBDT(totalReturnedAmount)}
          </span>
        </div>
      </div>

      {/* 2. Smart Credit Control & Utilization Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Credit Utilization & Limit Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-[#0F766E]" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Credit Control & Utilization</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${creditInfo.badgeBg} ${creditInfo.badgeText} ${creditInfo.badgeBorder}`}>
                {creditInfo.category}: {Math.round(creditInfo.utilizationPercent)}%
              </span>
              {customer.creditHold && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  HOLD
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 my-1">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className={`h-full transition-all duration-500 rounded-full ${creditInfo.barColor}`}
                style={{ width: `${creditInfo.clampedPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium text-slate-500">
              <span>0% Utilized</span>
              <span>50% Threshold</span>
              <span>100% Limit ({formatBDT(customer.creditLimit || 0)})</span>
            </div>
          </div>

          {/* Detailed limit breakdowns */}
          <div className="grid grid-cols-3 gap-2 pt-2.5 mt-1 border-t border-slate-100 text-center">
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Assigned Limit</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">{formatBDT(customer.creditLimit || 0)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Available Credit</span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-700">{formatBDT(creditInfo.availableCredit)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-medium">Exposure Mode</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800">{customer.creditCheckMode || 'NONE'}</span>
            </div>
          </div>
        </div>

        {/* Smart Customer Risk Indicator */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900">Risk Profile</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${riskInfo.badgeBg} ${riskInfo.badgeText} ${riskInfo.badgeBorder}`}>
                {riskInfo.level}
              </span>
            </div>

            <p className="text-xs font-bold text-slate-900 leading-snug">
              {riskInfo.scoreLabel}
            </p>
            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
              {riskInfo.reason}
            </p>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start space-x-1 text-[10px] text-slate-400">
            <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{riskInfo.disclaimer}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
