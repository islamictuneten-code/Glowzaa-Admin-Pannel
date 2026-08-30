import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  DateRangeFilter, 
  DateRangePreset, 
  ComparisonMode, 
  ExecutiveBISettings, 
  ExecutiveKPI 
} from '../../../types';
import { 
  buildDateRangeFilter,
  isDateWithin,
  loadExecutiveBISettings,
  buildExecutiveKPIs,
  buildSalesProfitTrendPoints,
  buildProfitWaterfall,
  buildProductProfitability,
  buildCustomerProfitability,
  buildSellerExecutiveSummaries,
  buildRegionalSummaries,
  buildCategoryExecutiveSummaries,
  generateExecutiveAIInsights,
  generateExecutiveActionItems,
  scanDataQualityIssues,
  exportExecutiveReportCSV
} from '../../../services/executiveBIService';

import { ExecutiveOverviewTab } from './ExecutiveOverviewTab';
import { ProfitabilityAnalyticsTab } from './ProfitabilityAnalyticsTab';
import { CustomerProfitabilityTab } from './CustomerProfitabilityTab';
import { SellerExecutiveTab } from './SellerExecutiveTab';
import { GeographicCategoryTab } from './GeographicCategoryTab';
import { WhatIfSimulatorModal } from './WhatIfSimulatorModal';
import { ExecutiveActionCenterModal } from './ExecutiveActionCenterModal';
import { DataQualityModal } from './DataQualityModal';
import { ExecutiveSettingsModal } from './ExecutiveSettingsModal';
import { ExecutiveKPIDrilldownDrawer } from './ExecutiveKPIDrilldownDrawer';

