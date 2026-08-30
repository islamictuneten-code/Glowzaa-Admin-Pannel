import { Order, Product, Customer, FieldDutySession, CustomerVisit } from '../types';

export interface ProductDemandForecast {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  historicalDays: number;
  totalUnitsSold: number;
  averageDailyUnits: number;
  averageWeeklyUnits: number;
  averageMonthlyUnits: number;
  forecast7Days: number;
  forecast14Days: number;
  forecast30Days: number;
  salesTrendPercent: number;
  confidence: 'High' | 'Medium' | 'Low' | 'Insufficient Data';
  dataQuality: 'excellent' | 'good' | 'limited' | 'insufficient';
  dataQualityNote: string;
  lastSaleDate: string | null;
  daysSinceLastSale: number | null;
  status: 'growing' | 'stable' | 'declining' | 'slow_moving' | 'insufficient_data';
  currentStock: number;
  daysOfStock: number | null;
  stockoutRisk7Days: boolean;
  stockoutRisk14Days: boolean;
  recommendedAction: string;
  recentAvgDaily: number;
  previousAvgDaily: number;
}

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  averageDailyDemand: number;
  leadTimeDays: number | null;
  leadTimeSource: 'supplier_data' | 'admin_config' | 'missing';
  safetyStock: number | null;
  safetyStockSource: 'configured' | 'default_policy' | 'missing';
  reorderPoint: number | null;
  forecastDemand30Days: number;
  recommendedOrderQty: number;
  daysOfStock: number | null;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  reason: string;
  dataQuality: 'excellent' | 'good' | 'limited' | 'insufficient';
}

export interface CustomerReorderOpportunity {
  customerId: string;
  customerName: string;
  shopName: string;
  phone: string;
  address: string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  lastOrderDate: string | null;
  orderCount: number;
  averageOrderIntervalDays: number | null;
  averageOrderValue: number;
  estimatedNextOrderWindow: string | null;
  daysUntilExpectedOrder: number | null;
  status: 'due_soon' | 'overdue' | 'on_track' | 'insufficient_history';
  suggestedAction: string;
}

export interface PriorityVisitOpportunity {
  id: string;
  customerId: string;
  customerName: string;
  shopName: string;
  sellerId?: string;
  sellerName?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  lastVisitDate: string | null;
  lastOrderDate: string | null;
  suggestedAction: string;
}

export interface ForecastingSettings {
  forecastHorizonDays: number;
  minHistoryDays: number;
  salesDeclineThreshold: number; // e.g. -15%
  reorderPlanningHorizonDays: number;
  defaultSafetyStockUnits: number;
  defaultLeadTimeDays: number;
}

export const DEFAULT_FORECASTING_SETTINGS: ForecastingSettings = {
  forecastHorizonDays: 30,
  minHistoryDays: 14,
  salesDeclineThreshold: -15,
  reorderPlanningHorizonDays: 30,
  defaultSafetyStockUnits: 10,
  defaultLeadTimeDays: 7,
};

