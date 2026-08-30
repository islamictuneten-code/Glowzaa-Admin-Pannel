import React, { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { Supplier, SupplierPerformanceScore } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { 
  Users, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Truck, 
  Clock, 
  DollarSign, 
  Percent,
  XCircle,
  Sparkles
} from 'lucide-react';

interface SupplierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  allScores: SupplierPerformanceScore[];
  allSuppliers: Supplier[];
}

export const SupplierComparisonModal: React.FC<SupplierComparisonModalProps> = ({
  isOpen,
  onClose,
  allScores,
  allSuppliers
}) => {
  const { formatBDT } = useApp();
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(
    allScores.slice(0, 3).map(s => s.supplierId)
  );

  const toggleSupplier = (supId: string) => {
    if (selectedSupplierIds.includes(supId)) {
      if (selectedSupplierIds.length > 2) {
        setSelectedSupplierIds(selectedSupplierIds.filter(id => id !== supId));
      }
    } else {
      if (selectedSupplierIds.length < 5) {
        setSelectedSupplierIds([...selectedSupplierIds, supId]);
      }
    }
  };

  const comparedScores = allScores.filter(s => selectedSupplierIds.includes(s.supplierId));

  // Determine top performers in each metric
  const bestScore = Math.max(...comparedScores.map(s => s.overallScore || 0));
  const bestOtif = Math.max(...comparedScores.map(s => s.kpis.otifRate || 0));
  const bestQuality = Math.max(...comparedScores.map(s => s.kpis.qualityAcceptanceRate || 0));
  const lowestDamage = Math.min(...comparedScores.map(s => s.kpis.damageRate ?? 100));
  const lowestLeadTime = Math.min(...comparedScores.map(s => s.kpis.averageLeadTimeDays ?? 999));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-Supplier Performance Benchmarking Matrix"
      subtitle="Compare up to 5 suppliers side-by-side on fulfillment reliability, quality, lead times, and spend."
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Supplier Picker Chips */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Select 2 to 5 Suppliers to Benchmark ({selectedSupplierIds.length}/5 Selected)
          </label>
          <div className="flex flex-wrap gap-2">
            {allScores.map(score => {
              const isSelected = selectedSupplierIds.includes(score.supplierId);
              return (
                <button
                  key={score.supplierId}
                  type="button"
                  onClick={() => toggleSupplier(score.supplierId)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{score.supplierName}</span>
                  {score.overallScore !== null && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-teal-900/40 text-teal-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {score.overallScore}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-44">
                  Evaluation Metric
                </th>
                {comparedScores.map(score => (
                  <th key={score.supplierId} className="p-3.5 font-bold text-slate-900 min-w-44 text-center border-l border-slate-200">
                    <div className="text-sm font-extrabold text-slate-900">{score.supplierName}</div>
                    <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                      {score.supplierCode || 'Supplier'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Overall Score */}
              <tr className="bg-teal-50/20">
                <td className="p-3.5 font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Overall Score</span>
                  </div>
                </td>
                {comparedScores.map(s => {
                  const isTop = (s.overallScore || 0) === bestScore && bestScore > 0;
                  return (
                    <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`text-base font-extrabold ${
                          (s.overallScore || 0) >= 80 ? 'text-emerald-700' :
                          (s.overallScore || 0) >= 60 ? 'text-teal-700' : 'text-rose-700'
                        }`}>
                          {s.overallScore !== null ? `${s.overallScore}/100` : 'Unrated'}
                        </span>
                        {isTop && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                            Top
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Performance Tier */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">Tier Classification</td>
                {comparedScores.map(s => (
                  <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      s.rating === 'Excellent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      s.rating === 'Good' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                      s.rating === 'Average' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {s.rating}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Risk Level */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                    <span>Risk Level</span>
                  </div>
                </td>
                {comparedScores.map(s => (
                  <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      s.riskLevel === 'Low' ? 'bg-emerald-50 text-emerald-700' :
                      s.riskLevel === 'Moderate' ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {s.riskLevel} Risk
                    </span>
                  </td>
                ))}
              </tr>

              {/* On-Time In-Full (OTIF) */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>OTIF Rate (%)</span>
                  </div>
                </td>
                {comparedScores.map(s => {
                  const val = s.kpis.otifRate;
                  const isTop = val === bestOtif && bestOtif > 0;
                  return (
                    <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200 font-bold">
                      <span className={val && val >= 80 ? 'text-emerald-700' : 'text-slate-800'}>
                        {val !== null ? `${val}%` : 'N/A'}
                      </span>
                      {isTop && <span className="ml-1 text-[10px] text-emerald-600 font-bold">★</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Fill Rate */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">Quantity Fill Rate (%)</td>
                {comparedScores.map(s => (
                  <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200 font-bold text-slate-800">
                    {s.kpis.fillRate !== null ? `${s.kpis.fillRate}%` : 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Quality Acceptance */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Quality Acceptance (%)</span>
                  </div>
                </td>
                {comparedScores.map(s => {
                  const val = s.kpis.qualityAcceptanceRate;
                  const isTop = val === bestQuality && bestQuality > 0;
                  return (
                    <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200 font-bold">
                      <span className={val && val >= 95 ? 'text-emerald-700' : 'text-slate-800'}>
                        {val !== null ? `${val}%` : 'N/A'}
                      </span>
                      {isTop && <span className="ml-1 text-[10px] text-emerald-600 font-bold">★</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Damage Rate */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">Damage / Defect Rate (%)</td>
                {comparedScores.map(s => {
                  const val = s.kpis.damageRate;
                  const isTop = val === lowestDamage && val !== null;
                  return (
                    <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200 font-bold">
                      <span className={val && val > 3 ? 'text-rose-700' : 'text-emerald-700'}>
                        {val !== null ? `${val}%` : '0%'}
                      </span>
                      {isTop && <span className="ml-1 text-[10px] text-emerald-600 font-bold">★</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Average Lead Time */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Average Lead Time</span>
                  </div>
                </td>
                {comparedScores.map(s => {
                  const val = s.kpis.averageLeadTimeDays;
                  const isTop = val === lowestLeadTime && val !== null;
                  return (
                    <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200 font-semibold text-slate-800">
                      {val !== null ? `${val} Days` : 'N/A'}
                      {isTop && <span className="ml-1 text-[10px] text-emerald-600 font-bold">★</span>}
                    </td>
                  );
                })}
              </tr>

              {/* Total Spend Volume */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cumulative Spend (৳)</span>
                  </div>
                </td>
                {comparedScores.map(s => (
                  <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200 font-extrabold text-slate-900">
                    {formatBDT(s.kpis.totalSpendBDT)}
                  </td>
                ))}
              </tr>

              {/* Order Count & GRNs */}
              <tr>
                <td className="p-3.5 font-semibold text-slate-700">Orders / GRNs Posted</td>
                {comparedScores.map(s => (
                  <td key={s.supplierId} className="p-3.5 text-center border-l border-slate-200 text-slate-600">
                    {s.kpis.totalPurchaseOrders} POs / {s.kpis.totalGoodsReceipts} GRNs
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Best In Class Callout */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block text-xs">Procurement Optimization Insight</span>
            <p>
              When evaluating supplier allocation, suppliers with Tier 1 status and low defect rates (<span className="font-semibold text-emerald-700">&lt;2%</span>) represent the highest gross margin protection despite minor unit purchase price differences.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0d655e] rounded-xl shadow-xs transition-colors"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </Modal>
  );
};
