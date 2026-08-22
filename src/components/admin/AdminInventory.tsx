import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, InventoryTransaction } from '../../types';
import { Modal } from '../shared/Modal';
import { 
  Boxes, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  ArrowUpDown, 
  History, 
  Sliders, 
  TrendingDown, 
  DollarSign, 
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { products, inventoryTransactions, adjustStock, formatBDT, isProductsLoading } = useApp();

  // Tab State: 'overview' | 'audit_logs'
  const [activeView, setActiveView] = useState<'overview' | 'audit_logs'>('overview');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');
  
  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number | ''>(0);
  const [adjustReason, setAdjustReason] = useState('Stock Count Verification');
  const [adjustType, setAdjustType] = useState<'adjustment' | 'stock_in' | 'damage' | 'audit' | 'return' | 'sample'>('audit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Metrics
  const totalUnits = products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const totalCostValuation = products.reduce((sum, p) => sum + ((p.currentStock || 0) * (p.purchasePrice || 0)), 0);
  const totalWholesaleValuation = products.reduce((sum, p) => sum + ((p.currentStock || 0) * (p.wholesalePrice || 0)), 0);
  const lowStockCount = products.filter(p => p.stockStatus === 'low_stock').length;
  const outOfStockCount = products.filter(p => p.stockStatus === 'out_of_stock').length;

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const term = search.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term) ||
      (p.category && p.category.toLowerCase().includes(term));
    const matchesFilter = filterType === 'all' || p.stockStatus === filterType;
    return matchesSearch && matchesFilter;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = inventoryTransactions.filter(t => {
    const term = search.toLowerCase();
    return (
      t.productName.toLowerCase().includes(term) ||
      t.sku.toLowerCase().includes(term) ||
      t.reason.toLowerCase().includes(term) ||
      t.userName.toLowerCase().includes(term)
    );
  });

  const handleOpenAdjustModal = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustQuantity(0);
    setAdjustType('audit');
    setAdjustReason('Physical Inventory Count Verification');
    setFormError(null);
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    if (adjustQuantity === '' || Number(adjustQuantity) === 0) {
      setFormError('Adjustment quantity cannot be 0. Enter positive number to add stock, or negative to deduct.');
      return;
    }
    if (!adjustReason.trim()) {
      setFormError('Please enter a specific audit reason for this inventory change.');
      return;
    }

    setIsSubmitting(true);
    const res = await adjustStock(
      adjustingProduct.id,
      Number(adjustQuantity),
      adjustReason.trim(),
      adjustType
    );
    setIsSubmitting(false);

    if (res.success) {
      setAdjustingProduct(null);
    } else {
      setFormError(res.error || 'Failed to adjust stock in Firestore.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Warehouse & Stock Inventory</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Banani Central Distribution Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time physical stock counts, reorder alerts, and immutable Firestore audit logs for authorized stock movements.
          </p>
        </div>

        {/* View Switcher: Stock Status vs Audit History */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveView('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'overview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Stock Overview</span>
          </button>
          <button
            onClick={() => setActiveView('audit_logs')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'audit_logs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({inventoryTransactions.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Units on Hand</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalUnits.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">{products.length} SKU items in Firestore</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Inventory Valuation (Cost)</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{formatBDT(totalCostValuation)}</div>
          <span className="text-[11px] text-slate-500">Asset acquisition value</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Wholesale Value</span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{formatBDT(totalWholesaleValuation)}</div>
          <span className="text-[11px] text-slate-500">Potential trade revenue</span>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-600 block">Reorder / Out of Stock</span>
          <div className="text-xl font-extrabold text-amber-700 mt-1">{lowStockCount + outOfStockCount} SKUs</div>
          <span className="text-[11px] text-amber-700 font-medium">
            {lowStockCount} low • {outOfStockCount} out of stock
          </span>
        </div>
      </div>

      {/* Low Stock Urgent Warning Banner (if any) */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-xs">Low Stock Warning Alert</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              There are {lowStockCount} products at or below their safety threshold and {outOfStockCount} out of stock items in the warehouse. Reorder or adjust stock quantities to maintain smooth sales booking.
            </p>
          </div>
          <button
            onClick={() => {
              setActiveView('overview');
              setFilterType('low_stock');
            }}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Review Low Items
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeView === 'overview' ? "Search SKU, product name..." : "Search audit logs by SKU, reason..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
          />
        </div>

        {activeView === 'overview' && (
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'all' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              onClick={() => setFilterType('low_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'low_stock' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ⚠️ Low Stock ({lowStockCount})
            </button>
            <button
              onClick={() => setFilterType('out_of_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'out_of_stock' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ❌ Out of Stock ({outOfStockCount})
            </button>
            <button
              onClick={() => setFilterType('in_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'in_stock' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              In Stock ({products.length - lowStockCount - outOfStockCount})
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: INVENTORY STOCK OVERVIEW TABLE */}
      {activeView === 'overview' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-3.5 px-4">Item & Code</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3 text-right">Cost Price</th>
                  <th className="py-3.5 px-3 text-right">Wholesale Price</th>
                  <th className="py-3.5 px-3 text-center">Safety Threshold</th>
                  <th className="py-3.5 px-3 text-center">Current Stock</th>
                  <th className="py-3.5 px-3 text-right">Asset Valuation</th>
                  <th className="py-3.5 px-4 text-right">Authorized Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.lowStockThreshold && p.currentStock > 0;
                  const isOut = p.currentStock <= 0;
                  const itemValuation = (p.currentStock || 0) * (p.purchasePrice || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Item & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <span className="font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                            <span className="font-mono text-slate-500 text-[10px]">{p.sku}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700">{p.category}</span>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatBDT(p.purchasePrice)}
                      </td>

                      {/* Wholesale */}
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {formatBDT(p.wholesalePrice)}
                      </td>

                      {/* Threshold */}
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {p.lowStockThreshold} {p.unit}
                      </td>

                      {/* Stock Count */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-bold px-2.5 py-1 rounded-md text-xs inline-block ${
                          isOut 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : isLow 
                              ? 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse' 
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {p.currentStock} {p.unit}
                        </span>
                      </td>

                      {/* Asset Valuation */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatBDT(itemValuation)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenAdjustModal(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Adjust Stock</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: INVENTORY AUDIT LOG HISTORY TABLE */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              <span>Immutable Inventory Stock Movement Logs (Firestore: inventoryTransactions)</span>
            </div>
            <span className="text-xs text-slate-400">Total Entries: {inventoryTransactions.length}</span>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No inventory adjustment records found in Firestore.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-3">Product Name & SKU</th>
                    <th className="py-3.5 px-3">Movement Type</th>
                    <th className="py-3.5 px-3 text-center">Previous Stock</th>
                    <th className="py-3.5 px-3 text-center">Adjustment</th>
                    <th className="py-3.5 px-3 text-center">New Stock</th>
                    <th className="py-3.5 px-4">Reason / Notes</th>
                    <th className="py-3.5 px-4 text-right">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredAuditLogs.map((log) => {
                    const isPositive = log.adjustmentQuantity > 0;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>

                        {/* Product */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block line-clamp-1">{log.productName}</span>
                          <span className="font-mono text-[10px] text-slate-400">{log.sku}</span>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                            {log.type.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Previous Stock */}
                        <td className="py-3 px-3 text-center text-slate-500 font-bold">
                          {log.previousStock}
                        </td>

                        {/* Adjustment Quantity */}
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-0.5 ${
                            isPositive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{isPositive ? `+${log.adjustmentQuantity}` : log.adjustmentQuantity}</span>
                          </span>
                        </td>

                        {/* New Stock */}
                        <td className="py-3 px-3 text-center font-extrabold text-slate-900">
                          {log.newStock}
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {log.reason}
                        </td>

                        {/* User */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-slate-800 block text-[11px]">{log.userName}</span>
                          <span className="text-[10px] text-rose-600 font-semibold uppercase">{log.userRole}</span>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustingProduct(null)}
          title={`Authorized Stock Adjustment: ${adjustingProduct.sku}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveStockAdjustment} className="space-y-4 text-left">
            
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Product summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <img
                src={adjustingProduct.image}
                alt={adjustingProduct.name}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white"
              />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-xs text-slate-900 block truncate">{adjustingProduct.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">{adjustingProduct.sku}</span>
                <div className="mt-1 text-xs">
                  <span className="text-slate-500">Warehouse Count: </span>
                  <strong className="text-slate-900">{adjustingProduct.currentStock} {adjustingProduct.unit}</strong>
                </div>
              </div>
            </div>

            {/* Movement Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Classification
              </label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
              >
                <option value="audit">Physical Stock Count / Audit</option>
                <option value="stock_in">Direct Stock Inflow</option>
                <option value="damage">Damaged / Expired Write-off</option>
                <option value="return">Customer Return</option>
                <option value="sample">Marketing Sample / Tester</option>
                <option value="adjustment">Other Adjustment</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adjustment Quantity (+ to add, - to reduce)
              </label>
              <input
                type="number"
                placeholder="e.g. +10 or -5"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
              {adjustQuantity !== '' && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Resulting warehouse stock: <strong className="text-rose-600">{Math.max(0, adjustingProduct.currentStock + Number(adjustQuantity))} {adjustingProduct.unit}</strong>
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Audit Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Explanation of count discrepancy or stock change..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>Log Adjustment</span>
              </button>
            </div>

          </form>
        </Modal>
      )}

    </div>
  );
};
