import { 
  Customer, 
  Order, 
  Payment, 
  Product, 
  AuthUser, 
  CustomerVisit, 
  FieldDutySession,
  CustomerSegment,
  SalesTrendPoint,
  SellerPerformanceSummary,
  CustomerIntelligenceSummary,
  ProductPerformanceSummary,
  BusinessAlert,
  RepeatCustomerAnalysis,
  SalesIntelligenceSummary
} from '../types';
import { calculateAvailableCredit, calculateCreditUtilization } from './creditEngine';

// Valid order statuses contributing to net wholesale sales
const VALID_ORDER_STATUSES = new Set([
  'confirmed', 'Confirmed',
  'packing', 'Packing',
  'ready_for_delivery', 'Ready for Delivery',
  'processing', 'Processing',
  'dispatched', 'Dispatched',
  'partially_delivered', 'Partially Delivered',
  'delivered', 'Delivered',
  'completed', 'Completed'
]);

/**
 * Filter orders and payments by a specified timeframe.
 */
export function filterDataByDateRange<T extends { createdAt?: string; createdDate?: string; paymentDate?: string; date?: string }>(
  items: T[],
  range: 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom' | 'all',
  customStart?: string,
  customEnd?: string
): T[] {
  if (range === 'all') return items;

  const now = new Date();
  let startMs = 0;
  let endMs = now.getTime();

  if (range === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startMs = todayStart.getTime();
  } else if (range === '7days') {
    startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else if (range === '30days') {
    startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  } else if (range === 'this_month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    startMs = monthStart.getTime();
  } else if (range === 'last_month') {
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    startMs = lastMonthStart.getTime();
    endMs = lastMonthEnd.getTime();
  } else if (range === 'custom') {
    if (customStart) startMs = new Date(customStart).getTime();
    if (customEnd) {
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      endMs = end.getTime();
    }
  }

  return items.filter(item => {
    const dateStr = item.createdAt || item.createdDate || item.paymentDate || item.date;
    if (!dateStr) return false;
    const itemMs = new Date(dateStr).getTime();
    return !isNaN(itemMs) && itemMs >= startMs && itemMs <= endMs;
  });
}

/**
 * Calculates single customer intelligence profile and health indicators.
 */
export function getCustomerIntelligence(
  customer: Customer,
  allOrders: Order[],
  allPayments: Payment[],
  allVisits: CustomerVisit[] = []
): CustomerIntelligenceSummary {
  const customerOrders = allOrders.filter(o => o.customerId === customer.id);
  const validOrders = customerOrders.filter(o => VALID_ORDER_STATUSES.has(o.orderStatus || ''));
  const customerPayments = allPayments.filter(p => p.customerId === customer.id && !p.isReversed);
  const customerVisits = allVisits.filter(v => v.customerId === customer.id);

  const totalSales = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount) || 0), 0);
  const ordersCount = validOrders.length;
  const averageOrderValue = ordersCount > 0 ? Math.round(totalSales / ordersCount) : 0;

  // Chronological order dates
  const sortedOrders = [...validOrders].sort((a, b) => {
    const tA = new Date(a.createdAt || a.createdDate || 0).getTime();
    const tB = new Date(b.createdAt || b.createdDate || 0).getTime();
    return tB - tA;
  });

  const lastOrder = sortedOrders[0];
  const lastOrderDate = lastOrder ? (lastOrder.createdDate || (lastOrder.createdAt ? new Date(lastOrder.createdAt).toISOString().split('T')[0] : null)) : null;

  const nowMs = Date.now();
  let daysSinceLastOrder: number | null = null;
  if (lastOrderDate) {
    const lastMs = new Date(lastOrderDate).getTime();
    if (!isNaN(lastMs)) {
      daysSinceLastOrder = Math.max(0, Math.floor((nowMs - lastMs) / (1000 * 60 * 60 * 24)));
    }
  }

  // Order frequency: average days between successive orders
  let orderFrequencyDays: number | null = null;
  if (sortedOrders.length >= 2) {
    const intervals: number[] = [];
    for (let i = 0; i < sortedOrders.length - 1; i++) {
      const d1 = new Date(sortedOrders[i].createdAt || sortedOrders[i].createdDate || '').getTime();
      const d2 = new Date(sortedOrders[i + 1].createdAt || sortedOrders[i + 1].createdDate || '').getTime();
      if (!isNaN(d1) && !isNaN(d2)) {
        intervals.push(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
      }
    }
    if (intervals.length > 0) {
      orderFrequencyDays = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    }
  }

  // 30-day window comparison: Current 30d vs Previous 30d
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

  let salesCurrent30d = 0;
  let salesPrevious30d = 0;

  validOrders.forEach(o => {
    const orderTime = new Date(o.createdAt || o.createdDate || 0).getTime();
    if (isNaN(orderTime)) return;
    const amount = Number(o.grandTotal ?? o.totalAmount) || 0;
    if (nowMs - orderTime <= thirtyDaysMs) {
      salesCurrent30d += amount;
    } else if (nowMs - orderTime <= sixtyDaysMs) {
      salesPrevious30d += amount;
    }
  });

  let salesChangePercent: number | null = null;
  if (salesPrevious30d > 0) {
    salesChangePercent = Math.round(((salesCurrent30d - salesPrevious30d) / salesPrevious30d) * 100);
  } else if (salesCurrent30d > 0) {
    salesChangePercent = 100; // New growth
  }

  // Credit calculation
  const creditLimit = Math.max(0, Number(customer.creditLimit) || 0);
  const currentDue = Math.max(0, Number(customer.currentDue) || 0);
  const availableCredit = calculateAvailableCredit(creditLimit, currentDue);
  const creditUtilizationPercent = calculateCreditUtilization(creditLimit, currentDue);

  // Field Visits
  const visitsCount = customerVisits.length;
  const visitsWithOrder = customerVisits.filter(v => v.visitOutcome === 'order_booked' || v.orderId).length;
  const conversionRate = visitsCount > 0 ? Math.round((visitsWithOrder / visitsCount) * 100) : 0;

  // Segment Determination
  let segment: CustomerSegment = 'STABLE';
  if (customer.creditHold) {
    segment = 'CREDIT HOLD';
  } else if (customer.status === 'inactive') {
    segment = 'INACTIVE';
  } else if (currentDue > 0 && (creditLimit > 0 && currentDue > creditLimit || customer.status === 'overdue_hold')) {
    segment = 'OVERDUE';
  } else if (daysSinceLastOrder !== null && daysSinceLastOrder > 60 && ordersCount > 0) {
    segment = 'AT RISK';
  } else if (salesPrevious30d > 10000 && salesCurrent30d < salesPrevious30d * 0.7) {
    segment = 'DECLINING';
  } else if (totalSales >= 100000 || (ordersCount >= 5 && currentDue <= creditLimit * 0.5)) {
    segment = 'HIGH VALUE';
  } else if (salesChangePercent !== null && salesChangePercent >= 20 && salesCurrent30d > 15000) {
    segment = 'GROWING';
  } else if (ordersCount === 0) {
    segment = 'INACTIVE';
  }

  // Risk Indicators
  const riskIndicators: string[] = [];
  if (customer.creditHold) {
    riskIndicators.push(`Administrative Credit Hold: ${customer.creditHoldReason || 'Manual restriction'}`);
  }
  if (creditLimit > 0 && currentDue > creditLimit) {
    riskIndicators.push(`Credit Limit Exceeded by ৳${(currentDue - creditLimit).toLocaleString()}`);
  }
  if (creditUtilizationPercent >= 85) {
    riskIndicators.push(`Elevated Credit Utilization (${Math.round(creditUtilizationPercent)}%)`);
  }
  if (salesChangePercent !== null && salesChangePercent <= -25 && salesPrevious30d > 5000) {
    riskIndicators.push(`Purchase Velocity Dropped by ${Math.abs(salesChangePercent)}% in last 30 days`);
  }
  if (daysSinceLastOrder !== null && daysSinceLastOrder >= 45) {
    riskIndicators.push(`Inactive: No orders placed in ${daysSinceLastOrder} days`);
  }
  if (ordersCount >= 3 && conversionRate < 25 && visitsCount >= 4) {
    riskIndicators.push(`Low Field Visit Conversion (${conversionRate}% from ${visitsCount} visits)`);
  }

  // Recommended Actions
  const recommendedActions: string[] = [];
  if (customer.creditHold) {
    recommendedActions.push('Review customer credit clearance with Management.');
  }
  if (currentDue > 0 && creditUtilizationPercent >= 75) {
    recommendedActions.push(`Schedule urgent payment collection of ৳${currentDue.toLocaleString()} before taking new credit orders.`);
  }
  if (salesChangePercent !== null && salesChangePercent <= -25) {
    recommendedActions.push('Assign field sales officer for an in-person retention visit and competitor product check.');
  }
  if (daysSinceLastOrder !== null && daysSinceLastOrder >= 30) {
    recommendedActions.push('Send promotional wholesale catalogue and seasonal trade discount.');
  }
  if (segment === 'HIGH VALUE' && availableCredit > 25000) {
    recommendedActions.push('Offer priority bulk allocation on fast-moving cosmetic bundles.');
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Maintain regular sales visit cycle and monitor weekly inventory turnover.');
  }

  return {
    customerId: customer.id,
    shopName: customer.shopName,
    ownerName: customer.ownerName,
    phone: customer.phone,
    district: customer.district || 'Dhaka',
    territory: customer.area || customer.district || 'Dhaka Metro',
    assignedSalesUserId: customer.assignedSalesUserId,
    assignedSalesUserName: customer.assignedSalesUserName,
    segment,
    totalSales,
    ordersCount,
    averageOrderValue,
    lastOrderDate,
    daysSinceLastOrder,
    orderFrequencyDays,
    salesCurrent30d,
    salesPrevious30d,
    salesChangePercent,
    creditLimit,
    currentDue,
    availableCredit,
    creditUtilizationPercent,
    creditHold: Boolean(customer.creditHold),
    creditCheckMode: customer.creditCheckMode || 'NONE',
    visitsCount,
    conversionRate,
    riskIndicators,
    recommendedActions
  };
}

