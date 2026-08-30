import React, { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { ProductSupplierBenchmark, Product } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { 
  Package, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ProductSupplierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  benchmarks: ProductSupplierBenchmark[];
  initialProductId?: string;
}

export const ProductSupplierComparisonModal: React.FC<ProductSupplierComparisonModalProps> = ({
  isOpen,
  onClose,
  benchmarks,
  initialProductId
}) => {
  const { formatBDT } = useApp();
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || benchmarks[0]?.productId || ''
  );

  const currentBenchmark = benchmarks.find(b => b.productId === selectedProductId) || benchmarks[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product-Level Supplier Benchmarking & Effective Cost"
      subtitle="Analyze supplier pricing, waste damage impact, and reliability for specific inventory items."
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Product Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Select Product to Benchmark:
          </label>
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(e.target.value)}
            className="w-full sm:w-96 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden"
          >
            {benchmarks.map(b => (
              <option key={b.productId} value={b.productId}>
                {b.productName} ({b.sku}) - {b.supplierCount} Suppliers
              </option>
            ))}
          </select>
        </div>

        {currentBenchmark ? (
          <div className="space-y-6">
            {/* Top KPI row for selected product */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Min Unit Price</span>
                <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                  {formatBDT(currentBenchmark.minPriceBDT)}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Max Unit Price</span>
                <div className="text-base font-extrabold text-rose-700 mt-0.5">
                  {formatBDT(currentBenchmark.maxPriceBDT)}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Market Spread</span>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {formatBDT(currentBenchmark.priceSpreadBDT)} ({currentBenchmark.priceSpreadPercent}%)
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Best Value Supplier</span>
                <div className="text-xs font-extrabold text-emerald-900 mt-0.5 truncate">
                  {currentBenchmark.bestValueSupplierName}
                </div>
              </div>
            </div>

            {/* Supplier Breakdown Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Suppliers for {currentBenchmark.productName}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {currentBenchmark.suppliers.length} active suppliers recorded
                </span>
              </div>

              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 bg-white">
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Latest PO Price</th>
                    <th className="p-3">Effective Landed Cost</th>
                    <th className="p-3">Fulfillment (OTIF)</th>
                    <th className="p-3">Defect / Damage</th>
                    <th className="p-3">Score & Rating</th>
                    <th className="p-3 text-right">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {currentBenchmark.suppliers.map(sup => {
                    const isBestValue = sup.supplierId === currentBenchmark.bestValueSupplierId;
                    return (
                      <tr key={sup.supplierId} className={isBestValue ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{sup.supplierName}</div>
                          <div className="text-[10px] text-slate-400">
                            Last purchase: {new Date(sup.lastPurchasedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {formatBDT(sup.latestPriceBDT)}
                        </td>
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900">{formatBDT(sup.effectiveCostBDT)}</div>
                          <span className="text-[10px] text-slate-400">incl. waste rate</span>
                        </td>
                        <td className="p-3">
                          <span className={`font-semibold ${
                            sup.otifRate && sup.otifRate >= 80 ? 'text-emerald-700' : 'text-slate-700'
                          }`}>
                            {sup.otifRate !== null ? `${sup.otifRate}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-semibold ${
                            sup.damageRate && sup.damageRate > 3 ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {sup.damageRate !== null ? `${sup.damageRate}%` : '0%'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900">
                              {sup.overallScore !== null ? sup.overallScore : 'N/A'}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                              sup.rating === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                              sup.rating === 'Good' ? 'bg-teal-100 text-teal-800' :
                              sup.rating === 'Average' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {sup.rating}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {isBestValue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <Sparkles className="w-3 h-3" /> Best Value
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Secondary Source
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Effective Cost Insight Note */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block text-xs">How Effective Landed Cost is Calculated:</span>
              <p>
                Effective Landed Cost reflects the true unit cost after absorbing transit defects: <br />
                <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded-md border border-slate-200 mt-1 inline-block text-slate-800">
                  Effective Cost = Unit Price × (1 + Defect Waste Ratio)
                </code>
              </p>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            No product benchmarks recorded yet. Create and receive Purchase Orders to populate benchmark metrics.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0d655e] rounded-xl shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
