import React, { useState, useEffect } from 'react';
import { Modal } from '../../shared/Modal';
import { 
  SupplierPerformanceScore, 
  SupplierPerformanceSnapshot, 
  Supplier, 
  PurchaseOrder, 
  GoodsReceipt 
} from '../../../types';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { 
  createSupplierPerformanceSnapshot, 
  fetchSupplierSnapshots 
} from '../../../services/supplierPerformanceService';
import { 
  Award, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Clock, 
  DollarSign, 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  Camera, 
  History, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface SupplierScorecardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: SupplierPerformanceScore;
  supplier: Supplier;
  allPOs: PurchaseOrder[];
  allGRNs: GoodsReceipt[];
}

export const SupplierScorecardDetailModal: React.FC<SupplierScorecardDetailModalProps> = ({
  isOpen,
  onClose,
  score,
  supplier,
  allPOs,
  allGRNs
}) => {
  const { formatBDT, addToast } = useApp();
  const { currentUser } = useAuth();
  const [snapshots, setSnapshots] = useState<SupplierPerformanceSnapshot[]>([]);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'recommendations' | 'history'>('scorecard');

  useEffect(() => {
    if (isOpen && score.supplierId) {
      fetchSupplierSnapshots(score.supplierId).then(data => setSnapshots(data));
    }
  }, [isOpen, score.supplierId]);

  const handleTakeSnapshot = async () => {
    if (!currentUser) return;
    setIsTakingSnapshot(true);
    try {
      const res = await createSupplierPerformanceSnapshot({
        supplierId: score.supplierId,
        supplierName: score.supplierName,
        periodStart: score.periodStart || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        periodEnd: score.periodEnd || new Date().toISOString().split('T')[0],
        overallScore: score.overallScore,
        rating: score.rating,
        riskLevel: score.riskLevel,
        kpis: score.kpis,
        dataConfidence: score.dataConfidence
      }, currentUser as any);

      if (res.success) {
        addToast(`Performance snapshot recorded for ${score.supplierName}.`, 'success');
        const refreshed = await fetchSupplierSnapshots(score.supplierId);
        setSnapshots(refreshed);
      } else {
        addToast(res.error || 'Failed to record snapshot.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Error creating snapshot', 'error');
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const getTierColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Good': return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Average': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Poor': return 'bg-orange-50 text-orange-800 border-orange-200';
      default: return 'bg-rose-50 text-rose-800 border-rose-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Moderate': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${score.supplierName} — Executive Performance Scorecard`}
      subtitle={`Code: ${score.supplierCode || 'N/A'} • Confidence: ${score.dataConfidence} • Evaluated ${new Date(score.calculatedAt).toLocaleDateString()}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-[#0F766E]">
                {score.overallScore !== null ? score.overallScore : '--'}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase">/ 100</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getTierColor(score.rating)}`}>
                  {score.rating} (Tier {score.rating === 'Excellent' ? '1' : score.rating === 'Good' ? '2' : score.rating === 'Average' ? '3' : '4'})
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRiskColor(score.riskLevel)}`}>
                  {score.riskLevel} Risk
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Based on <span className="font-semibold text-slate-800">{score.totalEligiblePOs} Purchase Orders</span> and <span className="font-semibold text-slate-800">{score.totalGRNs} Goods Receipts</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTakeSnapshot}
              disabled={isTakingSnapshot}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>{isTakingSnapshot ? 'Recording...' : 'Capture Snapshot'}</span>
            </button>
          </div>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('scorecard')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'scorecard'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            KPI Breakdown & Weights
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'recommendations'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Action Recommendations</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded-full">
              {score.recommendations.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Historical Snapshots</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded-full">
              {snapshots.length}
            </span>
          </button>
        </div>

        {/* Tab 1: KPI Breakdown & Component Scores */}
        {activeTab === 'scorecard' && (
          <div className="space-y-6">
            {/* Component Progress Bars */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Weighted Component Performance
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Dynamic weight normalization applied
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* 1. Delivery */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-700">Delivery Performance (OTIF)</span>
                    <span className="text-slate-900 font-bold">
                      {score.componentScores.deliveryScore !== null ? `${score.componentScores.deliveryScore}%` : 'N/A'}
                      <span className="text-slate-400 text-[10px] font-normal ml-1">
                        (Weight: {score.normalizedWeights.delivery || 30}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${score.componentScores.deliveryScore || 0}%` }}
                    />
                  </div>
                </div>

                {/* 2. Quantity */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-700">Quantity Accuracy (Fill Rate)</span>
                    <span className="text-slate-900 font-bold">
                      {score.componentScores.quantityScore !== null ? `${score.componentScores.quantityScore}%` : 'N/A'}
                      <span className="text-slate-400 text-[10px] font-normal ml-1">
                        (Weight: {score.normalizedWeights.quantity || 20}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${score.componentScores.quantityScore || 0}%` }}
                    />
                  </div>
                </div>

                {/* 3. Quality */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-700">Quality & Defect Acceptance</span>
                    <span className="text-slate-900 font-bold">
                      {score.componentScores.qualityScore !== null ? `${score.componentScores.qualityScore}%` : 'N/A'}
                      <span className="text-slate-400 text-[10px] font-normal ml-1">
                        (Weight: {score.normalizedWeights.quality || 20}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${score.componentScores.qualityScore || 0}%` }}
                    />
                  </div>
                </div>

                {/* 4. Price */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-700">Price Stability & Competitiveness</span>
                    <span className="text-slate-900 font-bold">
                      {score.componentScores.priceScore !== null ? `${score.componentScores.priceScore}%` : 'N/A'}
                      <span className="text-slate-400 text-[10px] font-normal ml-1">
                        (Weight: {score.normalizedWeights.price || 15}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${score.componentScores.priceScore || 0}%` }}
                    />
                  </div>
                </div>

                {/* 5. Responsiveness */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-700">Operational Responsiveness</span>
                    <span className="text-slate-900 font-bold">
                      {score.componentScores.responsivenessScore !== null ? `${score.componentScores.responsivenessScore}%` : 'N/A'}
                      <span className="text-slate-400 text-[10px] font-normal ml-1">
                        (Weight: {score.normalizedWeights.responsiveness || 10}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-sky-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${score.componentScores.responsivenessScore || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">OTIF Rate</span>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {score.kpis.otifRate !== null ? `${score.kpis.otifRate}%` : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-500">On-Time In-Full</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Quality Acceptance</span>
                <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                  {score.kpis.qualityAcceptanceRate !== null ? `${score.kpis.qualityAcceptanceRate}%` : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-500">Passed inspection</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Damage Loss</span>
                <div className="text-base font-extrabold text-rose-700 mt-0.5">
                  {formatBDT(score.kpis.totalDamagedLossBDT)}
                </div>
                <span className="text-[10px] text-slate-500">{score.kpis.totalDamagedUnits} units damaged</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Avg Lead Time</span>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {score.kpis.averageLeadTimeDays !== null ? `${score.kpis.averageLeadTimeDays}d` : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-500">PO to GRN post</span>
              </div>
            </div>

            {/* Risk Assessment Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Risk Engine Diagnostic Summary
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {score.riskFactors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Action Recommendations */}
        {activeTab === 'recommendations' && (
          <div className="space-y-3">
            {score.recommendations.map(rec => (
              <div key={rec.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      rec.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                      rec.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      rec.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-teal-100 text-teal-800'
                    }`}>
                      {rec.severity} Priority
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">{rec.title}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 capitalize">{rec.category}</span>
                </div>

                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Finding: </span>
                  {rec.reason}
                </p>

                <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-[#0F766E]">Recommendation: </span>
                  {rec.recommendation}
                </p>

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                  <span>Evidence: <strong className="text-slate-700">{rec.evidenceMetric}</strong></span>
                  <span className="text-[#0F766E] font-bold">Suggested Action: {rec.suggestedAction}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Historical Snapshots */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {snapshots.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <th className="p-3">Snapshot Date</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Risk</th>
                      <th className="p-3">OTIF</th>
                      <th className="p-3">Damage %</th>
                      <th className="p-3">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {snapshots.map(snap => (
                      <tr key={snap.id}>
                        <td className="p-3 font-semibold text-slate-900">
                          {new Date(snap.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-extrabold text-slate-900">
                          {snap.overallScore !== null ? `${snap.overallScore}/100` : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTierColor(snap.rating)}`}>
                            {snap.rating}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRiskColor(snap.riskLevel)}`}>
                            {snap.riskLevel}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {snap.kpis.otifRate !== null ? `${snap.kpis.otifRate}%` : 'N/A'}
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {snap.kpis.damageRate !== null ? `${snap.kpis.damageRate}%` : '0%'}
                        </td>
                        <td className="p-3 text-slate-500">
                          {snap.createdByUserName || 'Admin'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No historical performance snapshots recorded yet for this supplier. Click "Capture Snapshot" to save the current scorecard state.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-200">
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