/**
 * Calculates full customer intelligence list for all customers in the database.
 */
export function calculateCustomerIntelligenceList(
  customers: Customer[],
  orders: Order[],
  payments: Payment[],
  visits: CustomerVisit[] = []
): CustomerIntelligenceSummary[] {
  return customers.map(c => getCustomerIntelligence(c, orders, payments, visits));
}

/**
 * Calculates Seller Performance summary table & ranking.
 */
export function calculateSellerPerformanceList(
  staffUsers: AuthUser[],
  orders: Order[],
  payments: Payment[],
  customers: Customer[],
  visits: CustomerVisit[] = [],
  sessions: FieldDutySession[] = []
): SellerPerformanceSummary[] {
  const salesUsers = staffUsers.filter(u => u.role === 'sales');

  const summaries: SellerPerformanceSummary[] = salesUsers.map(seller => {
    const sId = seller.uid || seller.id || '';
    const sellerOrders = orders.filter(o => 
      (o.salesUserId === sId || o.salesSellerId === sId || (o as any).salesStaffId === sId || o.salesUserName === seller.name) &&
      VALID_ORDER_STATUSES.has(o.orderStatus || '')
    );
    const sellerPayments = payments.filter(p => 
      (p.collectedByUserId === sId || (p as any).salesUserId === sId || p.collectedByUserName === seller.name) &&
      !p.isReversed
    );
    const assignedCustomers = customers.filter(c => 
      c.assignedSalesUserId === sId || c.assignedSalesSellerId === sId || c.assignedSalesUserName === seller.name
    );
    const sellerVisits = visits.filter(v => v.userId === sId || v.userName === seller.name);
    const sellerSessions = sessions.filter(sess => sess.userId === sId);

    const sales = sellerOrders.reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount) || 0), 0);
    const ordersCount = sellerOrders.length;
    const collections = sellerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalDue = assignedCustomers.reduce((sum, c) => sum + (Number(c.currentDue) || 0), 0);
    const averageOrderValue = ordersCount > 0 ? Math.round(sales / ordersCount) : 0;

    const monthlyTarget = Number(seller.monthlyTarget) || 0;
    const hasTarget = monthlyTarget > 0;
    const achievementRate = hasTarget ? Math.round((sales / monthlyTarget) * 100) : 0;

    const visitsCount = sellerVisits.length;
    const visitsWithOrder = sellerVisits.filter(v => v.visitOutcome === 'order_booked' || v.orderId).length;
    const conversionRate = visitsCount > 0 ? Math.round((visitsWithOrder / visitsCount) * 100) : 0;

    const fieldDistanceKm = sellerSessions.reduce((sum, s) => sum + (Number(s.totalDistanceKm) || 0), 0);
    const activeCustomersCount = assignedCustomers.filter(c => c.status === 'active').length;

    return {
      sellerId: sId,
      sellerLoginId: seller.loginId || seller.email || '',
      sellerName: seller.name || 'Sales Staff',
      territory: seller.territory || seller.assignedArea || 'Dhaka Metro',
      monthlyTarget,
      sales,
      achievementRate,
      hasTarget,
      ordersCount,
      collections,
      totalDue,
      assignedCustomersCount: assignedCustomers.length,
      activeCustomersCount,
      visitsCount,
      visitsWithOrder,
      conversionRate,
      fieldDistanceKm: Math.round(fieldDistanceKm * 10) / 10,
      averageOrderValue
    };
  });

  // Sort by sales descending and assign rank
  summaries.sort((a, b) => b.sales - a.sales);
  summaries.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return summaries;
}

