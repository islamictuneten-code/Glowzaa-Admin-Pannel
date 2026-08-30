import { 
  Order, 
  Product, 
  Customer, 
  Expense, 
  Payment,
  AuthUser,
  CategoryDoc,
  DateRangeFilter, 
  DateRangePreset, 
  ComparisonMode, 
  ExecutiveKPI, 
  SalesProfitTrendPoint, 
  ProductProfitabilityItem, 
  CustomerProfitabilityItem, 
  SellerExecutiveSummary, 
  RegionalSalesSummary, 
  CategoryExecutiveSummary, 
  ProfitWaterfallStep, 
  ExecutiveActionItem, 
  ExecutiveAIInsight, 
  DataQualityIssue, 
  WhatIfSimulationParams, 
  WhatIfSimulationResult, 
  ExecutiveBISettings, 
  ExecutiveBIAuditLogEntry 
} from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreService';

// ============================================================================
// DEFAULT BI SETTINGS
// ============================================================================

export const DEFAULT_EXECUTIVE_BI_SETTINGS: ExecutiveBISettings = {
  id: 'global_bi_settings',
  lowMarginThresholdPercent: 15,
  negativeMarginThresholdPercent: 0,
  highDiscountThresholdPercent: 10,
  inactiveCustomerDays: 60,
  targetWarningThresholdPercent: 80,
  targetCriticalThresholdPercent: 60,
  profitDeclineThresholdPercent: 10,
  highSalesVolumeThresholdBDT: 25000,
  updatedAt: new Date().toISOString()
};

// Valid status list for calculating net wholesale sales
export const VALID_EXECUTIVE_SALES_STATUSES = new Set([
  'confirmed', 'Confirmed',
  'packing', 'Packing',
  'ready_for_delivery', 'Ready for Delivery',
  'processing', 'Processing',
  'dispatched', 'Dispatched',
  'partially_delivered', 'Partially Delivered',
  'delivered', 'Delivered',
  'completed', 'Completed'
]);

// ============================================================================
// DATE & PERIOD CALCULATION HELPERS
// ============================================================================

export function buildDateRangeFilter(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  comparisonMode: ComparisonMode = 'previous_period'
): DateRangeFilter {
  const now = new Date();
  const todayStr = toISODate(now);

  let startDate = todayStr;
  let endDate = todayStr;

  switch (preset) {
    case 'today':
      startDate = todayStr;
      endDate = todayStr;
      break;
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = toISODate(y);
      endDate = startDate;
      break;
    }
    case 'this_week': {
      // Assuming week starts on Saturday or Monday. Let's do Monday-based or last 7 days:
      const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
      const diff = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const startOfWeek = new Date(now.setDate(diff));
      startDate = toISODate(startOfWeek);
      endDate = todayStr;
      break;
    }
    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = toISODate(startOfMonth);
      endDate = todayStr;
      break;
    }
    case 'last_month': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      startDate = toISODate(startOfLastMonth);
      endDate = toISODate(endOfLastMonth);
      break;
    }
    case 'this_quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      startDate = toISODate(startOfQuarter);
      endDate = todayStr;
      break;
    }
    case 'this_year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      startDate = toISODate(startOfYear);
      endDate = todayStr;
      break;
    }
    case 'last_year': {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      startDate = toISODate(startOfLastYear);
      endDate = toISODate(endOfLastYear);
      break;
    }
    case 'custom':
      startDate = customStart || todayStr;
      endDate = customEnd || todayStr;
      break;
  }

  // Calculate matching previous period
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const durationMs = Math.max(0, endMs - startMs) + 24 * 60 * 60 * 1000; // inclusive days

  let prevStartDate = '';
  let prevEndDate = '';

  if (comparisonMode === 'same_period_last_year') {
    const sDate = new Date(startDate);
    sDate.setFullYear(sDate.getFullYear() - 1);
    const eDate = new Date(endDate);
    eDate.setFullYear(eDate.getFullYear() - 1);
    prevStartDate = toISODate(sDate);
    prevEndDate = toISODate(eDate);
  } else {
    // previous period: exact duration shifted back
    const pEndMs = startMs - 24 * 60 * 60 * 1000;
    const pStartMs = pEndMs - durationMs + 24 * 60 * 60 * 1000;
    prevStartDate = toISODate(new Date(pStartMs));
    prevEndDate = toISODate(new Date(pEndMs));
  }

  return {
    preset,
    startDate,
    endDate,
    comparisonMode,
    prevStartDate,
    prevEndDate
  };
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateWithin(dateStr: string | undefined | null, startIso: string, endIso: string): boolean {
  if (!dateStr) return false;
  // Parse date string (handles ISO, YYYY-MM-DD, or timestamp formats)
  const d = dateStr.slice(0, 10);
  return d >= startIso && d <= endIso;
}

// ============================================================================
// CORE FINANCIAL CALCULATIONS
// ============================================================================

/**
 * Authoritative Cost Hierarchy:
 * 1. Transaction-level cost on order item (`item.purchasePrice`)
 * 2. Authoritative product catalog cost (`product.purchasePrice`)
 * 3. Returns null if cost is missing/unrecorded (<= 0)
 */
export function resolveItemUnitCost(
  item: { purchasePrice?: number; productId?: string },
  productMap: Map<string, Product>
): number | null {
  if (typeof item.purchasePrice === 'number' && item.purchasePrice > 0) {
    return item.purchasePrice;
  }
  if (item.productId) {
    const product = productMap.get(item.productId);
    if (product && typeof product.purchasePrice === 'number' && product.purchasePrice > 0) {
      return product.purchasePrice;
    }
  }
  return null;
}

/**
 * Centralized calculation of Net Sales for a collection of orders.
 * Filters only valid wholesale statuses (excludes cancelled, draft, returns).
 */
export function calculateNetSales(orders: Order[]): number {
  return orders
    .filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''))
    .reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount) || 0), 0);
}

/**
 * Centralized calculation of Cost of Goods Sold (COGS).
 * Returns { totalCOGS: number | null, missingCostItemsCount: number }
 */
export function calculateCOGS(
  orders: Order[],
  productMap: Map<string, Product>
): { totalCOGS: number | null; missingCostItemsCount: number; hasFullCostData: boolean } {
  let totalCOGS = 0;
  let missingCostItemsCount = 0;
  let totalItemsCount = 0;

  const validOrders = orders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));

  for (const order of validOrders) {
    if (!order.items || !Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const qty = item.deliveredQuantity ?? item.quantity ?? 1;
      if (qty <= 0) continue;
      totalItemsCount++;

      const unitCost = resolveItemUnitCost(item, productMap);
      if (unitCost !== null) {
        totalCOGS += unitCost * qty;
      } else {
        missingCostItemsCount++;
      }
    }
  }

  const hasFullCostData = missingCostItemsCount === 0 && totalItemsCount > 0;
  // If ALL items are missing costs, return null
  if (totalItemsCount > 0 && missingCostItemsCount === totalItemsCount) {
    return { totalCOGS: null, missingCostItemsCount, hasFullCostData: false };
  }

  return { totalCOGS, missingCostItemsCount, hasFullCostData };
}

/**
 * Calculates Gross Profit = Net Sales - COGS
 */
export function calculateGrossProfit(netSales: number, cogs: number | null): number | null {
  if (cogs === null) return null;
  return netSales - cogs;
}

/**
 * Calculates Gross Margin % = (Gross Profit / Net Sales) * 100
 * Strictly returns null if Net Sales <= 0 or Gross Profit is null (Prevents NaN & Infinity).
 */
export function calculateGrossMarginPercent(grossProfit: number | null, netSales: number): number | null {
  if (grossProfit === null || netSales <= 0) return null;
  return Number(((grossProfit / netSales) * 100).toFixed(2));
}

/**
 * Safe percentage change calculation between current and previous values.
 */
export function calculatePercentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return Number(change.toFixed(1));
}

// ============================================================================
// EXECUTIVE TOP 8 KPIS BUILDER
// ============================================================================

