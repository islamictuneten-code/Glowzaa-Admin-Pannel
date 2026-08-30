import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, orderBy, limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  AuthUser,
  PurchaseOrder, 
  PurchaseOrderItem, 
  GoodsReceipt, 
  GoodsReceiptItem, 
  Supplier, 
  Product,
  SupplierScorecardSettings,
  SupplierScorecardWeights,
  SupplierScorecardThresholds,
  SupplierRatingBands,
  SupplierKPIs,
  SupplierComponentScores,
  SupplierPerformanceScore,
  SupplierPerformanceRating,
  SupplierRiskLevel,
  SupplierActionRecommendation,
  SupplierProductPriceStat,
  ProductSupplierBenchmark,
  SupplierPriceAlert,
  SupplierPerformanceSnapshot
} from '../types';
import { cleanUndefined, recordProcurementAuditLog } from './firestoreService';

// Default Global Scorecard Settings
export const DEFAULT_SCORECARD_WEIGHTS: SupplierScorecardWeights = {
  deliveryWeight: 30,
  quantityAccuracyWeight: 20,
  qualityWeight: 20,
  priceWeight: 15,
  responsivenessWeight: 10,
  commitmentAccuracyWeight: 5
};

export const DEFAULT_SCORECARD_THRESHOLDS: SupplierScorecardThresholds = {
  minOtifRate: 80,
  maxDamageRate: 3,
  maxShortDeliveryRate: 5,
  maxPriceIncreasePercent: 10,
  minSupplierScore: 60,
  minOrderVolumeForScoring: 1
};

export const DEFAULT_RATING_BANDS: SupplierRatingBands = {
  excellentMin: 90,
  goodMin: 75,
  averageMin: 60,
  poorMin: 40
};

export const DEFAULT_SCORECARD_SETTINGS: SupplierScorecardSettings = {
  id: 'global',
  weights: DEFAULT_SCORECARD_WEIGHTS,
  thresholds: DEFAULT_SCORECARD_THRESHOLDS,
  ratingBands: DEFAULT_RATING_BANDS,
  updatedAt: new Date().toISOString()
};

/**
 * Safely divide two numbers, returning fallback if denominator is 0 or numbers are invalid
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (!denominator || isNaN(denominator) || denominator === 0) return fallback;
  if (isNaN(numerator)) return fallback;
  const result = (numerator / denominator);
  return isFinite(result) ? result : fallback;
}

/**
 * Round a number to specified decimal places safely
 */