/**
 * Calculates Product Performance (Top selling, Fast moving, Slow moving).
 */
export function calculateProductPerformanceList(
  products: Product[],
  orders: Order[]
): ProductPerformanceSummary[] {
  const validOrders = orders.filter(o => VALID_ORDER_STATUSES.has(o.orderStatus || ''));
  const productStatsMap = new Map<string, { unitsSold: number; revenue: number; ordersCount: number }>();

  validOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const pId = item.productId || (item as any).id;
      if (!pId) return;
      const current = productStatsMap.get(pId) || { unitsSold: 0, revenue: 0, ordersCount: 0 };
      current.unitsSold += Number(item.quantity) || 0;
      current.revenue += Number(item.totalPrice ?? (item.price * item.quantity)) || 0;
      current.ordersCount += 1;
      productStatsMap.set(pId, current);
    });
  });

  const summaries: ProductPerformanceSummary[] = products.map(prod => {
    const stats = productStatsMap.get(prod.id) || { unitsSold: 0, revenue: 0, ordersCount: 0 };
    let velocity: 'fast' | 'medium' | 'slow' = 'medium';
    if (stats.unitsSold >= 50) velocity = 'fast';
    else if (stats.unitsSold <= 5) velocity = 'slow';

    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = prod.stockStatus || 'in_stock';
    if (prod.currentStock <= 0) stockStatus = 'out_of_stock';
    else if (prod.currentStock <= (prod.lowStockThreshold || 10)) stockStatus = 'low_stock';

    return {
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      category: prod.category,
      unitsSold: stats.unitsSold,
      revenue: stats.revenue,
      ordersCount: stats.ordersCount,
      currentStock: prod.currentStock,
      wholesalePrice: prod.wholesalePrice,
      stockStatus,
      velocity
    };
  });

  summaries.sort((a, b) => b.revenue - a.revenue);
  return summaries;
}