export function buildExecutiveKPIs(
  currentOrders: Order[],
  previousOrders: Order[],
  customers: Customer[],
  products: Product[],
  companyMonthlyTargetBDT: number = 0
): ExecutiveKPI[] {
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));

  // 1. Net Sales
  const currentNetSales = calculateNetSales(currentOrders);
  const previousNetSales = calculateNetSales(previousOrders);
  const salesChangeAmount = currentNetSales - previousNetSales;
  const salesChangePct = calculatePercentChange(currentNetSales, previousNetSales);

  // 2. COGS & Gross Profit
  const currentCOGSResult = calculateCOGS(currentOrders, productMap);
  const previousCOGSResult = calculateCOGS(previousOrders, productMap);
  
  const currentGrossProfit = calculateGrossProfit(currentNetSales, currentCOGSResult.totalCOGS);
  const previousGrossProfit = calculateGrossProfit(previousNetSales, previousCOGSResult.totalCOGS);
  const profitChangeAmount = (currentGrossProfit !== null && previousGrossProfit !== null) 
    ? currentGrossProfit - previousGrossProfit 
    : null;
  const profitChangePct = calculatePercentChange(currentGrossProfit, previousGrossProfit);

  // 3. Gross Margin %
  const currentMargin = calculateGrossMarginPercent(currentGrossProfit, currentNetSales);
  const previousMargin = calculateGrossMarginPercent(previousGrossProfit, previousNetSales);
  const marginChangePoints = (currentMargin !== null && previousMargin !== null) 
    ? Number((currentMargin - previousMargin).toFixed(1)) 
    : null;

  // 4. Total Orders
  const currentValidOrders = currentOrders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));
  const previousValidOrders = previousOrders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));
  const currentOrdersCount = currentValidOrders.length;
  const previousOrdersCount = previousValidOrders.length;
  const ordersChangeAmount = currentOrdersCount - previousOrdersCount;
  const ordersChangePct = calculatePercentChange(currentOrdersCount, previousOrdersCount);

  // 5. Average Order Value (AOV)
  const currentAOV = currentOrdersCount > 0 ? Math.round(currentNetSales / currentOrdersCount) : 0;
  const previousAOV = previousOrdersCount > 0 ? Math.round(previousNetSales / previousOrdersCount) : 0;
  const aovChangeAmount = currentAOV - previousAOV;
  const aovChangePct = calculatePercentChange(currentAOV, previousAOV);

  // 6. Customer Due (Authoritative Customer Ledger)
  const totalCustomerDue = customers.reduce((sum, c) => sum + (Number(c.currentDue) || 0), 0);
  const overdueCustomersCount = customers.filter(c => (Number(c.currentDue) || 0) > 0 && c.creditHold).length;

  // 7. Inventory Stock Value (Authoritative Stock * Purchase Cost)
  let totalInventoryValue = 0;
  let totalStockUnits = 0;
  products.forEach(p => {
    const stock = Number(p.currentStock) || 0;
    const cost = Number(p.purchasePrice) || 0;
    totalStockUnits += stock;
    totalInventoryValue += stock * cost;
  });

  // 8. Sales Target Achievement
  const effectiveTarget = companyMonthlyTargetBDT > 0 ? companyMonthlyTargetBDT : 1000000; // default benchmark
  const targetAchievement = effectiveTarget > 0 ? Number(((currentNetSales / effectiveTarget) * 100).toFixed(1)) : null;

  return [
    {
      id: 'net_sales',
      title: 'Net Wholesale Sales',
      currentValue: currentNetSales,
      previousValue: previousNetSales,
      unit: 'BDT',
      changeAmount: salesChangeAmount,
      changePercent: salesChangePct,
      trend: salesChangeAmount > 0 ? 'up' : salesChangeAmount < 0 ? 'down' : 'neutral',
      isPositive: true,
      subtitle: `${currentOrdersCount} finalized wholesale orders`,
      drilldownTab: 'overview',
      hasSufficientData: true
    },
    {
      id: 'gross_profit',
      title: 'Gross Profit',
      currentValue: currentGrossProfit,
      previousValue: previousGrossProfit,
      unit: 'BDT',
      changeAmount: profitChangeAmount,
      changePercent: profitChangePct,
      trend: profitChangeAmount !== null && profitChangeAmount > 0 ? 'up' : profitChangeAmount !== null && profitChangeAmount < 0 ? 'down' : 'neutral',
      isPositive: true,
      subtitle: currentCOGSResult.missingCostItemsCount > 0 
        ? `${currentCOGSResult.missingCostItemsCount} items missing cost` 
        : 'Authoritative product COGS',
      drilldownTab: 'profitability',
      hasSufficientData: currentGrossProfit !== null
    },
    {
      id: 'gross_margin',
      title: 'Gross Margin %',
      currentValue: currentMargin,
      previousValue: previousMargin,
      unit: 'PERCENT',
      changeAmount: marginChangePoints,
      changePercent: marginChangePoints,
      trend: marginChangePoints !== null && marginChangePoints > 0 ? 'up' : marginChangePoints !== null && marginChangePoints < 0 ? 'down' : 'neutral',
      isPositive: true,
      subtitle: currentMargin !== null && currentMargin < 15 ? 'Margin compression alert' : 'Net profitability ratio',
      statusLabel: currentMargin !== null && currentMargin < 15 ? 'WATCH' : 'HEALTHY',
      statusColor: currentMargin !== null && currentMargin < 15 ? 'amber' : 'emerald',
      drilldownTab: 'profitability',
      hasSufficientData: currentMargin !== null
    },
    {
      id: 'total_orders',
      title: 'Finalized Orders',
      currentValue: currentOrdersCount,
      previousValue: previousOrdersCount,
      unit: 'COUNT',
      changeAmount: ordersChangeAmount,
      changePercent: ordersChangePct,
      trend: ordersChangeAmount > 0 ? 'up' : ordersChangeAmount < 0 ? 'down' : 'neutral',
      isPositive: true,
      subtitle: `${currentOrders.length - currentOrdersCount} cancelled/draft orders excluded`,
      drilldownTab: 'overview',
      hasSufficientData: true
    },
    {
      id: 'aov',
      title: 'Average Order Value (AOV)',
      currentValue: currentAOV,
      previousValue: previousAOV,
      unit: 'BDT',
      changeAmount: aovChangeAmount,
      changePercent: aovChangePct,
      trend: aovChangeAmount > 0 ? 'up' : aovChangeAmount < 0 ? 'down' : 'neutral',
      isPositive: true,
      subtitle: 'Basket size per wholesale transaction',
      drilldownTab: 'customers',
      hasSufficientData: currentOrdersCount > 0
    },
    {
      id: 'customer_due',
      title: 'Total Market Receivables',
      currentValue: totalCustomerDue,
      previousValue: null,
      unit: 'BDT',
      changeAmount: null,
      changePercent: null,
      trend: 'neutral',
      isPositive: false, // lower due is better
      subtitle: `${overdueCustomersCount} accounts on credit hold`,
      statusLabel: overdueCustomersCount > 0 ? 'ATTENTION' : 'NORMAL',
      statusColor: overdueCustomersCount > 0 ? 'rose' : 'emerald',
      drilldownTab: 'customers',
      hasSufficientData: true
    },
    {
      id: 'inventory_value',
      title: 'Inventory Stock Value',
      currentValue: totalInventoryValue,
      previousValue: null,
      unit: 'BDT',
      changeAmount: null,
      changePercent: null,
      trend: 'neutral',
      isPositive: true,
      subtitle: `${totalStockUnits.toLocaleString()} units in warehouse`,
      drilldownTab: 'profitability',
      hasSufficientData: true
    },
    {
      id: 'target_achievement',
      title: 'Monthly Target Progress',
      currentValue: targetAchievement,
      previousValue: null,
      unit: 'PERCENT',
      changeAmount: null,
      changePercent: null,
      trend: targetAchievement !== null && targetAchievement >= 100 ? 'up' : 'neutral',
      isPositive: true,
      subtitle: `Target: ৳${(effectiveTarget / 1000).toFixed(0)}k BDT`,
      statusLabel: targetAchievement !== null && targetAchievement >= 90 ? 'ON TRACK' : targetAchievement !== null && targetAchievement >= 70 ? 'WATCH' : 'BEHIND',
      statusColor: targetAchievement !== null && targetAchievement >= 90 ? 'emerald' : targetAchievement !== null && targetAchievement >= 70 ? 'amber' : 'rose',
      drilldownTab: 'sellers',
      hasSufficientData: true
    }
  ];
}

