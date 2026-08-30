import React, { useState } from 'react';
import { WhatIfSimulationParams, ProductProfitabilityItem } from '../../../types';
import { runWhatIfSimulation } from '../../../services/executiveBIService';
import { formatBDT } from '../../../utils/formatters';
import { 
  Sliders, 
  X, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  ArrowRight, 
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Info
} from 'lucide-react';

interface WhatIfSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productProfitability: ProductProfitabilityItem[];
}

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({
  isOpen,
  onClose,
  productProfitability
}) => {
  const [priceChange, setPriceChange] = useState<number>(0);
  const [costChange, setCostChange] = useState<number>(0);
  const [volumeChange, setVolumeChange] = useState<number>(0);

  if (!isOpen) return null;

  const simResult = runWhatIfSimulation(productProfitability, {
    sellingPriceChangePercent: priceChange,
    purchaseCostChangePercent: costChange,
    salesVolumeChangePercent: volumeChange
  });

  const handleReset = () => {
    setPriceChange(0);
    setCostChange(0);
    setVolumeChange(0);
  };

  const isSimulated = priceChange !== 0 || costChange !== 0 || volumeChange !== 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Executive What-If Profit Sandbox</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-400/30">
                  Client-Side Simulation
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Simulate strategic pricing, supplier cost fluctuations, and wholesale volume changes on net EBITDA.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-teal-200 hover:text-white hover:bg-teal-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Informational Banner */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3 text-xs text-teal-900">
            <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Sandbox Safe Mode:</span> All scenario calculations are run locally in memory using authoritative catalog data. No changes are committed to the Firestore database or product catalogs.
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            
            {/* Slider 1: Wholesale Selling Price */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Wholesale Price Adjustment</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                  priceChange > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  priceChange < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {priceChange > 0 ? `+${priceChange}%` : `${priceChange}%`}
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="1"
                value={priceChange}
                onChange={e => setPriceChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-20% (Discount)</span>
                <span>0% (Base)</span>
                <span>+20% (Markup)</span>
              </div>
            </div>

            {/* Slider 2: Purchase / Supplier Cost */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Supplier Cost Change</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                  costChange < 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  costChange > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {costChange > 0 ? `+${costChange}%` : `${costChange}%`}
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="1"
                value={costChange}
                onChange={e => setCostChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-20% (Cost Savings)</span>
                <span>0% (Base)</span>
                <span>+20% (Inflation)</span>
              </div>
            </div>

            {/* Slider 3: Wholesale Volume */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Sales Volume Change</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                  volumeChange > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  volumeChange < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {volumeChange > 0 ? `+${volumeChange}%` : `${volumeChange}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={volumeChange}
                onChange={e => setVolumeChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-30%</span>
                <span>0% (Base)</span>
                <span>+50% (Growth)</span>
              </div>
            </div>

          </div>

          {/* Simulation Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Projected Net Sales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Projected Net Sales
              </span>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatBDT(simResult.simulatedNetSalesBDT)}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">Baseline: {formatBDT(simResult.baselineNetSalesBDT)}</span>
                {simResult.deltaSalesBDT !== 0 && (
                  <span className={`font-bold flex items-center gap-0.5 ${
                    simResult.deltaSalesBDT > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {simResult.deltaSalesBDT > 0 ? '+' : ''}{formatBDT(simResult.deltaSalesBDT)} ({simResult.deltaSalesPercent}%)
                  </span>
                )}
              </div>
            </div>

            {/* Projected Gross Profit */}
            <div className={`p-5 rounded-2xl border shadow-2xs space-y-3 ${
              simResult.simulatedGrossProfitBDT !== null && simResult.simulatedGrossProfitBDT > 0 
                ? 'bg-emerald-50/50 border-emerald-200' 
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Projected Gross Profit
              </span>
              <div className="text-2xl font-extrabold text-emerald-950 tracking-tight">
                {simResult.simulatedGrossProfitBDT !== null ? formatBDT(simResult.simulatedGrossProfitBDT) : 'N/A'}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/50 text-xs">
                <span className="text-slate-600">
                  Base: {simResult.baselineGrossProfitBDT !== null ? formatBDT(simResult.baselineGrossProfitBDT) : 'N/A'}
                </span>
                {simResult.deltaProfitBDT !== 0 && (
                  <span className={`font-bold flex items-center gap-0.5 ${
                    simResult.deltaProfitBDT && simResult.deltaProfitBDT > 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {simResult.deltaProfitBDT && simResult.deltaProfitBDT > 0 ? '+' : ''}
                    {simResult.deltaProfitBDT !== null ? formatBDT(simResult.deltaProfitBDT) : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Projected Gross Margin % */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Projected Gross Margin %
              </span>
              <div className="text-2xl font-extrabold text-teal-700 tracking-tight">
                {simResult.simulatedGrossMarginPercent !== null ? `${simResult.simulatedGrossMarginPercent}%` : 'N/A'}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">Base: {simResult.baselineGrossMarginPercent}%</span>
                {simResult.deltaMarginPoints !== 0 && (
                  <span className={`font-bold ${
                    simResult.deltaMarginPoints && simResult.deltaMarginPoints > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {simResult.deltaMarginPoints && simResult.deltaMarginPoints > 0 ? '+' : ''}
                    {simResult.deltaMarginPoints} pts
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Scenario Insight */}
          {isSimulated && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-700 space-y-1">
                <span className="font-bold text-slate-900">Scenario Assessment: </span>
                <span>
                  {simResult.deltaProfitBDT && simResult.deltaProfitBDT > 0 ? (
                    `This simulated strategic shift would expand company gross margin by ${simResult.deltaMarginPoints} percentage points, generating an estimated ${formatBDT(simResult.deltaProfitBDT)} in additional gross margin.`
                  ) : (
                    `This scenario reduces gross margin by ${Math.abs(simResult.deltaMarginPoints || 0)} percentage points, contracting gross profit by ${formatBDT(Math.abs(simResult.deltaProfitBDT || 0))}.`
                  )}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={!isSimulated}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sliders</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white transition-colors"
          >
            Close Sandbox
          </button>
        </div>

      </div>
    </div>
  );
};