/**
 * Calculates Repeat Customer Analytics.
 */
export function calculateRepeatCustomerStats(
  customers: Customer[],
  orders: Order[]
): RepeatCustomerAnalysis {
  const totalCustomers = customers.length;
  const validOrders = orders.filter(o => VALID_ORDER_STATUSES.has(o.orderStatus || ''));
  const customerOrderCounts = new Map<string, number>();

  validOrders.forEach(o => {
    if (o.customerId) {
      customerOrderCounts.set(o.customerId, (customerOrderCounts.get(o.customerId) || 0) + 1);
    }
  });

  let repeatCustomers = 0;
  let oneTimeCustomers = 0;
  let zeroOrderCustomers = 0;

  customers.forEach(c => {
    const count = customerOrderCounts.get(c.id) || 0;
    if (count >= 2) repeatCustomers++;
    else if (count === 1) oneTimeCustomers++;
    else zeroOrderCustomers++;
  });

  const activeCustomerBase = Math.max(1, repeatCustomers + oneTimeCustomers);
  const repeatPurchaseRate = Math.round((repeatCustomers / activeCustomerBase) * 100);
  const newCustomerRate = Math.round((oneTimeCustomers / Math.max(1, totalCustomers)) * 100);
  const inactiveCustomerRate = Math.round((zeroOrderCustomers / Math.max(1, totalCustomers)) * 100);

  return {
    totalCustomers,
    repeatCustomers,
    oneTimeCustomers,
    zeroOrderCustomers,
    repeatPurchaseRate,
    newCustomerRate,
    inactiveCustomerRate
  };
}

/**
 * Calculates Sales & Collection Trend Points over time.
 */