// ============================================================================
// SALES & PROFIT TRENDS BUILDER
// ============================================================================

export function buildSalesProfitTrendPoints(
  orders: Order[],
  products: Product[],
  dateFilter: DateRangeFilter
): SalesProfitTrendPoint[] {
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  const validOrders = orders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));

  // Group by date
  const dateMap = new Map<string, {
    netSales: number;
    cogs: number;
    hasIncompleteCost: boolean;
    ordersCount: number;
    discounts: number;
    returns: number;
  }>();

  // Populate map for date range
  const start = new Date(dateFilter.startDate);
  const end = new Date(dateFilter.endDate);
  const cur = new Date(start);

  while (cur <= end) {
    const iso = toISODate(cur);
    dateMap.set(iso, {
      netSales: 0,
      cogs: 0,
      hasIncompleteCost: false,
      ordersCount: 0,
      discounts: 0,
      returns: 0
    });
    cur.setDate(cur.getDate() + 1);
  }

  for (const order of validOrders) {
    const orderDate = (order.createdAt || order.createdDate || '').slice(0, 10);
    if (!orderDate || !dateMap.has(orderDate)) continue;

    const entry = dateMap.get(orderDate)!;
    const orderSales = Number(order.grandTotal ?? order.totalAmount) || 0;
    const discount = Number(order.totalDiscount ?? order.discount) || 0;

    entry.netSales += orderSales;
    entry.ordersCount += 1;
    entry.discounts += discount;

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const qty = item.deliveredQuantity ?? item.quantity ?? 1;
        const unitCost = resolveItemUnitCost(item, productMap);
        if (unitCost !== null) {
          entry.cogs += unitCost * qty;
        } else {
          entry.hasIncompleteCost = true;
        }
      }
    }
  }

  const result: SalesProfitTrendPoint[] = [];
  dateMap.forEach((val, dateKey) => {
    const grossProfit = val.netSales - val.cogs;
    const grossMargin = val.netSales > 0 ? Number(((grossProfit / val.netSales) * 100).toFixed(1)) : 0;
    const aov = val.ordersCount > 0 ? Math.round(val.netSales / val.ordersCount) : 0;

    // Format label e.g. "Aug 22"
    const [y, m, d] = dateKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = `${monthNames[Number(m) - 1]} ${d}`;

    result.push({
      dateKey,
      label,
      netSalesBDT: val.netSales,
      cogsBDT: val.cogs,
      grossProfitBDT: grossProfit,
      grossMarginPercent: grossMargin,
      ordersCount: val.ordersCount,
      aovBDT: aov,
      discountBDT: val.discounts,
      returnBDT: val.returns
    });
  });

  return result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

// ============================================================================
// PRODUCT PROFITABILITY & MARGIN MATRIX
// ============================================================================

export function buildProductProfitability(
  orders: Order[],
  products: Product[],
  settings: ExecutiveBISettings = DEFAULT_EXECUTIVE_BI_SETTINGS
): ProductProfitabilityItem[] {
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  const validOrders = orders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));

  const aggMap = new Map<string, {
    productId: string;
    productName: string;
    sku: string;
    category: string;
    unitsSold: number;
    returnedUnits: number;
    grossSalesBDT: number;
    discountBDT: number;
    netSalesBDT: number;
    ordersCount: number;
    totalCOGS: number;
    hasMissingCost: boolean;
  }>();

  for (const order of validOrders) {
    if (!order.items || !Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const pid = item.productId || item.sku || 'unknown';
      const existing = aggMap.get(pid) || {
        productId: pid,
        productName: item.productName || 'Product',
        sku: item.sku || '',
        category: (item.category as string) || 'Other Products',
        unitsSold: 0,
        returnedUnits: 0,
        grossSalesBDT: 0,
        discountBDT: 0,
        netSalesBDT: 0,
        ordersCount: 0,
        totalCOGS: 0,
        hasMissingCost: false
      };

      const qty = Number(item.deliveredQuantity ?? item.quantity) || 0;
      const unitPrice = Number(item.unitPrice ?? item.wholesalePrice ?? item.price) || 0;
      const itemGross = unitPrice * qty;
      const itemDiscount = Number(item.discount) || 0;
      const itemNet = Math.max(0, itemGross - itemDiscount);

      const unitCost = resolveItemUnitCost(item, productMap);
      if (unitCost !== null) {
        existing.totalCOGS += unitCost * qty;
      } else {
        existing.hasMissingCost = true;
      }

      existing.unitsSold += qty;
      existing.grossSalesBDT += itemGross;
      existing.discountBDT += itemDiscount;
      existing.netSalesBDT += itemNet;
      existing.ordersCount += 1;

      aggMap.set(pid, existing);
    }
  }

  const items: ProductProfitabilityItem[] = [];

  aggMap.forEach(val => {
    const prod = productMap.get(val.productId);
    const unitCost = prod && prod.purchasePrice > 0 ? prod.purchasePrice : null;
    const cogs = val.hasMissingCost && val.totalCOGS === 0 ? null : val.totalCOGS;
    const grossProfit = cogs !== null ? val.netSalesBDT - cogs : null;
    const grossMargin = (grossProfit !== null && val.netSalesBDT > 0) 
      ? Number(((grossProfit / val.netSalesBDT) * 100).toFixed(1)) 
      : null;
    const avgSellingPrice = val.unitsSold > 0 ? Math.round(val.netSalesBDT / val.unitsSold) : 0;
    const currentStock = prod ? prod.currentStock : 0;
    const inventoryVal = prod && prod.purchasePrice > 0 ? currentStock * prod.purchasePrice : null;

    const isLossMaking = grossProfit !== null && grossProfit < 0;
    const isHighSalesLowMargin = 
      val.netSalesBDT >= settings.highSalesVolumeThresholdBDT && 
      grossMargin !== null && 
      grossMargin < settings.lowMarginThresholdPercent;

    let marginClassification: ProductProfitabilityItem['marginClassification'] = 'normal';
    if (grossMargin === null) {
      marginClassification = 'unknown';
    } else if (grossMargin < 0) {
      marginClassification = 'negative';
    } else if (grossMargin < settings.lowMarginThresholdPercent) {
      marginClassification = 'low_margin';
    } else if (grossMargin >= 30) {
      marginClassification = 'high_margin';
    }

    const rootCauseNotes: string[] = [];
    if (isLossMaking) {
      rootCauseNotes.push(`Selling below purchase cost (Cost: ৳${unitCost || 'N/A'}, Selling: ৳${avgSellingPrice})`);
    }
    if (val.discountBDT > 0 && (val.discountBDT / Math.max(1, val.grossSalesBDT)) * 100 > settings.highDiscountThresholdPercent) {
      rootCauseNotes.push(`Heavy discount rate of ${((val.discountBDT / val.grossSalesBDT) * 100).toFixed(0)}% eroding margins`);
    }
    if (isHighSalesLowMargin) {
      rootCauseNotes.push(`High wholesale volume (৳${val.netSalesBDT.toLocaleString()}) with slim margin (${grossMargin}%)`);
    }

    items.push({
      productId: val.productId,
      productName: prod ? prod.name : val.productName,
      sku: prod ? prod.sku : val.sku,
      category: prod ? prod.category : val.category,
      unitsSold: val.unitsSold,
      returnedUnits: val.returnedUnits,
      grossSalesBDT: val.grossSalesBDT,
      discountBDT: val.discountBDT,
      netSalesBDT: val.netSalesBDT,
      unitCostBDT: unitCost,
      cogsBDT: cogs,
      grossProfitBDT: grossProfit,
      grossMarginPercent: grossMargin,
      averageSellingPriceBDT: avgSellingPrice,
      ordersCount: val.ordersCount,
      currentStock,
      inventoryValueBDT: inventoryVal,
      isHighSalesLowMargin,
      isLossMaking,
      marginClassification,
      rootCauseNotes
    });
  });

  return items.sort((a, b) => b.netSalesBDT - a.netSalesBDT);
}

