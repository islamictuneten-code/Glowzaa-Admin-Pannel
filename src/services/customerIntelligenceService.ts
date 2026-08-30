import {
  Customer,
  Order,
  Payment,
  CustomerLedgerEntry,
  Product,
  AuthUser
} from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreService';

export interface CustomerIntelligenceProfile {
  customerId: string;
  customerName: string;
  customerCode: string;
  sellerId: string;
  sellerName?: string;
  territory: string;
  phone: string;
  status: 'NEW' | 'ACTIVE' | 'GROWING' | 'STABLE' | 'DECLINING' | 'AT_RISK' | 'DORMANT' | 'CHURN_RISK' | 'REACTIVATED';
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  completedOrderCount: number;
  netSales: number;
  grossProfit: number;
  grossMarginPercent: number;
  averageOrderValue: number;
  purchaseFrequencyDays: number;
  daysSinceLastOrder: number;
  
  // RFM
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: number;
  rfmSegment: string;

  // Growth & Risk
  salesGrowthPercent: number;
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reorderRisk: 'REORDER_DUE' | 'REORDER_OVERDUE' | 'REORDER_EXPECTED' | 'NO_REORDER_PATTERN';
  creditRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  currentDue: number;
  creditLimit: number;
  creditUtilizationPercent: number;

  // Forecast & Value
  expectedNextOrderDate: string | null;
  expectedNextOrderValue: number;
  customerLifetimeValue: number;
  healthScore: number;

  // Opportunities
  crossSellOpportunities: string[];
  upsellOpportunities: string[];
  topProducts: { productId: string; productName: string; units: number; revenue: number }[];
  lostProducts: string[];
}

export interface CustomerIntelligenceKPIs {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  growingCustomers: number;
  atRiskCustomers: number;
  churnRiskCustomers: number;
  dormantCustomers: number;
  highValueCustomers: number;
  totalNetSales: number;
  totalOutstandingDue: number;
  averageHealthScore: number;
}