import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Download, 
  Sliders, 
  Zap, 
  Database, 
  Settings, 
  Layers, 
  Users, 
  Award, 
  Compass, 
  Package, 
  Filter, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const ExecutiveBIDashboard: React.FC = () => {
  const { 
    orders = [], 
    products = [], 
    customers = [], 
    expenses = [], 
    salesStaff = [], 
    categoryDocs = [], 
    currentUser 
  } = useApp() || {};

  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'profitability' | 'customers' | 'sellers' | 'geography'>('overview');

  // Date Filter State
  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('previous_period');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Settings State
  const [settings, setSettings] = useState<ExecutiveBISettings>({
    lowMarginThresholdPercent: 15,
    highDiscountThresholdPercent: 12,
    highSalesVolumeThresholdBDT: 50000,
    inactiveCustomerDays: 60,
    targetWarningThresholdPercent: 75
  });

  // Modal States
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isActionCenterOpen, setIsActionCenterOpen] = useState<boolean>(false);
  const [isDataQualityOpen, setIsDataQualityOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedDrilldownKPI, setSelectedDrilldownKPI] = useState<ExecutiveKPI | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);

  // Load Settings from Firestore
  useEffect(() => {
    let isMounted = true;
    loadExecutiveBISettings().then(saved => {
      if (isMounted) setSettings(saved);
    });
    return () => { isMounted = false; };
  }, []);

  // Compute Current Date Filter Object
  const dateFilter: DateRangeFilter = useMemo(() => {
    return buildDateRangeFilter(preset, customStart, customEnd, comparisonMode);
  }, [preset, comparisonMode, customStart, customEnd]);

  // Convert SalesStaff to AuthUser format for seller calculations
  const mappedStaffUsers = useMemo(() => {
    return salesStaff.map(s => ({
      uid: s.id,
      name: s.name,
      email: s.email || '',
      role: 'sales',
      phone: s.phone,
      loginId: (s as any).loginId || s.phone,
      territory: (s as any).territory || (s as any).assignedArea || 'Dhaka',
      monthlyTarget: Number(s.monthlyTarget) || 0,
      status: 'active'
    } as any));
  }, [salesStaff]);

  // Filter orders and expenses by active period
  const { currentOrders, previousOrders, filteredExpenses } = useMemo(() => {
    const current = orders.filter(o => isDateWithin(o.createdAt || o.createdDate, dateFilter.startDate, dateFilter.endDate));
    const previous = orders.filter(o => isDateWithin(o.createdAt || o.createdDate, dateFilter.prevStartDate, dateFilter.prevEndDate));
    const fExpenses = expenses.filter(e => !e.deleted && e.status === 'approved' && isDateWithin(e.date || e.createdAt, dateFilter.startDate, dateFilter.endDate));
    return { currentOrders: current, previousOrders: previous, filteredExpenses: fExpenses };
  }, [orders, expenses, dateFilter]);

  // Dynamic BI Calculations
  const kpis = useMemo(() => {
    return buildExecutiveKPIs(currentOrders, previousOrders, customers, products, 1000000);
  }, [currentOrders, previousOrders, customers, products]);

  const trendPoints = useMemo(() => {
    return buildSalesProfitTrendPoints(currentOrders, products, dateFilter);
  }, [currentOrders, products, dateFilter]);

  const waterfallSteps = useMemo(() => {
    return buildProfitWaterfall(currentOrders, products, filteredExpenses);
  }, [currentOrders, products, filteredExpenses]);

  const productProfitability = useMemo(() => {
    return buildProductProfitability(currentOrders, products, settings);
  }, [currentOrders, products, settings]);

  const customerProfitability = useMemo(() => {
    return buildCustomerProfitability(currentOrders, customers, products, settings);
  }, [currentOrders, customers, products, settings]);

  const sellerSummaries = useMemo(() => {
    return buildSellerExecutiveSummaries(currentOrders, mappedStaffUsers, products, settings);
  }, [currentOrders, mappedStaffUsers, products, settings]);

  const regionalSummaries = useMemo(() => {
    return buildRegionalSummaries(currentOrders, customers, products, 'district');
  }, [currentOrders, customers, products]);

  const categorySummaries = useMemo(() => {
    return buildCategoryExecutiveSummaries(currentOrders, products, categoryDocs);
  }, [currentOrders, products, categoryDocs]);

  const aiInsights = useMemo(() => {
    return generateExecutiveAIInsights(
      kpis,
      productProfitability,
      sellerSummaries,
      regionalSummaries
    );
  }, [kpis, productProfitability, sellerSummaries, regionalSummaries]);

  const actionItems = useMemo(() => {
    return generateExecutiveActionItems(
      productProfitability,
      customerProfitability,
      sellerSummaries,
      settings
    );
  }, [productProfitability, customerProfitability, sellerSummaries, settings]);

  const dataQualityIssues = useMemo(() => {
    return scanDataQualityIssues(products, orders, customers, expenses);
  }, [products, orders, customers, expenses]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Executive Header & Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        
        {/* Main Title & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Executive Business Intelligence</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    Live System Audit
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Executive analytics for wholesale revenue, product margins, sales officer quotas, and debtor exposure.
                </p>
              </div>
            </div>
          </div>

          {/* Action Center, Sandbox, Quality & Settings Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Action Center Button */}
            <button
              onClick={() => setIsActionCenterOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 text-rose-600" />
              <span>Actions</span>
              {actionItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white font-mono">
                  {actionItems.length}
                </span>
              )}
            </button>

            {/* What-If Simulator Sandbox */}
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-teal-600" />
              <span>What-If Sandbox</span>
            </button>

            {/* Data Quality & Audit Button */}
            <button
              onClick={() => setIsDataQualityOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span>Data Audit</span>
              {dataQualityIssues.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white font-mono">
                  {dataQualityIssues.length}
                </span>
              )}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Configure Executive Thresholds & Policies"
            >
              <Settings className="w-4 h-4" />
            </button>

          </div>
        </div>

        {/* Date Filter & Comparison Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_quarter', label: 'This Quarter' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id as DateRangePreset)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  preset === p.id 
                    ? 'bg-teal-700 text-white shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Comparison Mode & Custom Date Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            
            {preset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">vs:</span>
              <button
                onClick={() => setComparisonMode('previous_period')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold ${
                  comparisonMode === 'previous_period' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Prev Period
              </button>
              <button
                onClick={() => setComparisonMode('last_year')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold ${
                  comparisonMode === 'last_year' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Last Year
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
          { id: 'profitability', label: 'Product Profitability', icon: Package, badge: productProfitability.filter(p => p.isLossMaking).length },
          { id: 'customers', label: 'Customer Matrix', icon: Users },
          { id: 'sellers', label: 'Sales Force Quotas', icon: Award },
          { id: 'geography', label: 'Territories & Mix', icon: Compass }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white bg-white/50 border border-slate-200/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      {activeTab === 'overview' && (
        <ExecutiveOverviewTab
          kpis={kpis}
          trendPoints={trendPoints}
          waterfallSteps={waterfallSteps}
          aiInsights={aiInsights}
          productProfitability={productProfitability}
          sellerSummaries={sellerSummaries}
          regionalSummaries={regionalSummaries}
          dateFilter={dateFilter}
          onSelectKPI={kpi => setSelectedDrilldownKPI(kpi)}
          onNavigateTab={tab => setActiveTab(tab as any)}
        />
      )}

      {activeTab === 'profitability' && (
        <ProfitabilityAnalyticsTab
          items={productProfitability}
          settings={settings}
        />
      )}

      {activeTab === 'customers' && (
        <CustomerProfitabilityTab
          items={customerProfitability}
          settings={settings}
        />
      )}

      {activeTab === 'sellers' && (
        <SellerExecutiveTab
          summaries={sellerSummaries}
          settings={settings}
        />
      )}

      {activeTab === 'geography' && (
        <GeographicCategoryTab
          regionalSummaries={regionalSummaries}
          categorySummaries={categorySummaries}
        />
      )}

      {/* Modals & Drawers */}
      <WhatIfSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        productProfitability={productProfitability}
      />

      <ExecutiveActionCenterModal
        isOpen={isActionCenterOpen}
        onClose={() => setIsActionCenterOpen(false)}
        actions={actionItems}
        onNavigateTab={tab => setActiveTab(tab as any)}
      />

      <DataQualityModal
        isOpen={isDataQualityOpen}
        onClose={() => setIsDataQualityOpen(false)}
        issues={dataQualityIssues}
      />

      {currentUser && (
        <ExecutiveSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSaved={updated => setSettings(updated)}
          currentUser={currentUser}
        />
      )}

      <ExecutiveKPIDrilldownDrawer
        kpi={selectedDrilldownKPI}
        onClose={() => setSelectedDrilldownKPI(null)}
        orders={orders}
        products={products}
        customers={customers}
        expenses={expenses}
        onNavigateTab={tab => setActiveTab(tab as any)}
      />

    </div>
  );
};