// ============================================================================
// CUSTOMER PROFITABILITY & INACTIVE CUSTOMER DETECTION
// ============================================================================

export function buildCustomerProfitability(
  orders: Order[],
  customers: Customer[],
  products: Product[],
  settings: ExecutiveBISettings = DEFAULT_EXECUTIVE_BI_SETTINGS
): CustomerProfitabilityItem[] {
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  const customerMap = new Map<string, Customer>(customers.map(c => [c.id, c]));
  const validOrders = orders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));

  const aggMap = new Map<string, {
    customerId: string;
    ordersCount: number;
    unitsBought: number;
    grossSalesBDT: number;
    discountBDT: number;
    netSalesBDT: number;
    totalCOGS: number;
    hasMissingCost: boolean;
    lastOrderDate: string | null;
  }>();

  for (const order of validOrders) {
    const cid = order.customerId;
    if (!cid) continue;

    const existing = aggMap.get(cid) || {
      customerId: cid,
      ordersCount: 0,
      unitsBought: 0,
      grossSalesBDT: 0,
      discountBDT: 0,
      netSalesBDT: 0,
      totalCOGS: 0,
      hasMissingCost: false,
      lastOrderDate: null
    };

    const orderDate = (order.createdAt || order.createdDate || '').slice(0, 10);
    if (!existing.lastOrderDate || orderDate > existing.lastOrderDate) {
      existing.lastOrderDate = orderDate;
    }

    const orderGross = Number(order.subtotal || order.totalAmount) || 0;
    const orderDiscount = Number(order.totalDiscount || order.discount) || 0;
    const orderNet = Number(order.grandTotal ?? order.totalAmount) || 0;

    existing.ordersCount += 1;
    existing.grossSalesBDT += orderGross;
    existing.discountBDT += orderDiscount;
    existing.netSalesBDT += orderNet;

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const qty = item.deliveredQuantity ?? item.quantity ?? 1;
        existing.unitsBought += qty;
        const unitCost = resolveItemUnitCost(item, productMap);
        if (unitCost !== null) {
          existing.totalCOGS += unitCost * qty;
        } else {
          existing.hasMissingCost = true;
        }
      }
    }

    aggMap.set(cid, existing);
  }

  const nowMs = new Date().getTime();
  const items: CustomerProfitabilityItem[] = [];

  // Also include customers who have zero orders in the selected period (for inactive customer analysis)
  const allCustomerIds = new Set([...aggMap.keys(), ...customerMap.keys()]);

  allCustomerIds.forEach(cid => {
    const cust = customerMap.get(cid);
    const agg = aggMap.get(cid);

    const netSales = agg ? agg.netSalesBDT : 0;
    const grossSales = agg ? agg.grossSalesBDT : 0;
    const discount = agg ? agg.discountBDT : 0;
    const cogs = agg ? (agg.hasMissingCost && agg.totalCOGS === 0 ? null : agg.totalCOGS) : 0;
    const grossProfit = cogs !== null ? netSales - cogs : null;
    const grossMargin = (grossProfit !== null && netSales > 0) 
      ? Number(((grossProfit / netSales) * 100).toFixed(1)) 
      : null;
    const ordersCount = agg ? agg.ordersCount : 0;
    const aov = ordersCount > 0 ? Math.round(netSales / ordersCount) : 0;

    // Calculate days since last order
    const lastDate = agg?.lastOrderDate || cust?.lastOrderDate || null;
    let daysSinceLast: number | null = null;
    if (lastDate) {
      const diffMs = nowMs - new Date(lastDate).getTime();
      daysSinceLast = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    }

    const isInactive = daysSinceLast !== null && daysSinceLast >= settings.inactiveCustomerDays;

    let segment = (cust as any)?.segment || 'STABLE';
    if (isInactive) {
      segment = 'INACTIVE';
    } else if (netSales > 50000) {
      segment = 'HIGH VALUE';
    }

    items.push({
      customerId: cid,
      shopName: cust ? cust.shopName : 'Shop',
      ownerName: cust ? cust.ownerName : 'Owner',
      phone: cust ? cust.phone : '',
      district: cust ? cust.district : 'Dhaka',
      area: cust ? cust.area : 'General',
      territory: (cust as any)?.territory || cust?.area || cust?.district || 'Dhaka Central',
      assignedSalesUserId: cust?.assignedSalesUserId,
      assignedSalesUserName: cust?.assignedSalesUserName,
      ordersCount,
      unitsBought: agg ? agg.unitsBought : 0,
      grossSalesBDT: grossSales,
      discountBDT: discount,
      netSalesBDT: netSales,
      cogsBDT: cogs,
      grossProfitBDT: grossProfit,
      grossMarginPercent: grossMargin,
      averageOrderValueBDT: aov,
      currentDueBDT: cust ? (Number(cust.currentDue) || 0) : 0,
      creditLimitBDT: cust ? (Number(cust.creditLimit) || 0) : 0,
      daysSinceLastOrder: daysSinceLast,
      lastOrderDate: lastDate,
      isInactive,
      segment
    });
  });

  return items.sort((a, b) => b.netSalesBDT - a.netSalesBDT);
}

// ============================================================================
// SELLER PERFORMANCE & TARGET GAP
// ============================================================================

export function buildSellerExecutiveSummaries(
  orders: Order[],
  staffUsers: AuthUser[],
  products: Product[],
  settings: ExecutiveBISettings = DEFAULT_EXECUTIVE_BI_SETTINGS
): SellerExecutiveSummary[] {
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  const validOrders = orders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));

  // Filter sales staff
  const salesStaff = staffUsers.filter(u => u.role === 'sales');

  const aggMap = new Map<string, {
    sellerId: string;
    sellerLoginId?: string;
    sellerName: string;
    territory: string;
    monthlyTargetBDT: number;
    netSalesBDT: number;
    ordersCount: number;
    totalCOGS: number;
    hasMissingCost: boolean;
    activeCustomersSet: Set<string>;
    returnValueBDT: number;
  }>();

  // Initialize with sales staff profiles
  for (const staff of salesStaff) {
    aggMap.set(staff.uid, {
      sellerId: staff.uid,
      sellerLoginId: staff.loginId,
      sellerName: staff.name,
      territory: staff.territory || staff.assignedArea || 'Dhaka',
      monthlyTargetBDT: Number(staff.monthlyTarget) || 0,
      netSalesBDT: 0,
      ordersCount: 0,
      totalCOGS: 0,
      hasMissingCost: false,
      activeCustomersSet: new Set<string>(),
      returnValueBDT: 0
    });
  }

  for (const order of validOrders) {
    const sid = order.salesUserId || order.salesSellerId;
    if (!sid) continue;

    let existing = aggMap.get(sid);
    if (!existing) {
      existing = {
        sellerId: sid,
        sellerLoginId: order.salesSellerId,
        sellerName: order.salesUserName || order.salesSellerName || 'Sales Officer',
        territory: order.district || 'Dhaka',
        monthlyTargetBDT: 0,
        netSalesBDT: 0,
        ordersCount: 0,
        totalCOGS: 0,
        hasMissingCost: false,
        activeCustomersSet: new Set<string>(),
        returnValueBDT: 0
      };
      aggMap.set(sid, existing);
    }

    const orderSales = Number(order.grandTotal ?? order.totalAmount) || 0;
    existing.netSalesBDT += orderSales;
    existing.ordersCount += 1;
    if (order.customerId) {
      existing.activeCustomersSet.add(order.customerId);
    }

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const qty = item.deliveredQuantity ?? item.quantity ?? 1;
        const unitCost = resolveItemUnitCost(item, productMap);
        if (unitCost !== null) {
          existing.totalCOGS += unitCost * qty;
        } else {
          existing.hasMissingCost = true;
        }
      }
    }
  }

  // Days remaining in month
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const remainingDays = Math.max(1, lastDayOfMonth - currentDay + 1);

  const summaries: SellerExecutiveSummary[] = [];

  aggMap.forEach(val => {
    const target = val.monthlyTargetBDT;
    const netSales = val.netSalesBDT;
    const targetGap = Math.max(0, target - netSales);
    const achievementPct = target > 0 ? Number(((netSales / target) * 100).toFixed(1)) : null;
    const requiredDaily = (target > 0 && targetGap > 0) ? Math.round(targetGap / remainingDays) : null;

    let targetStatus: SellerExecutiveSummary['targetStatus'] = 'no_target';
    if (target > 0) {
      if (achievementPct !== null && achievementPct >= settings.targetWarningThresholdPercent) {
        targetStatus = 'on_track';
      } else if (achievementPct !== null && achievementPct >= settings.targetCriticalThresholdPercent) {
        targetStatus = 'watch';
      } else {
        targetStatus = 'at_risk';
      }
    }

    const cogs = val.hasMissingCost && val.totalCOGS === 0 ? null : val.totalCOGS;
    const grossProfit = cogs !== null ? netSales - cogs : null;
    const grossMargin = (grossProfit !== null && netSales > 0) 
      ? Number(((grossProfit / netSales) * 100).toFixed(1)) 
      : null;
    const aov = val.ordersCount > 0 ? Math.round(netSales / val.ordersCount) : 0;

    summaries.push({
      sellerId: val.sellerId,
      sellerLoginId: val.sellerLoginId,
      sellerName: val.sellerName,
      territory: val.territory,
      monthlyTargetBDT: target,
      netSalesBDT: netSales,
      targetGapBDT: targetGap,
      targetAchievementPercent: achievementPct,
      requiredDailySalesBDT: requiredDaily,
      targetStatus,
      ordersCount: val.ordersCount,
      averageOrderValueBDT: aov,
      cogsBDT: cogs,
      grossProfitBDT: grossProfit,
      grossMarginPercent: grossMargin,
      activeCustomersCount: val.activeCustomersSet.size,
      totalDueGeneratedBDT: 0,
      returnValueBDT: val.returnValueBDT,
      salesRank: 0,
      profitRank: 0,
      marginRank: 0
    });
  });

  // Assign ranks
  const sortedBySales = [...summaries].sort((a, b) => b.netSalesBDT - a.netSalesBDT);
  sortedBySales.forEach((s, idx) => { s.salesRank = idx + 1; });

  const sortedByProfit = [...summaries].sort((a, b) => (b.grossProfitBDT || 0) - (a.grossProfitBDT || 0));
  sortedByProfit.forEach((s, idx) => { s.profitRank = idx + 1; });

  const sortedByMargin = [...summaries].sort((a, b) => (b.grossMarginPercent || 0) - (a.grossMarginPercent || 0));
  sortedByMargin.forEach((s, idx) => { s.marginRank = idx + 1; });

  return summaries.sort((a, b) => a.salesRank - b.salesRank);
}

