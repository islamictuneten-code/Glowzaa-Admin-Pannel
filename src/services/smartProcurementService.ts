import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  AuthUser,
  Product, 
  Order, 
  OrderItem,
  Supplier, 
  SupplierProduct,
  PurchaseOrder, 
  PurchaseOrderItem, 
  GoodsReceipt, 
  GoodsReceiptItem,
  ProcurementRecommendation,
  ProcurementRecommendationType,
  ProcurementPriority,
  ProcurementRecommendationStatus,
  ProcurementConfidence,
  StockoutRiskLevel,
  ProcurementSupplierOption,
  ProcurementKPIs,
  ProcurementHealthSummary,
  OpenPORiskItem,
  ProcurementSpendAnalytics,
  ProcurementAuditLogEntry,
  ProcurementSettings,
  SupplierRiskLevel,
  SupplierPerformanceRating
} from '../types';
import { cleanUndefined, recordProcurementAuditLog } from './firestoreService';
import { 
  calculateSupplierScorecard, 
  getScorecardSettings, 
  calculateSupplierKPIs,
  safeDivide,
  roundTo
} from './supplierPerformanceService';
import { computeProductForecasts, ProductDemandForecast } from './salesForecastService';

export const DEFAULT_PROCUREMENT_SETTINGS: ProcurementSettings = {
  id: 'global',
  highValueApprovalThresholdBDT: 50000,
  defaultLeadTimeDays: 7,
  defaultSafetyStockDays: 7,
  overstockThresholdDays: 60,
  demandSpikeThresholdPercent: 30,
  demandDropThresholdPercent: -30,
  updatedAt: new Date().toISOString()
};

/**
 * Fetch global procurement settings with fallback
 */
export async function getProcurementSettings(): Promise<ProcurementSettings> {
  try {
    const snap = await getDoc(doc(db, 'procurement_settings', 'global'));
    if (snap.exists()) {
      return { ...DEFAULT_PROCUREMENT_SETTINGS, ...(snap.data() as any) };
    }
  } catch (err) {
    console.warn('Failed to load procurement settings, using defaults:', err);
  }
  return DEFAULT_PROCUREMENT_SETTINGS;
}

/**
 * Save procurement settings with audit log
 */
export async function saveProcurementSettings(
  settings: Partial<ProcurementSettings>,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can modify procurement configuration.' };
    }
    const payload: ProcurementSettings = {
      ...DEFAULT_PROCUREMENT_SETTINGS,
      ...settings,
      id: 'global',
      updatedAt: new Date().toISOString(),
      updatedByUserId: currentUser.uid || currentUser.id,
      updatedByUserName: currentUser.name || 'Admin'
    };
    await setDoc(doc(db, 'procurement_settings', 'global'), cleanUndefined(payload));
    await recordProcurementAuditLog(
      'PROCUREMENT_SETTINGS_UPDATED',
      'global',
      'PROCUREMENT-CONFIG',
      currentUser,
      'Updated high-value threshold and procurement risk settings.'
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save procurement settings.' };
  }
}

/**
 * Helper to compute days of cover safely without division by zero
 */
export function calculateDaysOfCover(stock: number, dailyDemand: number): { days: number | null; text: string } {
  if (stock <= 0) {
    return { days: 0, text: '0 Days (Out of Stock)' };
  }
  if (!dailyDemand || dailyDemand <= 0 || isNaN(dailyDemand)) {
    return { days: null, text: 'No Current Demand' };
  }
  const days = Math.round(stock / dailyDemand);
  return { days, text: `${days} Days` };
}

/**
 * Helper to compute stockout risk level and projected stockout days
 */
export function calculateStockoutRisk(
  availableStock: number, 
  dailyDemand: number, 
  leadTimeDays: number,
  safetyStock: number
): { risk: StockoutRiskLevel; daysRemaining: number | null; projectedDate: string | null } {
  if (availableStock <= 0) {
    return { risk: 'CRITICAL', daysRemaining: 0, projectedDate: new Date().toISOString().split('T')[0] };
  }
  if (!dailyDemand || dailyDemand <= 0) {
    return { risk: 'NONE', daysRemaining: null, projectedDate: null };
  }

  const daysRemaining = Math.floor(availableStock / dailyDemand);
  const projectedDate = new Date(Date.now() + daysRemaining * 86400000).toISOString().split('T')[0];

  if (daysRemaining <= 3) {
    return { risk: 'CRITICAL', daysRemaining, projectedDate };
  }
  if (daysRemaining <= leadTimeDays) {
    return { risk: 'HIGH', daysRemaining, projectedDate };
  }
  if (availableStock <= safetyStock) {
    return { risk: 'MEDIUM', daysRemaining, projectedDate };
  }
  if (daysRemaining <= 30) {
    return { risk: 'LOW', daysRemaining, projectedDate };
  }
  return { risk: 'NONE', daysRemaining, projectedDate };
}

/**
 * Core Procurement Decision Engine:
 * Ingests all active master records and generates deterministic, traceable procurement recommendations.
 */
