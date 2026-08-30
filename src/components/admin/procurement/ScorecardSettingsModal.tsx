import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { Modal } from '../../shared/Modal';
import { 
  SupplierScorecardSettings, 
  SupplierScorecardWeights, 
  SupplierScorecardThresholds, 
  SupplierRatingBands 
} from '../../../types';
import { 
  DEFAULT_SCORECARD_WEIGHTS, 
  DEFAULT_SCORECARD_THRESHOLDS, 
  DEFAULT_RATING_BANDS,
  saveScorecardSettings 
} from '../../../services/supplierPerformanceService';
import { Settings, Sliders, ShieldAlert, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

interface ScorecardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: SupplierScorecardSettings;
  onSettingsSaved: (newSettings: SupplierScorecardSettings) => void;
}

export const ScorecardSettingsModal: React.FC<ScorecardSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSettingsSaved
}) => {
  const { currentUser } = useAuth();
  const { addToast } = useApp();

  const [weights, setWeights] = useState<SupplierScorecardWeights>(currentSettings.weights || DEFAULT_SCORECARD_WEIGHTS);
  const [thresholds, setThresholds] = useState<SupplierScorecardThresholds>(currentSettings.thresholds || DEFAULT_SCORECARD_THRESHOLDS);
  const [ratingBands, setRatingBands] = useState<SupplierRatingBands>(currentSettings.ratingBands || DEFAULT_RATING_BANDS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWeights(currentSettings.weights || DEFAULT_SCORECARD_WEIGHTS);
      setThresholds(currentSettings.thresholds || DEFAULT_SCORECARD_THRESHOLDS);
      setRatingBands(currentSettings.ratingBands || DEFAULT_RATING_BANDS);
    }
  }, [isOpen, currentSettings]);

  const totalWeight = Number(weights.deliveryWeight || 0) +
                      Number(weights.quantityAccuracyWeight || 0) +
                      Number(weights.qualityWeight || 0) +
                      Number(weights.priceWeight || 0) +
                      Number(weights.responsivenessWeight || 0) +
                      Number(weights.commitmentAccuracyWeight || 0);

  const isWeightValid = totalWeight === 100;

  const handleResetDefaults = () => {
    setWeights(DEFAULT_SCORECARD_WEIGHTS);
    setThresholds(DEFAULT_SCORECARD_THRESHOLDS);
    setRatingBands(DEFAULT_RATING_BANDS);
    addToast('Reset to system default scorecard parameters.', 'info');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!isWeightValid) {
      addToast(`Weights must sum to exactly 100% (currently ${totalWeight}%).`, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveScorecardSettings({
        weights,
        thresholds,
        ratingBands
      }, currentUser as any);

      if (res.success) {
        addToast('Scorecard & Risk Engine configuration updated successfully.', 'success');
        onSettingsSaved({
          id: 'global',
          weights,
          thresholds,
          ratingBands,
          updatedAt: new Date().toISOString(),
          updatedByUserId: currentUser.uid || currentUser.id,
          updatedByUserName: currentUser.name || 'Admin'
        });
        onClose();
      } else {
        addToast(res.error || 'Failed to save scorecard settings.', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Unexpected error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supplier Scorecard & Risk Policy Configuration"
      subtitle="Configure KPI evaluation weights, risk alert triggers, and tier rating bands."
      maxWidth="2xl"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: KPI Scoring Weights */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0F766E]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Evaluation Metric Weights
              </h3>
            </div>
            <div className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              isWeightValid 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              Total Weight: <span className="font-bold">{totalWeight}%</span> / 100%
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Delivery Performance (OTIF) %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weights.deliveryWeight}
                onChange={e => setWeights({ ...weights, deliveryWeight: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500">On-time and in-full fulfillment rate</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Quantity Accuracy (Fill Rate) %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weights.quantityAccuracyWeight}
                onChange={e => setWeights({ ...weights, quantityAccuracyWeight: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500">Accurate shipment counts without short/over delivery</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Quality & Defect Acceptance %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weights.qualityWeight}
                onChange={e => setWeights({ ...weights, qualityWeight: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500">Inspection pass rate vs damaged & rejected items</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Price Competitiveness & Stability %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weights.priceWeight}
                onChange={e => setWeights({ ...weights, priceWeight: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500">Price consistency & benchmark competitiveness</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Operational Responsiveness %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weights.responsivenessWeight}
                onChange={e => setWeights({ ...weights, responsivenessWeight: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500">Order turnaround and prompt ASN confirmation</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Commitment Accuracy %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weights.commitmentAccuracyWeight}
                onChange={e => setWeights({ ...weights, commitmentAccuracyWeight: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0F766E] focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-500">Adherence to promised dispatch dates</span>
            </div>
          </div>
        </div>

        {/* Section 2: Risk Engine Thresholds */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Risk & Alert Threshold Triggers
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Min Target OTIF (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={thresholds.minOtifRate}
                onChange={e => setThresholds({ ...thresholds, minOtifRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
              <span className="text-[10px] text-slate-500">Triggers delay warning below this</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Max Allowed Damage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={thresholds.maxDamageRate}
                onChange={e => setThresholds({ ...thresholds, maxDamageRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
              <span className="text-[10px] text-slate-500">Flags quality breach above this</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Max Short Delivery (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={thresholds.maxShortDeliveryRate}
                onChange={e => setThresholds({ ...thresholds, maxShortDeliveryRate: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
              <span className="text-[10px] text-slate-500">Flags shortage issue above this</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Max Price Hike Alert (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={thresholds.maxPriceIncreasePercent}
                onChange={e => setThresholds({ ...thresholds, maxPriceIncreasePercent: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
              <span className="text-[10px] text-slate-500">Flags price increase above this</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Min Score Threshold (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={thresholds.minSupplierScore}
                onChange={e => setThresholds({ ...thresholds, minSupplierScore: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
              <span className="text-[10px] text-slate-500">Places supplier on review below this</span>
            </div>
          </div>
        </div>

        {/* Section 3: Performance Tier Bands */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Performance Rating Bands
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
              <span className="font-bold text-emerald-800 block text-[11px]">Tier 1 (Preferred)</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-slate-500">Min Score:</span>
                <input
                  type="number"
                  value={ratingBands.excellentMin}
                  onChange={e => setRatingBands({ ...ratingBands, excellentMin: Number(e.target.value) })}
                  className="w-14 px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-bold text-emerald-800"
                />
              </div>
            </div>

            <div className="p-2.5 bg-teal-50/50 rounded-lg border border-teal-200">
              <span className="font-bold text-teal-800 block text-[11px]">Tier 2 (Reliable)</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-slate-500">Min Score:</span>
                <input
                  type="number"
                  value={ratingBands.goodMin}
                  onChange={e => setRatingBands({ ...ratingBands, goodMin: Number(e.target.value) })}
                  className="w-14 px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-bold text-teal-800"
                />
              </div>
            </div>

            <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-800 block text-[11px]">Tier 3 (Conditional)</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-slate-500">Min Score:</span>
                <input
                  type="number"
                  value={ratingBands.averageMin}
                  onChange={e => setRatingBands({ ...ratingBands, averageMin: Number(e.target.value) })}
                  className="w-14 px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-bold text-amber-800"
                />
              </div>
            </div>

            <div className="p-2.5 bg-rose-50/50 rounded-lg border border-rose-200">
              <span className="font-bold text-rose-800 block text-[11px]">Tier 4 (High Risk)</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-slate-500">Min Score:</span>
                <input
                  type="number"
                  value={ratingBands.poorMin}
                  onChange={e => setRatingBands({ ...ratingBands, poorMin: Number(e.target.value) })}
                  className="w-14 px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-bold text-rose-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !isWeightValid}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0F766E] hover:bg-[#0d655e] disabled:opacity-50 rounded-xl shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving Policy...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
