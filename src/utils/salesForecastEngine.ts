import { Product, Order, Customer, FieldDutySession, CustomerVisit, AuthUser, BusinessAlert, ProductDemandForecast, ReorderRecommendation, CustomerReorderOpportunity, SellerOpportunity } from '../types';

export interface ForecastingSettings {
  forecastHorizonDays: number; // default 30
  minHistoryDays: number; // default 14
  salesDeclineThreshold: number; // default -15 (%)
  reorderPlanningHorizon: number; // default 30
  defaultLeadTimeDays: number; // default 5 (or null if strict)
  defaultSafetyStockUnits: number; // default 10
}

export const DEFAULT_FORECASTING_SETTINGS: ForecastingSettings = {
  forecastHorizonDays: 30,
  minHistoryDays: 14,
  salesDeclineThreshold: -15,
  reorderPlanningHorizon: 30,
  defaultLeadTimeDays: 5,
  defaultSafetyStockUnits: 15,
};

/**
 * Calculate Product Demand Forecasts using real orders and product stock data
 */
export function calculateSalesForecasts(
  products: Product[],
  orders: Order[],
  settings: ForecastingSettings = DEFAULT_FORECASTING_SETTINGS
): ProductDemandForecast[] {
  const now = Date.now();
  const validOrders = orders.filter(o => {
    const st = String(o.orderStatus || '').toLowerCase();
    return !['cancelled', 'returned'].includes(st);
  });

  return products.map(product => {
    const pId = product.id;
    const currentStock = Number(product.currentStock ?? 0);
    const categoryName = product.category || 'General';
    const categoryId = product.categoryId || categoryName.toLowerCase().replace(/\s+/g, '_');

    // Gather all order line items for this product
    const productSales: { date: number; quantity: number }[] = [];
    let earliestDate = now;
    let lastSaleTime: number | null = null;

    validOrders.forEach(o => {
      const orderDateStr = o.createdDate || o.createdAt;
      if (!orderDateStr) return;
      const orderTime = new Date(orderDateStr).getTime();
      if (isNaN(orderTime)) return;

      if (orderTime < earliestDate) {
        earliestDate = orderTime;
      }

      o.items.forEach(item => {
        if (item.productId === pId || item.productName === product.name) {
          const qty = Number(item.quantity || item.deliveredQuantity || 1);
          productSales.push({ date: orderTime, quantity: qty });
          if (!lastSaleTime || orderTime > lastSaleTime) {
            lastSaleTime = orderTime;
          }
        }
      });
    });

    const historicalDays = Math.max(1, Math.floor((now - earliestDate) / (1000 * 60 * 60 * 24)));
    const totalUnitsSold = productSales.reduce((sum, s) => sum + s.quantity, 0);

    const daysSinceLastSale = lastSaleTime ? Math.floor((now - lastSaleTime) / (1000 * 60 * 60 * 24)) : null;
    const lastSaleDateStr = lastSaleTime ? new Date(lastSaleTime).toISOString().split('T')[0] : null;

    // Check data sufficiency
    const hasSufficientHistory = historicalDays >= settings.minHistoryDays && productSales.length >= 2;

    if (!hasSufficientHistory || totalUnitsSold === 0) {
      return {
        productId: pId,
        productName: product.name,
        categoryId,
        categoryName,
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
        lastSaleDate: lastSaleDateStr,
        daysSinceLastSale,
        status: 'insufficient_data',
        currentStock,
        daysOfStock: null,
        stockoutRisk7Days: false,
        stockoutRisk14Days: false,
      };
    }

    const averageDailyUnits = totalUnitsSold / Math.max(1, historicalDays);
    const averageWeeklyUnits = averageDailyUnits * 7;
    const averageMonthlyUnits = averageDailyUnits * 30;

    // Recent 7 days vs previous 7 days trend
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

    const recentUnits = productSales
      .filter(s => s.date >= sevenDaysAgo)
      .reduce((sum, s) => sum + s.quantity, 0);

    const previousUnits = productSales
      .filter(s => s.date >= fourteenDaysAgo && s.date < sevenDaysAgo)
      .reduce((sum, s) => sum + s.quantity, 0);

    const recentDaily = recentUnits / 7;
    const prevDaily = previousUnits > 0 ? previousUnits / 7 : averageDailyUnits;

    let trendPercent = prevDaily > 0 ? Math.round(((recentDaily - prevDaily) / prevDaily) * 100) : 0;
    if (trendPercent > 200) trendPercent = 200;
    if (trendPercent < -100) trendPercent = -100;

    // Weighted trend multiplier
    const trendMultiplier = 1 + trendPercent / 100;
    const adjustedDaily = Math.max(0, averageDailyUnits * 0.6 + recentDaily * 0.4 * Math.max(0.5, trendMultiplier));

    const forecast7Days = Math.round(adjustedDaily * 7);
    const forecast14Days = Math.round(adjustedDaily * 14);
    const forecast30Days = Math.round(adjustedDaily * 30);

    const daysOfStock = adjustedDaily > 0 ? Math.round((currentStock / adjustedDaily) * 10) / 10 : null;
    const stockoutRisk7Days = currentStock < forecast7Days;
    const stockoutRisk14Days = currentStock < forecast14Days;

    let status: ProductDemandForecast['status'] = 'stable';
    if (trendPercent >= 15) status = 'growing';
    else if (trendPercent <= settings.salesDeclineThreshold) status = 'declining';
    else if (averageDailyUnits < 0.1) status = 'slow_moving';

    let confidence: ProductDemandForecast['confidence'] = 'Medium';
    let dataQuality: ProductDemandForecast['dataQuality'] = 'good';

    if (historicalDays >= 30 && productSales.length >= 10) {
      confidence = 'High';
      dataQuality = 'excellent';
    } else if (historicalDays >= 14 && productSales.length >= 4) {
      confidence = 'Medium';
      dataQuality = 'good';
    } else {
      confidence = 'Low';
      dataQuality = 'limited';
    }

    return {
      productId: pId,
      productName: product.name,
      categoryId,
      categoryName,
      historicalDays,
      totalUnitsSold,
      averageDailyUnits: Math.round(averageDailyUnits * 100) / 100,
      averageWeeklyUnits: Math.round(averageWeeklyUnits * 10) / 10,
      averageMonthlyUnits: Math.round(averageMonthlyUnits * 10) / 10,
      forecast7Days,
      forecast14Days,
      forecast30Days,
      salesTrendPercent: trendPercent,
      confidence,
      dataQuality,
      lastSaleDate: lastSaleDateStr,
      daysSinceLastSale,
      status,
      currentStock,
      daysOfStock,
      stockoutRisk7Days,
      stockoutRisk14Days,
    };
  });
}