export async function generateProcurementRecommendations(
  customSettings?: ProcurementSettings
): Promise<{
  recommendations: ProcurementRecommendation[];
  kpis: ProcurementKPIs;
  health: ProcurementHealthSummary;
  openPORisks: OpenPORiskItem[];
  spendAnalytics: ProcurementSpendAnalytics;
}> {
  const settings = customSettings || await getProcurementSettings();
  const scorecardSettings = await getScorecardSettings();

  // 1. Fetch raw data concurrently
  const [
    productsSnap,
    ordersSnap,
    posSnap,
    poItemsSnap,
    grnsSnap,
    grnItemsSnap,
    suppliersSnap,
    supplierProductsSnap,
    existingRecsSnap
  ] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'purchase_orders')),
    getDocs(collection(db, 'purchase_order_items')),
    getDocs(collection(db, 'goods_receipts')),
    getDocs(collection(db, 'goods_receipt_items')),
    getDocs(collection(db, 'suppliers')),
    getDocs(collection(db, 'supplier_products')),
    getDocs(collection(db, 'procurement_recommendations')).catch(() => ({ docs: [] } as any))
  ]);

  const products = productsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Product));
  const orders = ordersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Order));
  const purchaseOrders = posSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrder));
  const poItems = poItemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrderItem));
  const grns = grnsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as GoodsReceipt));
  const grnItems = grnItemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as GoodsReceiptItem));
  const suppliers = suppliersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Supplier));
  const supplierProducts = supplierProductsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as SupplierProduct));

  // Existing recommendations map for status preservation (actioned, dismissed, etc.)
  const existingRecsMap = new Map<string, any>();
  if (existingRecsSnap && existingRecsSnap.docs) {
    for (const d of existingRecsSnap.docs) {
      existingRecsMap.set(d.id, d.data());
    }
  }

  // 2. Generate Sales Demand Forecasts (reusing STEP 16 forecasting model)
  let forecastsMap = new Map<string, ProductDemandForecast>();
  try {
    const allForecasts = computeProductForecasts(products, orders);
    for (const f of allForecasts) {
      forecastsMap.set(f.productId, f);
    }
  } catch (fcErr) {
    console.warn('Could not generate full sales forecasts, falling back to direct calculation:', fcErr);
  }

  // 3. Compute Supplier Performance Scorecards (STEP 17.4)
  const supplierScorecardsMap = new Map<string, any>();
  for (const s of suppliers) {
    try {
      const scorecard = calculateSupplierScorecard(s.id, purchaseOrders, grns, grnItems, s.name, scorecardSettings);
      supplierScorecardsMap.set(s.id, scorecard);
    } catch (scErr) {
      supplierScorecardsMap.set(s.id, null);
    }
  }

  // 4. Calculate Inbound Stock by Product
  // STRICT RULE: Only count open, approved, sent, in-transit, or partially received POs!
  // Exclude draft, pending_approval, cancelled, rejected, closed, or fully received POs.
  const validInboundStatuses = new Set(['approved', 'sent_to_supplier', 'supplier_confirmed', 'in_transit', 'partially_received']);
  const activePOs = purchaseOrders.filter(po => validInboundStatuses.has(po.status));
  const activePOIds = new Set(activePOs.map(po => po.id));

  const inboundStockByProduct = new Map<string, { units: number; poRefs: string[]; valueBDT: number }>();
  for (const item of poItems) {
    if (activePOIds.has(item.purchaseOrderId)) {
      const remainingUnits = item.remainingQuantity !== undefined 
        ? Math.max(0, item.remainingQuantity) 
        : Math.max(0, (item.orderedQuantity || 0) - (item.receivedQuantity || 0));
      
      if (remainingUnits > 0) {
        const prev = inboundStockByProduct.get(item.productId) || { units: 0, poRefs: [], valueBDT: 0 };
        prev.units += remainingUnits;
        prev.valueBDT += (remainingUnits * (item.unitPurchasePriceBDT || 0));
        if (!prev.poRefs.includes(item.purchaseOrderId)) {
          prev.poRefs.push(item.purchaseOrderId);
        }
        inboundStockByProduct.set(item.productId, prev);
      }
    }
  }

  // 5. Calculate Committed / Reserved Stock by Product (pending/confirmed sales orders)
  const reservedStockByProduct = new Map<string, number>();
  const activeSalesOrders = orders.filter(o => ['pending', 'confirmed', 'processing', 'packing'].includes(o.orderStatus || (o as any).status));
  for (const order of activeSalesOrders) {
    if (Array.isArray(order.items)) {
      for (const it of order.items) {
        const pId = it.productId;
        const qty = Number(it.quantity || 0);
        reservedStockByProduct.set(pId, (reservedStockByProduct.get(pId) || 0) + qty);
      }
    }
  }

  // 6. Map Supplier Products by Product ID
  const supplierProductsByProduct = new Map<string, SupplierProduct[]>();
  for (const sp of supplierProducts) {
    if (sp.isActive !== false) {
      const list = supplierProductsByProduct.get(sp.productId) || [];
      list.push(sp);
      supplierProductsByProduct.set(sp.productId, list);
    }
  }

  // 7. Evaluate Recommendations for Each Product
  const recommendations: ProcurementRecommendation[] = [];
  let totalOverstockValueBDT = 0;
  let totalOverstockProductCount = 0;
  let totalSavingsOpportunityBDT = 0;

  for (const product of products) {
    const forecast = forecastsMap.get(product.id);
    const inboundData = inboundStockByProduct.get(product.id) || { units: 0, poRefs: [], valueBDT: 0 };
    const inboundUnits = inboundData.units;
    const reservedUnits = reservedStockByProduct.get(product.id) || 0;
    const currentStock = Number(product.currentStock || 0);
    const availableStock = Math.max(0, currentStock - reservedUnits);

    // Demand Velocity
    const dailyDemand = forecast ? Number(forecast.averageDailyUnits || 0) : 0;
    const weeklyVelocity = forecast ? Number(forecast.averageWeeklyUnits || 0) : roundTo(dailyDemand * 7, 1) || 0;
    const forecastDemand30Days = forecast ? Number(forecast.forecast30Days || 0) : roundTo(dailyDemand * 30, 0) || 0;
    const demandTrendPercent = forecast ? Number(forecast.salesTrendPercent || 0) : 0;

    // Supplier Options Evaluation
    const availableSupplierProducts = supplierProductsByProduct.get(product.id) || [];
    const supplierOptions: ProcurementSupplierOption[] = [];

    for (const sp of availableSupplierProducts) {
      const sup = suppliers.find(s => s.id === sp.supplierId);
      const scorecard = supplierScorecardsMap.get(sp.supplierId);

      const score = scorecard && scorecard.overallScore !== null ? Number(scorecard.overallScore) : null;
      const rating: SupplierPerformanceRating = scorecard ? scorecard.rating : 'Unrated';
      const riskLevel: SupplierRiskLevel = scorecard ? scorecard.riskLevel : 'Low';
      const otif = scorecard && scorecard.kpis ? scorecard.kpis.otifRate : null;
      const damageRate = scorecard && scorecard.kpis ? scorecard.kpis.damageRate : null;
      const leadTimeDays = sp.leadTimeDays || (sup ? sup.defaultLeadTimeDays : null) || settings.defaultLeadTimeDays;
      const unitPriceBDT = Number(sp.purchasePrice || 0);
      const effectiveCostBDT = unitPriceBDT * (1 + ((damageRate || 0) / 100));

      supplierOptions.push({
        supplierId: sp.supplierId,
        supplierName: sp.supplierName || (sup ? sup.name : 'Unknown Supplier'),
        supplierCode: sup?.supplierCode,
        unitPriceBDT: unitPriceBDT > 0 ? unitPriceBDT : null,
        effectiveCostBDT: effectiveCostBDT > 0 ? roundTo(effectiveCostBDT, 2) : null,
        score,
        rating,
        riskLevel,
        leadTimeDays,
        otifRate: otif,
        damageRate: damageRate,
        moq: sp.minimumOrderQuantity || 1,
        currency: sp.currency || 'BDT',
        rank: 'alternative_1'
      });
    }

    // Rank Suppliers: High Performance Score > Valid Price > Low Risk > Lead Time
    supplierOptions.sort((a, b) => {
      // Prioritize Preferred or Highest Score
      const scoreA = a.score !== null ? a.score : 50;
      const scoreB = b.score !== null ? b.score : 50;
      if (Math.abs(scoreA - scoreB) > 10) {
        return scoreB - scoreA;
      }
      // If scores close, compare price
      const priceA = a.unitPriceBDT || Infinity;
      const priceB = b.unitPriceBDT || Infinity;
      if (priceA !== priceB) {
        return priceA - priceB;
      }
      return (a.leadTimeDays || 99) - (b.leadTimeDays || 99);
    });

    let preferredSupplier: ProcurementSupplierOption | null = null;
    const alternativeSuppliers: ProcurementSupplierOption[] = [];

    if (supplierOptions.length > 0) {
      preferredSupplier = {
        ...supplierOptions[0],
        rank: 'preferred',
        selectionReason: supplierOptions[0].score && supplierOptions[0].score >= 75
          ? `High overall performance (${supplierOptions[0].score}/100) with competitive pricing.`
          : `Active supplier with valid purchase pricing.`
      };
      for (let i = 1; i < supplierOptions.length; i++) {
        alternativeSuppliers.push({
          ...supplierOptions[i],
          rank: i === 1 ? 'alternative_1' : 'alternative_2'
        });
      }
    }

    // Supply Parameters
    const leadTimeDays = preferredSupplier?.leadTimeDays || settings.defaultLeadTimeDays;
    const safetyStock = product.lowStockThreshold !== undefined && product.lowStockThreshold > 0
      ? product.lowStockThreshold
      : Math.max(5, Math.ceil(dailyDemand * settings.defaultSafetyStockDays));
    
    const demandDuringLeadTime = Math.ceil(dailyDemand * leadTimeDays);
    const reorderPoint = demandDuringLeadTime + safetyStock;
    const projectedStock = availableStock + inboundUnits - demandDuringLeadTime;

    const { days: daysOfCover, text: daysOfCoverText } = calculateDaysOfCover(availableStock + inboundUnits, dailyDemand);
    const { risk: stockoutRisk, daysRemaining: projectedStockoutDays, projectedDate: projectedStockoutDate } = 
      calculateStockoutRisk(availableStock, dailyDemand, leadTimeDays, safetyStock);

    // Price & Cost Determination
    const unitPriceBDT = preferredSupplier?.unitPriceBDT 
      || (product.purchasePrice && product.purchasePrice > 0 ? product.purchasePrice : null);

    // Confidence Assessment
    let confidence: ProcurementConfidence = 'Medium';
    const confidenceFactors: string[] = [];

    if (forecast && (forecast.dataQuality === 'excellent' || forecast.confidence === 'High')) {
      confidenceFactors.push('Strong sales history with reliable 30-day velocity.');
    } else if (!forecast || forecast.dataQuality === 'insufficient') {
      confidence = 'Insufficient Data';
      confidenceFactors.push('Limited or missing sales history.');
    } else {
      confidenceFactors.push('Moderate sales velocity history.');
    }

    if (preferredSupplier && preferredSupplier.score !== null) {
      confidenceFactors.push(`Supplier performance verified (${preferredSupplier.score}/100).`);
      if (confidence !== 'Insufficient Data') confidence = 'High';
    } else if (!preferredSupplier) {
      confidence = 'Low';
      confidenceFactors.push('No linked supplier record found; manual selection required.');
    }

    if (unitPriceBDT === null) {
      confidence = 'Low';
      confidenceFactors.push('No valid purchase price on file.');
    }

    // Recommendation Type & Priority Determination
    let recType: ProcurementRecommendationType = 'NO_ACTION';
    let priority: ProcurementPriority = 'low';
    let recommendedQuantity = 0;
    let targetStockLevel = reorderPoint + Math.ceil(dailyDemand * 14); // Target: 14 days post-arrival buffer
    const reasons: string[] = [];
    const consequencesOfNoAction: string[] = [];
    let title = '';
    let summary = '';
    let potentialSavingsBDT = 0;
    let excessUnits = 0;
    let excessValueBDT = 0;

    // Evaluate Potential Savings from Alternative Suppliers
    if (preferredSupplier && alternativeSuppliers.length > 0) {
      for (const alt of alternativeSuppliers) {
        if (alt.unitPriceBDT && preferredSupplier.unitPriceBDT && alt.unitPriceBDT < preferredSupplier.unitPriceBDT) {
          const savingPerUnit = preferredSupplier.unitPriceBDT - alt.unitPriceBDT;
          const altScore = alt.score !== null ? alt.score : 0;
          if (altScore >= 65) { // Only recommend if alternative has acceptable score
            const potentialSavings = Math.round(savingPerUnit * (recommendedQuantity || Math.ceil(dailyDemand * 30) || 50));
            if (potentialSavings > potentialSavingsBDT) {
              potentialSavingsBDT = potentialSavings;
            }
          }
        }
      }
    }

    // Logic Rules Matrix:
    // 1. Critical Stockout (Stockout in <= 3 days or already out of stock)
    if (stockoutRisk === 'CRITICAL') {
      recType = 'REORDER_NOW';
      priority = 'critical';
      recommendedQuantity = Math.max(0, targetStockLevel - (availableStock + inboundUnits));
      if (preferredSupplier?.moq && recommendedQuantity < preferredSupplier.moq) {
        recommendedQuantity = preferredSupplier.moq;
      }

      title = `Critical Stockout Alert: Immediate Reorder Required for ${product.name}`;
      summary = `Stock is projected to run out in ${projectedStockoutDays === 0 ? '0 days (OUT OF STOCK)' : `${projectedStockoutDays} days`}, which is less than supplier lead time (${leadTimeDays} days).`;
      reasons.push(`Current available inventory is ${availableStock} units.`);
      reasons.push(`Daily demand velocity is ${roundTo(dailyDemand, 1)} units/day.`);
      reasons.push(`Inbound expected stock is ${inboundUnits} units.`);
      reasons.push(`Supplier delivery lead time requires ${leadTimeDays} days.`);
      consequencesOfNoAction.push(`Immediate stockout and loss of customer wholesale orders.`);
      consequencesOfNoAction.push(`Unfulfilled demand of approximately ${Math.ceil(dailyDemand * leadTimeDays)} units during replenishment delay.`);
    } 
    // 2. High Stockout Risk (Stockout expected during lead time)
    else if (stockoutRisk === 'HIGH' || (availableStock + inboundUnits) < reorderPoint) {
      recType = 'REORDER_NOW';
      priority = 'high';
      recommendedQuantity = Math.max(0, targetStockLevel - (availableStock + inboundUnits));
      if (preferredSupplier?.moq && recommendedQuantity < preferredSupplier.moq) {
        recommendedQuantity = preferredSupplier.moq;
      }

      title = `Reorder Now: Stock Approaching Reorder Point (${product.name})`;
      summary = `Stock level (${availableStock} units) + inbound (${inboundUnits} units) is below reorder point (${reorderPoint} units).`;
      reasons.push(`Daily demand is ${roundTo(dailyDemand, 1)} units.`);
      reasons.push(`Lead time demand (${demandDuringLeadTime} units) + safety stock (${safetyStock} units) exceeds available position.`);
      consequencesOfNoAction.push(`Stockout expected on approximately ${projectedStockoutDate || 'upcoming week'}.`);
    }
    // 3. Demand Spike Alert
    else if (demandTrendPercent >= settings.demandSpikeThresholdPercent && dailyDemand > 0) {
      recType = 'DEMAND_SPIKE';
      priority = 'high';
      recommendedQuantity = Math.max(0, Math.ceil(targetStockLevel * 1.25) - (availableStock + inboundUnits));
      if (preferredSupplier?.moq && recommendedQuantity < preferredSupplier.moq) {
        recommendedQuantity = preferredSupplier.moq;
      }

      title = `Demand Spike (+${Math.round(demandTrendPercent)}%): Adjust Procurement Plan`;
      summary = `Sales velocity increased by ${Math.round(demandTrendPercent)}% over baseline. Current stock may deplete faster than anticipated.`;
      reasons.push(`Recent demand velocity jumped to ${roundTo(dailyDemand, 1)} units/day.`);
      reasons.push(`Target stock adjusted upwards to compensate for elevated run-rate.`);
      consequencesOfNoAction.push(`Stock coverage may fall below safety thresholds prematurely.`);
    }
    // 4. Overstock Detected
    else if (daysOfCover !== null && daysOfCover > settings.overstockThresholdDays && availableStock > 20) {
      recType = 'OVERSTOCK';
      priority = 'low';
      recommendedQuantity = 0;
      excessUnits = Math.max(0, availableStock - Math.ceil(dailyDemand * 30));
      excessValueBDT = Math.round(excessUnits * (unitPriceBDT || product.wholesalePrice || 0));
      totalOverstockValueBDT += excessValueBDT;
      totalOverstockProductCount++;

      title = `Overstock Detected: Holding ${daysOfCover} Days of Cover`;
      summary = `Current inventory of ${availableStock} units significantly exceeds the ${settings.overstockThresholdDays}-day holding limit.`;
      reasons.push(`Sales velocity of ${roundTo(dailyDemand, 1)} units/day indicates slow capital turnover.`);
      reasons.push(`Estimated excess holding is ${excessUnits} units (valued at ~৳${excessValueBDT.toLocaleString()}).`);
      reasons.push(`Recommendation: DO NOT REORDER at this time.`);
      consequencesOfNoAction.push(`Capital tied up in holding inventory with potential carrying cost.`);
    }
    // 5. Excess Inbound Warning
    else if (inboundUnits > 0 && availableStock > (dailyDemand * 30) && (availableStock + inboundUnits) > (dailyDemand * 60)) {
      recType = 'EXCESS_INBOUND';
      priority = 'medium';
      recommendedQuantity = 0;

      title = `Excess Inbound Warning: Open POs May Cause Overstock`;
      summary = `Current inventory (${availableStock} units) combined with incoming POs (${inboundUnits} units) provides ${daysOfCoverText} of coverage.`;
      reasons.push(`Open PO reference(s): ${inboundData.poRefs.join(', ') || 'N/A'}`);
      reasons.push(`Forecast demand over next 30 days is ${forecastDemand30Days} units.`);
      consequencesOfNoAction.push(`Warehouse overfill and surplus stock accumulation.`);
    }
    // 6. Supplier Risk Alert
    else if (preferredSupplier && (preferredSupplier.riskLevel === 'Severe' || preferredSupplier.riskLevel === 'High')) {
      recType = 'SUPPLIER_RISK';
      priority = 'medium';
      recommendedQuantity = (availableStock + inboundUnits) < reorderPoint 
        ? Math.max(0, targetStockLevel - (availableStock + inboundUnits))
        : 0;

      title = `Supplier Risk Warning: Preferred Supplier Has Elevated Risk`;
      summary = `Preferred supplier "${preferredSupplier.supplierName}" has a score of ${preferredSupplier.score || 'unrated'} and elevated delivery/quality risk.`;
      reasons.push(`Elevated risk level: ${preferredSupplier.riskLevel}.`);
      if (alternativeSuppliers.length > 0) {
        reasons.push(`Alternative supplier(s) available: ${alternativeSuppliers.map(a => a.supplierName).join(', ')}.`);
      }
      consequencesOfNoAction.push(`Potential delivery delays or defect risk on incoming orders.`);
    }
    // 7. Price Opportunity
    else if (potentialSavingsBDT > 500) {
      recType = 'PRICE_OPPORTUNITY';
      priority = 'low';
      recommendedQuantity = (availableStock + inboundUnits) < reorderPoint 
        ? Math.max(0, targetStockLevel - (availableStock + inboundUnits))
        : 0;

      title = `Price Savings Opportunity: Potential ৳${potentialSavingsBDT.toLocaleString()} Saving`;
      summary = `Alternative verified supplier offers lower unit pricing compared to current baseline.`;
      reasons.push(`Potential saving of ~৳${potentialSavingsBDT.toLocaleString()} across recommended purchasing.`);
      consequencesOfNoAction.push(`Purchasing at suboptimal unit costs.`);
    }
    // 8. Demand Drop
    else if (demandTrendPercent <= settings.demandDropThresholdPercent && dailyDemand > 0) {
      recType = 'DEMAND_DROP';
      priority = 'low';
      recommendedQuantity = 0;

      title = `Demand Decline (${Math.round(demandTrendPercent)}%): Procurement Throttled`;
      summary = `Sales demand contracted by ${Math.abs(Math.round(demandTrendPercent))}%. Reorder thresholds scaled back to avoid surplus.`;
      reasons.push(`Historical run-rate decreased.`);
      consequencesOfNoAction.push(`Risk of over-ordering if baseline is not adjusted.`);
    }
    // 9. Reorder Soon / Planned
    else if ((availableStock + inboundUnits) < (reorderPoint + (dailyDemand * 7))) {
      recType = 'REORDER_SOON';
      priority = 'medium';
      recommendedQuantity = Math.max(0, targetStockLevel - (availableStock + inboundUnits));
      if (preferredSupplier?.moq && recommendedQuantity < preferredSupplier.moq) {
        recommendedQuantity = preferredSupplier.moq;
      }

      title = `Reorder Soon: Stock Level Approaching Threshold (${product.name})`;
      summary = `Stock is adequate for immediate needs but will require reorder within ${Math.max(1, (projectedStockoutDays || 14) - leadTimeDays)} days.`;
      reasons.push(`Projected stockout within ${(projectedStockoutDays || 14)} days.`);
      consequencesOfNoAction.push(`Will become critical reorder in next planning cycle.`);
    }
    // 10. Healthy / No Action
    else {
      recType = 'NO_ACTION';
      priority = 'planned';
      recommendedQuantity = 0;

      title = `Stock Healthy: ${product.name}`;
      summary = `Inventory position is balanced (${daysOfCoverText} cover). No purchasing needed.`;
      reasons.push(`Current stock (${availableStock} units) comfortably exceeds reorder point (${reorderPoint} units).`);
    }

    if (potentialSavingsBDT > 0) {
      totalSavingsOpportunityBDT += potentialSavingsBDT;
    }

    // Calculate Estimated Total Cost
    const estimatedCostBDT = unitPriceBDT !== null && recommendedQuantity > 0 
      ? roundTo(recommendedQuantity * unitPriceBDT, 2) 
      : null;

    // Preserved recommendation status from Firestore if exists
    const recId = `rec_${product.id}`;
    const existingRec = existingRecsMap.get(recId);
    const status: ProcurementRecommendationStatus = existingRec && existingRec.status 
      ? existingRec.status 
      : 'new';

    const recommendation: ProcurementRecommendation = {
      id: recId,
      productId: product.id,
      productName: product.name,
      sku: product.sku || '',
      category: product.category,
      type: recType,
      priority,
      status,
      confidence,
      confidenceFactors,

      currentStock,
      reservedStock: reservedUnits,
      inboundStock: inboundUnits,
      availableStock,
      projectedStock,

      averageDailyDemand: roundTo(dailyDemand, 2) || 0,
      weeklyVelocity: roundTo(weeklyVelocity, 1) || 0,
      forecastDemand30Days: Math.round(forecastDemand30Days),
      demandTrendPercent: Math.round(demandTrendPercent),

      leadTimeDays,
      safetyStock,
      reorderPoint,
      daysOfCover,
      daysOfCoverText,

      stockoutRisk,
      projectedStockoutDays,
      projectedStockoutDate,

      recommendedQuantity: Math.max(0, recommendedQuantity),
      targetStockLevel,
      unitPriceBDT,
      estimatedCostBDT,

      preferredSupplier,
      alternativeSuppliers,

      title,
      summary,
      reasons,
      consequencesOfNoAction,
      potentialSavingsBDT: potentialSavingsBDT > 0 ? potentialSavingsBDT : undefined,

      excessUnits: excessUnits > 0 ? excessUnits : undefined,
      excessValueBDT: excessValueBDT > 0 ? excessValueBDT : undefined,
      openPORefs: inboundData.poRefs.length > 0 ? inboundData.poRefs : undefined,

      approvedQuantity: existingRec?.approvedQuantity,
      overrideReason: existingRec?.overrideReason,
      purchaseOrderId: existingRec?.purchaseOrderId,
      purchaseOrderNumber: existingRec?.purchaseOrderNumber,
      reviewedByUserId: existingRec?.reviewedByUserId,
      reviewedByUserName: existingRec?.reviewedByUserName,
      actionedByUserId: existingRec?.actionedByUserId,
      actionedByUserName: existingRec?.actionedByUserName,
      dismissedByUserId: existingRec?.dismissedByUserId,
      dismissedByUserName: existingRec?.dismissedByUserName,
      dismissReason: existingRec?.dismissReason,
      createdAt: existingRec?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewedAt: existingRec?.reviewedAt,
      actionedAt: existingRec?.actionedAt,
      dismissedAt: existingRec?.dismissedAt
    };

    recommendations.push(recommendation);
  }

  // Sort recommendations: Critical first, then High, then Medium, then Low, then Planned
  const priorityWeight: Record<ProcurementPriority, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    planned: 1
  };
  recommendations.sort((a, b) => {
    const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return (b.estimatedCostBDT || 0) - (a.estimatedCostBDT || 0);
  });

  // 8. Calculate Open PO Risks
  const openPORisks: OpenPORiskItem[] = [];
  const nowMs = Date.now();
  for (const po of activePOs) {
    let daysOverdue = 0;
    let riskType: OpenPORiskItem['riskType'] = 'NORMAL';
    let riskSeverity: OpenPORiskItem['riskSeverity'] = 'low';
    let riskReason = 'On track for scheduled delivery';

    if (po.expectedDeliveryDate) {
      const expMs = new Date(po.expectedDeliveryDate).getTime();
      if (!isNaN(expMs)) {
        if (expMs < nowMs) {
          daysOverdue = Math.ceil((nowMs - expMs) / 86400000);
          riskType = 'LATE';
          riskSeverity = daysOverdue > 7 ? 'critical' : 'high';
          riskReason = `Order is ${daysOverdue} days past promised delivery date (${po.expectedDeliveryDate}).`;
        } else if (expMs - nowMs <= 3 * 86400000) {
          riskType = 'APPROACHING_DUE';
          riskSeverity = 'medium';
          riskReason = `Due for delivery within next 3 days (${po.expectedDeliveryDate}).`;
        }
      }
    } else {
      riskType = 'APPROACHING_DUE';
      riskSeverity = 'medium';
      riskReason = 'No expected delivery date specified by supplier.';
    }

    if (po.status === 'partially_received') {
      riskType = 'PARTIAL_DELIVERY';
      riskSeverity = 'high';
      riskReason = `Partially delivered (${po.totalReceivedQuantity || 0} / ${po.totalOrderedQuantity || 0} units received).`;
    }

    const supplierCard = supplierScorecardsMap.get(po.supplierId);
    if (supplierCard && (supplierCard.riskLevel === 'CRITICAL_RISK' || supplierCard.riskLevel === 'HIGH_RISK')) {
      if (riskType === 'NORMAL') {
        riskType = 'SUPPLIER_RISK';
        riskSeverity = 'medium';
        riskReason = `Supplier has elevated risk score (${supplierCard.overallScore || 'unrated'}/100).`;
      }
    }

    const remainingQty = po.totalRemainingQuantity !== undefined 
      ? po.totalRemainingQuantity 
      : Math.max(0, (po.totalOrderedQuantity || 0) - (po.totalReceivedQuantity || 0));

    openPORisks.push({
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      status: po.status,
      totalAmountBDT: po.totalAmountBDT || 0,
      totalOrderedQuantity: po.totalOrderedQuantity || 0,
      totalReceivedQuantity: po.totalReceivedQuantity || 0,
      remainingQuantity: remainingQty,
      createdAt: po.createdAt,
      expectedDeliveryDate: po.expectedDeliveryDate,
      daysOverdue,
      riskType,
      riskSeverity,
      riskReason
    });
  }

  // Sort PO Risks: Critical > High > Medium > Low
  const poRiskWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  openPORisks.sort((a, b) => poRiskWeight[b.riskSeverity] - poRiskWeight[a.riskSeverity]);

  // 9. Calculate Top KPIs
  let totalPurchaseSpendBDT = 0;
  for (const grn of grns) {
    if (grn.status === 'posted') {
      totalPurchaseSpendBDT += Number(grn.subtotalReceivedValueBDT || 0);
    }
  }
  // Fallback to closed/received POs if no GRN spend
  if (totalPurchaseSpendBDT === 0) {
    for (const po of purchaseOrders) {
      if (po.status === 'received' || po.status === 'closed') {
        totalPurchaseSpendBDT += Number(po.totalAmountBDT || 0);
      }
    }
  }

  let openPurchaseOrdersValueBDT = 0;
  for (const po of activePOs) {
    openPurchaseOrdersValueBDT += Number(po.totalAmountBDT || 0);
  }

  let inboundStockUnits = 0;
  let inboundStockValueBDT = 0;
  for (const item of poItems) {
    if (activePOIds.has(item.purchaseOrderId)) {
      const rem = item.remainingQuantity !== undefined 
        ? Math.max(0, item.remainingQuantity) 
        : Math.max(0, (item.orderedQuantity || 0) - (item.receivedQuantity || 0));
      inboundStockUnits += rem;
      inboundStockValueBDT += (rem * (item.unitPurchasePriceBDT || 0));
    }
  }

  const reorderRequiredCount = recommendations.filter(r => 
    (r.type === 'REORDER_NOW' || r.type === 'REORDER_SOON') && r.status !== 'actioned' && r.status !== 'dismissed'
  ).length;

  const criticalStockoutRiskCount = recommendations.filter(r => 
    r.stockoutRisk === 'CRITICAL' && r.status !== 'actioned' && r.status !== 'dismissed'
  ).length;

  const supplierRiskCount = suppliers.filter(s => {
    const card = supplierScorecardsMap.get(s.id);
    return card && (card.riskLevel === 'HIGH_RISK' || card.riskLevel === 'CRITICAL_RISK');
  }).length;

  const actionableRecs = recommendations.filter(r => r.type !== 'NO_ACTION' && r.status !== 'actioned' && r.status !== 'dismissed');

  const kpis: ProcurementKPIs = {
    totalPurchaseSpendBDT: roundTo(totalPurchaseSpendBDT, 2) || 0,
    openPurchaseOrdersCount: activePOs.length,
    openPurchaseOrdersValueBDT: roundTo(openPurchaseOrdersValueBDT, 2) || 0,
    inboundStockUnits,
    inboundStockValueBDT: roundTo(inboundStockValueBDT, 2) || 0,
    reorderRequiredCount,
    criticalStockoutRiskCount,
    overstockProductCount: totalOverstockProductCount,
    overstockValueBDT: roundTo(totalOverstockValueBDT, 2) || 0,
    supplierRiskCount,
    totalRecommendationsCount: actionableRecs.length,
    criticalRecommendationsCount: actionableRecs.filter(r => r.priority === 'critical').length,
    savingsOpportunityBDT: roundTo(totalSavingsOpportunityBDT, 2) || 0
  };

  // 10. Calculate Procurement Health Summary (0-100 deterministic)
  // Inventory Health: % of products with stockoutRisk not CRITICAL (scaled)
  const nonCriticalProducts = products.length > 0 
    ? products.length - criticalStockoutRiskCount 
    : 1;
  const inventoryHealthScore = Math.min(100, Math.max(0, Math.round((nonCriticalProducts / (products.length || 1)) * 100)));

  // Supplier Health: Average supplier score
  let totalSupScore = 0;
  let ratedSupCount = 0;
  for (const s of suppliers) {
    const card = supplierScorecardsMap.get(s.id);
    if (card && card.overallScore !== null) {
      totalSupScore += card.overallScore;
      ratedSupCount++;
    }
  }
  const supplierHealthScore = ratedSupCount > 0 
    ? Math.round(totalSupScore / ratedSupCount) 
    : 75; // Baseline good if unrated

  // Overall Health Score: 50% Inventory + 30% Supplier + 20% Open PO
  const openPOOnTimeCount = openPORisks.filter(r => r.riskSeverity === 'low').length;
  const poHealthScore = activePOs.length > 0 
    ? Math.round((openPOOnTimeCount / activePOs.length) * 100) 
    : 90;

  const overallHealthScore = Math.round(
    (inventoryHealthScore * 0.45) + (supplierHealthScore * 0.35) + (poHealthScore * 0.20)
  );

  const overallHealthStatus: ProcurementHealthSummary['overallHealthStatus'] = 
    overallHealthScore >= 85 ? 'EXCELLENT' :
    overallHealthScore >= 70 ? 'GOOD' :
    overallHealthScore >= 50 ? 'WATCH' : 'RISK';

  const inventoryHealthStatus: ProcurementHealthSummary['inventoryHealthStatus'] = 
    inventoryHealthScore >= 85 ? 'EXCELLENT' :
    inventoryHealthScore >= 70 ? 'GOOD' :
    inventoryHealthScore >= 50 ? 'WATCH' : 'RISK';

  const supplierHealthStatus: ProcurementHealthSummary['supplierHealthStatus'] = 
    supplierHealthScore >= 85 ? 'EXCELLENT' :
    supplierHealthScore >= 70 ? 'GOOD' :
    supplierHealthScore >= 50 ? 'WATCH' : 'RISK';

  const purchaseRiskLevel: ProcurementHealthSummary['purchaseRiskLevel'] = 
    criticalStockoutRiskCount > 0 || openPORisks.some(r => r.riskSeverity === 'critical') ? 'HIGH' :
    reorderRequiredCount > 3 || openPORisks.some(r => r.riskSeverity === 'high') ? 'MEDIUM' : 'LOW';

  let recommendedPurchaseCommitmentBDT = 0;
  for (const r of actionableRecs) {
    if (r.estimatedCostBDT && (r.type === 'REORDER_NOW' || r.type === 'REORDER_SOON')) {
      recommendedPurchaseCommitmentBDT += r.estimatedCostBDT;
    }
  }

  const healthFactors: string[] = [];
  if (criticalStockoutRiskCount > 0) {
    healthFactors.push(`${criticalStockoutRiskCount} product(s) in critical stockout risk.`);
  } else {
    healthFactors.push('Zero immediate stockout outages detected.');
  }
  if (openPORisks.some(r => r.riskType === 'LATE')) {
    healthFactors.push(`${openPORisks.filter(r => r.riskType === 'LATE').length} late purchase order(s) requiring supplier followup.`);
  }
  if (supplierRiskCount > 0) {
    healthFactors.push(`${supplierRiskCount} supplier(s) exhibiting elevated performance risk.`);
  }

  const health: ProcurementHealthSummary = {
    overallHealthScore,
    overallHealthStatus,
    inventoryHealthScore,
    inventoryHealthStatus,
    supplierHealthScore,
    supplierHealthStatus,
    purchaseRiskLevel,
    stockoutRiskProductsCount: criticalStockoutRiskCount,
    actualOpenCommitmentBDT: roundTo(openPurchaseOrdersValueBDT, 2) || 0,
    recommendedPurchaseCommitmentBDT: roundTo(recommendedPurchaseCommitmentBDT, 2) || 0,
    totalProjectedCommitmentBDT: roundTo(openPurchaseOrdersValueBDT + recommendedPurchaseCommitmentBDT, 2) || 0,
    forecastConfidence: 'High',
    healthFactors
  };

  // 11. Spend Analytics Calculation
  const spendBySupplierMap = new Map<string, { spend: number; count: number; name: string }>();
  const spendByCategoryMap = new Map<string, { spend: number; units: number }>();
  const spendByMonthMap = new Map<string, { spend: number; openPO: number; count: number }>();

  for (const po of purchaseOrders) {
    if (po.status !== 'draft' && po.status !== 'cancelled' && po.status !== 'rejected') {
      const supName = po.supplierName || 'Unknown Supplier';
      const prevSup = spendBySupplierMap.get(po.supplierId) || { spend: 0, count: 0, name: supName };
      prevSup.spend += (po.totalAmountBDT || 0);
      prevSup.count += 1;
      spendBySupplierMap.set(po.supplierId, prevSup);

      // Month bucket
      const monthKey = po.createdAt ? po.createdAt.substring(0, 7) : 'Unknown';
      const prevMonth = spendByMonthMap.get(monthKey) || { spend: 0, openPO: 0, count: 0 };
      if (po.status === 'received' || po.status === 'closed') {
        prevMonth.spend += (po.totalAmountBDT || 0);
      } else {
        prevMonth.openPO += (po.totalAmountBDT || 0);
      }
      prevMonth.count += 1;
      spendByMonthMap.set(monthKey, prevMonth);
    }
  }

  for (const item of poItems) {
    const prod = products.find(p => p.id === item.productId);
    const cat = prod?.category || 'General';
    const prevCat = spendByCategoryMap.get(cat) || { spend: 0, units: 0 };
    prevCat.spend += (item.totalLineAmountBDT || (item.orderedQuantity * (item.unitPurchasePriceBDT || 0)));
    prevCat.units += (item.orderedQuantity || 0);
    spendByCategoryMap.set(cat, prevCat);
  }

  const spendBySupplier: ProcurementSpendAnalytics['spendBySupplier'] = [];
  const totalAnalyzedSpend = totalPurchaseSpendBDT + openPurchaseOrdersValueBDT || 1;
  spendBySupplierMap.forEach((val, id) => {
    spendBySupplier.push({
      supplierId: id,
      supplierName: val.name,
      spendBDT: roundTo(val.spend, 2) || 0,
      percentage: roundTo((val.spend / totalAnalyzedSpend) * 100, 1) || 0,
      orderCount: val.count
    });
  });
  spendBySupplier.sort((a, b) => b.spendBDT - a.spendBDT);

  const spendByCategory: ProcurementSpendAnalytics['spendByCategory'] = [];
  spendByCategoryMap.forEach((val, cat) => {
    spendByCategory.push({
      category: cat,
      spendBDT: roundTo(val.spend, 2) || 0,
      percentage: roundTo((val.spend / totalAnalyzedSpend) * 100, 1) || 0,
      units: val.units
    });
  });
  spendByCategory.sort((a, b) => b.spendBDT - a.spendBDT);

  const spendByMonth: ProcurementSpendAnalytics['spendByMonth'] = [];
  spendByMonthMap.forEach((val, month) => {
    spendByMonth.push({
      month,
      spendBDT: roundTo(val.spend, 2) || 0,
      openPOValueBDT: roundTo(val.openPO, 2) || 0,
      orderCount: val.count
    });
  });
  spendByMonth.sort((a, b) => a.month.localeCompare(b.month));

  const savingsOpportunities: ProcurementSpendAnalytics['savingsOpportunities'] = [];
  for (const r of recommendations) {
    if (r.potentialSavingsBDT && r.preferredSupplier && r.alternativeSuppliers.length > 0) {
      const bestAlt = r.alternativeSuppliers[0];
      if (bestAlt.unitPriceBDT && r.preferredSupplier.unitPriceBDT) {
        savingsOpportunities.push({
          productId: r.productId,
          productName: r.productName,
          currentSupplierName: r.preferredSupplier.supplierName,
          betterSupplierName: bestAlt.supplierName,
          currentPriceBDT: r.preferredSupplier.unitPriceBDT,
          betterPriceBDT: bestAlt.unitPriceBDT,
          unitSavingBDT: roundTo(r.preferredSupplier.unitPriceBDT - bestAlt.unitPriceBDT, 2) || 0,
          estimatedPotentialSavingBDT: r.potentialSavingsBDT,
          reason: `Alternative supplier ${bestAlt.supplierName} offers ৳${bestAlt.unitPriceBDT}/unit compared to ৳${r.preferredSupplier.unitPriceBDT}/unit.`
        });
      }
    }
  }

  const spendAnalytics: ProcurementSpendAnalytics = {
    totalSpendBDT: roundTo(totalPurchaseSpendBDT, 2) || 0,
    openPOValueBDT: roundTo(openPurchaseOrdersValueBDT, 2) || 0,
    recommendedSpendBDT: roundTo(recommendedPurchaseCommitmentBDT, 2) || 0,
    spendBySupplier,
    spendByCategory,
    spendByMonth,
    savingsOpportunities
  };

  return {
    recommendations,
    kpis,
    health,
    openPORisks,
    spendAnalytics
  };
}