// ============================================================================
// GEOGRAPHIC & REGIONAL SALES INTELLIGENCE
// ============================================================================

export function buildRegionalSummaries(
  orders: Order[],
  customers: Customer[],
  products: Product[],
  regionType: 'district' | 'area' | 'territory' = 'district'
): RegionalSalesSummary[] {
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  const validOrders = orders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));

  const aggMap = new Map<string, {
    regionName: string;
    netSalesBDT: number;
    ordersCount: number;
    totalCOGS: number;
    hasMissingCost: boolean;
    customersSet: Set<string>;
    totalDue: number;
  }>();

  for (const order of validOrders) {
    let region = 'Dhaka';
    if (regionType === 'district') region = order.district || 'Dhaka';
    else if (regionType === 'area') region = order.area || 'General';
    else region = order.district || 'Dhaka Central';

    const existing = aggMap.get(region) || {
      regionName: region,
      netSalesBDT: 0,
      ordersCount: 0,
      totalCOGS: 0,
      hasMissingCost: false,
      customersSet: new Set<string>(),
      totalDue: 0
    };

    const orderSales = Number(order.grandTotal ?? order.totalAmount) || 0;
    existing.netSalesBDT += orderSales;
    existing.ordersCount += 1;
    if (order.customerId) existing.customersSet.add(order.customerId);

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const qty = item.deliveredQuantity ?? item.quantity ?? 1;
        const unitCost = resolveItemUnitCost(item, productMap);
        if (unitCost !== null) {
          existing.totalCOGS += unitCost * qty;
        } else {
          existing.hasMissingCost = true;
        }
      }
    }

    aggMap.set(region, existing);
  }

  const results: RegionalSalesSummary[] = [];

  aggMap.forEach(val => {
    const cogs = val.hasMissingCost && val.totalCOGS === 0 ? null : val.totalCOGS;
    const grossProfit = cogs !== null ? val.netSalesBDT - cogs : null;
    const grossMargin = (grossProfit !== null && val.netSalesBDT > 0)
      ? Number(((grossProfit / val.netSalesBDT) * 100).toFixed(1))
      : null;
    const aov = val.ordersCount > 0 ? Math.round(val.netSalesBDT / val.ordersCount) : 0;

    results.push({
      regionKey: `${regionType}_${val.regionName}`,
      regionType,
      regionName: val.regionName,
      netSalesBDT: val.netSalesBDT,
      prevNetSalesBDT: null,
      growthPercent: null,
      growthStatus: 'stable',
      ordersCount: val.ordersCount,
      activeCustomersCount: val.customersSet.size,
      cogsBDT: cogs,
      grossProfitBDT: grossProfit,
      grossMarginPercent: grossMargin,
      averageOrderValueBDT: aov,
      totalDueBDT: val.totalDue
    });
  });

  return results.sort((a, b) => b.netSalesBDT - a.netSalesBDT);
}

// ============================================================================
// CATEGORY PERFORMANCE & PRODUCT MIX ANALYSIS
// ============================================================================

export function buildCategoryExecutiveSummaries(
  orders: Order[],
  products: Product[],
  categories: CategoryDoc[] = []
): CategoryExecutiveSummary[] {
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  const validOrders = orders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));

  const aggMap = new Map<string, {
    categoryName: string;
    unitsSold: number;
    netSalesBDT: number;
    totalCOGS: number;
    hasMissingCost: boolean;
    ordersCount: number;
  }>();

  let grandTotalSales = 0;
  let grandTotalGrossProfit = 0;

  for (const order of validOrders) {
    if (!order.items || !Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const cat = (item.category as string) || 'Other Products';
      const existing = aggMap.get(cat) || {
        categoryName: cat,
        unitsSold: 0,
        netSalesBDT: 0,
        totalCOGS: 0,
        hasMissingCost: false,
        ordersCount: 0
      };

      const qty = item.deliveredQuantity ?? item.quantity ?? 1;
      const unitPrice = Number(item.unitPrice ?? item.wholesalePrice) || 0;
      const itemDiscount = Number(item.discount) || 0;
      const itemNet = Math.max(0, unitPrice * qty - itemDiscount);

      existing.unitsSold += qty;
      existing.netSalesBDT += itemNet;
      existing.ordersCount += 1;
      grandTotalSales += itemNet;

      const unitCost = resolveItemUnitCost(item, productMap);
      if (unitCost !== null) {
        existing.totalCOGS += unitCost * qty;
      } else {
        existing.hasMissingCost = true;
      }

      aggMap.set(cat, existing);
    }
  }

  // Pre-calculate grand total gross profit
  aggMap.forEach(val => {
    const profit = val.netSalesBDT - val.totalCOGS;
    grandTotalGrossProfit += profit;
  });

  const results: CategoryExecutiveSummary[] = [];

  aggMap.forEach(val => {
    const cogs = val.hasMissingCost && val.totalCOGS === 0 ? null : val.totalCOGS;
    const grossProfit = cogs !== null ? val.netSalesBDT - cogs : null;
    const grossMargin = (grossProfit !== null && val.netSalesBDT > 0)
      ? Number(((grossProfit / val.netSalesBDT) * 100).toFixed(1))
      : null;
    
    const salesMix = grandTotalSales > 0 
      ? Number(((val.netSalesBDT / grandTotalSales) * 100).toFixed(1)) 
      : 0;
    
    const profitMix = (grossProfit !== null && grandTotalGrossProfit > 0)
      ? Number(((grossProfit / grandTotalGrossProfit) * 100).toFixed(1))
      : null;

    const mixDisparity = (profitMix !== null) ? Number((salesMix - profitMix).toFixed(1)) : null;

    results.push({
      categoryName: val.categoryName,
      unitsSold: val.unitsSold,
      netSalesBDT: val.netSalesBDT,
      salesMixPercent: salesMix,
      cogsBDT: cogs,
      grossProfitBDT: grossProfit,
      grossMarginPercent: grossMargin,
      profitMixPercent: profitMix,
      mixDisparityPercent: mixDisparity,
      growthPercent: null,
      ordersCount: val.ordersCount
    });
  });

  return results.sort((a, b) => b.netSalesBDT - a.netSalesBDT);
}