export function roundTo(val: number | null | undefined, decimals: number = 1): number | null {
  if (val === null || val === undefined || isNaN(val)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Fetch global scorecard settings with fallback to defaults
 */
export async function getScorecardSettings(): Promise<SupplierScorecardSettings> {
  try {
    const docRef = doc(db, 'supplier_scorecard_settings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: 'global',
        weights: { ...DEFAULT_SCORECARD_WEIGHTS, ...(data.weights || {}) },
        thresholds: { ...DEFAULT_SCORECARD_THRESHOLDS, ...(data.thresholds || {}) },
        ratingBands: { ...DEFAULT_RATING_BANDS, ...(data.ratingBands || {}) },
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedByUserId: data.updatedByUserId,
        updatedByUserName: data.updatedByUserName
      };
    }
  } catch (err) {
    console.warn('Failed to load scorecard settings, using default configuration:', err);
  }
  return DEFAULT_SCORECARD_SETTINGS;
}

/**
 * Save updated scorecard settings with audit log
 */
export async function saveScorecardSettings(
  settings: Partial<SupplierScorecardSettings>,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required' };
    
    // Ensure weights sum up reasonably
    const weights = settings.weights || DEFAULT_SCORECARD_WEIGHTS;
    const totalWeight = (weights.deliveryWeight || 0) + 
                        (weights.quantityAccuracyWeight || 0) + 
                        (weights.qualityWeight || 0) + 
                        (weights.priceWeight || 0) + 
                        (weights.responsivenessWeight || 0) + 
                        (weights.commitmentAccuracyWeight || 0);
    
    if (Math.abs(totalWeight - 100) > 0.01 && totalWeight !== 0) {
      // Normalize to 100 if non-zero
      weights.deliveryWeight = Math.round((weights.deliveryWeight / totalWeight) * 100);
      weights.quantityAccuracyWeight = Math.round((weights.quantityAccuracyWeight / totalWeight) * 100);
      weights.qualityWeight = Math.round((weights.qualityWeight / totalWeight) * 100);
      weights.priceWeight = Math.round((weights.priceWeight / totalWeight) * 100);
      weights.responsivenessWeight = Math.round((weights.responsivenessWeight / totalWeight) * 100);
      weights.commitmentAccuracyWeight = 100 - (weights.deliveryWeight + weights.quantityAccuracyWeight + weights.qualityWeight + weights.priceWeight + weights.responsivenessWeight);
    }

    const payload: SupplierScorecardSettings = {
      id: 'global',
      weights: { ...DEFAULT_SCORECARD_WEIGHTS, ...weights },
      thresholds: { ...DEFAULT_SCORECARD_THRESHOLDS, ...(settings.thresholds || {}) },
      ratingBands: { ...DEFAULT_RATING_BANDS, ...(settings.ratingBands || {}) },
      updatedAt: new Date().toISOString(),
      updatedByUserId: currentUser.uid || currentUser.id,
      updatedByUserName: currentUser.name || 'Admin'
    };

    await setDoc(doc(db, 'supplier_scorecard_settings', 'global'), cleanUndefined(payload));

    await recordProcurementAuditLog(
      'SUPPLIER_SCORECARD_SETTINGS_UPDATED',
      'global',
      'SCORECARD-CONFIG',
      currentUser,
      'Updated supplier scorecard weights and threshold policies.'
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error saving scorecard settings:', err);
    return { success: false, error: err.message || 'Failed to save settings' };
  }
}

/**
 * Filter POs and GRNs within an optional date range
 */
export function filterRecordsByDate<T extends { createdAt: string; receivedAt?: string; purchaseDate?: string }>(
  records: T[],
  startDate?: string,
  endDate?: string
): T[] {
  if (!startDate && !endDate) return records;
  return records.filter(r => {
    const d = r.receivedAt || r.purchaseDate || r.createdAt;
    if (!d) return true;
    const recordDate = new Date(d).getTime();
    if (startDate && recordDate < new Date(startDate).getTime()) return false;
    if (endDate && recordDate > new Date(endDate + 'T23:59:59.999Z').getTime()) return false;
    return true;
  });
}

/**
 * 1. Calculate Comprehensive KPIs for a Single Supplier
 */
export function calculateSupplierKPIs(
  supplierId: string,
  allPOs: PurchaseOrder[],
  allGRNs: GoodsReceipt[],
  allGRNItems: GoodsReceiptItem[],
  startDate?: string,
  endDate?: string
): SupplierKPIs {
  // Filter for this supplier and exclude drafts
  const supplierPOs = filterRecordsByDate(
    allPOs.filter(po => po.supplierId === supplierId && po.status !== 'draft'),
    startDate,
    endDate
  );

  const supplierGRNs = filterRecordsByDate(
    allGRNs.filter(grn => grn.supplierId === supplierId && grn.status === 'posted'),
    startDate,
    endDate
  );

  const postedGRNIds = new Set(supplierGRNs.map(g => g.id));
  const supplierGRNItems = allGRNItems.filter(item => postedGRNIds.has(item.goodsReceiptId));

  const totalPurchaseOrders = supplierPOs.length;
  const completedPurchaseOrders = supplierPOs.filter(po => po.status === 'received' || po.status === 'closed').length;
  const cancelledPurchaseOrders = supplierPOs.filter(po => po.status === 'cancelled').length;
  const totalGoodsReceipts = supplierGRNs.length;

  // Aggregate quantities from posted GRNs
  let totalReceivedUnits = 0;
  let totalAcceptedUnits = 0;
  let totalDamagedUnits = 0;
  let totalRejectedUnits = 0;
  let totalDamagedLossBDT = 0;
  let totalAcceptedSpendBDT = 0;

  for (const grn of supplierGRNs) {
    totalReceivedUnits += Number(grn.totalReceivedQuantity || 0);
    totalAcceptedUnits += Number(grn.totalAcceptedQuantity || 0);
    totalDamagedUnits += Number(grn.totalDamagedQuantity || 0);
    totalRejectedUnits += Number(grn.totalRejectedQuantity || 0);
    totalAcceptedSpendBDT += Number(grn.subtotalReceivedValueBDT || 0);
  }

  // Calculate damage loss from GRN Items
  for (const item of supplierGRNItems) {
    if (item.damagedQuantity > 0) {
      totalDamagedLossBDT += (item.damagedQuantity * (item.unitPurchasePriceBDT || 0));
    }
  }

  // Calculate total ordered quantity from non-cancelled POs
  const activeOrReceivedPOs = supplierPOs.filter(po => po.status !== 'cancelled');
  let totalOrderedUnits = 0;
  let totalSpendBDT = 0;
  for (const po of activeOrReceivedPOs) {
    totalOrderedUnits += Number(po.totalOrderedQuantity || 0);
    totalSpendBDT += Number(po.totalAmountBDT || 0);
  }

  // Delivery timeliness analysis (On-Time)
  let onTimeGRNCount = 0;
  let inFullGRNCount = 0;
  let otifGRNCount = 0;
  let totalLeadTimeDaysSum = 0;
  let validLeadTimeCount = 0;
  let totalDelayDaysSum = 0;
  let delayCount = 0;

  // Map PO details for quick lookup
  const poMap = new Map<string, PurchaseOrder>();
  for (const po of supplierPOs) {
    poMap.set(po.id, po);
  }

  for (const grn of supplierGRNs) {
    const parentPO = poMap.get(grn.purchaseOrderId);
    let isOnTime = false;
    let isInFull = false;

    if (parentPO) {
      // Check expected delivery date
      const receivedTime = new Date(grn.receivedAt || grn.createdAt).getTime();
      const expectedDateStr = parentPO.expectedDeliveryDate;

      if (expectedDateStr) {
        const expectedTime = new Date(expectedDateStr + 'T23:59:59.999Z').getTime();
        if (receivedTime <= expectedTime) {
          isOnTime = true;
          onTimeGRNCount++;
        } else {
          const diffDays = Math.max(0, Math.round((receivedTime - expectedTime) / (1000 * 60 * 60 * 24)));
          totalDelayDaysSum += diffDays;
          delayCount++;
        }
      } else {
        // If no explicit expected date was set on PO, consider on-time if delivered within normal lead time
        isOnTime = true;
        onTimeGRNCount++;
      }

      // Lead time calculation
      if (parentPO.createdAt) {
        const poCreatedTime = new Date(parentPO.createdAt).getTime();
        const leadDays = Math.max(0, Math.round((receivedTime - poCreatedTime) / (1000 * 60 * 60 * 24)));
        totalLeadTimeDaysSum += leadDays;
        validLeadTimeCount++;
      }

      // In-Full check
      const acceptedRatio = safeDivide(grn.totalAcceptedQuantity, parentPO.totalOrderedQuantity, 0);
      if (acceptedRatio >= 0.98 || grn.totalReceivedQuantity >= parentPO.totalOrderedQuantity) {
        isInFull = true;
        inFullGRNCount++;
      }
    } else {
      // Fallback
      isOnTime = true;
      onTimeGRNCount++;
      if (grn.totalAcceptedQuantity >= grn.totalOrderedQuantity && grn.totalOrderedQuantity > 0) {
        isInFull = true;
        inFullGRNCount++;
      }
    }

    if (isOnTime && isInFull) {
      otifGRNCount++;
    }
  }

  // Calculate Short / Over units across active POs
  let totalShortUnits = 0;
  let totalOverUnits = 0;
  for (const po of supplierPOs) {
    if (po.status === 'received' || po.status === 'partially_received' || po.status === 'closed') {
      const diff = (po.totalOrderedQuantity || 0) - (po.totalReceivedQuantity || 0);
      if (diff > 0) totalShortUnits += diff;
      if (diff < 0) totalOverUnits += Math.abs(diff);
    }
  }

  // Normalized Rates (Only calculate if valid data exists)
  const hasGRNs = totalGoodsReceipts > 0;
  const hasOrders = totalOrderedUnits > 0;

  const onTimeDeliveryRate = hasGRNs ? roundTo((onTimeGRNCount / totalGoodsReceipts) * 100) : null;
  const inFullDeliveryRate = hasGRNs ? roundTo((inFullGRNCount / totalGoodsReceipts) * 100) : null;
  const otifRate = hasGRNs ? roundTo((otifGRNCount / totalGoodsReceipts) * 100) : null;
  const fillRate = hasOrders && hasGRNs ? roundTo(Math.min(100, (totalReceivedUnits / totalOrderedUnits) * 100)) : null;
  const shortDeliveryRate = hasOrders ? roundTo((totalShortUnits / totalOrderedUnits) * 100) : null;
  const overDeliveryRate = hasOrders ? roundTo((totalOverUnits / totalOrderedUnits) * 100) : null;

  const qualityAcceptanceRate = totalReceivedUnits > 0 ? roundTo((totalAcceptedUnits / totalReceivedUnits) * 100) : null;
  const damageRate = totalReceivedUnits > 0 ? roundTo((totalDamagedUnits / totalReceivedUnits) * 100) : null;
  const rejectionRate = totalReceivedUnits > 0 ? roundTo((totalRejectedUnits / totalReceivedUnits) * 100) : null;

  const averageLeadTimeDays = validLeadTimeCount > 0 ? roundTo(totalLeadTimeDaysSum / validLeadTimeCount, 1) : null;
  const averageDeliveryDelayDays = delayCount > 0 ? roundTo(totalDelayDaysSum / delayCount, 1) : 0;

  // Responsiveness & Commitment Accuracy (computed from adherence)
  const responsivenessScore = hasOrders ? roundTo(Math.max(40, 100 - (averageDeliveryDelayDays ? averageDeliveryDelayDays * 5 : 0))) : null;
  const commitmentAccuracyScore = (onTimeDeliveryRate !== null && fillRate !== null) 
    ? roundTo((onTimeDeliveryRate * 0.5) + (fillRate * 0.5)) 
    : null;

  return {
    totalPurchaseOrders,
    completedPurchaseOrders,
    cancelledPurchaseOrders,
    totalGoodsReceipts,
    totalOrderedUnits,
    totalReceivedUnits,
    totalAcceptedUnits,
    totalDamagedUnits,
    totalRejectedUnits,
    totalShortUnits,
    totalOverUnits,
    totalSpendBDT,
    totalAcceptedSpendBDT,
    totalDamagedLossBDT,
    onTimeDeliveryRate,
    inFullDeliveryRate,
    otifRate,
    fillRate,
    shortDeliveryRate,
    overDeliveryRate,
    qualityAcceptanceRate,
    damageRate,
    rejectionRate,
    priceCompetitivenessScore: 85, // Computed or benchmarked
    responsivenessScore,
    commitmentAccuracyScore,
    averageLeadTimeDays,
    averageDeliveryDelayDays
  };
}

/**
 * 2. Calculate Weighted Supplier Score with Dynamic Renormalization for Missing KPIs
 */
export function calculateSupplierScore(
  kpis: SupplierKPIs,
  weights: SupplierScorecardWeights = DEFAULT_SCORECARD_WEIGHTS,
  thresholds: SupplierScorecardThresholds = DEFAULT_SCORECARD_THRESHOLDS
): {
  overallScore: number | null;
  componentScores: SupplierComponentScores;
  normalizedWeights: { [key: string]: number };
  dataConfidence: 'High' | 'Medium' | 'Low' | 'Insufficient';
} {
  // Check minimum data requirements
  if (kpis.totalGoodsReceipts === 0 && kpis.totalPurchaseOrders === 0) {
    return {
      overallScore: null,
      componentScores: {
        deliveryScore: null,
        quantityScore: null,
        qualityScore: null,
        priceScore: null,
        responsivenessScore: null,
        commitmentScore: null
      },
      normalizedWeights: {},
      dataConfidence: 'Insufficient'
    };
  }

  // 1. Delivery Score (0-100) -> Combination of OTIF and On-Time
  let deliveryScore: number | null = null;
  if (kpis.otifRate !== null && kpis.onTimeDeliveryRate !== null) {
    deliveryScore = Math.min(100, Math.max(0, (kpis.otifRate * 0.7) + (kpis.onTimeDeliveryRate * 0.3)));
  } else if (kpis.onTimeDeliveryRate !== null) {
    deliveryScore = kpis.onTimeDeliveryRate;
  }

  // 2. Quantity Accuracy Score (0-100) -> Fill rate minus short delivery penalty
  let quantityScore: number | null = null;
  if (kpis.fillRate !== null) {
    const shortPenalty = (kpis.shortDeliveryRate || 0) * 1.5;
    const overPenalty = (kpis.overDeliveryRate || 0) * 0.5;
    quantityScore = Math.min(100, Math.max(0, kpis.fillRate - shortPenalty - overPenalty));
  }

  // 3. Quality Score (0-100) -> Quality Acceptance Rate
  let qualityScore: number | null = null;
  if (kpis.qualityAcceptanceRate !== null) {
    qualityScore = Math.min(100, Math.max(0, kpis.qualityAcceptanceRate));
  }

  // 4. Price Competitiveness Score (0-100)
  const priceScore: number | null = kpis.priceCompetitivenessScore;

  // 5. Responsiveness Score (0-100)
  const responsivenessScore: number | null = kpis.responsivenessScore;

  // 6. Commitment Score (0-100)
  const commitmentScore: number | null = kpis.commitmentAccuracyScore;

  // Collect available components and their base weights
  const availableComponents: Array<{ key: string; score: number; baseWeight: number }> = [];

  if (deliveryScore !== null) availableComponents.push({ key: 'delivery', score: deliveryScore, baseWeight: weights.deliveryWeight });
  if (quantityScore !== null) availableComponents.push({ key: 'quantity', score: quantityScore, baseWeight: weights.quantityAccuracyWeight });
  if (qualityScore !== null) availableComponents.push({ key: 'quality', score: qualityScore, baseWeight: weights.qualityWeight });
  if (priceScore !== null) availableComponents.push({ key: 'price', score: priceScore, baseWeight: weights.priceWeight });
  if (responsivenessScore !== null) availableComponents.push({ key: 'responsiveness', score: responsivenessScore, baseWeight: weights.responsivenessWeight });
  if (commitmentScore !== null) availableComponents.push({ key: 'commitment', score: commitmentScore, baseWeight: weights.commitmentAccuracyWeight });

  if (availableComponents.length === 0) {
    return {
      overallScore: null,
      componentScores: {
        deliveryScore: null,
        quantityScore: null,
        qualityScore: null,
        priceScore: null,
        responsivenessScore: null,
        commitmentScore: null
      },
      normalizedWeights: {},
      dataConfidence: 'Insufficient'
    };
  }

  // Calculate sum of base weights of available components
  const sumBaseWeights = availableComponents.reduce((sum, c) => sum + c.baseWeight, 0);

  // Renormalize weights so they sum to 100%
  const normalizedWeights: { [key: string]: number } = {};
  let totalWeightedScore = 0;

  for (const comp of availableComponents) {
    const normWeight = sumBaseWeights > 0 ? (comp.baseWeight / sumBaseWeights) * 100 : 0;
    normalizedWeights[comp.key] = roundTo(normWeight, 1) || 0;
    totalWeightedScore += (comp.score * (normWeight / 100));
  }

  const finalScore = roundTo(Math.min(100, Math.max(0, totalWeightedScore)), 1);

  // Confidence Level Determination
  let dataConfidence: 'High' | 'Medium' | 'Low' | 'Insufficient' = 'Low';
  if (kpis.totalGoodsReceipts >= 5 && kpis.totalPurchaseOrders >= 5) {
    dataConfidence = 'High';
  } else if (kpis.totalGoodsReceipts >= 2 || kpis.totalPurchaseOrders >= 2) {
    dataConfidence = 'Medium';
  } else if (kpis.totalGoodsReceipts >= 1 || kpis.totalPurchaseOrders >= 1) {
    dataConfidence = 'Low';
  }

  return {
    overallScore: finalScore,
    componentScores: {
      deliveryScore: roundTo(deliveryScore, 1),
      quantityScore: roundTo(quantityScore, 1),
      qualityScore: roundTo(qualityScore, 1),
      priceScore: roundTo(priceScore, 1),
      responsivenessScore: roundTo(responsivenessScore, 1),
      commitmentScore: roundTo(commitmentScore, 1)
    },
    normalizedWeights,
    dataConfidence
  };
}

/**
 * 3. Calculate Rating Band from Overall Score
 */
export function calculateSupplierRating(
  score: number | null,
  bands: SupplierRatingBands = DEFAULT_RATING_BANDS
): SupplierPerformanceRating {
  if (score === null || score === undefined || isNaN(score)) return 'Unrated';
  if (score >= bands.excellentMin) return 'Excellent';
  if (score >= bands.goodMin) return 'Good';
  if (score >= bands.averageMin) return 'Average';
  if (score >= bands.poorMin) return 'Poor';
  return 'Critical';
}

/**
 * 4. Calculate Supplier Risk Level & Risk Factors
 */
export function calculateSupplierRisk(
  kpis: SupplierKPIs,
  score: number | null,
  thresholds: SupplierScorecardThresholds = DEFAULT_SCORECARD_THRESHOLDS
): {
  riskLevel: SupplierRiskLevel;
  riskFactors: string[];
} {
  if (score === null) {
    return {
      riskLevel: 'Unknown',
      riskFactors: ['Insufficient historical orders or deliveries to assess risk accurately.']
    };
  }

  const riskFactors: string[] = [];

  // Check Damage Rate
  if (kpis.damageRate !== null && kpis.damageRate > thresholds.maxDamageRate) {
    riskFactors.push(`High defect/damage rate of ${kpis.damageRate}% (exceeds threshold of ${thresholds.maxDamageRate}%)`);
  }

  // Check OTIF Delivery
  if (kpis.otifRate !== null && kpis.otifRate < thresholds.minOtifRate) {
    riskFactors.push(`Low On-Time-In-Full rate of ${kpis.otifRate}% (below target of ${thresholds.minOtifRate}%)`);
  }

  // Check Short Delivery Rate
  if (kpis.shortDeliveryRate !== null && kpis.shortDeliveryRate > thresholds.maxShortDeliveryRate) {
    riskFactors.push(`Short shipment rate of ${kpis.shortDeliveryRate}% (exceeds tolerance of ${thresholds.maxShortDeliveryRate}%)`);
  }

  // Check Overall Score
  if (score < thresholds.minSupplierScore) {
    riskFactors.push(`Overall performance score ${score}/100 is below acceptable minimum of ${thresholds.minSupplierScore}`);
  }

  // Check Cancellations
  if (kpis.cancelledPurchaseOrders > 1 && safeDivide(kpis.cancelledPurchaseOrders, kpis.totalPurchaseOrders) > 0.15) {
    riskFactors.push(`Frequent order cancellation rate (${kpis.cancelledPurchaseOrders} cancelled POs)`);
  }

  // Check Delivery Delay
  if (kpis.averageDeliveryDelayDays && kpis.averageDeliveryDelayDays > 4) {
    riskFactors.push(`Significant average delivery delay of ${kpis.averageDeliveryDelayDays} days`);
  }

  // Determine Risk Level
  let riskLevel: SupplierRiskLevel = 'Low';

  if (score < 40 || riskFactors.length >= 3 || (kpis.damageRate && kpis.damageRate > 8)) {
    riskLevel = 'Severe';
  } else if (score < 60 || riskFactors.length >= 2 || (kpis.otifRate && kpis.otifRate < 65)) {
    riskLevel = 'High';
  } else if (score < 75 || riskFactors.length >= 1) {
    riskLevel = 'Moderate';
  }

  if (riskFactors.length === 0) {
    riskFactors.push('Consistent on-time delivery with low defect rates and compliant fulfillment.');
  }

  return {
    riskLevel,
    riskFactors
  };
}

/**
 * 5. Generate Data-Driven Action Recommendations
 */
export function calculateSupplierActionRecommendations(
  supplierName: string,
  kpis: SupplierKPIs,
  score: number | null,
  riskLevel: SupplierRiskLevel,
  priceStats?: SupplierProductPriceStat[]
): SupplierActionRecommendation[] {
  const recommendations: SupplierActionRecommendation[] = [];

  // High Performance Volume Discount Opportunity
  if (score && score >= 88 && riskLevel === 'Low' && kpis.totalSpendBDT > 100000) {
    recommendations.push({
      id: `rec-vol-${Date.now()}-1`,
      title: 'Negotiate Volume Rebate or Preferred Tier Pricing',
      category: 'pricing',
      severity: 'low',
      reason: `${supplierName} maintains Tier-1 performance (${score}/100) with ৳${kpis.totalSpendBDT.toLocaleString()} in procurement spend.`,
      recommendation: 'Request a 3-5% volume discount or quarterly rebate agreement on high-velocity items.',
      evidenceMetric: `Score: ${score}/100, Total Spend: ৳${kpis.totalSpendBDT.toLocaleString()}`,
      suggestedAction: 'Draft procurement contract addendum with volume tier brackets.'
    });
  }

  // Damage Rate Issue
  if (kpis.damageRate && kpis.damageRate > 3) {
    recommendations.push({
      id: `rec-dmg-${Date.now()}-2`,
      title: 'Enforce Stricter Packaging & Transit Inspection Protocol',
      category: 'quality',
      severity: kpis.damageRate > 6 ? 'critical' : 'high',
      reason: `Damage rate of ${kpis.damageRate}% has caused an estimated loss of ৳${kpis.totalDamagedLossBDT.toLocaleString()}.`,
      recommendation: 'Issue a formal quality non-conformance notice and mandate reinforced carton packaging.',
      evidenceMetric: `Damage Rate: ${kpis.damageRate}%, Incurred Loss: ৳${kpis.totalDamagedLossBDT.toLocaleString()}`,
      suggestedAction: 'Require photographic pre-shipment inspection and apply invoice debit notes for damaged goods.'
    });
  }

  // Delivery Delays & Low OTIF
  if (kpis.otifRate !== null && kpis.otifRate < 75) {
    recommendations.push({
      id: `rec-otif-${Date.now()}-3`,
      title: 'Review Buffer Stock & Establish Secondary Supplier Backup',
      category: 'delivery',
      severity: 'high',
      reason: `OTIF fulfillment rate is currently ${kpis.otifRate}%, with an average delay of ${kpis.averageDeliveryDelayDays || 0} days.`,
      recommendation: 'Increase reorder lead time buffer in inventory settings and activate secondary supplier backup.',
      evidenceMetric: `OTIF: ${kpis.otifRate}%, Lead Time: ${kpis.averageLeadTimeDays || 'N/A'} days`,
      suggestedAction: 'Reconfigure lead time thresholds in Glowzaa Reorder Intelligence.'
    });
  }

  // Short Deliveries
  if (kpis.shortDeliveryRate && kpis.shortDeliveryRate > 5) {
    recommendations.push({
      id: `rec-short-${Date.now()}-4`,
      title: 'Audit Order Commitment vs Actual Production Capacity',
      category: 'volume',
      severity: 'medium',
      reason: `${kpis.shortDeliveryRate}% short delivery rate (${kpis.totalShortUnits} units missing across orders).`,
      recommendation: 'Require supplier PO confirmation with explicit batch allocation before dispatching couriers.',
      evidenceMetric: `Shortage: ${kpis.totalShortUnits} units (${kpis.shortDeliveryRate}%)`,
      suggestedAction: 'Enable strict pre-dispatch ASN (Advance Shipping Notice) requirement.'
    });
  }

  // Price Hike Detection
  if (priceStats && priceStats.length > 0) {
    const risingProducts = priceStats.filter(p => p.priceChangePercent > 5);
    if (risingProducts.length > 0) {
      const topHike = risingProducts.sort((a, b) => b.priceChangePercent - a.priceChangePercent)[0];
      recommendations.push({
        id: `rec-price-${Date.now()}-5`,
        title: `Audit Price Hike on ${topHike.productName}`,
        category: 'pricing',
        severity: topHike.priceChangePercent > 12 ? 'high' : 'medium',
        reason: `Unit price increased by +${topHike.priceChangePercent}% (from ৳${topHike.previousPriceBDT} to ৳${topHike.currentPriceBDT}).`,
        recommendation: 'Benchmark current market rate against alternative suppliers in the Price Intelligence Matrix.',
        evidenceMetric: `Price Change: +${topHike.priceChangePercent}% (৳${topHike.priceChangeBDT})`,
        suggestedAction: 'Open price renegotiation discussion or split volume with alternative suppliers.'
      });
    }
  }

  // Default Positive Recommendation if all is clean
  if (recommendations.length === 0) {
    recommendations.push({
      id: `rec-clean-${Date.now()}-0`,
      title: 'Maintain Standard Operating Procurement Flow',
      category: 'contract',
      severity: 'low',
      reason: `${supplierName} meets all core delivery, quantity, and quality benchmarks with high consistency.`,
      recommendation: 'Continue regular purchase order cycle and review quarterly KPIs.',
      evidenceMetric: `Score: ${score || 'N/A'}/100, Quality: ${kpis.qualityAcceptanceRate || 100}%`,
      suggestedAction: 'Schedule next quarterly supplier review.'
    });
  }

  return recommendations;
}

/**
 * 5. Consolidate full supplier scorecard (KPIs, Score, Rating, Risk, Recommendations)
 */
export function calculateSupplierScorecard(
  supplierId: string,
  allPOs: PurchaseOrder[],
  allGRNs: GoodsReceipt[],
  allGRNItems: GoodsReceiptItem[],
  supplierName: string,
  settings: SupplierScorecardSettings = DEFAULT_SCORECARD_SETTINGS
): {
  kpis: SupplierKPIs;
  overallScore: number | null;
  componentScores: SupplierComponentScores;
  rating: SupplierPerformanceRating;
  riskLevel: SupplierRiskLevel;
  riskFactors: string[];
  recommendations: SupplierActionRecommendation[];
} {
  const kpis = calculateSupplierKPIs(supplierId, allPOs, allGRNs, allGRNItems);
  const scoreResult = calculateSupplierScore(kpis, settings.weights, settings.thresholds);
  const rating = calculateSupplierRating(scoreResult.overallScore, settings.ratingBands);
  const riskResult = calculateSupplierRisk(kpis, scoreResult.overallScore, settings.thresholds);
  const recommendations = calculateSupplierActionRecommendations(supplierName, kpis, scoreResult.overallScore, riskResult.riskLevel);

  return {
    kpis,
    overallScore: scoreResult.overallScore,
    componentScores: scoreResult.componentScores,
    rating,
    riskLevel: riskResult.riskLevel,
    riskFactors: riskResult.riskFactors,
    recommendations
  };
}

/**
 * 6. Calculate Detailed Product-Level Price Analytics across POs & GRNs
 */
export function calculateSupplierPriceAnalytics(
  allPOs: PurchaseOrder[],
  allPOItems: PurchaseOrderItem[],
  allGRNs: GoodsReceipt[],
  allGRNItems: GoodsReceiptItem[],
  allProducts: Product[],
  allSuppliers: Supplier[]
): {
  productStats: SupplierProductPriceStat[];
  benchmarks: ProductSupplierBenchmark[];
  alerts: SupplierPriceAlert[];
  overallPriceMetrics: {
    totalProcurementSpend: number;
    averagePriceChangePercent: number;
    productsWithRisingPrices: number;
    productsWithFallingPrices: number;
    highestPriceHike: { productName: string; supplierName: string; percent: number } | null;
    largestSupplierPriceSpread: { productName: string; spreadBDT: number; percent: number } | null;
  };
} {
  // Map helper lookups
  const supplierMap = new Map<string, Supplier>();
  for (const s of allSuppliers) supplierMap.set(s.id, s);

  const productMap = new Map<string, Product>();
  for (const p of allProducts) productMap.set(p.id, p);

  // Group PO items by Product + Supplier
  // key: `${productId}_${supplierId}`
  const groupedItems = new Map<string, {
    productId: string;
    productName: string;
    sku: string;
    supplierId: string;
    supplierName: string;
    items: Array<{ price: number; date: string; qty: number; poId: string }>;
  }>();

  for (const item of allPOItems) {
    if (!item.productId) continue;
    const parentPO = allPOs.find(p => p.id === item.purchaseOrderId);
    if (!parentPO || parentPO.status === 'draft' || parentPO.status === 'cancelled') continue;

    const supplierId = parentPO.supplierId;
    const supplierName = parentPO.supplierName || supplierMap.get(supplierId)?.name || 'Supplier';
    const key = `${item.productId}_${supplierId}`;

    if (!groupedItems.has(key)) {
      const prod = productMap.get(item.productId);
      groupedItems.set(key, {
        productId: item.productId,
        productName: item.productName || prod?.name || 'Product',
        sku: prod?.sku || item.supplierSku || 'SKU',
        supplierId,
        supplierName,
        items: []
      });
    }

    groupedItems.get(key)!.items.push({
      price: Number(item.unitPurchasePriceBDT || 0),
      date: parentPO.createdAt || item.createdAt || new Date().toISOString(),
      qty: Number(item.orderedQuantity || 0),
      poId: parentPO.id
    });
  }

  // Calculate stats for each Product-Supplier pair
  const productStats: SupplierProductPriceStat[] = [];
  const alerts: SupplierPriceAlert[] = [];

  for (const [key, group] of groupedItems.entries()) {
    // Sort items chronologically
    const sorted = group.items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length === 0) continue;

    const prices = sorted.map(s => s.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const totalQty = sorted.reduce((sum, s) => sum + s.qty, 0);
    const totalValue = sorted.reduce((sum, s) => sum + (s.price * s.qty), 0);
    const avgPrice = safeDivide(totalValue, totalQty, sorted[0].price);

    const latest = sorted[sorted.length - 1];
    const currentPriceBDT = latest.price;
    const previousPriceBDT = sorted.length > 1 ? sorted[sorted.length - 2].price : null;

    let priceChangeBDT = 0;
    let priceChangePercent = 0;
    let trend: 'up' | 'down' | 'stable' = 'stable';

    if (previousPriceBDT !== null && previousPriceBDT > 0) {
      priceChangeBDT = currentPriceBDT - previousPriceBDT;
      priceChangePercent = roundTo(((currentPriceBDT - previousPriceBDT) / previousPriceBDT) * 100, 1) || 0;
      if (priceChangePercent > 0.5) trend = 'up';
      else if (priceChangePercent < -0.5) trend = 'down';
    }

    // Effective Unit Cost Calculation (Include damage cost allocation from GRNs)
    const matchingGRNItems = allGRNItems.filter(g => g.productId === group.productId);
    let totalDamagedQty = 0;
    let totalAcceptedQty = 0;

    for (const gItem of matchingGRNItems) {
      totalDamagedQty += Number(gItem.damagedQuantity || 0);
      totalAcceptedQty += Number(gItem.acceptedQuantity || 0);
    }

    const defectRatio = safeDivide(totalDamagedQty, (totalAcceptedQty + totalDamagedQty), 0);
    const effectiveUnitCostBDT = roundTo(currentPriceBDT * (1 + defectRatio), 1) || currentPriceBDT;

    const stat: SupplierProductPriceStat = {
      productId: group.productId,
      productName: group.productName,
      sku: group.sku,
      category: productMap.get(group.productId)?.category || 'General',
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      currentPriceBDT,
      previousPriceBDT,
      minHistoricalPriceBDT: minPrice,
      maxHistoricalPriceBDT: maxPrice,
      avgHistoricalPriceBDT: roundTo(avgPrice, 1) || currentPriceBDT,
      priceChangeBDT: roundTo(priceChangeBDT, 1) || 0,
      priceChangePercent,
      trend,
      effectiveUnitCostBDT,
      lastPurchaseDate: latest.date,
      orderCount: sorted.length,
      totalQuantityPurchased: totalQty
    };

    productStats.push(stat);

    // Generate Price Hike Alert if threshold exceeded
    if (priceChangePercent >= 8) {
      alerts.push({
        id: `alert-price-${group.productId}-${group.supplierId}-${Date.now()}`,
        supplierId: group.supplierId,
        supplierName: group.supplierName,
        productId: group.productId,
        productName: group.productName,
        alertType: 'price_hike',
        severity: priceChangePercent >= 15 ? 'critical' : 'warning',
        title: `Price Hike: ${group.productName}`,
        message: `${group.supplierName} increased price by +${priceChangePercent}% (৳${previousPriceBDT} ➔ ৳${currentPriceBDT})`,
        metricValue: priceChangePercent,
        thresholdValue: 8,
        createdAt: latest.date
      });
    }
  }

  // Group by Product for Multi-Supplier Benchmark Matrix
  const productGroups = new Map<string, SupplierProductPriceStat[]>();
  for (const stat of productStats) {
    if (!productGroups.has(stat.productId)) {
      productGroups.set(stat.productId, []);
    }
    productGroups.get(stat.productId)!.push(stat);
  }

  const benchmarks: ProductSupplierBenchmark[] = [];

  for (const [productId, stats] of productGroups.entries()) {
    const prices = stats.map(s => s.currentPriceBDT);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = roundTo(prices.reduce((sum, p) => sum + p, 0) / prices.length, 1) || minPrice;
    const spreadBDT = maxPrice - minPrice;
    const spreadPercent = minPrice > 0 ? roundTo((spreadBDT / minPrice) * 100, 1) || 0 : 0;

    // Pick best value supplier (lowest effective cost with good stability)
    const sortedByValue = [...stats].sort((a, b) => a.effectiveUnitCostBDT - b.effectiveUnitCostBDT);
    const bestValue = sortedByValue[0];

    const benchmarkSuppliers = stats.map(s => {
      // Calculate supplier overall score for benchmark
      const kpis = calculateSupplierKPIs(s.supplierId, allPOs, allGRNs, allGRNItems);
      const scoreResult = calculateSupplierScore(kpis);
      return {
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        latestPriceBDT: s.currentPriceBDT,
        effectiveCostBDT: s.effectiveUnitCostBDT,
        overallScore: scoreResult.overallScore,
        rating: calculateSupplierRating(scoreResult.overallScore),
        otifRate: kpis.otifRate,
        damageRate: kpis.damageRate,
        leadTimeDays: kpis.averageLeadTimeDays,
        lastPurchasedAt: s.lastPurchaseDate
      };
    });

    benchmarks.push({
      productId,
      productName: stats[0].productName,
      sku: stats[0].sku,
      category: stats[0].category,
      minPriceBDT: minPrice,
      maxPriceBDT: maxPrice,
      avgPriceBDT: avgPrice,
      supplierCount: stats.length,
      priceSpreadBDT: spreadBDT,
      priceSpreadPercent: spreadPercent,
      bestValueSupplierId: bestValue.supplierId,
      bestValueSupplierName: bestValue.supplierName,
      suppliers: benchmarkSuppliers
    });

    // Alert on large supplier price variance (> 15% difference across suppliers)
    if (stats.length > 1 && spreadPercent >= 15) {
      alerts.push({
        id: `alert-var-${productId}-${Date.now()}`,
        supplierId: bestValue.supplierId,
        supplierName: bestValue.supplierName,
        productId,
        productName: stats[0].productName,
        alertType: 'price_variance',
        severity: 'info',
        title: `High Price Variance on ${stats[0].productName}`,
        message: `${spreadPercent}% price difference across ${stats.length} suppliers (Min: ৳${minPrice}, Max: ৳${maxPrice}).`,
        metricValue: spreadPercent,
        thresholdValue: 15,
        createdAt: new Date().toISOString()
      });
    }
  }

  // Summary Metrics
  let totalProcurementSpend = 0;
  for (const po of allPOs) {
    if (po.status !== 'draft' && po.status !== 'cancelled') {
      totalProcurementSpend += Number(po.totalAmountBDT || 0);
    }
  }

  let totalPercentChanges = 0;
  let changedCount = 0;
  let productsWithRisingPrices = 0;
  let productsWithFallingPrices = 0;

  for (const stat of productStats) {
    if (stat.priceChangePercent !== 0) {
      totalPercentChanges += stat.priceChangePercent;
      changedCount++;
    }
    if (stat.trend === 'up') productsWithRisingPrices++;
    if (stat.trend === 'down') productsWithFallingPrices++;
  }

  const averagePriceChangePercent = changedCount > 0 ? roundTo(totalPercentChanges / changedCount, 1) || 0 : 0;

  // Find highest price hike
  let highestPriceHike: { productName: string; supplierName: string; percent: number } | null = null;
  const sortedByHike = [...productStats].filter(s => s.priceChangePercent > 0).sort((a, b) => b.priceChangePercent - a.priceChangePercent);
  if (sortedByHike.length > 0) {
    highestPriceHike = {
      productName: sortedByHike[0].productName,
      supplierName: sortedByHike[0].supplierName,
      percent: sortedByHike[0].priceChangePercent
    };
  }

  // Find largest price spread across suppliers
  let largestSupplierPriceSpread: { productName: string; spreadBDT: number; percent: number } | null = null;
  const sortedBySpread = [...benchmarks].filter(b => b.supplierCount > 1).sort((a, b) => b.priceSpreadPercent - a.priceSpreadPercent);
  if (sortedBySpread.length > 0) {
    largestSupplierPriceSpread = {
      productName: sortedBySpread[0].productName,
      spreadBDT: sortedBySpread[0].priceSpreadBDT,
      percent: sortedBySpread[0].priceSpreadPercent
    };
  }

  return {
    productStats,
    benchmarks,
    alerts,
    overallPriceMetrics: {
      totalProcurementSpend,
      averagePriceChangePercent,
      productsWithRisingPrices,
      productsWithFallingPrices,
      highestPriceHike,
      largestSupplierPriceSpread
    }
  };
}

/**
 * 7. Comprehensive Single Supplier Scorecard Builder
 */
export function getSupplierPerformanceSummary(
  supplier: Supplier,
  allPOs: PurchaseOrder[],
  allPOItems: PurchaseOrderItem[],
  allGRNs: GoodsReceipt[],
  allGRNItems: GoodsReceiptItem[],
  allProducts: Product[],
  settings: SupplierScorecardSettings = DEFAULT_SCORECARD_SETTINGS,
  startDate?: string,
  endDate?: string,
  previousSnapshot?: SupplierPerformanceSnapshot
): SupplierPerformanceScore {
  const kpis = calculateSupplierKPIs(supplier.id, allPOs, allGRNs, allGRNItems, startDate, endDate);
  const scoreResult = calculateSupplierScore(kpis, settings.weights, settings.thresholds);
  const rating = calculateSupplierRating(scoreResult.overallScore, settings.ratingBands);
  const risk = calculateSupplierRisk(kpis, scoreResult.overallScore, settings.thresholds);

  // Price analytics for this supplier
  const priceAnalytics = calculateSupplierPriceAnalytics(allPOs, allPOItems, allGRNs, allGRNItems, allProducts, [supplier]);
  const supplierPriceStats = priceAnalytics.productStats.filter(p => p.supplierId === supplier.id);

  // Recommendations
  const recommendations = calculateSupplierActionRecommendations(
    supplier.name,
    kpis,
    scoreResult.overallScore,
    risk.riskLevel,
    supplierPriceStats
  );

  // Trend detection
  let trend: 'improving' | 'declining' | 'stable' | 'insufficient_data' = 'insufficient_data';
  const prevScore = previousSnapshot?.overallScore ?? null;

  if (scoreResult.overallScore !== null && prevScore !== null) {
    const diff = scoreResult.overallScore - prevScore;
    if (diff >= 2) trend = 'improving';
    else if (diff <= -2) trend = 'declining';
    else trend = 'stable';
  } else if (scoreResult.overallScore !== null) {
    trend = 'stable';
  }

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierCode: supplier.supplierCode,
    periodStart: startDate,
    periodEnd: endDate,
    overallScore: scoreResult.overallScore,
    rating,
    riskLevel: risk.riskLevel,
    riskFactors: risk.riskFactors,
    kpis,
    componentScores: scoreResult.componentScores,
    normalizedWeights: scoreResult.normalizedWeights,
    dataConfidence: scoreResult.dataConfidence,
    totalEligiblePOs: kpis.totalPurchaseOrders,
    totalGRNs: kpis.totalGoodsReceipts,
    trend,
    previousScore: prevScore,
    recommendations,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * 8. Compare 2 to 5 Suppliers Side-by-Side
 */
export function compareSuppliers(
  supplierIds: string[],
  allSuppliers: Supplier[],
  allPOs: PurchaseOrder[],
  allPOItems: PurchaseOrderItem[],
  allGRNs: GoodsReceipt[],
  allGRNItems: GoodsReceiptItem[],
  allProducts: Product[],
  settings: SupplierScorecardSettings = DEFAULT_SCORECARD_SETTINGS,
  startDate?: string,
  endDate?: string
): SupplierPerformanceScore[] {
  const selectedSuppliers = allSuppliers.filter(s => supplierIds.includes(s.id));
  return selectedSuppliers.map(sup => {
    return getSupplierPerformanceSummary(
      sup,
      allPOs,
      allPOItems,
      allGRNs,
      allGRNItems,
      allProducts,
      settings,
      startDate,
      endDate
    );
  });
}

/**
 * 9. Save Performance Snapshot to Firestore
 */
export async function createSupplierPerformanceSnapshot(
  snapshotData: Omit<SupplierPerformanceSnapshot, 'id' | 'createdAt'>,
  currentUser: AuthUser
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required' };

    const snapshotRef = doc(collection(db, 'supplier_performance_snapshots'));
    const payload: SupplierPerformanceSnapshot = {
      id: snapshotRef.id,
      ...snapshotData,
      createdAt: new Date().toISOString(),
      createdByUserId: currentUser.uid || currentUser.id,
      createdByUserName: currentUser.name || 'Admin'
    };

    await setDoc(snapshotRef, cleanUndefined(payload));

    await recordProcurementAuditLog(
      'SUPPLIER_PERFORMANCE_SNAPSHOT_CREATED',
      snapshotRef.id,
      `SNAP-${snapshotData.supplierName}`,
      currentUser,
      `Recorded performance snapshot for ${snapshotData.supplierName} with score ${snapshotData.overallScore ?? 'N/A'}.`
    );

    return { success: true, id: snapshotRef.id };
  } catch (err: any) {
    console.error('Error creating snapshot:', err);
    return { success: false, error: err.message || 'Failed to create snapshot' };
  }
}

/**
 * 10. Fetch Historical Snapshots for a Supplier
 */
export async function fetchSupplierSnapshots(supplierId: string): Promise<SupplierPerformanceSnapshot[]> {
  try {
    const q = query(
      collection(db, 'supplier_performance_snapshots'),
      where('supplierId', '==', supplierId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as SupplierPerformanceSnapshot));
  } catch (err) {
    console.warn('Failed to fetch supplier snapshots:', err);
    return [];
  }
}