/**
 * Persist recommendation state changes (e.g. reviewed, dismissed, approved)
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  status: ProcurementRecommendationStatus,
  currentUser: AuthUser,
  extraData?: {
    approvedQuantity?: number;
    overrideReason?: string;
    purchaseOrderId?: string;
    purchaseOrderNumber?: string;
    dismissReason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can take procurement actions.' };
    }

    const recRef = doc(db, 'procurement_recommendations', recommendationId);
    const now = new Date().toISOString();
    const updatePayload: any = {
      status,
      updatedAt: now,
      ...(extraData || {})
    };

    if (status === 'reviewed') {
      updatePayload.reviewedAt = now;
      updatePayload.reviewedByUserId = currentUser.uid || currentUser.id;
      updatePayload.reviewedByUserName = currentUser.name || 'Admin';
    } else if (status === 'approved' || status === 'actioned') {
      updatePayload.actionedAt = now;
      updatePayload.actionedByUserId = currentUser.uid || currentUser.id;
      updatePayload.actionedByUserName = currentUser.name || 'Admin';
    } else if (status === 'dismissed') {
      updatePayload.dismissedAt = now;
      updatePayload.dismissedByUserId = currentUser.uid || currentUser.id;
      updatePayload.dismissedByUserName = currentUser.name || 'Admin';
    }

    await setDoc(recRef, cleanUndefined(updatePayload), { merge: true });

    await recordProcurementAuditLog(
      status === 'dismissed' ? 'PROCUREMENT_RECOMMENDATION_DISMISSED' :
      status === 'approved' ? 'PROCUREMENT_RECOMMENDATION_APPROVED' : 'PROCUREMENT_RECOMMENDATION_VIEWED',
      recommendationId,
      recommendationId,
      currentUser,
      `Recommendation status changed to ${status}. ${extraData?.dismissReason || extraData?.overrideReason || ''}`
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error updating recommendation status:', err);
    return { success: false, error: err?.message || 'Failed to update recommendation status.' };
  }
}

/**
 * EXPLICIT ADMIN ACTION: Create Purchase Order from Recommendation
 * STRICT SAFETY RULE: Requires explicit confirmation and DOES NOT execute automatically.
 */