/**
 * Calculate Reorder Recommendations based on forecasts, lead time, and safety stock
 */
export function calculateReorderRecommendations(
  products: Product[],
  forecasts: ProductDemandForecast[],
  settings: ForecastingSettings = DEFAULT_FORECASTING_SETTINGS
): ReorderRecommendation[] {
  return products.map(product => {
    const forecast = forecasts.find(f => f.productId === product.id);
    const currentStock = Number(product.currentStock ?? 0);
    const avgDaily = forecast ? forecast.averageDailyUnits : 0;
    const leadTimeDays = settings.defaultLeadTimeDays; // explicit configuration or supplier lead time if present
    const safetyStock = settings.defaultSafetyStockUnits;

    const reorderPoint = leadTimeDays !== null ? Math.round(avgDaily * leadTimeDays + safetyStock) : null;
    const forecastDemand30Days = forecast ? forecast.forecast30Days : Math.round(avgDaily * 30);

    // Recommended Order Qty = forecast demand + safety stock - current stock
    const rawQty = forecastDemand30Days + safetyStock - currentStock;
    const recommendedOrderQty = Math.max(0, rawQty);

    const daysOfStock = forecast ? forecast.daysOfStock : null;

    let priority: ReorderRecommendation['priority'] = 'none';
    let reason = 'Stock level is sufficient for projected demand.';

    if (currentStock <= 0 || (daysOfStock !== null && daysOfStock <= 3)) {
      priority = 'critical';
      reason = 'Critical stockout imminent or stock exhausted within 3 days.';
    } else if (reorderPoint !== null && currentStock <= reorderPoint) {
      priority = 'high';
      reason = `Current stock (${currentStock}) is at or below reorder point (${reorderPoint}).`;
    } else if (daysOfStock !== null && daysOfStock <= 14) {
      priority = 'medium';
      reason = `Stock approaching reorder threshold (${daysOfStock} days of stock remaining).`;
    } else if (forecast && forecast.status === 'slow_moving') {
      priority = 'low';
      reason = 'Slow moving product with low demand velocity.';
    }

    return {
      productId: product.id,
      productName: product.name,
      currentStock,
      averageDailyDemand: avgDaily,
      leadTimeDays,
      safetyStock,
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
 * Calculate Customer Reorder Opportunities based on order history intervals
 */
export function calculateCustomerReorderOpportunities(
  customers: Customer[],
  orders: Order[]
): CustomerReorderOpportunity[] {
  const now = Date.now();
  const validOrders = orders.filter(o => {
    const st = String(o.orderStatus || '').toLowerCase();
    return !['cancelled', 'returned'].includes(st);
  });

  return customers.map(cust => {
    const custOrders = validOrders
      .filter(o => o.customerId === cust.id || o.customerName === cust.shopName)
      .sort((a, b) => new Date(b.createdDate || b.createdAt || 0).getTime() - new Date(a.createdDate || a.createdAt || 0).getTime());

    const orderFrequency = custOrders.length;
    const lastOrderDateStr = custOrders.length > 0 ? custOrders[0].createdDate || custOrders[0].createdAt || null : null;
    const lastOrderTime = lastOrderDateStr ? new Date(lastOrderDateStr).getTime() : null;

    let averageOrderIntervalDays: number | null = null;
    if (custOrders.length >= 2) {
      const intervals: number[] = [];
      for (let i = 0; i < custOrders.length - 1; i++) {
        const t1 = new Date(custOrders[i].createdDate || custOrders[i].createdAt || 0).getTime();
        const t2 = new Date(custOrders[i + 1].createdDate || custOrders[i + 1].createdAt || 0).getTime();
        if (!isNaN(t1) && !isNaN(t2)) {
          const diffDays = Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
          intervals.push(diffDays);
        }
      }
      if (intervals.length > 0) {
        const sumIntervals = intervals.reduce((acc, val) => acc + val, 0);
        averageOrderIntervalDays = Math.round(sumIntervals / intervals.length);
      }
    }

    const totalSpent = custOrders.reduce((sum, o) => sum + Number(o.totalAmount || o.grandTotal || 0), 0);
    const averageOrderValue = orderFrequency > 0 ? Math.round(totalSpent / orderFrequency) : 0;

    let estimatedNextOrderWindow: string | null = null;
    let status: CustomerReorderOpportunity['status'] = 'insufficient_history';
    let reason = 'Insufficient purchase history to estimate reorder window.';

    if (orderFrequency >= 2 && averageOrderIntervalDays !== null && lastOrderTime) {
      const nextOrderTime = lastOrderTime + averageOrderIntervalDays * 24 * 60 * 60 * 1000;
      estimatedNextOrderWindow = new Date(nextOrderTime).toISOString().split('T')[0];

      const daysUntilNext = Math.floor((nextOrderTime - now) / (1000 * 60 * 60 * 24));

      if (daysUntilNext < 0) {
        status = 'overdue';
        reason = `Past expected reorder window by ${Math.abs(daysUntilNext)} days (avg interval ${averageOrderIntervalDays} days).`;
      } else if (daysUntilNext <= 5) {
        status = 'due_soon';
        reason = `Expected reorder window approaching in ${daysUntilNext} days.`;
      } else {
        status = 'healthy';
        reason = `Active account. Next estimated reorder in ${daysUntilNext} days.`;
      }
    } else if (orderFrequency === 1 && lastOrderTime) {
      const daysSinceFirst = Math.floor((now - lastOrderTime) / (1000 * 60 * 60 * 24));
      if (daysSinceFirst >= 21) {
        status = 'due_soon';
        reason = `Made single order ${daysSinceFirst} days ago. Follow-up recommended.`;
      } else {
        status = 'healthy';
        reason = 'Recent first-time order placed.';
      }
    }

    return {
      customerId: cust.id,
      shopName: cust.shopName,
      ownerName: cust.ownerName,
      phone: cust.phone,
      district: cust.district,
      assignedSalesUserId: cust.assignedSalesUserId,
      assignedSalesUserName: cust.assignedSalesUserName || cust.assignedSalesSellerName,
      lastOrderDate: lastOrderDateStr,
      orderFrequency,
      averageOrderIntervalDays,
      averageOrderValue,
      estimatedNextOrderWindow,
      status,
      reason,
    };
  });
}

/**
 * Calculate Seller Opportunities and Field Visit priorities
 */
export function calculateSellerOpportunities(
  customers: Customer[],
  orders: Order[],
  customerOpportunities: CustomerReorderOpportunity[]
): SellerOpportunity[] {
  const sellerMap = new Map<string, SellerOpportunity>();

  customers.forEach(cust => {
    const sId = cust.assignedSalesUserId || 'unassigned';
    const sName = cust.assignedSalesUserName || cust.assignedSalesSellerName || 'Unassigned Rep';
    const territory = cust.district || cust.area || 'General';

    if (!sellerMap.has(sId)) {
      sellerMap.set(sId, {
        sellerId: sId,
        sellerName: sName,
        territory,
        customerOpportunities: [],
      });
    }

    const opp = customerOpportunities.find(c => c.customerId === cust.id);
    if (opp && (opp.status === 'due_soon' || opp.status === 'overdue')) {
      const seller = sellerMap.get(sId)!;
      seller.customerOpportunities.push({
        customerId: cust.id,
        shopName: cust.shopName,
        reason: opp.reason,
        suggestedAction: opp.status === 'overdue' ? 'Urgent visit & phone call — reorder window overdue' : 'Schedule territory visit for reorder discussion',
        priority: opp.status === 'overdue' ? 'high' : 'medium',
      });
    }
  });

  return Array.from(sellerMap.values());
}

/**
 * Generate Smart Business Alerts for forecasting & inventory
 */
export function generateForecastBusinessAlerts(
  forecasts: ProductDemandForecast[],
  reorders: ReorderRecommendation[],
  customerOpps: CustomerReorderOpportunity[]
): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];

  // 1. Stockout Risk Alerts
  forecasts.forEach(f => {
    if (f.stockoutRisk7Days) {
      alerts.push({
        id: `alert_stockout_${f.productId}`,
        type: 'PRODUCT_STOCKOUT_RISK',
        category: 'inventory',
        severity: 'critical',
        title: `Stockout Risk: ${f.productName}`,
        description: `Current stock (${f.currentStock}) is below projected 7-day demand (${f.forecast7Days} units).`,
        targetType: 'product',
        targetId: f.productId,
        entityName: f.productName,
        metric: 'Stock vs 7-Day Demand',
        currentValue: `${f.currentStock} units`,
        metricValue: f.currentStock,
        actionLabel: 'Review Reorder',
        actionType: 'navigate_inventory',
        status: 'unread',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // 2. Reorder Required Alerts
  reorders.forEach(r => {
    if (r.priority === 'critical' || r.priority === 'high') {
      alerts.push({
        id: `alert_reorder_${r.productId}`,
        type: 'PRODUCT_REORDER_REQUIRED',
        category: 'inventory',
        severity: r.priority === 'critical' ? 'critical' : 'warning',
        title: `Reorder Required: ${r.productName}`,
        description: r.reason,
        targetType: 'product',
        targetId: r.productId,
        entityName: r.productName,
        metric: 'Recommended Order Qty',
        currentValue: `${r.recommendedOrderQty} units`,
        metricValue: r.recommendedOrderQty,
        actionLabel: 'Create Purchase Order',
        actionType: 'navigate_purchases',
        status: 'unread',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // 3. Customer Reorder Window Alerts
  customerOpps.forEach(c => {
    if (c.status === 'due_soon' || c.status === 'overdue') {
      alerts.push({
        id: `alert_cust_reorder_${c.customerId}`,
        type: 'CUSTOMER_REORDER_OPPORTUNITY',
        category: 'sales',
        severity: c.status === 'overdue' ? 'warning' : 'opportunity',
        title: `Reorder Window: ${c.shopName}`,
        description: c.reason,
        targetType: 'customer',
        targetId: c.customerId,
        customerId: c.customerId,
        customerName: c.shopName,
        sellerId: c.assignedSalesUserId,
        sellerName: c.assignedSalesUserName,
        metric: 'Est. Reorder Window',
        currentValue: c.estimatedNextOrderWindow || 'Due Now',
        actionLabel: 'Open Customer 360',
        actionType: 'open_customer_360',
        status: 'unread',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return alerts;
}
