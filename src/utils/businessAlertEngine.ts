import { Customer, Order, Payment, CustomerVisit, FieldDutySession, Product, AuthUser, BusinessAlert } from '../types';
import { computeProductForecasts, computeCustomerReorderOpportunities } from '../services/salesForecastService';

export interface BusinessAlertSettings {
  highCreditUtilizationThreshold: number; // e.g., 80%
  salesDeclineThreshold: number; // e.g., 20%
  customerInactivityDays: number; // e.g., 30 days
}

export const DEFAULT_ALERT_SETTINGS: BusinessAlertSettings = {
  highCreditUtilizationThreshold: 80,
  salesDeclineThreshold: 20,
  customerInactivityDays: 30
};

export function getStoredAlertSettings(): BusinessAlertSettings {
  try {
    const saved = localStorage.getItem('glowzaa_business_alert_settings');
    if (saved) {
      return { ...DEFAULT_ALERT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Error loading business alert settings:', err);
  }
  return DEFAULT_ALERT_SETTINGS;
}

export function saveStoredAlertSettings(settings: BusinessAlertSettings) {
  try {
    localStorage.setItem('glowzaa_business_alert_settings', JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving business alert settings:', err);
  }
}

export function getStoredAlertStatuses(): Record<string, 'unread' | 'read' | 'dismissed' | 'actioned'> {
  try {
    const saved = localStorage.getItem('glowzaa_business_alert_statuses');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading alert statuses:', err);
  }
  return {};
}

export function saveStoredAlertStatuses(statuses: Record<string, 'unread' | 'read' | 'dismissed' | 'actioned'>) {
  try {
    localStorage.setItem('glowzaa_business_alert_statuses', JSON.stringify(statuses));
  } catch (err) {
    console.error('Error saving alert statuses:', err);
  }
}

/**
 * Centralized deterministic Business Alert Engine
 */
export function generateAdvancedBusinessAlerts(
  customers: Customer[] = [],
  orders: Order[] = [],
  payments: Payment[] = [],
  staffUsers: AuthUser[] = [],
  visits: CustomerVisit[] = [],
  fieldSessions: FieldDutySession[] = [],
  products: Product[] = [],
  settings: BusinessAlertSettings = DEFAULT_ALERT_SETTINGS,
  currentUser?: AuthUser | null
): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];
  const storedStatuses = getStoredAlertStatuses();
  const nowStr = new Date().toISOString();

  const isSalesStaff = currentUser?.role === 'sales';
  const currentUserId = currentUser?.uid || currentUser?.id;
  const currentUserName = currentUser?.name;

  const validOrders = orders.filter(o => ['completed', 'delivered', 'confirmed', 'processing'].includes(o.orderStatus || ''));
  const validPayments = payments.filter(p => !p.isReversed);

  // 1. CREDIT RISK ALERTS
  customers.forEach(c => {
    const creditLimit = Number(c.creditLimit) || 0;
    const currentDue = Number(c.currentDue) || 0;
    const utilization = creditLimit > 0 ? (currentDue / creditLimit) * 100 : 0;
    const isOverdue = (c as any).segment === 'OVERDUE' || c.status === 'overdue_hold' || currentDue > creditLimit;

    // Check RBAC for customer alerts if sales staff
    if (isSalesStaff && c.assignedSalesUserId !== currentUserId && c.assignedSalesUserName !== currentUserName) {
      return;
    }

    // A. SEVERE CREDIT EXCEEDED / OVERDUE
    if (isOverdue || currentDue > creditLimit) {
      const exceededAmt = currentDue - creditLimit;
      const alertId = `alert_credit_exceeded_${c.id}`;
      alerts.push({
        id: alertId,
        type: 'CREDIT_EXCEEDED',
        category: 'credit',
        severity: 'critical',
        title: `Credit Limit Exceeded: ${c.shopName}`,
        description: `${c.shopName} has exceeded its credit limit by ৳${exceededAmt.toLocaleString()}. Current due: ৳${currentDue.toLocaleString()} (Limit: ৳${creditLimit.toLocaleString()}).`,
        entityType: 'customer',
        entityId: c.id,
        entityName: c.shopName,
        relatedUserId: c.assignedSalesUserId,
        relatedUserName: c.assignedSalesUserName,
        metric: `৳${exceededAmt.toLocaleString()} Exceeded`,
        previousValue: `৳${creditLimit.toLocaleString()}`,
        currentValue: `৳${currentDue.toLocaleString()}`,
        changePercent: `${Math.round(utilization)}% Utilized`,
        createdAt: c.updatedAt || nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_customer_360',
        actionLabel: 'View Customer 360°'
      });
    }
    // B. SEVERE CREDIT UTILIZATION (>= 100%)
    else if (utilization >= 100) {
      const alertId = `alert_credit_severe_${c.id}`;
      alerts.push({
        id: alertId,
        type: 'CREDIT_UTILIZATION_SEVERE',
        category: 'credit',
        severity: 'critical',
        title: `Critical Credit Utilization: ${c.shopName}`,
        description: `Credit utilization has reached ${Math.round(utilization)}%. Current due: ৳${currentDue.toLocaleString()} of ৳${creditLimit.toLocaleString()} limit.`,
        entityType: 'customer',
        entityId: c.id,
        entityName: c.shopName,
        relatedUserId: c.assignedSalesUserId,
        relatedUserName: c.assignedSalesUserName,
        metric: `${Math.round(utilization)}% Utilization`,
        previousValue: `৳${creditLimit.toLocaleString()}`,
        currentValue: `৳${currentDue.toLocaleString()}`,
        changePercent: `${Math.round(utilization)}%`,
        createdAt: c.updatedAt || nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_customer_360',
        actionLabel: 'View Customer 360°'
      });
    }
    // C. HIGH CREDIT UTILIZATION (>= threshold)
    else if (utilization >= settings.highCreditUtilizationThreshold) {
      const alertId = `alert_credit_high_${c.id}`;
      alerts.push({
        id: alertId,
        type: 'CREDIT_UTILIZATION_HIGH',
        category: 'credit',
        severity: 'high',
        title: `High Credit Utilization: ${c.shopName}`,
        description: `Credit utilization is at ${Math.round(utilization)}% (threshold: ${settings.highCreditUtilizationThreshold}%).`,
        entityType: 'customer',
        entityId: c.id,
        entityName: c.shopName,
        relatedUserId: c.assignedSalesUserId,
        relatedUserName: c.assignedSalesUserName,
        metric: `${Math.round(utilization)}% Utilized`,
        previousValue: `৳${creditLimit.toLocaleString()}`,
        currentValue: `৳${currentDue.toLocaleString()}`,
        changePercent: `${Math.round(utilization)}%`,
        createdAt: c.updatedAt || nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_customer_360',
        actionLabel: 'View Customer 360°'
      });
    }
  });

  // 2. CUSTOMER SALES ALERTS
  // Calculate customer 30d comparison
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  customers.forEach(c => {
    if (isSalesStaff && c.assignedSalesUserId !== currentUserId && c.assignedSalesUserName !== currentUserName) {
      return;
    }

    const custOrders = validOrders.filter(o => o.customerId === c.id || o.customerName === c.shopName);
    const current30Orders = custOrders.filter(o => now - new Date(o.createdAt || '').getTime() <= thirtyDaysMs);
    const prev30Orders = custOrders.filter(o => {
      const age = now - new Date(o.createdAt || '').getTime();
      return age > thirtyDaysMs && age <= 2 * thirtyDaysMs;
    });

    const currentSales = current30Orders.reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount) || 0), 0);
    const prevSales = prev30Orders.reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount) || 0), 0);

    // A. SALES DECLINING (>= salesDeclineThreshold %, e.g., 20% drop)
    if (prevSales >= 10000 && currentSales < prevSales) {
      const dropPct = Math.round(((prevSales - currentSales) / prevSales) * 100);
      if (dropPct >= settings.salesDeclineThreshold) {
        const alertId = `alert_sales_decline_${c.id}`;
        alerts.push({
          id: alertId,
          type: 'SALES_DECLINING',
          category: 'sales',
          severity: 'high',
          title: `Sales Declining: ${c.shopName}`,
          description: `Sales dropped by ${dropPct}% compared to previous 30-day period (৳${currentSales.toLocaleString()} vs ৳${prevSales.toLocaleString()}).`,
          entityType: 'customer',
          entityId: c.id,
          entityName: c.shopName,
          relatedUserId: c.assignedSalesUserId,
          relatedUserName: c.assignedSalesUserName,
          metric: `-${dropPct}% Sales`,
          previousValue: `৳${prevSales.toLocaleString()}`,
          currentValue: `৳${currentSales.toLocaleString()}`,
          changePercent: `-${dropPct}%`,
          createdAt: nowStr,
          status: storedStatuses[alertId] || 'unread',
          actionType: 'view_customer_360',
          actionLabel: 'View Customer 360°'
        });
      }
    }

    // B. CUSTOMER INACTIVE (no order for >= inactivity days)
    const sortedCustOrders = [...custOrders].sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    const lastOrderDate = sortedCustOrders.length > 0 ? sortedCustOrders[0].createdAt : null;
    const daysSinceLast = lastOrderDate ? Math.floor((now - new Date(lastOrderDate).getTime()) / (24 * 60 * 60 * 1000)) : null;

    if (daysSinceLast !== null && daysSinceLast >= settings.customerInactivityDays && custOrders.length > 0) {
      const alertId = `alert_customer_inactive_${c.id}`;
      alerts.push({
        id: alertId,
        type: 'NO_RECENT_ORDER',
        category: 'customer',
        severity: 'medium',
        title: `Inactive Customer: ${c.shopName}`,
        description: `No order placed in the last ${daysSinceLast} days (threshold: ${settings.customerInactivityDays} days). Last order: ${new Date(lastOrderDate!).toLocaleDateString()}.`,
        entityType: 'customer',
        entityId: c.id,
        entityName: c.shopName,
        relatedUserId: c.assignedSalesUserId,
        relatedUserName: c.assignedSalesUserName,
        metric: `${daysSinceLast} Days Inactive`,
        previousValue: lastOrderDate ? new Date(lastOrderDate).toLocaleDateString() : 'N/A',
        currentValue: `${daysSinceLast} Days`,
        changePercent: 'Inactive',
        createdAt: nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_customer_360',
        actionLabel: 'View Customer 360°'
      });
    }

    // C. HIGH VALUE GROWTH OPPORTUNITY (Positive)
    if (prevSales > 0 && currentSales > prevSales && ((currentSales - prevSales) / prevSales) * 100 >= 25) {
      const growthPct = Math.round(((currentSales - prevSales) / prevSales) * 100);
      const alertId = `alert_high_growth_${c.id}`;
      alerts.push({
        id: alertId,
        type: 'HIGH_GROWTH_CUSTOMER',
        category: 'sales',
        severity: 'opportunity',
        title: `High Growth Account: ${c.shopName}`,
        description: `Sales surged by +${growthPct}% in the current 30-day period reaching ৳${currentSales.toLocaleString()}.`,
        entityType: 'customer',
        entityId: c.id,
        entityName: c.shopName,
        relatedUserId: c.assignedSalesUserId,
        relatedUserName: c.assignedSalesUserName,
        metric: `+${growthPct}% Growth`,
        previousValue: `৳${prevSales.toLocaleString()}`,
        currentValue: `৳${currentSales.toLocaleString()}`,
        changePercent: `+${growthPct}%`,
        createdAt: nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_customer_360',
        actionLabel: 'View Customer 360°'
      });
    }
  });

  // 3. SELLER PERFORMANCE ALERTS
  staffUsers.filter(u => u.role === 'sales').forEach(seller => {
    const sId = seller.uid || seller.id || '';
    if (isSalesStaff && sId !== currentUserId) {
      return;
    }

    const monthlyTarget = Number(seller.monthlyTarget) || 0;
    if (monthlyTarget <= 0) return; // Skip if no target configured

    const sellerOrders = validOrders.filter(o => o.salesUserId === sId || o.salesSellerId === sId || (o as any).salesStaffId === sId || o.salesUserName === seller.name);
    const sellerSales = sellerOrders.reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount) || 0), 0);
    const achievementPct = Math.round((sellerSales / monthlyTarget) * 100);

    // A. SELLER BELOW TARGET
    if (achievementPct < 45) {
      const alertId = `alert_seller_below_target_${sId}`;
      alerts.push({
        id: alertId,
        type: 'BELOW_TARGET',
        category: 'sales',
        severity: 'high',
        title: `Seller Target Lag: ${seller.name}`,
        description: `Achievement rate is ${achievementPct}% (Sales: ৳${sellerSales.toLocaleString()} vs Target: ৳${monthlyTarget.toLocaleString()}).`,
        entityType: 'seller',
        entityId: sId,
        entityName: seller.name,
        relatedUserId: sId,
        relatedUserName: seller.name,
        metric: `${achievementPct}% Target`,
        previousValue: `৳${monthlyTarget.toLocaleString()}`,
        currentValue: `৳${sellerSales.toLocaleString()}`,
        changePercent: `${achievementPct}%`,
        createdAt: nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_seller',
        actionLabel: 'Review Seller'
      });
    }
    // B. STRONG SELLER PERFORMANCE (Positive)
    else if (achievementPct >= 100) {
      const alertId = `alert_seller_star_${sId}`;
      alerts.push({
        id: alertId,
        type: 'TOP_SELLER',
        category: 'sales',
        severity: 'opportunity',
        title: `Top Performer: ${seller.name}`,
        description: `Exceeded monthly quota with ${achievementPct}% achievement (৳${sellerSales.toLocaleString()} delivered).`,
        entityType: 'seller',
        entityId: sId,
        entityName: seller.name,
        relatedUserId: sId,
        relatedUserName: seller.name,
        metric: `${achievementPct}% Achieved`,
        previousValue: `৳${monthlyTarget.toLocaleString()}`,
        currentValue: `৳${sellerSales.toLocaleString()}`,
        changePercent: `+${achievementPct - 100}%`,
        createdAt: nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_seller',
        actionLabel: 'View Leaderboard'
      });
    }
  });

  // 4. FIELD SALES ALERTS
  staffUsers.filter(u => u.role === 'sales').forEach(seller => {
    const sId = seller.uid || seller.id || '';
    if (isSalesStaff && sId !== currentUserId) return;

    const sellerVisits = visits.filter(v => v.userId === sId || v.userName === seller.name);
    const completedVisits = sellerVisits.filter(v => ['order_booked', 'payment_collected', 'follow_up', 'no_sale'].includes(v.visitOutcome));
    const orderBookedVisits = sellerVisits.filter(v => v.visitOutcome === 'order_booked');
    const conversionRate = completedVisits.length > 0 ? Math.round((orderBookedVisits.length / completedVisits.length) * 100) : 0;

    // A. LOW VISIT CONVERSION
    if (completedVisits.length >= 5 && conversionRate < 15) {
      const alertId = `alert_field_conversion_${sId}`;
      alerts.push({
        id: alertId,
        type: 'LOW_VISIT_CONVERSION',
        category: 'field',
        severity: 'medium',
        title: `Low Visit Conversion: ${seller.name}`,
        description: `Visit-to-order conversion rate is ${conversionRate}% (${orderBookedVisits.length} orders from ${completedVisits.length} completed visits).`,
        entityType: 'seller',
        entityId: sId,
        entityName: seller.name,
        relatedUserId: sId,
        relatedUserName: seller.name,
        metric: `${conversionRate}% Conversion`,
        previousValue: `${completedVisits.length} Visits`,
        currentValue: `${orderBookedVisits.length} Orders`,
        changePercent: `${conversionRate}%`,
        createdAt: nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_field',
        actionLabel: 'View Field Activity'
      });
    }

    // B. GPS STALE / DELAYED CHECK
    const latestSession = fieldSessions.find(s => s.userId === sId || s.userName === seller.name);
    const sessionTime = latestSession?.updatedAt || latestSession?.createdAt;
    if (latestSession && latestSession.status === 'active' && sessionTime) {
      const pingAgeMinutes = Math.floor((now - new Date(sessionTime).getTime()) / (60 * 1000));
      if (pingAgeMinutes >= 45) {
        const alertId = `alert_gps_stale_${sId}`;
        alerts.push({
          id: alertId,
          type: 'GPS_STALE',
          category: 'field',
          severity: 'high',
          title: `Stale GPS Ping: ${seller.name}`,
          description: `Field duty is active, but no GPS ping received for ${pingAgeMinutes} minutes.`,
          entityType: 'seller',
          entityId: sId,
          entityName: seller.name,
          relatedUserId: sId,
          relatedUserName: seller.name,
          metric: `${pingAgeMinutes}m Stale`,
          previousValue: 'Active GPS',
          currentValue: `${pingAgeMinutes}m Delay`,
          changePercent: 'Stale GPS',
          createdAt: nowStr,
          status: storedStatuses[alertId] || 'unread',
          actionType: 'view_field',
          actionLabel: 'Check Field Status'
        });
      }
    }
  });

  // 5. PRODUCT / INVENTORY ALERTS
  products.forEach(p => {
    const stock = Number(p.currentStock ?? (p as any).stock ?? 0);
    const reorderLevel = Number(p.lowStockThreshold ?? (p as any).reorderLevel ?? 10);
    if (stock <= 0) {
      const alertId = `alert_stock_out_${p.id}`;
      alerts.push({
        id: alertId,
        type: 'LOW_STOCK',
        category: 'product',
        severity: 'critical',
        title: `Out of Stock: ${p.name}`,
        description: `Product SKU ${p.sku || p.id} has 0 units remaining in inventory.`,
        entityType: 'product',
        entityId: p.id,
        entityName: p.name,
        metric: '0 Units',
        previousValue: `${reorderLevel} Min`,
        currentValue: '0 Units',
        changePercent: 'Out of Stock',
        createdAt: nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_inventory',
        actionLabel: 'Manage Inventory'
      });
    } else if (stock <= reorderLevel) {
      const alertId = `alert_stock_low_${p.id}`;
      alerts.push({
        id: alertId,
        type: 'LOW_STOCK',
        category: 'product',
        severity: 'warning',
        title: `Low Stock: ${p.name}`,
        description: `Product SKU ${p.sku || p.id} is low on stock (${stock} units remaining; reorder level: ${reorderLevel}).`,
        entityType: 'product',
        entityId: p.id,
        entityName: p.name,
        metric: `${stock} Units`,
        previousValue: `${reorderLevel} Min`,
        currentValue: `${stock} Units`,
        changePercent: 'Low Stock',
        createdAt: nowStr,
        status: storedStatuses[alertId] || 'unread',
        actionType: 'view_inventory',
        actionLabel: 'Manage Inventory'
      });
    }
  });

  // 6. FORECAST & REORDER INTELLIGENCE ALERTS
  try {
    const forecasts = computeProductForecasts(products, orders);
    forecasts.forEach(fc => {
      if (fc.stockoutRisk7Days) {
        const alertId = `alert_stockout_risk_${fc.productId}`;
        alerts.push({
          id: alertId,
          type: 'PRODUCT_STOCKOUT_RISK',
          category: 'forecast',
          severity: 'critical',
          title: `Stockout Risk (7 Days): ${fc.productName}`,
          description: `Current stock (${fc.currentStock} units) is projected to stock out within 7 days based on 7-day forecast (${fc.forecast7Days} units).`,
          entityType: 'product',
          entityId: fc.productId,
          entityName: fc.productName,
          metric: `${fc.daysOfStock ?? 0} Days Stock`,
          currentValue: `${fc.currentStock} units`,
          createdAt: nowStr,
          status: storedStatuses[alertId] || 'unread',
          actionType: 'view_sales_forecast',
          actionLabel: 'View Forecast'
        });
      } else if (fc.status === 'declining' && fc.salesTrendPercent <= -20) {
        const alertId = `alert_product_declining_${fc.productId}`;
        alerts.push({
          id: alertId,
          type: 'PRODUCT_SALES_DECLINING',
          category: 'forecast',
          severity: 'warning',
          title: `Sales Declining: ${fc.productName}`,
          description: `Sales velocity dropped by ${fc.salesTrendPercent}% over the recent period. Average daily sales: ${fc.averageDailyUnits} units.`,
          entityType: 'product',
          entityId: fc.productId,
          entityName: fc.productName,
          metric: `${fc.salesTrendPercent}%`,
          createdAt: nowStr,
          status: storedStatuses[alertId] || 'unread',
          actionType: 'view_sales_forecast',
          actionLabel: 'View Forecast'
        });
      } else if (fc.status === 'growing' && fc.salesTrendPercent >= 25) {
        const alertId = `alert_product_growing_${fc.productId}`;
        alerts.push({
          id: alertId,
          type: 'PRODUCT_SALES_GROWING',
          category: 'forecast',
          severity: 'opportunity',
          title: `High Growth Product: ${fc.productName}`,
          description: `Sales surging by +${fc.salesTrendPercent}% over recent period. 30-day forecast: ${fc.forecast30Days} units.`,
          entityType: 'product',
          entityId: fc.productId,
          entityName: fc.productName,
          metric: `+${fc.salesTrendPercent}%`,
          createdAt: nowStr,
          status: storedStatuses[alertId] || 'unread',
          actionType: 'view_sales_forecast',
          actionLabel: 'View Forecast'
        });
      }
    });

    const customerReorders = computeCustomerReorderOpportunities(customers, orders);
    customerReorders.forEach(cr => {
      if (cr.status === 'overdue' || (cr.status === 'due_soon' && (cr.daysUntilExpectedOrder ?? 99) <= 2)) {
        if (isSalesStaff && cr.assignedSalesUserId !== currentUserId && cr.assignedSalesUserName !== currentUserName) {
          return;
        }
        const alertId = `alert_customer_reorder_${cr.customerId}`;
        alerts.push({
          id: alertId,
          type: 'CUSTOMER_REORDER_OPPORTUNITY',
          category: 'customer',
          severity: cr.status === 'overdue' ? 'critical' : 'warning',
          title: `Reorder Window ${cr.status === 'overdue' ? 'Overdue' : 'Approaching'}: ${cr.shopName}`,
          description: cr.suggestedAction,
          entityType: 'customer',
          entityId: cr.customerId,
          entityName: cr.shopName,
          relatedUserId: cr.assignedSalesUserId,
          relatedUserName: cr.assignedSalesUserName,
          metric: cr.estimatedNextOrderWindow || 'Due Now',
          createdAt: nowStr,
          status: storedStatuses[alertId] || 'unread',
          actionType: 'view_customer_360',
          actionLabel: 'View Customer 360°'
        });
      }
    });
  } catch (e) {
    console.error('Error generating forecasting alerts:', e);
  }

  return alerts;
}