export function calculateSalesTrendPoints(
  orders: Order[],
  payments: Payment[],
  range: 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom' | 'all' = '30days'
): SalesTrendPoint[] {
  const validOrders = orders.filter(o => VALID_ORDER_STATUSES.has(o.orderStatus || ''));
  const validPayments = payments.filter(p => !p.isReversed);

  const dateMap = new Map<string, { sales: number; ordersCount: number; collections: number }>();

  // Determine timeline keys
  const now = new Date();
  const numDays = range === '7days' ? 7 : range === 'today' ? 1 : 30;

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dateMap.set(key, { sales: 0, ordersCount: 0, collections: 0 });
  }

  validOrders.forEach(o => {
    const dStr = (o.createdAt || o.createdDate || '').split('T')[0];
    if (dStr && dateMap.has(dStr)) {
      const entry = dateMap.get(dStr)!;
      entry.sales += Number(o.grandTotal ?? o.totalAmount) || 0;
      entry.ordersCount += 1;
    }
  });

  validPayments.forEach(p => {
    const dStr = ((p as any).paymentDate || (p as any).date || p.createdAt || '').split('T')[0];
    if (dStr && dateMap.has(dStr)) {
      const entry = dateMap.get(dStr)!;
      entry.collections += Number(p.amount) || 0;
    }
  });

  const points: SalesTrendPoint[] = [];
  dateMap.forEach((val, date) => {
    points.push({
      date,
      sales: val.sales,
      ordersCount: val.ordersCount,
      collections: val.collections
    });
  });

  return points;
}

/**
 * Generates proactive Smart Business Alerts.
 */
export function generateBusinessAlerts(
  customerIntelligence: CustomerIntelligenceSummary[],
  sellerPerformances: SellerPerformanceSummary[]
): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];

  // 1. Critical Overdue Customers
  customerIntelligence
    .filter(c => c.segment === 'OVERDUE' || (c.creditLimit > 0 && c.currentDue > c.creditLimit * 1.2))
    .slice(0, 4)
    .forEach(c => {
      alerts.push({
        id: `alert-overdue-${c.customerId}`,
        type: 'OVERDUE',
        severity: 'critical',
        title: `Overdue Receivables: ${c.shopName}`,
        description: `Outstanding balance of ৳${c.currentDue.toLocaleString()} requires immediate collection action.`,
        targetType: 'customer',
        targetId: c.customerId,
        customerId: c.customerId,
        customerName: c.shopName,
        metricValue: `৳${c.currentDue.toLocaleString()}`,
        actionLabel: 'View 360°'
      });
    });

  // 2. Declining High-Value Customers
  customerIntelligence
    .filter(c => c.segment === 'DECLINING' && c.salesPrevious30d >= 15000)
    .slice(0, 3)
    .forEach(c => {
      alerts.push({
        id: `alert-declining-${c.customerId}`,
        type: 'SALES_DECLINING',
        severity: 'warning',
        title: `Sales Drop: ${c.shopName}`,
        description: `Purchases dropped by ${Math.abs(c.salesChangePercent || 0)}% compared to last month. Retention visit recommended.`,
        targetType: 'customer',
        targetId: c.customerId,
        customerId: c.customerId,
        customerName: c.shopName,
        metricValue: `${c.salesChangePercent}%`,
        actionLabel: 'Inspect Account'
      });
    });

  // 3. High Value Opportunity
  customerIntelligence
    .filter(c => c.segment === 'GROWING' && c.availableCredit > 30000)
    .slice(0, 2)
    .forEach(c => {
      alerts.push({
        id: `alert-opportunity-${c.customerId}`,
        type: 'HIGH_VALUE_OPPORTUNITY',
        severity: 'opportunity',
        title: `Growth Account: ${c.shopName}`,
        description: `Sales up by +${c.salesChangePercent}% with ৳${c.availableCredit.toLocaleString()} available credit buffer.`,
        targetType: 'customer',
        targetId: c.customerId,
        customerId: c.customerId,
        customerName: c.shopName,
        metricValue: `+${c.salesChangePercent}%`,
        actionLabel: 'Book Order'
      });
    });

  // 4. Sellers Lagging Target
  sellerPerformances
    .filter(s => s.hasTarget && s.achievementRate < 45 && s.monthlyTarget >= 50000)
    .slice(0, 3)
    .forEach(s => {
      alerts.push({
        id: `alert-seller-target-${s.sellerId}`,
        type: 'BELOW_TARGET',
        severity: 'warning',
        title: `Target Lag: ${s.sellerName}`,
        description: `Achieved ৳${s.sales.toLocaleString()} (${s.achievementRate}%) against target of ৳${s.monthlyTarget.toLocaleString()}.`,
        targetType: 'seller',
        targetId: s.sellerId,
        sellerId: s.sellerId,
        sellerName: s.sellerName,
        metricValue: `${s.achievementRate}%`,
        actionLabel: 'Review Seller'
      });
    });

  // 5. Strong Seller Star
  sellerPerformances
    .filter(s => s.hasTarget && s.achievementRate >= 100)
    .slice(0, 2)
    .forEach(s => {
      alerts.push({
        id: `alert-seller-star-${s.sellerId}`,
        type: 'STRONG_PERFORMANCE',
        severity: 'opportunity',
        title: `Target Achieved: ${s.sellerName}`,
        description: `Surpassed monthly sales quota with ৳${s.sales.toLocaleString()} (${s.achievementRate}% target).`,
        targetType: 'seller',
        targetId: s.sellerId,
        sellerId: s.sellerId,
        sellerName: s.sellerName,
        metricValue: `${s.achievementRate}%`,
        actionLabel: 'Leaderboard'
      });
    });

  return alerts;
}