// ============================================================================
// PROFIT WATERFALL BUILDER
// ============================================================================

export function buildProfitWaterfall(
  orders: Order[],
  products: Product[],
  expenses: Expense[]
): ProfitWaterfallStep[] {
  const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
  const validOrders = orders.filter(o => VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || ''));

  let grossInvoicedRevenue = 0;
  let totalDiscounts = 0;
  let totalReturns = 0;

  for (const order of validOrders) {
    const gross = Number(order.subtotal || order.totalAmount) || 0;
    const discount = Number(order.totalDiscount || order.discount) || 0;
    grossInvoicedRevenue += gross;
    totalDiscounts += discount;
  }

  const netSales = Math.max(0, grossInvoicedRevenue - totalDiscounts - totalReturns);
  const cogsResult = calculateCOGS(validOrders, productMap);
  const grossProfit = calculateGrossProfit(netSales, cogsResult.totalCOGS);

  // Operating Expenses from Firestore approved records
  const approvedExpenses = expenses.filter(e => !e.deleted && e.status === 'approved');
  const totalOPEX = approvedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const operatingProfit = grossProfit !== null ? grossProfit - totalOPEX : null;

  return [
    {
      label: 'Gross Invoiced Revenue',
      amountBDT: grossInvoicedRevenue,
      type: 'base',
      color: '#0F766E', // Teal
      tooltip: 'Total gross value of wholesale orders prior to discounts',
      isAvailable: true
    },
    {
      label: 'Wholesale Discounts & Deductions',
      amountBDT: totalDiscounts,
      type: 'deduction',
      color: '#EF4444', // Red
      tooltip: 'Approved line-item and bulk trade discounts given to retailers',
      isAvailable: totalDiscounts > 0
    },
    {
      label: 'Net Wholesale Sales',
      amountBDT: netSales,
      type: 'subtotal',
      color: '#0284C7', // Sky Blue
      tooltip: 'Final recognized wholesale top-line revenue',
      isAvailable: true
    },
    {
      label: 'Cost of Goods Sold (COGS)',
      amountBDT: cogsResult.totalCOGS || 0,
      type: 'deduction',
      color: '#F59E0B', // Amber
      tooltip: cogsResult.missingCostItemsCount > 0 
        ? `COGS (${cogsResult.missingCostItemsCount} items missing authoritative cost)` 
        : 'Authoritative supplier cost of ordered goods',
      isAvailable: cogsResult.totalCOGS !== null
    },
    {
      label: 'Gross Profit',
      amountBDT: grossProfit || 0,
      type: 'subtotal',
      color: '#10B981', // Emerald
      tooltip: 'Gross Margin contribution from wholesale sales',
      isAvailable: grossProfit !== null
    },
    {
      label: 'Operating Expenses (OPEX)',
      amountBDT: totalOPEX,
      type: 'deduction',
      color: '#6366F1', // Indigo
      tooltip: `${approvedExpenses.length} approved OPEX entries (Rent, Fuel, Logistics, Salaries)`,
      isAvailable: approvedExpenses.length > 0
    },
    {
      label: 'Operating Profit (EBITDA)',
      amountBDT: operatingProfit || 0,
      type: operatingProfit !== null ? 'total' : 'insufficient_data',
      color: operatingProfit !== null && operatingProfit >= 0 ? '#059669' : '#DC2626',
      tooltip: operatingProfit !== null ? 'Earnings before tax and non-operating adjustments' : 'Insufficient OPEX or COGS data',
      isAvailable: operatingProfit !== null
    }
  ];
}

// ============================================================================
// EXECUTIVE ACTION CENTER (NEXT BEST ACTIONS)
// ============================================================================

export function generateNextBestActions(
  productProfitability: ProductProfitabilityItem[],
  customerProfitability: CustomerProfitabilityItem[],
  sellerSummaries: SellerExecutiveSummary[],
  settings: ExecutiveBISettings = DEFAULT_EXECUTIVE_BI_SETTINGS
): ExecutiveActionItem[] {
  const actions: ExecutiveActionItem[] = [];

  // 1. Loss-making products
  const lossMakers = productProfitability.filter(p => p.isLossMaking);
  if (lossMakers.length > 0) {
    const totalLoss = lossMakers.reduce((sum, p) => sum + Math.abs(p.grossProfitBDT || 0), 0);
    actions.push({
      id: 'action_loss_making_products',
      category: 'MARGIN_RISK',
      severity: 'critical',
      title: 'Loss-Making Products Detected',
      problem: `${lossMakers.length} products are being sold below cost price, eroding ৳${totalLoss.toLocaleString()} in gross margin.`,
      evidence: lossMakers.map(p => `${p.productName} (Selling: ৳${p.averageSellingPriceBDT}, Cost: ৳${p.unitCostBDT})`).slice(0, 3).join('; '),
      recommendedAction: 'Immediately adjust wholesale price above purchase cost or renegotiate supplier rates in Price Intelligence.',
      affectedCount: lossMakers.length,
      affectedRecords: lossMakers.map(p => ({
        id: p.productId,
        label: p.productName,
        secondaryLabel: `Loss: ৳${Math.abs(p.grossProfitBDT || 0).toLocaleString()}`,
        valueBDT: Math.abs(p.grossProfitBDT || 0),
        metricValue: `${p.grossMarginPercent}% margin`
      })),
      drilldownTab: 'profitability'
    });
  }

  // 2. High Sales Low Margin Products
  const highSalesLowMargin = productProfitability.filter(p => p.isHighSalesLowMargin);
  if (highSalesLowMargin.length > 0) {
    const totalVolume = highSalesLowMargin.reduce((sum, p) => sum + p.netSalesBDT, 0);
    actions.push({
      id: 'action_high_sales_low_margin',
      category: 'MARGIN_RISK',
      severity: 'warning',
      title: 'High Sales / Slim Margin Products',
      problem: `${highSalesLowMargin.length} high-volume products generate ৳${totalVolume.toLocaleString()} revenue with margins below ${settings.lowMarginThresholdPercent}%.`,
      evidence: highSalesLowMargin.map(p => `${p.productName}: ৳${p.netSalesBDT.toLocaleString()} sales, ${p.grossMarginPercent}% margin`).slice(0, 3).join('; '),
      recommendedAction: 'A 2-3% price adjustment on these volume drivers would substantially increase company EBITDA.',
      affectedCount: highSalesLowMargin.length,
      affectedRecords: highSalesLowMargin.map(p => ({
        id: p.productId,
        label: p.productName,
        secondaryLabel: `Sales: ৳${p.netSalesBDT.toLocaleString()}`,
        valueBDT: p.netSalesBDT,
        metricValue: `${p.grossMarginPercent}% margin`
      })),
      drilldownTab: 'profitability'
    });
  }

  // 3. At-Risk Sellers (Far behind monthly targets)
  const atRiskSellers = sellerSummaries.filter(s => s.targetStatus === 'at_risk');
  if (atRiskSellers.length > 0) {
    const totalGap = atRiskSellers.reduce((sum, s) => sum + s.targetGapBDT, 0);
    actions.push({
      id: 'action_at_risk_sellers',
      category: 'TARGET_RISK',
      severity: 'critical',
      title: 'Sales Officers Lagging Monthly Target',
      problem: `${atRiskSellers.length} sales officers are below ${settings.targetCriticalThresholdPercent}% of target with ৳${totalGap.toLocaleString()} total revenue gap.`,
      evidence: atRiskSellers.map(s => `${s.sellerName}: ${s.targetAchievementPercent || 0}% achieved, ৳${s.targetGapBDT.toLocaleString()} gap`).slice(0, 3).join('; '),
      recommendedAction: 'Assign high-conversion field visits and review seller daily order pipeline in Field Tracking.',
      affectedCount: atRiskSellers.length,
      affectedRecords: atRiskSellers.map(s => ({
        id: s.sellerId,
        label: s.sellerName,
        secondaryLabel: `Territory: ${s.territory}`,
        valueBDT: s.targetGapBDT,
        metricValue: `${s.targetAchievementPercent}% achieved`
      })),
      drilldownTab: 'sellers'
    });
  }

  // 4. Inactive High-Value Customers
  const inactiveHighValue = customerProfitability.filter(c => c.isInactive && c.netSalesBDT > 30000);
  if (inactiveHighValue.length > 0) {
    actions.push({
      id: 'action_inactive_high_value_customers',
      category: 'CUSTOMER_RISK',
      severity: 'warning',
      title: 'Dormant Key Wholesale Retailers',
      problem: `${inactiveHighValue.length} established wholesale accounts have not placed an order in over ${settings.inactiveCustomerDays} days.`,
      evidence: inactiveHighValue.map(c => `${c.shopName} (${c.daysSinceLastOrder}d dormant)`).slice(0, 3).join('; '),
      recommendedAction: 'Schedule prioritized field sales visits or provide tailored reorder incentives to prevent churn.',
      affectedCount: inactiveHighValue.length,
      affectedRecords: inactiveHighValue.map(c => ({
        id: c.customerId,
        label: c.shopName,
        secondaryLabel: `Owner: ${c.ownerName} (${c.phone})`,
        valueBDT: c.netSalesBDT,
        metricValue: `${c.daysSinceLastOrder} days inactive`
      })),
      drilldownTab: 'customers'
    });
  }

  return actions;
}

