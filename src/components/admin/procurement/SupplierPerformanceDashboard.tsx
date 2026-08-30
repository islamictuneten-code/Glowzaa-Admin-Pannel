import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { 
  Supplier, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  GoodsReceipt, 
  GoodsReceiptItem, 
  SupplierPerformanceScore, 
  SupplierScorecardSettings,
  SupplierProductPriceStat
} from '../../../types';
import { 
  getScorecardSettings, 
  getSupplierPerformanceSummary, 
  compareSuppliers,
  DEFAULT_SCORECARD_SETTINGS 
} from '../../../services/supplierPerformanceService';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ScorecardSettingsModal } from './ScorecardSettingsModal';
import { SupplierComparisonModal } from './SupplierComparisonModal';
import { SupplierScorecardDetailModal } from './SupplierScorecardDetailModal';
import { 
  Award, 
  ShieldAlert, 
  Truck, 
  Boxes, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Sliders, 
  Users, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Layers,
  FileSpreadsheet,
  ArrowUpDown,
  Filter,
  Eye
} from 'lucide-react';

export const SupplierPerformanceDashboard: React.FC = () => {
  const { products, formatBDT, addToast } = useApp();
  const { currentUser } = useAuth();

  // Core Data States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [grnItems, setGrnItems] = useState<GoodsReceiptItem[]>([]);
  const [settings, setSettings] = useState<SupplierScorecardSettings>(DEFAULT_SCORECARD_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [datePeriod, setDatePeriod] = useState<'30' | '90' | '180' | '365' | 'all'>('all');
  const [sortField, setSortField] = useState<'score' | 'otif' | 'quality' | 'spend' | 'name'>('score');
  const [sortAsc, setSortAsc] = useState(false);

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedScoreForDetail, setSelectedScoreForDetail] = useState<SupplierPerformanceScore | null>(null);

  // Fetch all procurement data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [supSnap, poSnap, poItemsSnap, grnSnap, grnItemsSnap, loadedSettings] = await Promise.all([
        getDocs(query(collection(db, 'suppliers'), orderBy('name', 'asc'))),
        getDocs(query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'purchase_order_items')),
        getDocs(query(collection(db, 'goods_receipts'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'goods_receipt_items')),
        getScorecardSettings()
      ]);

      setSuppliers(supSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Supplier)));
      setPurchaseOrders(poSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrder)));
      setPoItems(poItemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrderItem)));
      setGoodsReceipts(grnSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as GoodsReceipt)));
      setGrnItems(grnItemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as GoodsReceiptItem)));
      setSettings(loadedSettings);
    } catch (err: any) {
      console.error('Failed to load supplier performance data:', err);
      addToast('Failed to load performance analytics data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute date filter boundary
  const dateRange = useMemo(() => {
    if (datePeriod === 'all') return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const days = parseInt(datePeriod, 10);
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }, [datePeriod]);

  // Compute Scorecard for all active suppliers
  const supplierScores = useMemo(() => {
    return suppliers.map(sup => {
      return getSupplierPerformanceSummary(
        sup,
        purchaseOrders,
        poItems,
        goodsReceipts,
        grnItems,
        products,
        settings,
        dateRange.startDate,
        dateRange.endDate
      );
    });
  }, [suppliers, purchaseOrders, poItems, goodsReceipts, grnItems, products, settings, dateRange]);

  // Top Summary Metrics
  const summaryMetrics = useMemo(() => {
    const ratedScores = supplierScores.filter(s => s.overallScore !== null);
    const totalRated = ratedScores.length;
    const avgScore = totalRated > 0 
      ? Math.round((ratedScores.reduce((sum, s) => sum + (s.overallScore || 0), 0) / totalRated) * 10) / 10 
      : null;

    const totalSpend = supplierScores.reduce((sum, s) => sum + s.kpis.totalSpendBDT, 0);
    const totalDamagedLoss = supplierScores.reduce((sum, s) => sum + s.kpis.totalDamagedLossBDT, 0);

    const validOtifScores = supplierScores.filter(s => s.kpis.otifRate !== null);
    const avgOtif = validOtifScores.length > 0
      ? Math.round((validOtifScores.reduce((sum, s) => sum + (s.kpis.otifRate || 0), 0) / validOtifScores.length) * 10) / 10
      : null;

    const validQualityScores = supplierScores.filter(s => s.kpis.qualityAcceptanceRate !== null);
    const avgQuality = validQualityScores.length > 0
      ? Math.round((validQualityScores.reduce((sum, s) => sum + (s.kpis.qualityAcceptanceRate || 0), 0) / validQualityScores.length) * 10) / 10
      : null;

    const atRiskCount = supplierScores.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Severe').length;
    const tier1Count = supplierScores.filter(s => s.rating === 'Excellent').length;

    return {
      totalSuppliers: suppliers.length,
      totalRated,
      avgScore,
      avgOtif,
      avgQuality,
      totalSpend,
      totalDamagedLoss,
      atRiskCount,
      tier1Count
    };
  }, [supplierScores, suppliers.length]);

  // Filtered & Sorted Supplier Scores Table
  const filteredScores = useMemo(() => {
    return supplierScores.filter(score => {
      const matchesSearch = score.supplierName.toLowerCase().includes(search.toLowerCase()) ||
                            (score.supplierCode && score.supplierCode.toLowerCase().includes(search.toLowerCase()));

      const matchesTier = tierFilter === 'all' || score.rating.toLowerCase() === tierFilter.toLowerCase();
      const matchesRisk = riskFilter === 'all' || score.riskLevel.toLowerCase() === riskFilter.toLowerCase();

      return matchesSearch && matchesTier && matchesRisk;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'score') {
        valA = a.overallScore ?? -1;
        valB = b.overallScore ?? -1;
      } else if (sortField === 'otif') {
        valA = a.kpis.otifRate ?? -1;
        valB = b.kpis.otifRate ?? -1;
      } else if (sortField === 'quality') {
        valA = a.kpis.qualityAcceptanceRate ?? -1;
        valB = b.kpis.qualityAcceptanceRate ?? -1;
      } else if (sortField === 'spend') {
        valA = a.kpis.totalSpendBDT;
        valB = b.kpis.totalSpendBDT;
      } else if (sortField === 'name') {
        valA = a.supplierName.toLowerCase();
        valB = b.supplierName.toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [supplierScores, search, tierFilter, riskFilter, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getTierBadgeClass = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Good': return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Average': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Poor': return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Critical': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-emerald-50 text-emerald-700';
      case 'Moderate': return 'bg-amber-50 text-amber-700';
      case 'High': return 'bg-orange-50 text-orange-700';
      case 'Severe': return 'bg-rose-50 text-rose-700 font-bold';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Supplier Performance Scorecards
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              Executive Evaluation
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data-driven evaluation of supplier fulfillment reliability, defect rates, and vendor risk.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsCompareModalOpen(true)}
            disabled={suppliers.length < 2}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-xs transition-colors disabled:opacity-50"
          >
            <Users className="w-4 h-4 text-[#0F766E]" />
            <span>Benchmark Matrix</span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-xs transition-colors"
          >
            <Sliders className="w-4 h-4 text-[#0F766E]" />
            <span>Weights & Thresholds</span>
          </button>

          <button
            onClick={loadData}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Avg Performance Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Avg Supplier Score</span>
            <Award className="w-4 h-4 text-[#0F766E]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summaryMetrics.avgScore !== null ? `${summaryMetrics.avgScore}/100` : '--'}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-emerald-600">{summaryMetrics.tier1Count} Tier 1</span>
            <span>•</span>
            <span className="font-semibold text-rose-600">{summaryMetrics.atRiskCount} At Risk</span>
          </div>
        </div>

        {/* 2. OTIF Reliability */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">On-Time In-Full (OTIF)</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summaryMetrics.avgOtif !== null ? `${summaryMetrics.avgOtif}%` : '--'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Target benchmark: <span className="font-semibold text-slate-700">&gt;{settings.thresholds.minOtifRate}%</span>
          </div>
        </div>

        {/* 3. Quality & Damage Loss */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Quality Acceptance</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summaryMetrics.avgQuality !== null ? `${summaryMetrics.avgQuality}%` : '--'}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">
            {formatBDT(summaryMetrics.totalDamagedLoss)} defect loss
          </div>
        </div>

        {/* 4. Total Procurement Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Procurement Spend</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatBDT(summaryMetrics.totalSpend)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {summaryMetrics.totalSuppliers} active vendors
          </div>
        </div>
      </div>

      {/* Main Scorecard Table & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search supplier name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={datePeriod}
                onChange={e => setDatePeriod(e.target.value as any)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All-Time History</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="180">Last 180 Days</option>
                <option value="365">Last 1 Year</option>
              </select>
            </div>

            {/* Tier Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tier:</span>
              <select
                value={tierFilter}
                onChange={e => setTierFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Tiers</option>
                <option value="excellent">Tier 1 (Preferred)</option>
                <option value="good">Tier 2 (Reliable)</option>
                <option value="average">Tier 3 (Conditional)</option>
                <option value="poor">Tier 4 (High Risk)</option>
                <option value="unrated">Unrated</option>
              </select>
            </div>

            {/* Risk Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Risk:</span>
              <select
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
                <option value="severe">Severe Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Supplier Information</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Overall Score</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center">Tier & Rating</th>
                <th className="p-3.5 text-center">Risk Level</th>
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                  onClick={() => handleSort('otif')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>OTIF Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                  onClick={() => handleSort('quality')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Quality Acceptance</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center">Damage Rate</th>
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Spend</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredScores.length > 0 ? (
                filteredScores.map(score => {
                  const matchingSupplier = suppliers.find(s => s.id === score.supplierId) || ({} as Supplier);
                  return (
                    <tr key={score.supplierId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Code */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-sm">{score.supplierName}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{score.supplierCode || 'Vendor'}</span>
                          <span>•</span>
                          <span>{score.totalEligiblePOs} POs</span>
                          <span>•</span>
                          <span>{score.totalGRNs} GRNs</span>
                        </div>
                      </td>

                      {/* Overall Score */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 font-extrabold text-sm text-slate-900">
                          <span className={
                            (score.overallScore || 0) >= 80 ? 'text-emerald-700' :
                            (score.overallScore || 0) >= 60 ? 'text-teal-700' : 'text-rose-700'
                          }>
                            {score.overallScore !== null ? `${score.overallScore}/100` : 'Unrated'}
                          </span>
                          {score.trend === 'improving' && <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
                          {score.trend === 'declining' && <TrendingDown className="w-3.5 h-3.5 text-rose-600" />}
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getTierBadgeClass(score.rating)}`}>
                          {score.rating}
                        </span>
                      </td>

                      {/* Risk */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getRiskBadgeClass(score.riskLevel)}`}>
                          {score.riskLevel}
                        </span>
                      </td>

                      {/* OTIF */}
                      <td className="p-3.5 text-center font-bold">
                        <span className={score.kpis.otifRate && score.kpis.otifRate >= 80 ? 'text-emerald-700' : 'text-slate-800'}>
                          {score.kpis.otifRate !== null ? `${score.kpis.otifRate}%` : 'N/A'}
                        </span>
                      </td>

                      {/* Quality Acceptance */}
                      <td className="p-3.5 text-center font-bold">
                        <span className={score.kpis.qualityAcceptanceRate && score.kpis.qualityAcceptanceRate >= 95 ? 'text-emerald-700' : 'text-slate-800'}>
                          {score.kpis.qualityAcceptanceRate !== null ? `${score.kpis.qualityAcceptanceRate}%` : 'N/A'}
                        </span>
                      </td>

                      {/* Damage % */}
                      <td className="p-3.5 text-center font-semibold">
                        <span className={score.kpis.damageRate && score.kpis.damageRate > 3 ? 'text-rose-700' : 'text-slate-700'}>
                          {score.kpis.damageRate !== null ? `${score.kpis.damageRate}%` : '0%'}
                        </span>
                      </td>

                      {/* Spend */}
                      <td className="p-3.5 text-right font-extrabold text-slate-900">
                        {formatBDT(score.kpis.totalSpendBDT)}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedScoreForDetail(score)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Scorecard</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    No suppliers match the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings Modal */}
      <ScorecardSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentSettings={settings}
        onSettingsSaved={newSettings => setSettings(newSettings)}
      />

      {/* Supplier Comparison Modal */}
      <SupplierComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        allScores={supplierScores}
        allSuppliers={suppliers}
      />

      {/* Single Supplier Detail Modal */}
      {selectedScoreForDetail && (
        <SupplierScorecardDetailModal
          isOpen={!!selectedScoreForDetail}
          onClose={() => setSelectedScoreForDetail(null)}
          score={selectedScoreForDetail}
          supplier={suppliers.find(s => s.id === selectedScoreForDetail.supplierId) || ({} as Supplier)}
          allPOs={purchaseOrders}
          allGRNs={goodsReceipts}
        />
      )}
    </div>
  );
};