export async function createPOFromRecommendation(
  recommendation: ProcurementRecommendation,
  selectedSupplierId: string,
  orderQuantity: number,
  unitPrice: number,
  currentUser: AuthUser,
  notes?: string,
  overrideReason?: string
): Promise<{ success: boolean; poId?: string; poNumber?: string; error?: string }> {
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can create Purchase Orders.' };
    }

    if (orderQuantity <= 0) {
      return { success: false, error: 'Order quantity must be greater than zero.' };
    }

    if (unitPrice < 0) {
      return { success: false, error: 'Unit price cannot be negative.' };
    }

    // Verify supplier exists
    const supSnap = await getDoc(doc(db, 'suppliers', selectedSupplierId));
    if (!supSnap.exists()) {
      return { success: false, error: 'Selected supplier does not exist.' };
    }
    const supplier = supSnap.data() as Supplier;
    if (supplier.status !== 'active') {
      return { success: false, error: 'Selected supplier is not active.' };
    }

    // Verify product exists
    const prodSnap = await getDoc(doc(db, 'products', recommendation.productId));
    if (!prodSnap.exists()) {
      return { success: false, error: 'Product does not exist.' };
    }
    const product = prodSnap.data() as Product;

    const poNumber = `GZ-PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const subtotalBDT = orderQuantity * unitPrice;
    const totalAmountBDT = subtotalBDT;

    // Expected delivery date based on supplier lead time
    const leadTime = supplier.defaultLeadTimeDays || 7;
    const expectedDeliveryDate = new Date(Date.now() + leadTime * 86400000).toISOString().split('T')[0];

    const poRef = doc(collection(db, 'purchase_orders'));
    const poItemRef = doc(collection(db, 'purchase_order_items'));
    const recRef = doc(db, 'procurement_recommendations', recommendation.id);

    const batch = writeBatch(db);

    // 1. Create Purchase Order in Draft State
    batch.set(poRef, cleanUndefined({
      id: poRef.id,
      poNumber,
      purchaseRequestId: null,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: 'draft',
      createdByUserId: currentUser.uid || currentUser.id || '',
      createdByUserName: currentUser.name || 'Admin',
      approvedByUserId: null,
      approvedByUserName: null,
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      sentToSupplierAt: null,
      supplierConfirmedAt: null,
      expectedDeliveryDate,
      supplierReferenceNumber: null,
      paymentTerms: supplier.paymentTerms || 'Net 30',
      currency: supplier.currency || 'BDT',
      subtotalBDT,
      discountBDT: 0,
      transportCostBDT: 0,
      otherCostBDT: 0,
      totalAmountBDT,
      totalOrderedQuantity: orderQuantity,
      totalReceivedQuantity: 0,
      totalRemainingQuantity: orderQuantity,
      notes: notes || `Created from AI Procurement Recommendation. ${overrideReason ? `Override reason: ${overrideReason}` : ''}`,
      rejectionReason: null,
      cancellationReason: null,
      version: 1
    }));

    // 2. Create Line Item
    batch.set(poItemRef, cleanUndefined({
      id: poItemRef.id,
      purchaseOrderId: poRef.id,
      productId: product.id,
      productName: product.name,
      supplierProductId: null,
      supplierSku: null,
      orderedQuantity: orderQuantity,
      receivedQuantity: 0,
      remainingQuantity: orderQuantity,
      unitPurchasePriceBDT: unitPrice,
      discountBDT: 0,
      totalLineAmountBDT: subtotalBDT,
      expectedDeliveryDate,
      notes: notes || 'Procurement Recommendation',
      createdAt: now,
      updatedAt: now
    }));

    // 3. Update Recommendation status to ACTIONED
    batch.set(recRef, cleanUndefined({
      status: 'actioned',
      approvedQuantity: orderQuantity,
      overrideReason: overrideReason || null,
      purchaseOrderId: poRef.id,
      purchaseOrderNumber: poNumber,
      actionedAt: now,
      actionedByUserId: currentUser.uid || currentUser.id,
      actionedByUserName: currentUser.name || 'Admin',
      updatedAt: now
    }), { merge: true });

    await batch.commit();

    // 4. Record Audit Logs
    await recordProcurementAuditLog(
      'PROCUREMENT_PO_CREATED_FROM_RECOMMENDATION',
      poRef.id,
      poNumber,
      currentUser,
      `Created PO ${poNumber} for ${orderQuantity} units of "${product.name}" from recommendation. Total: ৳${totalAmountBDT.toLocaleString()}`
    );

    if (overrideReason || orderQuantity !== recommendation.recommendedQuantity) {
      await recordProcurementAuditLog(
        'PROCUREMENT_RECOMMENDATION_OVERRIDDEN',
        recommendation.id,
        poNumber,
        currentUser,
        `Recommended Qty: ${recommendation.recommendedQuantity}, Approved Qty: ${orderQuantity}. Reason: ${overrideReason || 'Admin adjustment'}`
      );
    }

    return { success: true, poId: poRef.id, poNumber };
  } catch (err: any) {
    console.error('Error creating PO from recommendation:', err);
    return { success: false, error: err?.message || 'Failed to create purchase order.' };
  }
}

/**
 * EXPLICIT ADMIN ACTION: Create Multiple Purchase Orders in Bulk (Grouped by Supplier)
 */
export async function createBulkPOsFromRecommendations(
  selectedRecommendations: Array<{
    recommendation: ProcurementRecommendation;
    supplierId: string;
    orderQuantity: number;
    unitPrice: number;
  }>,
  currentUser: AuthUser
): Promise<{ success: boolean; createdCount: number; poNumbers: string[]; errors?: string[] }> {
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, createdCount: 0, poNumbers: [], errors: ['Only admins can create Purchase Orders.'] };
    }

    if (selectedRecommendations.length === 0) {
      return { success: false, createdCount: 0, poNumbers: [], errors: ['No items selected.'] };
    }

    // Group items by Supplier
    const itemsBySupplier = new Map<string, Array<typeof selectedRecommendations[0]>>();
    for (const item of selectedRecommendations) {
      if (item.orderQuantity > 0 && item.supplierId) {
        const list = itemsBySupplier.get(item.supplierId) || [];
        list.push(item);
        itemsBySupplier.set(item.supplierId, list);
      }
    }

    const createdPONumbers: string[] = [];
    const errors: string[] = [];

    // Process each supplier group
    for (const [supplierId, items] of itemsBySupplier.entries()) {
      try {
        const supSnap = await getDoc(doc(db, 'suppliers', supplierId));
        if (!supSnap.exists()) {
          errors.push(`Supplier ${supplierId} not found.`);
          continue;
        }
        const supplier = supSnap.data() as Supplier;
        if (supplier.status !== 'active') {
          errors.push(`Supplier ${supplier.name} is not active.`);
          continue;
        }

        const poNumber = `GZ-PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        const now = new Date().toISOString();
        const leadTime = supplier.defaultLeadTimeDays || 7;
        const expectedDeliveryDate = new Date(Date.now() + leadTime * 86400000).toISOString().split('T')[0];

        let subtotalBDT = 0;
        let totalOrderedQuantity = 0;

        for (const item of items) {
          subtotalBDT += (item.orderQuantity * item.unitPrice);
          totalOrderedQuantity += item.orderQuantity;
        }

        const batch = writeBatch(db);
        const poRef = doc(collection(db, 'purchase_orders'));

        batch.set(poRef, cleanUndefined({
          id: poRef.id,
          poNumber,
          purchaseRequestId: null,
          supplierId: supplier.id,
          supplierName: supplier.name,
          status: 'draft',
          createdByUserId: currentUser.uid || currentUser.id || '',
          createdByUserName: currentUser.name || 'Admin',
          createdAt: now,
          updatedAt: now,
          expectedDeliveryDate,
          paymentTerms: supplier.paymentTerms || 'Net 30',
          currency: supplier.currency || 'BDT',
          subtotalBDT,
          discountBDT: 0,
          transportCostBDT: 0,
          otherCostBDT: 0,
          totalAmountBDT: subtotalBDT,
          totalOrderedQuantity,
          totalReceivedQuantity: 0,
          totalRemainingQuantity: totalOrderedQuantity,
          notes: `Bulk PO created from ${items.length} Procurement Recommendation(s).`,
          version: 1
        }));

        for (const item of items) {
          const poItemRef = doc(collection(db, 'purchase_order_items'));
          const lineTotal = item.orderQuantity * item.unitPrice;

          batch.set(poItemRef, cleanUndefined({
            id: poItemRef.id,
            purchaseOrderId: poRef.id,
            productId: item.recommendation.productId,
            productName: item.recommendation.productName,
            orderedQuantity: item.orderQuantity,
            receivedQuantity: 0,
            remainingQuantity: item.orderQuantity,
            unitPurchasePriceBDT: item.unitPrice,
            discountBDT: 0,
            totalLineAmountBDT: lineTotal,
            expectedDeliveryDate,
            createdAt: now,
            updatedAt: now
          }));

          const recRef = doc(db, 'procurement_recommendations', item.recommendation.id);
          batch.set(recRef, cleanUndefined({
            status: 'actioned',
            approvedQuantity: item.orderQuantity,
            purchaseOrderId: poRef.id,
            purchaseOrderNumber: poNumber,
            actionedAt: now,
            actionedByUserId: currentUser.uid || currentUser.id,
            actionedByUserName: currentUser.name || 'Admin',
            updatedAt: now
          }), { merge: true });
        }

        await batch.commit();
        createdPONumbers.push(poNumber);

        await recordProcurementAuditLog(
          'PROCUREMENT_PO_CREATED_FROM_RECOMMENDATION',
          poRef.id,
          poNumber,
          currentUser,
          `Bulk created PO ${poNumber} for supplier ${supplier.name} (${items.length} products). Total: ৳${subtotalBDT.toLocaleString()}`
        );
      } catch (grpErr: any) {
        errors.push(`Error creating PO for supplier ${supplierId}: ${grpErr?.message}`);
      }
    }

    return {
      success: createdPONumbers.length > 0,
      createdCount: createdPONumbers.length,
      poNumbers: createdPONumbers,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (err: any) {
    return { success: false, createdCount: 0, poNumbers: [], errors: [err?.message || 'Bulk creation failed.'] };
  }
}

/**
 * Fetch Procurement Audit Trail
 */
export async function getProcurementAuditLogs(limitCount: number = 50): Promise<ProcurementAuditLogEntry[]> {
  try {
    const q = query(
      collection(db, 'procurement_audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ProcurementAuditLogEntry));
  } catch (err) {
    try {
      const snap = await getDocs(collection(db, 'procurement_audit_logs'));
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ProcurementAuditLogEntry));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return list.slice(0, limitCount);
    } catch (fallbackErr) {
      console.error('Failed to load procurement audit logs:', fallbackErr);
      return [];
    }
  }
}
