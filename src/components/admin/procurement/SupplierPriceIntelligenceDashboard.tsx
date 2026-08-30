import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Supplier, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  GoodsReceipt, 
  GoodsReceiptItem, 
  Product,
  SupplierProductPriceStat,
  ProductSupplierBenchmark,
  SupplierPriceAlert
} from '../../../types';
import { 
  calculateSupplierPriceAnalytics 
} from '../../../services/supplierPerformanceService';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ProductSupplierComparisonModal } from './ProductSupplierComparisonModal';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Sparkles, 
  Package, 
  Layers, 
  ArrowUpDown, 
  CheckCircle2, 
  ShieldAlert, 
  Tag,
  Eye,
  Sliders
} from 'lucide-react';

export const SupplierPriceIntelligenceDashboard: React.FC = () => {
  const { products, formatBDT, addToast } = useApp();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [grnItems, setGrnItems] = useState<GoodsReceiptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [search, setSearch] = useState('');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'price' | 'change' | 'effectiveCost' | 'supplier'>('change');
  const [sortAsc, setSortAsc] = useState(false);

  // Product Benchmark Modal
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [selectedBenchmarkProductId, setSelectedBenchmarkProductId] = useState<string | undefined>(undefined);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [supSnap, poSnap, poItemsSnap, grnSnap, grnItemsSnap] = await Promise.all([
        getDocs(query(collection(db, 'suppliers'), orderBy('name', 'asc'))),
        getDocs(query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'purchase_order_items')),
        getDocs(query(collection(db, 'goods_receipts'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'goods_receipt_items'))
      ]);

      setSuppliers(supSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Supplier)));
      setPurchaseOrders(poSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrder)));
      setPoItems(poItemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrderItem)));
      setGoodsReceipts(grnSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as GoodsReceipt)));
      setGrnItems(grnItemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as GoodsReceiptItem)));
    } catch (err: any) {
      console.error('Failed to load price intelligence data:', err);
      addToast('Failed to load price intelligence records.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Full Price Analytics
  const priceAnalytics = useMemo(() => {
    return calculateSupplierPriceAnalytics(
      purchaseOrders,
      poItems,
      goodsReceipts,
      grnItems,
      products,
      suppliers
    );
  }, [purchaseOrders, poItems, goodsReceipts, grnItems, products, suppliers]);

  const { productStats, benchmarks, alerts, overallPriceMetrics } = priceAnalytics;

  // Filtered & Sorted Product Stats
  const filteredProductStats = useMemo(() => {
    return productStats.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(search.toLowerCase()) ||
                            item.sku.toLowerCase().includes(search.toLowerCase()) ||
                            item.supplierName.toLowerCase().includes(search.toLowerCase());

      const matchesTrend = trendFilter === 'all' || item.trend === trendFilter;
      const matchesSupplier = supplierFilter === 'all' || item.supplierId === supplierFilter;

      return matchesSearch && matchesTrend && matchesSupplier;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'name') {
        valA = a.productName.toLowerCase();
        valB = b.productName.toLowerCase();
      } else if (sortField === 'price') {
        valA = a.currentPriceBDT;
        valB = b.currentPriceBDT;
      } else if (sortField === 'change') {
        valA = a.priceChangePercent;
        valB = b.priceChangePercent;
      } else if (sortField === 'effectiveCost') {
        valA = a.effectiveUnitCostBDT;
        valB = b.effectiveUnitCostBDT;
      } else if (sortField === 'supplier') {
        valA = a.supplierName.toLowerCase();
        valB = b.supplierName.toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [productStats, search, trendFilter, supplierFilter, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleOpenBenchmarkForProduct = (productId: string) => {
    setSelectedBenchmarkProductId(productId);
    setBenchmarkModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Purchase Price & Market Intelligence
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              Procurement Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track SKU price inflation, multi-supplier variance, and defect-adjusted effective landed costs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedBenchmarkProductId(undefined);
              setBenchmarkModalOpen(true);
            }}
            disabled={benchmarks.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-xs transition-colors disabled:opacity-50"
          >
            <Layers className="w-4 h-4 text-[#0F766E]" />
            <span>Multi-Supplier Matrix</span>
          </button>

          <button
            onClick={loadData}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0d655e] text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Spend Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Purchase Spend</span>
            <DollarSign className="w-4 h-4 text-[#0F766E]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatBDT(overallPriceMetrics.totalProcurementSpend)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {productStats.length} catalog SKU purchases
          </div>
        </div>

        {/* 2. Price Inflation Index */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Average Price Shift</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-1">
            <span className={overallPriceMetrics.averagePriceChangePercent > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              {overallPriceMetrics.averagePriceChangePercent > 0 ? `+${overallPriceMetrics.averagePriceChangePercent}%` : `${overallPriceMetrics.averagePriceChangePercent}%`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-rose-600">{overallPriceMetrics.productsWithRisingPrices} Rising</span>
            <span>•</span>
            <span className="font-semibold text-emerald-600">{overallPriceMetrics.productsWithFallingPrices} Falling</span>
          </div>
        </div>

        {/* 3. Highest Price Hike */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Highest Price Hike</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          {overallPriceMetrics.highestPriceHike ? (
            <>
              <div className="text-2xl font-black text-rose-600 mt-2">
                +{overallPriceMetrics.highestPriceHike.percent}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {overallPriceMetrics.highestPriceHike.productName} ({overallPriceMetrics.highestPriceHike.supplierName})
              </div>
            </>
          ) : (
            <div className="text-sm font-semibold text-slate-400 mt-3">No hikes recorded</div>
          )}
        </div>

        {/* 4. Largest Supplier Price Spread */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Max Supplier Spread</span>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          {overallPriceMetrics.largestSupplierPriceSpread ? (
            <>
              <div className="text-2xl font-black text-teal-700 mt-2">
                {overallPriceMetrics.largestSupplierPriceSpread.percent}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {overallPriceMetrics.largestSupplierPriceSpread.productName} ({formatBDT(overallPriceMetrics.largestSupplierPriceSpread.spreadBDT)})
              </div>
            </>
          ) : (
            <div className="text-sm font-semibold text-slate-400 mt-3">No multi-source SKU</div>
          )}
        </div>
      </div>

      {/* Active Price Alerts Banner (if any) */}
      {alerts.length > 0 && (
        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Active Price & Risk Discrepancy Alerts ({alerts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.slice(0, 6).map(alert => (
              <div key={alert.id} className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 truncate">{alert.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm ${
                    alert.severity === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">{alert.message}</p>
                <div className="text-[10px] text-slate-400 pt-0.5">
                  Supplier: <strong className="text-slate-700">{alert.supplierName}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Intelligence Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, SKU, or supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0F766E]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Trend Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Trend:</span>
              <select
                value={trendFilter}
                onChange={e => setTrendFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Trends</option>
                <option value="up">Price Rising (Hikes)</option>
                <option value="down">Price Falling</option>
                <option value="stable">Stable Price</option>
              </select>
            </div>

            {/* Supplier Filter */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Supplier:</span>
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden max-w-[160px] truncate"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
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
                    <span>Product & SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('supplier')}
                >
                  <div className="flex items-center gap-1">
                    <span>Supplier</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Current Unit Price</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-right">Previous Price</th>
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                  onClick={() => handleSort('change')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Price Shift (%)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center">Historical Range</th>
                <th 
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => handleSort('effectiveCost')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Effective Cost (৳)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center">Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProductStats.length > 0 ? (
                filteredProductStats.map(stat => (
                  <tr key={`${stat.productId}_${stat.supplierId}`} className="hover:bg-slate-50/70 transition-colors">
                    {/* Product Name */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm">{stat.productName}</div>
                      <div className="text-[10px] text-slate-400">SKU: {stat.sku} • {stat.category}</div>
                    </td>

                    {/* Supplier */}
                    <td className="p-3.5 font-semibold text-slate-700">
                      {stat.supplierName}
                    </td>

                    {/* Current Price */}
                    <td className="p-3.5 text-right font-extrabold text-slate-900 text-sm">
                      {formatBDT(stat.currentPriceBDT)}
                    </td>

                    {/* Previous Price */}
                    <td className="p-3.5 text-right text-slate-500 font-medium">
                      {stat.previousPriceBDT !== null ? formatBDT(stat.previousPriceBDT) : '--'}
                    </td>

                    {/* Price Shift */}
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        stat.trend === 'up' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        stat.trend === 'down' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {stat.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                        {stat.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                        <span>{stat.priceChangePercent > 0 ? `+${stat.priceChangePercent}%` : `${stat.priceChangePercent}%`}</span>
                      </span>
                    </td>

                    {/* Range */}
                    <td className="p-3.5 text-center text-[11px] text-slate-600">
                      {formatBDT(stat.minHistoricalPriceBDT)} – {formatBDT(stat.maxHistoricalPriceBDT)}
                    </td>

                    {/* Effective Cost */}
                    <td className="p-3.5 text-right">
                      <div className="font-extrabold text-[#0F766E]">{formatBDT(stat.effectiveUnitCostBDT)}</div>
                      <span className="text-[9px] text-slate-400">incl. waste</span>
                    </td>

                    {/* Benchmark Action */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleOpenBenchmarkForProduct(stat.productId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-[#0F766E] rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Compare</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No purchase price history records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product-Level Supplier Comparison Modal */}
      {benchmarkModalOpen && (
        <ProductSupplierComparisonModal
          isOpen={benchmarkModalOpen}
          onClose={() => setBenchmarkModalOpen(false)}
          benchmarks={benchmarks}
          initialProductId={selectedBenchmarkProductId}
        />
      )}
    </div>
  );
};
