import React, { useState, useMemo } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Truck, 
  ShieldAlert, 
  Info, 
  Sparkles, 
  Calculator, 
  ArrowRight, 
  Building2, 
  Calendar, 
  FileText, 
  ShoppingBag,
  DollarSign,
  Layers,
  Award,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { 
  ProcurementRecommendation, 
  AuthUser, 
  ProcurementSettings, 
  ProcurementSupplierOption 
} from '../../../types';
import { 
  createPOFromRecommendation, 
  updateRecommendationStatus 
} from '../../../services/smartProcurementService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recommendation: ProcurementRecommendation | null;
  currentUser: AuthUser;
  settings: ProcurementSettings;
  onActionCompleted: () => void;
}

export const ProcurementRecommendationDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  recommendation,
  currentUser,
  settings,
  onActionCompleted
}) => {
  if (!isOpen || !recommendation) return null;

  // What-If Simulator state (Simulated quantity defaulted to recommended quantity)
  const defaultSimQty = recommendation.recommendedQuantity > 0 
    ? recommendation.recommendedQuantity 
    : Math.max(20, Math.ceil((recommendation.averageDailyDemand || 1) * 30));
  
  const [simulatedQuantity, setSimulatedQuantity] = useState<number>(defaultSimQty);
  
  // PO Creation Form Modal inside drawer
  const [showPOConfirm, setShowPOConfirm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    recommendation.preferredSupplier?.supplierId || 
    (recommendation.alternativeSuppliers[0]?.supplierId || '')
  );
  const [orderQuantity, setOrderQuantity] = useState<number>(
    recommendation.recommendedQuantity > 0 ? recommendation.recommendedQuantity : defaultSimQty
  );
  
  // Selected supplier price
  const activeSupplier = useMemo(() => {
    if (recommendation.preferredSupplier?.supplierId === selectedSupplierId) {
      return recommendation.preferredSupplier;
    }
    return recommendation.alternativeSuppliers.find(a => a.supplierId === selectedSupplierId) || recommendation.preferredSupplier;
  }, [selectedSupplierId, recommendation]);

  const [unitPrice, setUnitPrice] = useState<number>(
    activeSupplier?.unitPriceBDT || recommendation.unitPriceBDT || 0
  );
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isHighValueAcknowledged, setIsHighValueAcknowledged] = useState<boolean>(false);
  
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Dismiss reason state
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissReason, setDismissReason] = useState('Stock sufficient / seasonal pause');
  const [isDismissing, setIsDismissing] = useState(false);

  // What-If calculations (Deterministic Simulation Only)
  const simulatedResults = useMemo(() => {
    const daily = recommendation.averageDailyDemand || 0;
    const currentAvail = recommendation.availableStock;
    const inbound = recommendation.inboundStock;
    const leadDemand = Math.ceil(daily * recommendation.leadTimeDays);

    const projectedStockAfterArrival = currentAvail + inbound + simulatedQuantity - leadDemand;
    const newDaysOfCover = daily > 0 
      ? Math.round((currentAvail + inbound + simulatedQuantity) / daily) 
      : null;
    
    const estPrice = activeSupplier?.unitPriceBDT || recommendation.unitPriceBDT || 0;
    const estCost = Math.round(simulatedQuantity * estPrice);

    let excessWarning: string | null = null;
    if (newDaysOfCover !== null && newDaysOfCover > settings.overstockThresholdDays) {
      excessWarning = `Holding ${newDaysOfCover} days of inventory exceeds ${settings.overstockThresholdDays}-day policy.`;
    } else if (newDaysOfCover !== null && newDaysOfCover < 14) {
      excessWarning = `Coverage (${newDaysOfCover} days) remains below recommended 14-day minimum.`;
    }

    return {
      projectedStockAfterArrival,
      newDaysOfCover,
      estCost,
      excessWarning
    };
  }, [simulatedQuantity, recommendation, activeSupplier, settings]);

  const totalPOCost = orderQuantity * unitPrice;
  const isHighValue = totalPOCost >= settings.highValueApprovalThresholdBDT;

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') {
      setActionError('Unauthorized: Only admins can confirm purchase orders.');
      return;
    }
    if (!selectedSupplierId) {
      setActionError('Please select a supplier.');
      return;
    }
    if (orderQuantity <= 0) {
      setActionError('Quantity must be greater than 0.');
      return;
    }
    if (isHighValue && !isHighValueAcknowledged) {
      setActionError('High-value purchase requires explicit checkbox acknowledgment.');
      return;
    }

    setIsCreatingPO(true);
    setActionError(null);
    try {
      const res = await createPOFromRecommendation(
        recommendation,
        selectedSupplierId,
        orderQuantity,
        unitPrice,
        currentUser,
        orderNotes,
        orderQuantity !== recommendation.recommendedQuantity ? overrideReason : undefined
      );

      if (res.success) {
        setShowPOConfirm(false);
        onActionCompleted();
        onClose();
      } else {
        setActionError(res.error || 'Failed to create purchase order.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error executing purchase order.');
    } finally {
      setIsCreatingPO(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      const res = await updateRecommendationStatus(recommendation.id, 'dismissed', currentUser, {
        dismissReason
      });
      if (res.success) {
        setShowDismissModal(false);
        onActionCompleted();
        onClose();
      }
    } finally {
      setIsDismissing(false);
    }
  };

  // Badge helpers
  const priorityColor = {
    critical: 'bg-rose-100 text-rose-800 border-rose-200',
    high: 'bg-amber-100 text-amber-800 border-amber-200',
    medium: 'bg-teal-100 text-teal-800 border-teal-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    planned: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  }[recommendation.priority];

  const confidenceBadge = {
    'High': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Medium': 'bg-teal-100 text-teal-800 border-teal-200',
    'Low': 'bg-amber-100 text-amber-800 border-amber-200',
    'Insufficient Data': 'bg-slate-100 text-slate-600 border-slate-200'
  }[recommendation.confidence];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="bg-[#0F766E] text-white p-5 border-b border-teal-800/40 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${priorityColor}`}>
                  {recommendation.priority} PRIORITY
                </span>
                <span className="text-[11px] font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-md">
                  {recommendation.type.replace(/_/g, ' ')}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${confidenceBadge}`}>
                  {recommendation.confidence} Confidence
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{recommendation.productName}</h2>
              <p className="text-xs text-teal-100/90 font-mono mt-0.5">
                SKU: {recommendation.sku || 'N/A'} • Category: {recommendation.category || 'General'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">

          {/* Action Callout Summary */}
          <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl">
            <h3 className="text-sm font-bold text-[#0F766E] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
              Executive Action Summary
            </h3>
            <p className="text-sm font-semibold text-slate-800 mt-1.5">
              {recommendation.title}
            </p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {recommendation.summary}
            </p>
          </div>

          {/* Key Metric Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Current Stock</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{recommendation.currentStock}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Avail: {recommendation.availableStock}</div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inbound Stock</div>
              <div className="text-xl font-bold text-teal-700 mt-1">+{recommendation.inboundStock}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Open POs</div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Daily Run-Rate</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{recommendation.averageDailyDemand}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{recommendation.weeklyVelocity} units/wk</div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Days of Cover</div>
              <div className={`text-xl font-bold mt-1 ${
                recommendation.daysOfCover !== null && recommendation.daysOfCover <= 4 ? 'text-rose-600' :
                recommendation.daysOfCover !== null && recommendation.daysOfCover <= 10 ? 'text-amber-600' : 'text-emerald-700'
              }`}>
                {recommendation.daysOfCover !== null ? `${recommendation.daysOfCover}d` : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">{recommendation.daysOfCoverText}</div>
            </div>
          </div>

          {/* Section: Why This Recommendation? */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#0F766E]" />
              Why this recommendation? (Deterministic Evidence)
            </h4>
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
              {recommendation.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0F766E] mt-1.5 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200/60 mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Reorder Point: <strong className="text-slate-800">{recommendation.reorderPoint} units</strong></span>
                <span>Safety Stock: <strong className="text-slate-800">{recommendation.safetyStock} units</strong></span>
                <span>Lead Time: <strong className="text-slate-800">{recommendation.leadTimeDays} days</strong></span>
              </div>
            </div>
          </div>

          {/* Section: Consequences of Doing Nothing */}
          {recommendation.consequencesOfNoAction.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                What happens if we do nothing?
              </h4>
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                {recommendation.consequencesOfNoAction.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-medium text-amber-900">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Supplier Intelligence & Comparison */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#0F766E]" />
              Supplier Evaluation (STEP 17.4 Performance)
            </h4>

            {recommendation.preferredSupplier ? (
              <div className="space-y-2">
                {/* Preferred Supplier Card */}
                <div className="p-4 bg-emerald-50/50 border-2 border-emerald-500/40 rounded-2xl">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-600 text-white rounded-md">
                          Preferred Supplier
                        </span>
                        <span className="font-bold text-sm text-slate-900">{recommendation.preferredSupplier.supplierName}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {recommendation.preferredSupplier.selectionReason}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-slate-900">
                        {recommendation.preferredSupplier.unitPriceBDT ? `৳${recommendation.preferredSupplier.unitPriceBDT}` : 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500">Unit Price</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-emerald-200/60 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Score</div>
                      <div className="text-xs font-bold text-emerald-800">
                        {recommendation.preferredSupplier.score !== null ? `${recommendation.preferredSupplier.score}/100` : 'Unrated'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Lead Time</div>
                      <div className="text-xs font-bold text-slate-800">{recommendation.preferredSupplier.leadTimeDays || '7'} days</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">OTIF Rate</div>
                      <div className="text-xs font-bold text-slate-800">
                        {recommendation.preferredSupplier.otifRate !== null ? `${recommendation.preferredSupplier.otifRate}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Risk Level</div>
                      <div className={`text-xs font-bold ${
                        recommendation.preferredSupplier.riskLevel === 'Severe' ? 'text-rose-600' :
                        recommendation.preferredSupplier.riskLevel === 'High' ? 'text-amber-600' : 'text-emerald-700'
                      }`}>
                        {recommendation.preferredSupplier.riskLevel}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alternative Suppliers if available */}
                {recommendation.alternativeSuppliers.map((alt, i) => (
                  <div key={alt.supplierId || i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                          Alt {i + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{alt.supplierName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Score: {alt.score !== null ? `${alt.score}/100` : 'Unrated'} • Lead Time: {alt.leadTimeDays || 7}d
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{alt.unitPriceBDT ? `৳${alt.unitPriceBDT}` : 'N/A'}</div>
                      {recommendation.preferredSupplier?.unitPriceBDT && alt.unitPriceBDT && (
                        <div className={`text-[10px] font-semibold ${
                          alt.unitPriceBDT < recommendation.preferredSupplier.unitPriceBDT ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {alt.unitPriceBDT < recommendation.preferredSupplier.unitPriceBDT 
                            ? `-৳${recommendation.preferredSupplier.unitPriceBDT - alt.unitPriceBDT}/unit saving` 
                            : `+৳${alt.unitPriceBDT - recommendation.preferredSupplier.unitPriceBDT}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                No supplier records linked to this product. Manual supplier selection required upon PO creation.
              </div>
            )}
          </div>

          {/* Section: Interactive What-If Simulation */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-300" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-200">
                  What-If Procurement Simulator
                </h4>
              </div>
              <span className="text-[10px] font-mono bg-teal-900/80 text-teal-200 border border-teal-500/30 px-2 py-0.5 rounded">
                SIMULATION ONLY
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Test purchasing volume scenarios to preview projected inventory positions, coverage duration, and estimated capital cost before committing.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span>Simulated Order Quantity</span>
                  <span className="text-teal-300 font-bold text-sm font-mono">{simulatedQuantity} Units</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(1000, defaultSimQty * 4)}
                  step="10"
                  value={simulatedQuantity}
                  onChange={e => setSimulatedQuantity(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0F766E]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>0 Units</span>
                  <span>{defaultSimQty} (Recommended)</span>
                  <span>{Math.max(1000, defaultSimQty * 4)} Units</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-700/80 text-center">
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Projected Stock</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {simulatedResults.projectedStockAfterArrival} units
                  </div>
                </div>

                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Days of Cover</div>
                  <div className="text-sm font-bold text-teal-300 font-mono mt-0.5">
                    {simulatedResults.newDaysOfCover !== null ? `${simulatedResults.newDaysOfCover} Days` : 'N/A'}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Cost</div>
                  <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">
                    ৳{simulatedResults.estCost.toLocaleString()}
                  </div>
                </div>
              </div>

              {simulatedResults.excessWarning && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-700/60 rounded-xl flex items-center gap-2 text-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{simulatedResults.excessWarning}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowDismissModal(true)}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            Dismiss Recommendation
          </button>

          <button
            type="button"
            onClick={() => {
              setOrderQuantity(recommendation.recommendedQuantity > 0 ? recommendation.recommendedQuantity : simulatedQuantity);
              setShowPOConfirm(true);
            }}
            className="px-6 py-2.5 bg-[#0F766E] hover:bg-[#0d645e] text-white text-sm font-bold rounded-xl shadow-xs shadow-[#0F766E]/30 flex items-center gap-2 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Explicit PO Confirmation Modal */}
      {showPOConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0F766E] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Confirm Purchase Order Creation</h3>
                <p className="text-xs text-teal-100/90">Creates a draft PO requiring explicit authorization</p>
              </div>
              <button onClick={() => setShowPOConfirm(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product</label>
                <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-800">
                  {recommendation.productName} ({recommendation.sku || 'No SKU'})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={e => {
                    setSelectedSupplierId(e.target.value);
                    const sup = recommendation.preferredSupplier?.supplierId === e.target.value 
                      ? recommendation.preferredSupplier 
                      : recommendation.alternativeSuppliers.find(a => a.supplierId === e.target.value);
                    if (sup?.unitPriceBDT) {
                      setUnitPrice(sup.unitPriceBDT);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  required
                >
                  {recommendation.preferredSupplier && (
                    <option value={recommendation.preferredSupplier.supplierId}>
                      ★ {recommendation.preferredSupplier.supplierName} (Preferred • ৳{recommendation.preferredSupplier.unitPriceBDT || 0})
                    </option>
                  )}
                  {recommendation.alternativeSuppliers.map(alt => (
                    <option key={alt.supplierId} value={alt.supplierId}>
                      {alt.supplierName} (৳{alt.unitPriceBDT || 0})
                    </option>
                  ))}
                  {!recommendation.preferredSupplier && recommendation.alternativeSuppliers.length === 0 && (
                    <option value="">No suppliers available</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Order Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={orderQuantity}
                    onChange={e => setOrderQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                    required
                  />
                  {orderQuantity !== recommendation.recommendedQuantity && (
                    <span className="text-[10px] text-amber-600 font-semibold">
                      Overriding recommendation ({recommendation.recommendedQuantity})
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Price (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={e => setUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                    required
                  />
                </div>
              </div>

              {orderQuantity !== recommendation.recommendedQuantity && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Override Reason</label>
                  <input
                    type="text"
                    placeholder="e.g., Bulk shipment discount or seasonal forecast adjustment"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Order Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Reference notes for purchase order"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900">Total Purchase Commitment:</span>
                <span className="text-base font-extrabold text-[#0F766E] font-mono">
                  ৳{totalPOCost.toLocaleString()}
                </span>
              </div>

              {/* High-Value Purchase Alert & Checkbox */}
              {isHighValue && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>High-Value Purchase Alert (&gt; ৳{settings.highValueApprovalThresholdBDT.toLocaleString()})</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    This order represents a major procurement expenditure. Explicit authorization is required.
                  </p>
                  <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-rose-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHighValueAcknowledged}
                      onChange={e => setIsHighValueAcknowledged(e.target.checked)}
                      className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <span>I explicitly confirm and authorize this purchase order value.</span>
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPOConfirm(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPO || (isHighValue && !isHighValueAcknowledged)}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#0d645e] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingPO ? 'Creating PO...' : 'Confirm & Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dismiss Confirmation Modal */}
      {showDismissModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Dismiss Recommendation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select reason for dismissing this purchasing recommendation:
            </p>
            <div className="mt-3 space-y-2">
              <select
                value={dismissReason}
                onChange={e => setDismissReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
              >
                <option value="Stock sufficient / seasonal pause">Stock sufficient / seasonal pause</option>
                <option value="Supplier price too high">Supplier price too high</option>
                <option value="Product discontinuation planned">Product discontinuation planned</option>
                <option value="Alternative SKU preferred">Alternative SKU preferred</option>
                <option value="Cash flow budget restriction">Cash flow budget restriction</option>
              </select>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDismissModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isDismissing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                {isDismissing ? 'Dismissing...' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