export const generateExecutiveActionItems = generateNextBestActions;

// ============================================================================
// DATA QUALITY SCANNER
// ============================================================================

export function scanDataQualityIssues(
  products: Product[],
  orders: Order[],
  customers: Customer[],
  expenses: Expense[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  // 1. Products missing purchase cost
  const missingCostProducts = products.filter(p => !p.purchasePrice || p.purchasePrice <= 0);
  if (missingCostProducts.length > 0) {
    issues.push({
      id: 'dq_missing_product_cost',
      severity: 'critical',
      entityType: 'product',
      title: 'Products Missing Purchase Cost',
      description: `${missingCostProducts.length} products have ৳0 or blank purchase cost. Gross Profit & COGS cannot be accurately computed for these items.`,
      affectedCount: missingCostProducts.length,
      affectedItems: missingCostProducts.map(p => ({
        id: p.id,
        name: p.name,
        identifier: p.sku,
        issueDetails: `Purchase cost is ৳${p.purchasePrice || 0}`
      })),
      resolutionGuide: 'Go to Product Catalog or Price Intelligence to input authoritative supplier cost.'
    });
  }

  // 2. Orders with unassigned sales officer
  const unassignedOrders = orders.filter(o => 
    VALID_EXECUTIVE_SALES_STATUSES.has(o.orderStatus || '') && 
    !o.salesUserId && !o.salesSellerId
  );
  if (unassignedOrders.length > 0) {
    issues.push({
      id: 'dq_unassigned_sales_orders',
      severity: 'warning',
      entityType: 'order',
      title: 'Orders Without Sales Officer Assignment',
      description: `${unassignedOrders.length} finalized orders are not linked to a specific sales representative.`,
      affectedCount: unassignedOrders.length,
      affectedItems: unassignedOrders.map(o => ({
        id: o.id,
        name: `Order #${o.orderNumber}`,
        identifier: o.shopName,
        issueDetails: `Amount: ৳${o.totalAmount.toLocaleString()}`
      })),
      resolutionGuide: 'Assign the responsible sales officer in Order Management to ensure seller targets reflect correctly.'
    });
  }

  // 3. Customers missing phone or assigned seller
  const invalidCustomers = customers.filter(c => !c.phone || c.phone.trim().length < 10);
  if (invalidCustomers.length > 0) {
    issues.push({
      id: 'dq_invalid_customer_contacts',
      severity: 'info',
      entityType: 'customer',
      title: 'Customers with Incomplete Contact Information',
      description: `${invalidCustomers.length} retailer profiles have missing or malformed phone numbers.`,
      affectedCount: invalidCustomers.length,
      affectedItems: invalidCustomers.map(c => ({
        id: c.id,
        name: c.shopName,
        identifier: c.ownerName,
        issueDetails: `Phone: ${c.phone || 'Blank'}`
      })),
      resolutionGuide: 'Update shop contact details in Customer Management.'
    });
  }

  return issues;
}

// ============================================================================
// WHAT-IF SIMULATION ENGINE (CLIENT-SIDE ONLY)
// ============================================================================

export function runWhatIfSimulation(
  productProfitability: ProductProfitabilityItem[],
  params: WhatIfSimulationParams
): WhatIfSimulationResult {
  let baselineSales = 0;
  let baselineCOGS = 0;
  let simulatedSales = 0;
  let simulatedCOGS = 0;

  const priceMultiplier = 1 + params.sellingPriceChangePercent / 100;
  const costMultiplier = 1 + params.purchaseCostChangePercent / 100;
  const volumeMultiplier = 1 + params.salesVolumeChangePercent / 100;

  for (const item of productProfitability) {
    baselineSales += item.netSalesBDT;
    if (item.cogsBDT !== null) baselineCOGS += item.cogsBDT;

    // Simulated
    const simUnits = item.unitsSold * volumeMultiplier;
    const simAvgPrice = item.averageSellingPriceBDT * priceMultiplier;
    const simItemSales = simUnits * simAvgPrice;
    const simUnitCost = (item.unitCostBDT || 0) * costMultiplier;
    const simItemCOGS = simUnits * simUnitCost;

    simulatedSales += simItemSales;
    simulatedCOGS += simItemCOGS;
  }

  const baselineProfit = baselineSales - baselineCOGS;
  const baselineMargin = baselineSales > 0 ? Number(((baselineProfit / baselineSales) * 100).toFixed(1)) : 0;

  const simProfit = simulatedSales - simulatedCOGS;
  const simMargin = simulatedSales > 0 ? Number(((simProfit / simulatedSales) * 100).toFixed(1)) : 0;

  const deltaSales = simulatedSales - baselineSales;
  const deltaSalesPct = calculatePercentChange(simulatedSales, baselineSales);
  const deltaProfit = simProfit - baselineProfit;
  const deltaProfitPct = calculatePercentChange(simProfit, baselineProfit);
  const deltaMarginPoints = Number((simMargin - baselineMargin).toFixed(1));

  return {
    baselineNetSalesBDT: Math.round(baselineSales),
    baselineCOGSBDT: Math.round(baselineCOGS),
    baselineGrossProfitBDT: Math.round(baselineProfit),
    baselineGrossMarginPercent: baselineMargin,
    simulatedNetSalesBDT: Math.round(simulatedSales),
    simulatedCOGSBDT: Math.round(simulatedCOGS),
    simulatedGrossProfitBDT: Math.round(simProfit),
    simulatedGrossMarginPercent: simMargin,
    deltaSalesBDT: Math.round(deltaSales),
    deltaSalesPercent: deltaSalesPct,
    deltaProfitBDT: Math.round(deltaProfit),
    deltaProfitPercent: deltaProfitPct,
    deltaMarginPoints
  };
}

// ============================================================================
// EXECUTIVE AI INSIGHTS GENERATOR (DETERMINISTIC FACTS)
// ============================================================================

export function generateExecutiveAIInsights(
  kpis: ExecutiveKPI[],
  productProfitability: ProductProfitabilityItem[],
  sellerSummaries: SellerExecutiveSummary[],
  regionalSummaries: RegionalSalesSummary[]
): ExecutiveAIInsight[] {
  const insights: ExecutiveAIInsight[] = [];
  const nowStr = new Date().toISOString();

  const netSalesKpi = kpis.find(k => k.id === 'net_sales');
  const grossProfitKpi = kpis.find(k => k.id === 'gross_profit');
  const marginKpi = kpis.find(k => k.id === 'gross_margin');

  // Insight 1: Executive Topline & Margin Health
  const currentSales = netSalesKpi?.currentValue || 0;
  const currentMargin = marginKpi?.currentValue || 0;
  const marginStatus = currentMargin >= 20 ? 'healthy' : currentMargin >= 15 ? 'moderate' : 'compressed';

  insights.push({
    id: 'ai_insight_overview',
    type: 'executive_summary',
    title: 'Topline & Margin Trajectory',
    insight: `Glowzaa recorded ৳${currentSales.toLocaleString()} in net wholesale revenue with a ${marginStatus} gross margin of ${currentMargin}%.`,
    facts: [
      `Net Sales: ৳${currentSales.toLocaleString()}`,
      `Gross Profit: ৳${(grossProfitKpi?.currentValue || 0).toLocaleString()}`,
      `Gross Margin: ${currentMargin}% (${netSalesKpi?.changePercent ? `${netSalesKpi.changePercent > 0 ? '+' : ''}${netSalesKpi.changePercent}% vs prev period` : 'baseline'})`
    ],
    impactLevel: 'high',
    timestamp: nowStr
  });

  // Insight 2: Top Product Contributor
  if (productProfitability.length > 0) {
    const topProd = productProfitability[0];
    insights.push({
      id: 'ai_insight_product_star',
      type: 'product_mix',
      title: 'Primary Revenue Driver',
      insight: `${topProd.productName} is the leading revenue contributor, generating ৳${topProd.netSalesBDT.toLocaleString()} (${topProd.unitsSold} units) at ${topProd.grossMarginPercent || 0}% margin.`,
      facts: [
        `Leading SKU: ${topProd.sku}`,
        `Volume: ${topProd.unitsSold} units`,
        `Gross Margin: ${topProd.grossMarginPercent || 'N/A'}%`
      ],
      impactLevel: 'medium',
      timestamp: nowStr
    });
  }

  // Insight 3: Geographic Momentum
  if (regionalSummaries.length > 0) {
    const topRegion = regionalSummaries[0];
    insights.push({
      id: 'ai_insight_region',
      type: 'target_achievement',
      title: 'High-Density Sales Territory',
      insight: `${topRegion.regionName} accounts for the highest wholesale sales volume at ৳${topRegion.netSalesBDT.toLocaleString()} across ${topRegion.ordersCount} orders.`,
      facts: [
        `Territory: ${topRegion.regionName}`,
        `Orders: ${topRegion.ordersCount}`,
        `Active Retailers: ${topRegion.activeCustomersCount}`
      ],
      impactLevel: 'medium',
      timestamp: nowStr
    });
  }

  return insights;
}

// ============================================================================
// CSV EXPORT ENGINE
// ============================================================================

export function exportExecutiveReportCSV(
  reportType: 'overview' | 'products' | 'customers' | 'sellers' | 'regions' | 'loss_making',
  data: {
    kpis?: ExecutiveKPI[];
    products?: ProductProfitabilityItem[];
    customers?: CustomerProfitabilityItem[];
    sellers?: SellerExecutiveSummary[];
    regions?: RegionalSalesSummary[];
  }
): void {
  let csvContent = '\uFEFF'; // UTF-8 BOM

  if (reportType === 'overview' && data.kpis) {
    csvContent += 'KPI,Current Value,Previous Value,Change Amount,Change %,Status\n';
    data.kpis.forEach(k => {
      csvContent += `"${k.title}","${k.currentValue ?? 'N/A'}","${k.previousValue ?? 'N/A'}","${k.changeAmount ?? 'N/A'}","${k.changePercent ? `${k.changePercent}%` : 'N/A'}","${k.statusLabel || ''}"\n`;
    });
  } else if ((reportType === 'products' || reportType === 'loss_making') && data.products) {
    const prods = reportType === 'loss_making' ? data.products.filter(p => p.isLossMaking) : data.products;
    csvContent += 'Product Name,SKU,Category,Units Sold,Net Sales (BDT),Unit Cost (BDT),COGS (BDT),Gross Profit (BDT),Margin %,Classification\n';
    prods.forEach(p => {
      csvContent += `"${p.productName}","${p.sku}","${p.category}",${p.unitsSold},${p.netSalesBDT},"${p.unitCostBDT ?? 'N/A'}","${p.cogsBDT ?? 'N/A'}","${p.grossProfitBDT ?? 'N/A'}","${p.grossMarginPercent ? `${p.grossMarginPercent}%` : 'N/A'}","${p.marginClassification}"\n`;
    });
  } else if (reportType === 'customers' && data.customers) {
    csvContent += 'Shop Name,Owner,Phone,District,Orders,Net Sales (BDT),Gross Profit (BDT),Margin %,Due (BDT),Last Order,Status\n';
    data.customers.forEach(c => {
      csvContent += `"${c.shopName}","${c.ownerName}","${c.phone}","${c.district}",${c.ordersCount},${c.netSalesBDT},"${c.grossProfitBDT ?? 'N/A'}","${c.grossMarginPercent ? `${c.grossMarginPercent}%` : 'N/A'}",${c.currentDueBDT},"${c.lastOrderDate || 'None'}","${c.isInactive ? 'INACTIVE' : 'ACTIVE'}"\n`;
    });
  } else if (reportType === 'sellers' && data.sellers) {
    csvContent += 'Sales Officer,Territory,Target (BDT),Net Sales (BDT),Achievement %,Target Gap (BDT),Orders,Gross Profit (BDT),Margin %,Status\n';
    data.sellers.forEach(s => {
      csvContent += `"${s.sellerName}","${s.territory}",${s.monthlyTargetBDT},${s.netSalesBDT},"${s.targetAchievementPercent ? `${s.targetAchievementPercent}%` : 'N/A'}",${s.targetGapBDT},${s.ordersCount},"${s.grossProfitBDT ?? 'N/A'}","${s.grossMarginPercent ? `${s.grossMarginPercent}%` : 'N/A'}","${s.targetStatus}"\n`;
    });
  } else if (reportType === 'regions' && data.regions) {
    csvContent += 'Region Name,Orders,Active Retailers,Net Sales (BDT),Gross Profit (BDT),Margin %,AOV (BDT)\n';
    data.regions.forEach(r => {
      csvContent += `"${r.regionName}",${r.ordersCount},${r.activeCustomersCount},${r.netSalesBDT},"${r.grossProfitBDT ?? 'N/A'}","${r.grossMarginPercent ? `${r.grossMarginPercent}%` : 'N/A'}",${r.averageOrderValueBDT}\n`;
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Glowzaa_BI_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// FIRESTORE PERSISTENCE & AUDIT LOGGING
// ============================================================================

export async function fetchExecutiveBISettings(): Promise<ExecutiveBISettings> {
  const path = 'executive_bi_settings';
  try {
    const docRef = doc(db, path, 'global_bi_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_EXECUTIVE_BI_SETTINGS, ...snap.data(), id: snap.id } as ExecutiveBISettings;
    }
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.GET, `${path}/global_bi_settings`);
    } else {
      console.warn('Executive BI settings not found or error loading:', err);
    }
  }
  return DEFAULT_EXECUTIVE_BI_SETTINGS;
}

export const loadExecutiveBISettings = fetchExecutiveBISettings;

export async function saveExecutiveBISettings(settings: Partial<ExecutiveBISettings>, user: AuthUser): Promise<void> {
  const path = 'executive_bi_settings';
  try {
    const docRef = doc(db, path, 'global_bi_settings');
    await setDoc(docRef, {
      ...DEFAULT_EXECUTIVE_BI_SETTINGS,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedByUserId: user.uid,
      updatedByUserName: user.name
    }, { merge: true });

    await recordExecutiveBIAuditLog({
      action: 'PROFITABILITY_THRESHOLD_UPDATED',
      performedByUserId: user.uid,
      performedByUserName: user.name,
      performedByUserRole: user.role,
      timestamp: new Date().toISOString(),
      details: 'Updated executive profitability & alert thresholds'
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${path}/global_bi_settings`);
  }
}

export async function recordExecutiveBIAuditLog(log: Omit<ExecutiveBIAuditLogEntry, 'id'>): Promise<void> {
  const path = 'bi_audit_logs';
  try {
    await addDoc(collection(db, path), {
      ...log,
      timestamp: log.timestamp || new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to write BI audit log to Firestore:', err);
  }
}
