import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Download, 
  Search, 
  Filter, 
  Building2, 
  Truck, 
  Calendar, 
  DollarSign, 
  Layers, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  ChevronRight, 
  Eye, 
  AlertCircle,
  FileSpreadsheet,
  Boxes,
  HelpCircle,
  XCircle
} from 'lucide-react';
import { 
  AuthUser, 
  ProcurementRecommendation, 
  ProcurementKPIs, 
  ProcurementHealthSummary, 
  OpenPORiskItem, 
  ProcurementSpendAnalytics, 
  ProcurementSettings,
  ProcurementPriority,
  ProcurementRecommendationType
} from '../../../types';
import { 
  generateProcurementRecommendations, 
  getProcurementSettings,
  getProcurementAuditLogs
} from '../../../services/smartProcurementService';
import { ProcurementRecommendationDrawer } from './ProcurementRecommendationDrawer';
import { ProcurementSettingsModal } from './ProcurementSettingsModal';
import { BulkProcurementModal } from './BulkProcurementModal';

interface Props {
  currentUser: AuthUser;
}

type TabType = 'recommendations' | 'po_risks' | 'spend_analytics' | 'calendar' | 'audit_trail';

export const SmartProcurementDashboard: React.FC<Props> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('recommendations');
  
  // Data state
  const [recommendations, setRecommendations] = useState<ProcurementRecommendation[]>([]);
  const [kpis, setKpis] = useState<ProcurementKPIs | null>(null);
  const [health, setHealth] = useState<ProcurementHealthSummary | null>(null);
  const [openPORisks, setOpenPORisks] = useState<OpenPORiskItem[]>([]);
  const [spendAnalytics, setSpendAnalytics] = useState<ProcurementSpendAnalytics | null>(null);
  const [settings, setSettings] = useState<ProcurementSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'actioned' | 'dismissed' | 'all'>('active');

  // Modals & Drawer state
  const [selectedRecommendation, setSelectedRecommendation] = useState<ProcurementRecommendation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedRecIds, setSelectedRecIds] = useState<Set<string>>(new Set());

  // Load Data
  const loadDashboardData = async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const conf = await getProcurementSettings();
      setSettings(conf);

      const data = await generateProcurementRecommendations(conf);
      setRecommendations(data.recommendations);
      setKpis(data.kpis);
      setHealth(data.health);
      setOpenPORisks(data.openPORisks);
      setSpendAnalytics(data.spendAnalytics);

      const logs = await getProcurementAuditLogs(30);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading smart procurement dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser?.uid]);

  // Unique Categories for dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of recommendations) {
      if (r.category) set.add(r.category);
    }
    return Array.from(set);
  }, [recommendations]);

  // Filtered Recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(r => {
      // Search
      const matchesSearch = 
        r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.preferredSupplier?.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Category
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;

      // Priority
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;

      // Type
      if (typeFilter !== 'all') {
        if (typeFilter === 'reorder' && !(r.type === 'REORDER_NOW' || r.type === 'REORDER_SOON')) return false;
        if (typeFilter === 'stockout' && r.stockoutRisk !== 'CRITICAL' && r.stockoutRisk !== 'HIGH') return false;
        if (typeFilter === 'overstock' && r.type !== 'OVERSTOCK') return false;
        if (typeFilter === 'excess_inbound' && r.type !== 'EXCESS_INBOUND') return false;
        if (typeFilter === 'supplier_risk' && r.type !== 'SUPPLIER_RISK') return false;
        if (typeFilter === 'price_opportunity' && r.type !== 'PRICE_OPPORTUNITY') return false;
        if (typeFilter === 'demand_anomaly' && !(r.type === 'DEMAND_SPIKE' || r.type === 'DEMAND_DROP')) return false;
      }

      // Status
      if (statusFilter === 'active' && (r.status === 'actioned' || r.status === 'dismissed')) return false;
      if (statusFilter === 'actioned' && r.status !== 'actioned') return false;
      if (statusFilter === 'dismissed' && r.status !== 'dismissed') return false;

      return true;
    });
  }, [recommendations, searchQuery, categoryFilter, typeFilter, priorityFilter, statusFilter]);

  // Bulk Selection Handlers
  const handleToggleSelectRec = (id: string) => {
    const next = new Set(selectedRecIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRecIds(next);
  };

  const handleSelectAllVisible = () => {
    if (selectedRecIds.size === filteredRecommendations.length && filteredRecommendations.length > 0) {
      setSelectedRecIds(new Set());
    } else {
      const next = new Set<string>();
      for (const r of filteredRecommendations) {
        if (r.type !== 'NO_ACTION' && r.status !== 'actioned') {
          next.add(r.id);
        }
      }
      setSelectedRecIds(next);
    }
  };

  const selectedRecObjects = useMemo(() => {
    return recommendations.filter(r => selectedRecIds.has(r.id));
  }, [recommendations, selectedRecIds]);

  // Export to CSV
  const handleExportCSV = () => {
    if (recommendations.length === 0) return;
    const headers = [
      'Product Name', 'SKU', 'Category', 'Priority', 'Type', 'Status', 
      'Current Stock', 'Inbound Stock', 'Daily Demand', 'Days Of Cover', 
      'Recommended Qty', 'Preferred Supplier', 'Unit Price BDT', 'Estimated Total BDT', 'Stockout Risk'
    ];

    const rows = filteredRecommendations.map(r => [
      `"${r.productName.replace(/"/g, '""')}"`,
      `"${r.sku || ''}"`,
      `"${r.category || ''}"`,
      r.priority.toUpperCase(),
      r.type,
      r.status,
      r.currentStock,
      r.inboundStock,
      r.averageDailyDemand,
      r.daysOfCover !== null ? r.daysOfCover : 'N/A',
      r.recommendedQuantity,
      `"${r.preferredSupplier?.supplierName || 'Manual'}"`,
      r.unitPriceBDT || 0,
      r.estimatedCostBDT || 0,
      r.stockoutRisk
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Procurement_Recommendations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-[#0F766E] rounded-full animate-spin" />
        <div className="text-center">
          <h3 className="font-bold text-slate-800 text-base">Analyzing Procurement Intelligence...</h3>
          <p className="text-xs text-slate-500 mt-1">
            Evaluating stock positions, supplier scorecards, and forecast demand
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Executive Header */}
      <div className="bg-gradient-to-r from-[#0F766E] to-teal-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 text-teal-100 px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                STEP 17.5 • DECISION INTELLIGENCE
              </span>
              <span className="text-[11px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                Admin Confirmation Required
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Smart Procurement Command Center</h1>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-2xl leading-relaxed">
              Automated purchasing decision support synthesizing 30-day sales velocity, supplier reliability scorecards, active open POs, and replenishment risk.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs border border-white/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Intelligence'}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs border border-white/20 flex items-center gap-2 transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
              Settings
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white text-[#0F766E] hover:bg-teal-50 text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#0F766E]" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top 8 Actionable KPI Ribbon (Clickable for drill-down) */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          <div 
            onClick={() => setActiveTab('spend_analytics')}
            className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-[#0F766E] cursor-pointer transition-all hover:shadow-sm group"
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Total Spend</div>
            <div className="text-base font-black text-slate-900 font-mono mt-1 group-hover:text-[#0F766E] truncate">
              ৳{kpis.totalPurchaseSpendBDT.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Posted Receipts</div>
          </div>

          <div 
            onClick={() => setActiveTab('po_risks')}
            className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-[#0F766E] cursor-pointer transition-all hover:shadow-sm group"
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Open POs</div>
            <div className="text-base font-black text-slate-900 font-mono mt-1 group-hover:text-[#0F766E]">
              {kpis.openPurchaseOrdersCount} <span className="text-[11px] font-semibold text-slate-500">orders</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">৳{kpis.openPurchaseOrdersValueBDT.toLocaleString()}</div>
          </div>

          <div 
            onClick={() => { setActiveTab('recommendations'); setTypeFilter('excess_inbound'); }}
            className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-[#0F766E] cursor-pointer transition-all hover:shadow-sm group"
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Inbound Value</div>
            <div className="text-base font-black text-teal-700 font-mono mt-1">
              ৳{kpis.inboundStockValueBDT.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{kpis.inboundStockUnits} incoming units</div>
          </div>

          <div 
            onClick={() => { setActiveTab('recommendations'); setTypeFilter('reorder'); setPriorityFilter('all'); }}
            className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs hover:border-amber-400 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider truncate">Reorder Needed</div>
            <div className="text-base font-black text-amber-900 mt-1">
              {kpis.reorderRequiredCount} <span className="text-[11px] font-semibold text-amber-700">SKUs</span>
            </div>
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Below reorder point</div>
          </div>

          <div 
            onClick={() => { setActiveTab('recommendations'); setTypeFilter('stockout'); setPriorityFilter('critical'); }}
            className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl shadow-xs hover:border-rose-400 cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider truncate">Stockout Risk</div>
            <div className="text-base font-black text-rose-900 mt-1">
              {kpis.criticalStockoutRiskCount} <span className="text-[11px] font-semibold text-rose-700">critical</span>
            </div>
            <div className="text-[10px] text-rose-700 font-semibold mt-0.5">&le; 3 days stock</div>
          </div>

          <div 
            onClick={() => { setActiveTab('recommendations'); setTypeFilter('overstock'); }}
            className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-[#0F766E] cursor-pointer transition-all hover:shadow-sm group"
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Overstock Value</div>
            <div className="text-base font-black text-slate-900 font-mono mt-1 group-hover:text-[#0F766E] truncate">
              ৳{kpis.overstockValueBDT.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{kpis.overstockProductCount} excess SKUs</div>
          </div>

          <div 
            onClick={() => { setActiveTab('recommendations'); setTypeFilter('supplier_risk'); }}
            className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-[#0F766E] cursor-pointer transition-all hover:shadow-sm group"
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Supplier Risk</div>
            <div className="text-base font-black text-slate-900 mt-1 group-hover:text-[#0F766E]">
              {kpis.supplierRiskCount} <span className="text-[11px] font-semibold text-slate-500">vendors</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">High / Critical risk</div>
          </div>

          <div 
            onClick={() => { setActiveTab('recommendations'); setTypeFilter('all'); setPriorityFilter('all'); }}
            className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl shadow-xs hover:border-[#0F766E] cursor-pointer transition-all hover:shadow-sm"
          >
            <div className="text-[10px] font-bold text-[#0F766E] uppercase tracking-wider truncate">Recommendations</div>
            <div className="text-base font-black text-[#0F766E] mt-1">
              {kpis.totalRecommendationsCount} <span className="text-[11px] font-semibold text-teal-700">active</span>
            </div>
            <div className="text-[10px] text-teal-700 font-semibold mt-0.5">{kpis.criticalRecommendationsCount} critical priority</div>
          </div>

        </div>
      )}

      {/* 3. Executive Procurement Health Summary */}
      {health && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Left: Overall Health Score Gauge */}
            <div className="flex items-center gap-5 shrink-0">
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full border-8 border-slate-100" />
                <div 
                  className={`absolute inset-0 rounded-full border-8 border-t-transparent transition-all ${
                    health.overallHealthStatus === 'EXCELLENT' ? 'border-emerald-500' :
                    health.overallHealthStatus === 'GOOD' ? 'border-[#0F766E]' :
                    health.overallHealthStatus === 'WATCH' ? 'border-amber-500' : 'border-rose-500'
                  }`}
                  style={{ transform: `rotate(${Math.min(360, (health.overallHealthScore / 100) * 360)}deg)` }}
                />
                <div className="text-center z-10">
                  <span className="text-2xl font-black text-slate-900 font-mono leading-none">
                    {health.overallHealthScore}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">/ 100</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
                    health.overallHealthStatus === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800' :
                    health.overallHealthStatus === 'GOOD' ? 'bg-teal-100 text-teal-800' :
                    health.overallHealthStatus === 'WATCH' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {health.overallHealthStatus} HEALTH
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Procurement Index</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">Executive Procurement Health</h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                  Calculated from inventory stockout safety, supplier performance scorecards, and incoming PO timeliness.
                </p>
              </div>
            </div>

            {/* Middle: Component Health Scores */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Inventory Health</div>
                <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">{health.inventoryHealthScore} / 100</div>
                <span className="text-[10px] font-bold text-emerald-700">{health.inventoryHealthStatus}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Supplier Health</div>
                <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">{health.supplierHealthScore} / 100</div>
                <span className="text-[10px] font-bold text-teal-700">{health.supplierHealthStatus}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl col-span-2 sm:col-span-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Purchase Risk</div>
                <div className={`text-lg font-black mt-0.5 font-mono ${
                  health.purchaseRiskLevel === 'HIGH' ? 'text-rose-600' :
                  health.purchaseRiskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-700'
                }`}>
                  {health.purchaseRiskLevel}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {health.stockoutRiskProductsCount} critical alerts
                </span>
              </div>
            </div>

            {/* Right: Cash Commitment Breakdown */}
            <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl lg:min-w-[260px]">
              <div className="text-xs font-bold text-[#0F766E] uppercase tracking-wider flex items-center justify-between">
                <span>Procurement Cash Flow</span>
                <span className="text-[10px] bg-teal-200/60 text-[#0F766E] px-1.5 py-0.5 rounded font-mono">
                  EXECUTIVE
                </span>
              </div>
              
              <div className="mt-2 space-y-1.5 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-600">Actual Open Commitments:</span>
                  <strong className="text-slate-900 font-mono">৳{health.actualOpenCommitmentBDT.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Recommended New POs:</span>
                  <strong className="text-emerald-700 font-mono">৳{health.recommendedPurchaseCommitmentBDT.toLocaleString()}</strong>
                </div>
                <div className="pt-1.5 border-t border-teal-200/60 flex justify-between font-bold text-slate-900">
                  <span>Projected Commitment:</span>
                  <span className="text-[#0F766E] font-mono">৳{health.totalProjectedCommitmentBDT.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'recommendations'
              ? 'bg-[#0F766E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Action Center & Purchase Queue ({filteredRecommendations.length})
        </button>

        <button
          onClick={() => setActiveTab('po_risks')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'po_risks'
              ? 'bg-[#0F766E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Open PO Risks & Inbound Pipeline ({openPORisks.length})
        </button>

        <button
          onClick={() => setActiveTab('spend_analytics')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'spend_analytics'
              ? 'bg-[#0F766E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Spend & Savings Analytics
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-[#0F766E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Procurement Supply Timeline
        </button>

        <button
          onClick={() => setActiveTab('audit_trail')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit_trail'
              ? 'bg-[#0F766E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* 5. Tab Content: Action Center & Purchase Queue */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          
          {/* Filter Bar & Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product, SKU or supplier..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                />
              </div>

              {/* Category & Status */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
                >
                  <option value="active">Active Recommendations</option>
                  <option value="actioned">Actioned / Ordered</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="all">All Statuses</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Filter:</span>
              
              <button
                onClick={() => { setTypeFilter('all'); setPriorityFilter('all'); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  typeFilter === 'all' && priorityFilter === 'all'
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({recommendations.length})
              </button>

              <button
                onClick={() => { setPriorityFilter('critical'); setTypeFilter('all'); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  priorityFilter === 'critical'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                🔴 Critical Risk ({recommendations.filter(r => r.priority === 'critical').length})
              </button>

              <button
                onClick={() => { setTypeFilter('reorder'); setPriorityFilter('all'); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  typeFilter === 'reorder'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Reorder Required ({recommendations.filter(r => r.type === 'REORDER_NOW' || r.type === 'REORDER_SOON').length})
              </button>

              <button
                onClick={() => { setTypeFilter('overstock'); setPriorityFilter('all'); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  typeFilter === 'overstock'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Overstock ({recommendations.filter(r => r.type === 'OVERSTOCK').length})
              </button>

              <button
                onClick={() => { setTypeFilter('supplier_risk'); setPriorityFilter('all'); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  typeFilter === 'supplier_risk'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                }`}
              >
                Supplier Risk ({recommendations.filter(r => r.type === 'SUPPLIER_RISK').length})
              </button>

              <button
                onClick={() => { setTypeFilter('price_opportunity'); setPriorityFilter('all'); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  typeFilter === 'price_opportunity'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Price Savings ({recommendations.filter(r => r.type === 'PRICE_OPPORTUNITY').length})
              </button>

              <button
                onClick={() => { setTypeFilter('demand_anomaly'); setPriorityFilter('all'); }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  typeFilter === 'demand_anomaly'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                Demand Spikes/Drops ({recommendations.filter(r => r.type === 'DEMAND_SPIKE' || r.type === 'DEMAND_DROP').length})
              </button>
            </div>
          </div>

          {/* Bulk Selection Bar if any selected */}
          {selectedRecIds.size > 0 && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3 text-xs font-bold text-teal-900">
                <span className="bg-[#0F766E] text-white px-2.5 py-0.5 rounded-full font-mono">
                  {selectedRecIds.size} Selected
                </span>
                <span>
                  Total Units: {selectedRecObjects.reduce((s, r) => s + (r.recommendedQuantity || 50), 0)} • 
                  Estimated Value: ৳{selectedRecObjects.reduce((s, r) => s + (r.estimatedCostBDT || 0), 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedRecIds(new Set())}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-teal-100 rounded-xl"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-4 py-1.5 bg-[#0F766E] hover:bg-[#0d645e] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Review & Generate Bulk POs
                </button>
              </div>
            </div>
          )}

          {/* Recommendation Table / Cards */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRecIds.size === filteredRecommendations.length && filteredRecommendations.length > 0}
                        onChange={handleSelectAllVisible}
                        className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                      />
                    </th>
                    <th className="py-3 px-3">Priority / Type</th>
                    <th className="py-3 px-3">Product Name & SKU</th>
                    <th className="py-3 px-3 text-center">Stock Position</th>
                    <th className="py-3 px-3 text-center">Run-Rate & Cover</th>
                    <th className="py-3 px-3 text-center">Recommended Qty</th>
                    <th className="py-3 px-3">Preferred Supplier</th>
                    <th className="py-3 px-3 text-right">Estimated Cost</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredRecommendations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm">No procurement recommendations match criteria</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try resetting search query or filters</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecommendations.map(rec => {
                      const isSelected = selectedRecIds.has(rec.id);
                      const isActioned = rec.status === 'actioned';
                      const isDismissed = rec.status === 'dismissed';

                      return (
                        <tr 
                          key={rec.id} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-teal-50/40' : ''
                          } ${isActioned ? 'opacity-70 bg-emerald-50/20' : ''} ${isDismissed ? 'opacity-50' : ''}`}
                        >
                          <td className="py-3 px-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isActioned || rec.type === 'NO_ACTION'}
                              onChange={() => handleToggleSelectRec(rec.id)}
                              className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                            />
                          </td>

                          {/* Priority & Type */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md inline-block ${
                                rec.priority === 'critical' ? 'bg-rose-100 text-rose-800' :
                                rec.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                                rec.priority === 'medium' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {rec.priority}
                              </span>
                              <div className="text-[11px] font-bold text-slate-900 leading-tight">
                                {rec.type.replace(/_/g, ' ')}
                              </div>
                            </div>
                          </td>

                          {/* Product Info */}
                          <td className="py-3 px-3 max-w-[200px]">
                            <div className="font-bold text-slate-900 text-xs truncate" title={rec.productName}>
                              {rec.productName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                              SKU: {rec.sku || 'N/A'} • {rec.category || 'General'}
                            </div>
                          </td>

                          {/* Stock Position */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-bold text-slate-900 font-mono text-xs">
                              {rec.currentStock}
                            </div>
                            <div className="text-[10px] text-teal-700 font-mono">
                              +{rec.inboundStock} inbound
                            </div>
                          </td>

                          {/* Run Rate & Days Cover */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-semibold text-slate-800 text-xs">
                              {rec.averageDailyDemand} /day
                            </div>
                            <div className={`text-[10px] font-bold mt-0.5 ${
                              rec.daysOfCover !== null && rec.daysOfCover <= 4 ? 'text-rose-600 font-bold' :
                              rec.daysOfCover !== null && rec.daysOfCover <= 10 ? 'text-amber-600' : 'text-emerald-700'
                            }`}>
                              {rec.daysOfCoverText}
                            </div>
                          </td>

                          {/* Recommended Quantity */}
                          <td className="py-3 px-3 text-center">
                            <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg ${
                              rec.recommendedQuantity > 0 ? 'bg-teal-100 text-teal-900' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {rec.recommendedQuantity} units
                            </span>
                          </td>

                          {/* Preferred Supplier */}
                          <td className="py-3 px-3 max-w-[170px]">
                            {rec.preferredSupplier ? (
                              <div>
                                <div className="font-bold text-slate-800 text-xs truncate" title={rec.preferredSupplier.supplierName}>
                                  {rec.preferredSupplier.supplierName}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span>Score: <strong className="text-emerald-700">{rec.preferredSupplier.score || 'unrated'}</strong></span>
                                  <span>• ৳{rec.preferredSupplier.unitPriceBDT || 0}/u</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                Manual Selection Required
                              </span>
                            )}
                          </td>

                          {/* Estimated Total Cost */}
                          <td className="py-3 px-3 text-right font-mono">
                            {rec.estimatedCostBDT !== null ? (
                              <div className="font-bold text-slate-900 text-xs">
                                ৳{rec.estimatedCostBDT.toLocaleString()}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">N/A</span>
                            )}
                            {rec.potentialSavingsBDT && (
                              <div className="text-[10px] font-bold text-emerald-600">
                                Save ~৳{rec.potentialSavingsBDT.toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-3 text-center">
                            {isActioned ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Ordered
                              </span>
                            ) : isDismissed ? (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                Dismissed
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedRecommendation(rec);
                                  setIsDrawerOpen(true);
                                }}
                                className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#0d645e] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1 mx-auto"
                              >
                                <span>Review</span>
                                <ChevronRight className="w-3.5 h-3.5" />
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

      {/* 6. Tab Content: Open PO Risks & Inbound Pipeline */}
      {activeTab === 'po_risks' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Active Inbound Purchase Orders & Vendor Risks</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time monitoring of open purchase orders to identify delayed shipments and vendor delivery discrepancies.
                </p>
              </div>
              <span className="text-xs font-bold bg-teal-100 text-teal-800 px-3 py-1 rounded-xl font-mono">
                {openPORisks.length} Active Orders
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openPORisks.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-500">
                  <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No active open purchase orders</p>
                </div>
              ) : (
                openPORisks.map(po => (
                  <div 
                    key={po.purchaseOrderId} 
                    className={`p-4 rounded-2xl border transition-all ${
                      po.riskSeverity === 'critical' ? 'bg-rose-50/50 border-rose-200' :
                      po.riskSeverity === 'high' ? 'bg-amber-50/50 border-amber-200' :
                      po.riskSeverity === 'medium' ? 'bg-teal-50/40 border-teal-200' : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            po.riskSeverity === 'critical' ? 'bg-rose-600 text-white' :
                            po.riskSeverity === 'high' ? 'bg-amber-600 text-white' :
                            po.riskSeverity === 'medium' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {po.riskType}
                          </span>
                          <span className="font-bold text-sm text-slate-900 font-mono">{po.poNumber}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {po.supplierName}
                        </p>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-slate-900">৳{po.totalAmountBDT.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{po.status.replace(/_/g, ' ')}</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                      <div>
                        <span>Ordered: <strong className="text-slate-900 font-mono">{po.totalOrderedQuantity}</strong></span> • 
                        <span className="ml-1">Received: <strong className="text-emerald-700 font-mono">{po.totalReceivedQuantity}</strong></span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        {po.expectedDeliveryDate ? `Exp: ${po.expectedDeliveryDate}` : 'No date specified'}
                      </div>
                    </div>

                    <div className="mt-2 text-xs font-medium text-slate-700 bg-white/70 p-2 rounded-xl border border-slate-200/40">
                      {po.riskReason}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab Content: Spend & Savings Analytics */}
      {activeTab === 'spend_analytics' && spendAnalytics && (
        <div className="space-y-6">
          
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Actual Realized Spend</div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">৳{spendAnalytics.totalSpendBDT.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">From completed & accepted goods receipts</div>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Committed Inbound Value</div>
              <div className="text-2xl font-black text-teal-700 font-mono mt-1">৳{spendAnalytics.openPOValueBDT.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">Active purchase orders awaiting delivery</div>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <div className="text-xs font-bold text-[#0F766E] uppercase">Identified Price Savings</div>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                ৳{spendAnalytics.savingsOpportunities.reduce((s, o) => s + o.estimatedPotentialSavingBDT, 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Potential savings across alternative verified suppliers</div>
            </div>
          </div>

          {/* Supplier Spend & Category Spend Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Spend by Supplier */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0F766E]" />
                Spend Concentration by Supplier
              </h3>

              <div className="space-y-3">
                {spendAnalytics.spendBySupplier.length === 0 ? (
                  <p className="text-xs text-slate-400">No supplier spend data recorded</p>
                ) : (
                  spendAnalytics.spendBySupplier.map(s => (
                    <div key={s.supplierId} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800">{s.supplierName} ({s.orderCount} POs)</span>
                        <span className="text-slate-900 font-mono">৳{s.spendBDT.toLocaleString()} ({s.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#0F766E] rounded-full" 
                          style={{ width: `${Math.min(100, s.percentage)}%` }} 
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Spend by Category */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0F766E]" />
                Spend Breakdown by Product Category
              </h3>

              <div className="space-y-3">
                {spendAnalytics.spendByCategory.length === 0 ? (
                  <p className="text-xs text-slate-400">No category spend data recorded</p>
                ) : (
                  spendAnalytics.spendByCategory.map(c => (
                    <div key={c.category} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800">{c.category} ({c.units} units)</span>
                        <span className="text-slate-900 font-mono">৳{c.spendBDT.toLocaleString()} ({c.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-600 rounded-full" 
                          style={{ width: `${Math.min(100, c.percentage)}%` }} 
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Price Savings Opportunities */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Verified Price Savings Opportunities (STEP 17.4 Intelligence)
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Current Supplier</th>
                    <th className="py-3 px-4">Alternative Supplier</th>
                    <th className="py-3 px-4 text-center">Unit Price Comparison</th>
                    <th className="py-3 px-4 text-right">Potential Saving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {spendAnalytics.savingsOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                        No price arbitrage opportunities detected across alternative suppliers.
                      </td>
                    </tr>
                  ) : (
                    spendAnalytics.savingsOpportunities.map((o, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{o.productName}</td>
                        <td className="py-3 px-4 text-slate-700">{o.currentSupplierName} (৳{o.currentPriceBDT})</td>
                        <td className="py-3 px-4 font-semibold text-emerald-800">{o.betterSupplierName} (৳{o.betterPriceBDT})</td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-[11px] font-bold">
                            -৳{o.unitSavingBDT}/unit
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono text-sm">
                          ৳{o.estimatedPotentialSavingBDT.toLocaleString()}
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

      {/* 8. Tab Content: Procurement Supply Timeline / Calendar */}
      {activeTab === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Procurement & Replenishment Supply Calendar</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological schedule of expected supplier shipments, forecasted stockout deadlines, and reorder trigger dates.
            </p>
          </div>

          <div className="space-y-4">
            {/* Immediate Stockout Risks */}
            {recommendations.filter(r => r.stockoutRisk === 'CRITICAL' || r.stockoutRisk === 'HIGH').map(r => (
              <div key={r.id} className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-600 text-white rounded-xl font-mono text-center min-w-[50px]">
                    <div className="text-[10px] uppercase font-bold">DEADLINE</div>
                    <div className="text-xs font-black">{r.projectedStockoutDate?.substring(5) || 'SOON'}</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{r.productName}</div>
                    <p className="text-xs text-rose-800 mt-0.5">
                      Projected stockout in {r.projectedStockoutDays} days. Recommended purchase: {r.recommendedQuantity} units.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedRecommendation(r);
                    setIsDrawerOpen(true);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0"
                >
                  Order Now
                </button>
              </div>
            ))}

            {/* Expected Inbound POs */}
            {openPORisks.map(po => (
              <div key={po.purchaseOrderId} className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0F766E] text-white rounded-xl font-mono text-center min-w-[50px]">
                    <div className="text-[10px] uppercase font-bold">DELIVERY</div>
                    <div className="text-xs font-black">{po.expectedDeliveryDate?.substring(5) || 'TBD'}</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">PO: {po.poNumber} ({po.supplierName})</div>
                    <p className="text-xs text-teal-800 mt-0.5">
                      {po.totalOrderedQuantity} units scheduled for warehouse receipt.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-[#0F766E]">
                  ৳{po.totalAmountBDT.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Tab Content: Audit Trail */}
      {activeTab === 'audit_trail' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Procurement Audit Trail & Decision Logs</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tamper-evident record of all purchase orders created from recommendations, admin approvals, and quantity overrides.
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                      No procurement audit log entries found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">{log.targetUserName || log.targetUserId || 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {log.performedByUserName || 'Staff'} ({log.performedByUserRole || 'Admin'})
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                        {log.details || 'Procurement transaction executed'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for Recommendation Details & What-If Simulator */}
      <ProcurementRecommendationDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRecommendation(null);
        }}
        recommendation={selectedRecommendation}
        currentUser={currentUser}
        settings={settings || {
          id: 'global',
          highValueApprovalThresholdBDT: 50000,
          defaultLeadTimeDays: 7,
          defaultSafetyStockDays: 7,
          overstockThresholdDays: 60,
          demandSpikeThresholdPercent: 30,
          demandDropThresholdPercent: -30,
          updatedAt: ''
        }}
        onActionCompleted={() => loadDashboardData(true)}
      />

      {/* Procurement Settings Modal */}
      {settings && (
        <ProcurementSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          currentUser={currentUser}
          onSaved={() => loadDashboardData(true)}
        />
      )}

      {/* Bulk Procurement Modal */}
      {settings && (
        <BulkProcurementModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          selectedRecommendations={selectedRecObjects}
          currentUser={currentUser}
          settings={settings}
          onSuccess={() => {
            setSelectedRecIds(new Set());
            loadDashboardData(true);
          }}
        />
      )}

    </div>
  );
};