/**
 * Computes Master Sales Intelligence summary for executive dashboard.
 */
export function calculateOverallSalesIntelligence(
  staffUsers: AuthUser[],
  orders: Order[],
  payments: Payment[],
  customers: Customer[],
  products: Product[],
  visits: CustomerVisit[] = [],
  sessions: FieldDutySession[] = [],
  range: 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom' | 'all' = '30days',
  customStart?: string,
  customEnd?: string
): SalesIntelligenceSummary {
  const filteredOrders = filterDataByDateRange(orders, range, customStart, customEnd);
  const filteredPayments = filterDataByDateRange(payments, range, customStart, customEnd);

  const validOrders = filteredOrders.filter(o => VALID_ORDER_STATUSES.has(o.orderStatus || ''));
  const validPayments = filteredPayments.filter(p => !p.isReversed);

  const totalSales = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal ?? o.totalAmount) || 0), 0);
  const totalOrders = validOrders.length;
  const totalCollections = validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalDue = customers.reduce((sum, c) => sum + (Number(c.currentDue) || 0), 0);
  const averageOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  const salesUsers = staffUsers.filter(u => u.role === 'sales');
  const activeSellersCount = salesUsers.filter(u => u.status === 'active').length;
  const activeCustomersCount = customers.filter(c => c.status === 'active').length;

  const totalMonthlyTarget = salesUsers.reduce((sum, u) => sum + (Number(u.monthlyTarget) || 0), 0);
  const hasTargetConfigured = totalMonthlyTarget > 0;
  const totalAchievementPercent = hasTargetConfigured ? Math.round((totalSales / totalMonthlyTarget) * 100) : 0;

  const sellerPerformances = calculateSellerPerformanceList(staffUsers, orders, payments, customers, visits, sessions);
  const customerIntelligence = calculateCustomerIntelligenceList(customers, orders, payments, visits);
  const productPerformances = calculateProductPerformanceList(products, orders);
  const repeatCustomerStats = calculateRepeatCustomerStats(customers, orders);
  const trendPoints = calculateSalesTrendPoints(orders, payments, range);

  const decliningCustomers = customerIntelligence.filter(c => c.segment === 'DECLINING');
  const topProducts = productPerformances.slice(0, 10);
  const slowMovingProducts = productPerformances.filter(p => p.velocity === 'slow').slice(0, 10);
  const businessAlerts = generateBusinessAlerts(customerIntelligence, sellerPerformances);

  return {
    totalSales,
    totalOrders,
    totalCollections,
    totalDue,
    averageOrderValue,
    activeSellersCount,
    activeCustomersCount,
    totalMonthlyTarget,
    totalAchievementPercent,
    hasTargetConfigured,
    repeatCustomerStats,
    topSellers: sellerPerformances,
    topCustomers: customerIntelligence.sort((a, b) => b.totalSales - a.totalSales).slice(0, 10),
    decliningCustomers,
    topProducts,
    slowMovingProducts,
    businessAlerts,
    trendPoints
  };
}