export function getStoredForecastingSettings(): ForecastingSettings {
  try {
    const raw = localStorage.getItem('glowzaa_forecasting_settings');
    if (raw) {
      return { ...DEFAULT_FORECASTING_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_FORECASTING_SETTINGS;
}

export function saveForecastingSettings(settings: ForecastingSettings): void {
  try {
    localStorage.setItem('glowzaa_forecasting_settings', JSON.stringify(settings));
  } catch (e) {
    // ignore
  }
}

/**
 * Computes product demand forecasts from real orders and products data.
 */
export function computeProductForecasts(
  products: Product[],
  orders: Order[],
  settings: ForecastingSettings = getStoredForecastingSettings()
): ProductDemandForecast[] {
  const now = new Date();
  const validOrders = orders.filter(
    o => o.orderStatus && ['delivered', 'completed', 'confirmed', 'processing', 'dispatched'].includes(o.orderStatus.toLowerCase())
  );

  // Map product sales history over time
  // Extract all item sales with dates
  const productSalesMap: { [productId: string]: { date: Date; qty: number }[] } = {};

  validOrders.forEach(order => {
    const orderDateStr = order.createdDate || order.createdAt || now.toISOString();
    const orderDate = new Date(orderDateStr);
    if (isNaN(orderDate.getTime())) return;

    (order.items || []).forEach(item => {
      if (!item.productId) return;
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = [];
      }
      const qty = Number(item.quantity || item.orderedQuantity || 0);
      if (qty > 0) {
        productSalesMap[item.productId].push({ date: orderDate, qty });
      }
    });
  });

  return products.map(prod => {
    const sales = productSalesMap[prod.id] || [];
    const currentStock = Number(prod.currentStock ?? 0);

    // Sort sales by date ascending
    sales.sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalUnitsSold = sales.reduce((acc, s) => acc + s.qty, 0);
    const lastSale = sales.length > 0 ? sales[sales.length - 1] : null;
    const lastSaleDate = lastSale ? lastSale.date.toISOString() : null;
    const daysSinceLastSale = lastSale ? Math.floor((now.getTime() - lastSale.date.getTime()) / (1000 * 60 * 60 * 24)) : null;

    // Determine historical span in days
    let historicalDays = 0;
    if (sales.length > 0) {
      const firstSaleDate = sales[0].date;
      historicalDays = Math.max(1, Math.floor((now.getTime() - firstSaleDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Check data sufficiency
    const hasSufficientHistory = historicalDays >= settings.minHistoryDays && totalUnitsSold > 0;

    if (!hasSufficientHistory) {
      return {
        productId: prod.id,
        productName: prod.name,
        categoryId: prod.categoryId || prod.category,
        categoryName: prod.category || 'General',
        historicalDays,
        totalUnitsSold,
        averageDailyUnits: 0,
        averageWeeklyUnits: 0,
        averageMonthlyUnits: 0,
        forecast7Days: 0,
        forecast14Days: 0,
        forecast30Days: 0,
        salesTrendPercent: 0,
        confidence: 'Insufficient Data',
        dataQuality: 'insufficient',
        dataQualityNote: `Insufficient history (${historicalDays} days, ${totalUnitsSold} units sold. Min required: ${settings.minHistoryDays} days)`,
        lastSaleDate,
        daysSinceLastSale,
        status: 'insufficient_data',
        currentStock,
        daysOfStock: null,
        stockoutRisk7Days: false,
        stockoutRisk14Days: false,
        recommendedAction: 'Insufficient sales history for reliable forecasting.',
        recentAvgDaily: 0,
        previousAvgDaily: 0,
      };
    }

    const averageDailyUnits = totalUnitsSold / historicalDays;
    const averageWeeklyUnits = averageDailyUnits * 7;
    const averageMonthlyUnits = averageDailyUnits * 30;

    // Recent 7 days vs previous 7 days trend comparison
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentSalesQty = sales
      .filter(s => s.date >= sevenDaysAgo)
      .reduce((acc, s) => acc + s.qty, 0);

    const previousSalesQty = sales
      .filter(s => s.date >= fourteenDaysAgo && s.date < sevenDaysAgo)
      .reduce((acc, s) => acc + s.qty, 0);

    const recentAvgDaily = recentSalesQty / 7;
    const previousAvgDaily = previousSalesQty / 7;

    let salesTrendPercent = 0;
    if (previousAvgDaily > 0) {
      salesTrendPercent = Math.round(((recentAvgDaily - previousAvgDaily) / previousAvgDaily) * 100);
    } else if (recentAvgDaily > 0) {
      salesTrendPercent = 100;
    }

    // Weighted demand estimate combining overall average and recent trend
    const weightedDailyDemand = recentAvgDaily * 0.6 + averageDailyUnits * 0.4;

    const forecast7Days = Math.round(weightedDailyDemand * 7 * 10) / 10;
    const forecast14Days = Math.round(weightedDailyDemand * 14 * 10) / 10;
    const forecast30Days = Math.round(weightedDailyDemand * 30 * 10) / 10;

    // Days of stock
    const daysOfStock = weightedDailyDemand > 0 ? Math.round((currentStock / weightedDailyDemand) * 10) / 10 : null;

    const stockoutRisk7Days = currentStock < forecast7Days;
    const stockoutRisk14Days = currentStock < forecast14Days;

    // Status determination
    let status: ProductDemandForecast['status'] = 'stable';
    if (salesTrendPercent >= 15) {
      status = 'growing';
    } else if (salesTrendPercent <= settings.salesDeclineThreshold) {
      status = 'declining';
    } else if (weightedDailyDemand < 0.1) {
      status = 'slow_moving';
    }

    // Confidence level calculation based on sales consistency and history length
    let confidence: ProductDemandForecast['confidence'] = 'Medium';
    let dataQuality: ProductDemandForecast['dataQuality'] = 'good';
    if (historicalDays >= 60 && sales.length >= 10) {
      confidence = 'High';
      dataQuality = 'excellent';
    } else if (historicalDays >= 30) {
      confidence = 'Medium';
      dataQuality = 'good';
    } else {
      confidence = 'Low';
      dataQuality = 'limited';
    }

    let recommendedAction = 'Maintain current stock levels.';
    if (stockoutRisk7Days) {
      recommendedAction = 'CRITICAL: Immediate reorder required to prevent stockout within 7 days.';
    } else if (stockoutRisk14Days) {
      recommendedAction = 'HIGH: Reorder recommended to cover upcoming 14-day demand.';
    } else if (status === 'growing') {
      recommendedAction = 'High growth product: Consider increasing safety stock buffer.';
    } else if (status === 'declining') {
      recommendedAction = 'Sales declining: Review pricing, promotion, or sales push.';
    } else if (status === 'slow_moving') {
      recommendedAction = 'Slow moving: Avoid reordering until existing stock clears.';
    }

    return {
      productId: prod.id,
      productName: prod.name,
      categoryId: prod.categoryId || prod.category,
      categoryName: prod.category || 'General',
      historicalDays,
      totalUnitsSold,
      averageDailyUnits: Math.round(averageDailyUnits * 100) / 100,
      averageWeeklyUnits: Math.round(averageWeeklyUnits * 10) / 10,
      averageMonthlyUnits: Math.round(averageMonthlyUnits * 10) / 10,
      forecast7Days,
      forecast14Days,
      forecast30Days,
      salesTrendPercent,
      confidence,
      dataQuality,
      dataQualityNote: `Based on ${historicalDays} days of sales history (${totalUnitsSold} units total)`,
      lastSaleDate,
      daysSinceLastSale,
      status,
      currentStock,
      daysOfStock,
      stockoutRisk7Days,
      stockoutRisk14Days,
      recommendedAction,
      recentAvgDaily: Math.round(recentAvgDaily * 100) / 100,
      previousAvgDaily: Math.round(previousAvgDaily * 100) / 100,
    };
  });
}

/**
 * Computes reorder intelligence and reorder points for products.
 */
export function computeReorderRecommendations(
  products: Product[],
  forecasts: ProductDemandForecast[],
  settings: ForecastingSettings = getStoredForecastingSettings()
): ReorderRecommendation[] {
  return products.map(prod => {
    const forecast = forecasts.find(f => f.productId === prod.id);
    const currentStock = Number(prod.currentStock ?? 0);
    const avgDailyDemand = forecast ? forecast.averageDailyUnits : 0;

    // Lead time and safety stock handling (do not fabricate)
    // If supplier lead time / safety stock not explicitly set on product, use settings or mark missing
    const leadTimeDays = (prod as any).leadTimeDays ?? settings.defaultLeadTimeDays;
    const safetyStock = (prod as any).safetyStock ?? settings.defaultSafetyStockUnits;

    let reorderPoint: number | null = null;
    if (leadTimeDays != null && safetyStock != null && avgDailyDemand > 0) {
      reorderPoint = Math.round((avgDailyDemand * leadTimeDays + safetyStock) * 10) / 10;
    }

    const forecastDemand30Days = forecast ? forecast.forecast30Days : Math.round(avgDailyDemand * 30 * 10) / 10;

    // Recommended order quantity = forecast demand during planning horizon + safety stock - current stock
    let recommendedOrderQty = 0;
    if (avgDailyDemand > 0) {
      const needed = forecastDemand30Days + (safetyStock || 0) - currentStock;
      recommendedOrderQty = Math.max(0, Math.ceil(needed));
    }

    const daysOfStock = forecast ? forecast.daysOfStock : (avgDailyDemand > 0 ? currentStock / avgDailyDemand : null);

    // Determine priority
    let priority: ReorderRecommendation['priority'] = 'none';
    let reason = 'Stock level is healthy.';

    if (currentStock <= 0) {
      priority = 'critical';
      reason = 'Out of stock! Immediate restock required.';
    } else if (forecast && forecast.stockoutRisk7Days) {
      priority = 'critical';
      reason = 'Projected stockout within 7 days.';
    } else if (reorderPoint !== null && currentStock <= reorderPoint) {
      priority = 'high';
      reason = `Current stock (${currentStock}) is at or below reorder point (${reorderPoint}).`;
    } else if (forecast && forecast.stockoutRisk14Days) {
      priority = 'high';
      reason = 'Projected stockout within 14 days.';
    } else if (recommendedOrderQty > 0) {
      priority = 'medium';
      reason = 'Stock approaching reorder threshold.';
    } else if (forecast && forecast.status === 'slow_moving') {
      priority = 'low';
      reason = 'Slow moving product with excess stock.';
    }

    return {
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      category: prod.category || 'General',
      currentStock,
      averageDailyDemand: Math.round(avgDailyDemand * 100) / 100,
      leadTimeDays: leadTimeDays ?? null,
      leadTimeSource: (prod as any).leadTimeDays != null ? 'supplier_data' : 'admin_config',
      safetyStock: safetyStock ?? null,
      safetyStockSource: (prod as any).safetyStock != null ? 'configured' : 'default_policy',
      reorderPoint,
      forecastDemand30Days,
      recommendedOrderQty,
      daysOfStock,
      priority,
      reason,
      dataQuality: forecast ? forecast.dataQuality : 'insufficient',
    };
  });
}

/**
 * Computes customer reorder opportunities based on historical purchasing intervals.
 */
export function computeCustomerReorderOpportunities(
  customers: Customer[],
  orders: Order[]
): CustomerReorderOpportunity[] {
  const now = new Date();
  const validOrders = orders.filter(
    o => o.orderStatus && ['delivered', 'completed', 'confirmed', 'processing', 'dispatched'].includes(o.orderStatus.toLowerCase())
  );

  // Group orders by customerId
  const customerOrdersMap: { [customerId: string]: { date: Date; amount: number }[] } = {};
  validOrders.forEach(order => {
    if (!order.customerId) return;
    const d = new Date(order.createdDate || order.createdAt || now.toISOString());
    if (isNaN(d.getTime())) return;
    if (!customerOrdersMap[order.customerId]) {
      customerOrdersMap[order.customerId] = [];
    }
    customerOrdersMap[order.customerId].push({ date: d, amount: Number(order.totalAmount || 0) });
  });

  return customers.map(cust => {
    const ordersList = customerOrdersMap[cust.id] || [];
    ordersList.sort((a, b) => a.date.getTime() - b.date.getTime());

    const orderCount = ordersList.length;
    const lastOrder = orderCount > 0 ? ordersList[orderCount - 1] : null;
    const lastOrderDate = lastOrder ? lastOrder.date.toISOString() : null;

    let averageOrderIntervalDays: number | null = null;
    if (orderCount >= 2) {
      let totalIntervals = 0;
      for (let i = 1; i < ordersList.length; i++) {
        const diff = (ordersList[i].date.getTime() - ordersList[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
        totalIntervals += diff;
      }
      averageOrderIntervalDays = Math.round(totalIntervals / (orderCount - 1));
    }

    const totalAmountSum = ordersList.reduce((acc, o) => acc + o.amount, 0);
    const averageOrderValue = orderCount > 0 ? Math.round(totalAmountSum / orderCount) : 0;

    let estimatedNextOrderWindow: string | null = null;
    let daysUntilExpectedOrder: number | null = null;
    let status: CustomerReorderOpportunity['status'] = 'insufficient_history';
    let suggestedAction = 'Gather more purchase history for reorder estimation.';

    if (lastOrder && averageOrderIntervalDays !== null && averageOrderIntervalDays > 0) {
      const nextExpectedTime = lastOrder.date.getTime() + averageOrderIntervalDays * 24 * 60 * 60 * 1000;
      const nextExpectedDate = new Date(nextExpectedTime);
      estimatedNextOrderWindow = nextExpectedDate.toLocaleDateString();

      daysUntilExpectedOrder = Math.round((nextExpectedTime - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpectedOrder < 0) {
        status = 'overdue';
        suggestedAction = `Overdue for reorder by ~${Math.abs(daysUntilExpectedOrder)} days. Contact customer immediately.`;
      } else if (daysUntilExpectedOrder <= 5) {
        status = 'due_soon';
        suggestedAction = `Reorder window approaching in ${daysUntilExpectedOrder} days. Schedule sales visit or call.`;
      } else {
        status = 'on_track';
        suggestedAction = `Customer order cycle on track (Expected in ${daysUntilExpectedOrder} days).`;
      }
    } else if (orderCount === 1) {
      status = 'due_soon';
      suggestedAction = 'First-time customer. Follow up for repeat order and catalog review.';
    }

    return {
      customerId: cust.id,
      customerName: cust.ownerName || cust.shopName,
      shopName: cust.shopName,
      phone: cust.phone,
      address: cust.address,
      assignedSalesUserId: cust.assignedSalesUserId,
      assignedSalesUserName: cust.assignedSalesUserName || cust.assignedSalesSellerName,
      lastOrderDate,
      orderCount,
      averageOrderIntervalDays,
      averageOrderValue,
      estimatedNextOrderWindow,
      daysUntilExpectedOrder,
      status,
      suggestedAction,
    };
  });
}

/**
 * Computes priority visit opportunities for field sales.
 */
export function computePriorityVisitOpportunities(
  customers: Customer[],
  orders: Order[],
  visits: CustomerVisit[],
  fieldSessions: FieldDutySession[]
): PriorityVisitOpportunity[] {
  const customerReorders = computeCustomerReorderOpportunities(customers, orders);
  const now = new Date();

  const visitMap: { [customerId: string]: string } = {};
  visits.forEach(v => {
    if (!v.customerId) return;
    const vDate = v.checkInTime;
    if (!visitMap[v.customerId] || (vDate && vDate > visitMap[v.customerId])) {
      visitMap[v.customerId] = vDate;
    }
  });

  const opportunities: PriorityVisitOpportunity[] = [];

  customerReorders.forEach(cr => {
    const cust = customers.find(c => c.id === cr.customerId);
    if (!cust) return;

    const lastVisitDate = visitMap[cr.customerId] || null;
    const daysSinceLastVisit = lastVisitDate ? Math.floor((now.getTime() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;

    let priority: PriorityVisitOpportunity['priority'] = 'low';
    let reason = '';
    let shouldAdd = false;

    if (cr.status === 'overdue') {
      priority = 'critical';
      reason = `Estimated reorder window passed (~${Math.abs(cr.daysUntilExpectedOrder || 0)} days overdue)`;
      shouldAdd = true;
    } else if (cr.status === 'due_soon') {
      priority = 'high';
      reason = `Estimated reorder window approaching in ${cr.daysUntilExpectedOrder} days`;
      shouldAdd = true;
    } else if (cust.currentDue > (cust.creditLimit || 50000) * 0.8) {
      priority = 'high';
      reason = `High credit utilization (৳${cust.currentDue.toLocaleString()} / ৳${(cust.creditLimit || 0).toLocaleString()})`;
      shouldAdd = true;
    } else if (daysSinceLastVisit >= 30) {
      priority = 'medium';
      reason = `No field visit in ${daysSinceLastVisit} days`;
      shouldAdd = true;
    }

    if (shouldAdd) {
      opportunities.push({
        id: `visit_opp_${cust.id}`,
        customerId: cust.id,
        customerName: cust.ownerName || cust.shopName,
        shopName: cust.shopName,
        sellerId: cust.assignedSalesUserId,
        sellerName: cust.assignedSalesUserName || cust.assignedSalesSellerName,
        priority,
        reason,
        lastVisitDate,
        lastOrderDate: cr.lastOrderDate,
        suggestedAction: cr.suggestedAction,
      });
    }
  });

  // Sort by priority (critical > high > medium > low)
  const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  opportunities.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);

  return opportunities;
}