export interface CustomerIntelligenceSettings {
  id: string;
  activeWindowDays: number;
  dormantDays: number;
  churnWarningDays: number;
  highValueThreshold: number;
  creditRiskThresholdPercent: number;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

export const DEFAULT_CUSTOMER_INTELLIGENCE_SETTINGS: CustomerIntelligenceSettings = {
  id: 'global_customer_intelligence_settings',
  activeWindowDays: 30,
  dormantDays: 60,
  churnWarningDays: 45,
  highValueThreshold: 500000,
  creditRiskThresholdPercent: 80,
  updatedAt: new Date().toISOString()
};

/**
  * Centralized Customer Intelligence Calculation Engine
  */
export function calculateCustomerIntelligence(
  customers: Customer[],
  orders: Order[],
  products: Product[],
  settings: CustomerIntelligenceSettings = DEFAULT_CUSTOMER_INTELLIGENCE_SETTINGS
): { profiles: CustomerIntelligenceProfile[]; kpis: CustomerIntelligenceKPIs } {
  const profiles: CustomerIntelligenceProfile[] = [];
  const now = Date.now();

  const productMap = new Map<string, Product>();
  for (const p of (products || [])) {
    if (p && p.id) productMap.set(p.id, p);
  }

  // Group orders by customer
  const customerOrdersMap = new Map<string, Order[]>();
  const validOrders = (orders || []).filter(o => o && o.customerId && o.orderStatus !== 'cancelled' && o.orderStatus !== 'Cancelled');
  
  for (const o of validOrders) {
    const list = customerOrdersMap.get(o.customerId) || [];
    list.push(o);
    customerOrdersMap.set(o.customerId, list);
  }

  let totalNetSalesAll = 0;
  let totalDueAll = 0;
  let activeCount = 0;
  let newCount = 0;
  let growingCount = 0;
  let atRiskCount = 0;
  let churnRiskCount = 0;
  let dormantCount = 0;
  let highValueCount = 0;
  let totalHealthSum = 0;

  for (const c of (customers || [])) {
    if (!c || !c.id) continue;
    const cOrders = customerOrdersMap.get(c.id) || [];
    cOrders.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    let netSales = 0;
    let grossProfit = 0;
    let completedCount = 0;
    let firstDate: string | null = null;
    let lastDate: string | null = null;

    const productSalesMap = new Map<string, { name: string; units: number; revenue: number }>();
    const purchasedProductIds = new Set<string>();

    for (const o of cOrders) {
      const statusStr = String(o.orderStatus || '').toLowerCase();
      if (statusStr === 'delivered' || statusStr === 'completed' || statusStr === 'processing') {
        completedCount++;
        const oTotal = Number(o.totalAmount) || 0;
        netSales += oTotal;
        totalNetSalesAll += oTotal;

        if (!firstDate && o.createdAt) firstDate = o.createdAt;
        if (o.createdAt) lastDate = o.createdAt;

        for (const item of (o.items || [])) {
          if (item && item.productId) {
            purchasedProductIds.add(item.productId);
            const qty = Number(item.quantity) || 0;
            const itemRev = qty * (Number(item.price) || 0);
            const prod = productMap.get(item.productId);
            const itemCost = qty * (prod ? Number(prod.purchasePrice) || 0 : 0);
            grossProfit += (itemRev - itemCost);

            const curr = productSalesMap.get(item.productId) || { name: item.productName || prod?.name || 'Product', units: 0, revenue: 0 };
            curr.units += qty;
            curr.revenue += itemRev;
            productSalesMap.set(item.productId, curr);
          }
        }
      }
    }

    const averageOrderValue = completedCount > 0 ? Number((netSales / completedCount).toFixed(2)) : 0;
    const grossMarginPercent = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(1)) : 0;
    const currentDue = Number(c.currentDue) || 0;
    totalDueAll += currentDue;
    const creditLimit = Number(c.creditLimit) || 100000;
    const creditUtilizationPercent = creditLimit > 0 ? Number(((currentDue / creditLimit) * 100).toFixed(1)) : 0;

    let daysSinceLastOrder = 999;
    if (lastDate) {
      daysSinceLastOrder = Math.max(0, Math.floor((now - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Purchase frequency (average days between orders)
    let purchaseFrequencyDays = 30;
    if (cOrders.length >= 2 && firstDate && lastDate) {
      const spanDays = (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24);
      purchaseFrequencyDays = Math.max(1, Math.round(spanDays / (cOrders.length - 1)));
    }

    // Lifecycle Status
    let status: CustomerIntelligenceProfile['status'] = 'ACTIVE';
    const isNew = firstDate && (now - new Date(firstDate).getTime()) <= 30 * 24 * 60 * 60 * 1000;

    if (isNew) {
      status = 'NEW';
      newCount++;
    } else if (daysSinceLastOrder > settings.dormantDays) {
      status = 'DORMANT';
      dormantCount++;
    } else if (daysSinceLastOrder > settings.churnWarningDays) {
      status = 'CHURN_RISK';
      churnRiskCount++;
      atRiskCount++;
    } else if (daysSinceLastOrder > purchaseFrequencyDays * 1.5) {
      status = 'AT_RISK';
      atRiskCount++;
    } else if (completedCount >= 5 && netSales > 200000) {
      status = 'GROWING';
      growingCount++;
    } else {
      status = 'ACTIVE';
      activeCount++;
    }

    if (netSales >= settings.highValueThreshold) {
      highValueCount++;
    }

    // Churn Risk
    let churnRisk: CustomerIntelligenceProfile['churnRisk'] = 'LOW';
    if (daysSinceLastOrder > settings.dormantDays) churnRisk = 'CRITICAL';
    else if (daysSinceLastOrder > settings.churnWarningDays) churnRisk = 'HIGH';
    else if (daysSinceLastOrder > purchaseFrequencyDays * 1.5) churnRisk = 'MEDIUM';

    // Reorder Risk
    let reorderRisk: CustomerIntelligenceProfile['reorderRisk'] = 'NO_REORDER_PATTERN';
    if (daysSinceLastOrder > purchaseFrequencyDays * 1.3) {
      reorderRisk = daysSinceLastOrder > purchaseFrequencyDays * 2 ? 'REORDER_OVERDUE' : 'REORDER_DUE';
    } else if (daysSinceLastOrder >= purchaseFrequencyDays * 0.8) {
      reorderRisk = 'REORDER_EXPECTED';
    }

    // Credit Risk
    let creditRisk: CustomerIntelligenceProfile['creditRisk'] = 'LOW';
    if (creditUtilizationPercent >= 90 || currentDue > creditLimit) creditRisk = 'HIGH';
    else if (creditUtilizationPercent >= settings.creditRiskThresholdPercent) creditRisk = 'MEDIUM';

    // RFM Scoring (1 to 5)
    const recencyScore = daysSinceLastOrder <= 15 ? 5 : daysSinceLastOrder <= 30 ? 4 : daysSinceLastOrder <= 60 ? 3 : daysSinceLastOrder <= 90 ? 2 : 1;
    const frequencyScore = completedCount >= 10 ? 5 : completedCount >= 6 ? 4 : completedCount >= 3 ? 3 : completedCount >= 1 ? 2 : 1;
    const monetaryScore = netSales >= 1000000 ? 5 : netSales >= 500000 ? 4 : netSales >= 200000 ? 3 : netSales >= 50000 ? 2 : 1;
    const rfmScore = Number(((recencyScore + frequencyScore + monetaryScore) / 3).toFixed(1));

    let rfmSegment = 'Standard';
    if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) rfmSegment = 'CHAMPION';
    else if (frequencyScore >= 4 && monetaryScore >= 3) rfmSegment = 'LOYAL';
    else if (recencyScore <= 2 && monetaryScore >= 4) rfmSegment = 'HIGH_VALUE_AT_RISK';
    else if (recencyScore >= 4 && frequencyScore <= 2) rfmSegment = 'NEW_CUSTOMER';
    else if (recencyScore <= 2 && frequencyScore <= 2) rfmSegment = 'HIBERNATING';

    // Health Score (0-100)
    let healthScore = Math.min(100, Math.max(0, Math.round(
      (recencyScore * 20 * 0.3) +
      (frequencyScore * 20 * 0.3) +
      (monetaryScore * 20 * 0.2) +
      (creditRisk === 'LOW' ? 20 : creditRisk === 'MEDIUM' ? 10 : 0)
    )));
    totalHealthSum += healthScore;

    // Expected Next Order
    let expectedNextOrderDate: string | null = null;
    if (lastDate && purchaseFrequencyDays > 0) {
      const nextTs = new Date(lastDate).getTime() + purchaseFrequencyDays * 24 * 60 * 60 * 1000;
      expectedNextOrderDate = new Date(nextTs).toISOString();
    }

    const topProducts = Array.from(productSalesMap.entries())
      .map(([pid, val]) => ({ productId: pid, productName: val.name, units: val.units, revenue: val.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Cross-sell opportunities
    const crossSellOpportunities: string[] = [];
    const allProdList = Array.from(productMap.values());
    for (const p of allProdList) {
      if (!purchasedProductIds.has(p.id) && crossSellOpportunities.length < 3) {
        crossSellOpportunities.push(p.name);
      }
    }

    const customerCode = c.customerId || c.id.slice(0, 6).toUpperCase();
    const sellerId = c.assignedSalesUserId || c.assignedSalesSellerId || 'unassigned';
    const sellerName = c.assignedSalesUserName || c.assignedSalesSellerName || 'Unassigned';

    profiles.push({
      customerId: c.id,
      customerName: c.shopName ? `${c.shopName} (${c.ownerName})` : c.ownerName,
      customerCode,
      sellerId,
      sellerName,
      territory: c.district || 'Dhaka',
      phone: c.phone || '',
      status,
      firstOrderAt: firstDate,
      lastOrderAt: lastDate,
      completedOrderCount: completedCount,
      netSales: Number(netSales.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMarginPercent,
      averageOrderValue,
      purchaseFrequencyDays,
      daysSinceLastOrder,
      recencyScore,
      frequencyScore,
      monetaryScore,
      rfmScore,
      rfmSegment,
      salesGrowthPercent: 12.5,
      churnRisk,
      reorderRisk,
      creditRisk,
      currentDue,
      creditLimit,
      creditUtilizationPercent,
      expectedNextOrderDate,
      expectedNextOrderValue: averageOrderValue || 25000,
      customerLifetimeValue: Number(netSales.toFixed(2)),
      healthScore,
      crossSellOpportunities,
      upsellOpportunities: topProducts.length > 0 ? [`Bulk reorder pack for ${topProducts[0].productName}`] : [],
      topProducts,
      lostProducts: []
    });
  }

  const kpis: CustomerIntelligenceKPIs = {
    totalCustomers: customers.length,
    activeCustomers: activeCount,
    newCustomers: newCount,
    growingCustomers: growingCount,
    atRiskCustomers: atRiskCount,
    churnRiskCustomers: churnRiskCount,
    dormantCustomers: dormantCount,
    highValueCustomers: highValueCount,
    totalNetSales: Number(totalNetSalesAll.toFixed(2)),
    totalOutstandingDue: Number(totalDueAll.toFixed(2)),
    averageHealthScore: customers.length > 0 ? Math.round(totalHealthSum / customers.length) : 0
  };

  return { profiles, kpis };
}

export async function fetchCustomerIntelligenceSettings(): Promise<CustomerIntelligenceSettings> {
  const path = 'customer_intelligence_settings';
  try {
    const docRef = doc(db, path, 'global_customer_intelligence_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_CUSTOMER_INTELLIGENCE_SETTINGS, ...snap.data(), id: snap.id } as CustomerIntelligenceSettings;
    }
  } catch (err) {
    console.warn('Failed to load customer intelligence settings:', err);
  }
  return DEFAULT_CUSTOMER_INTELLIGENCE_SETTINGS;
}

export async function saveCustomerIntelligenceSettings(settings: Partial<CustomerIntelligenceSettings>, user: AuthUser): Promise<void> {
  const path = 'customer_intelligence_settings';
  try {
    const docRef = doc(db, path, 'global_customer_intelligence_settings');
    await setDoc(docRef, {
      ...DEFAULT_CUSTOMER_INTELLIGENCE_SETTINGS,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedByUserId: user.uid || user.id,
      updatedByUserName: user.name
    }, { merge: true });

    await addDoc(collection(db, 'customer_intelligence_audit_logs'), {
      action: 'CUSTOMER_INTELLIGENCE_SETTINGS_UPDATED',
      performedByUserId: user.uid || user.id,
      performedByUserName: user.name,
      performedByUserRole: user.role,
      timestamp: new Date().toISOString(),
      details: 'Updated customer intelligence thresholds & scoring rules'
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${path}/global_customer_intelligence_settings`);
  }
}

export async function logCustomerIntelligenceAudit(action: string, user: AuthUser, customerId?: string, details?: string): Promise<void> {
  try {
    await addDoc(collection(db, 'customer_intelligence_audit_logs'), {
      action,
      performedByUserId: user.uid || user.id,
      performedByUserName: user.name,
      performedByUserRole: user.role,
      timestamp: new Date().toISOString(),
      customerId: customerId || null,
      details: details || null
    });
  } catch (err) {
    console.warn('Failed to log customer intelligence audit:', err);
  }
}

export function exportCustomerIntelligenceCSV(profiles: CustomerIntelligenceProfile[]): void {
  const rows = [
    ['Glowzaa B2B Customer & Sales Growth Intelligence Report'],
    ['Generated At', new Date().toLocaleString()],
    [''],
    ['Customer Code', 'Customer Name', 'Territory', 'Status', 'Segment', 'Total Sales (৳)', 'Orders', 'AOV (৳)', 'Health', 'Churn Risk', 'Current Due (৳)']
  ];

  for (const p of profiles) {
    rows.push([
      p.customerCode,
      `"${p.customerName.replace(/"/g, '""')}"`,
      p.territory,
      p.status,
      p.rfmSegment,
      String(p.netSales),
      String(p.completedOrderCount),
      String(p.averageOrderValue),
      String(p.healthScore),
      p.churnRisk,
      String(p.currentDue)
    ]);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Glowzaa_Customer_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
