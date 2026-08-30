import {
  Product,
  InventoryTransaction,
  Order,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  Supplier,
  AuthUser
} from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreService';

export interface InventoryPosition {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  projectedAvailable: number;
  unitCost: number;
  inventoryValue: number;
  availableStockValue: number;
  incomingStockValue: number;
  averageDailyDemand: number;
  daysOfStock: number | null;
  stockStatus: 'HEALTHY' | 'LOW_STOCK' | 'REORDER_SOON' | 'STOCKOUT_RISK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'DEAD_STOCK';
  abcClass: 'A' | 'B' | 'C';
  agingDays: number;
  lastSaleDate: string | null;
}

export interface InventoryKPIs {
  totalSkus: number;
  totalUnitsOnHand: number;
  inventoryValue: number;
  availableStockValue: number;
  incomingStockValue: number;
  lowStockSkus: number;
  stockoutRiskSkus: number;
  deadStockValue: number;
  overstockValue: number;
}

export interface InventoryIntelligenceSettings {
  id: string;
  lowStockThresholdUnits: number;
  deadStockDays: number;
  overstockDays: number;
  abcAThresholdPercent: number;
  abcBThresholdPercent: number;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

export const DEFAULT_INVENTORY_SETTINGS: InventoryIntelligenceSettings = {
  id: 'global_inventory_settings',
  lowStockThresholdUnits: 10,
  deadStockDays: 90,
  overstockDays: 120,
  abcAThresholdPercent: 80,
  abcBThresholdPercent: 15,
  updatedAt: new Date().toISOString()
};

/**
  * Calculate inventory position and metrics for all products
  */
export function calculateInventoryIntelligence(
  products: Product[],
  orders: Order[],
  purchaseOrders: PurchaseOrder[],
  purchaseOrderItems: PurchaseOrderItem[],
  inventoryTransactions: InventoryTransaction[]
): { positions: InventoryPosition[]; kpis: InventoryKPIs } {
  const positions: InventoryPosition[] = [];

  // 1. Calculate reserved stock from pending / processing orders
  const reservedMap = new Map<string, number>();
  const validOrders = (orders || []).filter(o => o && o.orderStatus !== 'cancelled' && o.orderStatus !== 'delivered' && o.orderStatus !== 'completed' && o.orderStatus !== 'returned');
  for (const o of validOrders) {
    for (const item of (o.items || [])) {
      if (item && item.productId) {
        const qty = Number(item.quantity) || 0;
        reservedMap.set(item.productId, (reservedMap.get(item.productId) || 0) + qty);
      }
    }
  }

  // 2. Calculate incoming stock from approved / partial POs (ordered - received)
  const incomingMap = new Map<string, number>();
  const activePOs = (purchaseOrders || []).filter(po => po && (po.status === 'approved' || po.status === 'sent_to_supplier' || po.status === 'supplier_confirmed' || po.status === 'in_transit' || po.status === 'partially_received'));
  const activePoIds = new Set(activePOs.map(po => po.id));

  const relevantPoItems = (purchaseOrderItems || []).filter(item => item && item.purchaseOrderId && activePoIds.has(item.purchaseOrderId));
  for (const item of relevantPoItems) {
    const ordered = Number(item.orderedQuantity) || 0;
    const received = Number(item.receivedQuantity) || 0;
    const remaining = Math.max(0, ordered - received);
    incomingMap.set(item.productId, (incomingMap.get(item.productId) || 0) + remaining);
  }

  // 3. Calculate sales velocity / daily demand from orders over past 30 days
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const salesMap = new Map<string, { totalSold: number; lastSale: string | null }>();

  const deliveredOrders = (orders || []).filter(o => o && (o.orderStatus === 'delivered' || o.orderStatus === 'completed' || o.orderStatus === 'processing'));
  for (const o of deliveredOrders) {
    const oDate = o.createdAt ? new Date(o.createdAt).getTime() : now;
    if (oDate >= thirtyDaysAgo) {
      for (const item of (o.items || [])) {
        if (item && item.productId) {
          const qty = Number(item.quantity) || 0;
          const curr = salesMap.get(item.productId) || { totalSold: 0, lastSale: null };
          curr.totalSold += qty;
          if (!curr.lastSale || (o.createdAt && o.createdAt > curr.lastSale)) {
            curr.lastSale = o.createdAt || null;
          }
          salesMap.set(item.productId, curr);
        }
      }
    }
  }

  let totalSkus = 0;
  let totalUnitsOnHand = 0;
  let inventoryValue = 0;
  let availableStockValue = 0;
  let incomingStockValue = 0;
  let lowStockSkus = 0;
  let stockoutRiskSkus = 0;
  let deadStockValue = 0;
  let overstockValue = 0;

  // First pass to calculate revenue contribution for ABC classification
  const productRevenueMap = new Map<string, number>();
  let totalCatalogRevenue = 0;

  for (const p of (products || [])) {
    if (!p) continue;
    const sales = salesMap.get(p.id) || { totalSold: 0, lastSale: null };
    const rev = sales.totalSold * (Number(p.wholesalePrice) || Number(p.mrp) || 0);
    productRevenueMap.set(p.id, rev);
    totalCatalogRevenue += rev;
  }

  // Sort products by revenue desc for ABC
  const sortedByRev = [...(products || [])].sort((a, b) => (productRevenueMap.get(b.id) || 0) - (productRevenueMap.get(a.id) || 0));
  const abcMap = new Map<string, 'A' | 'B' | 'C'>();
  let cumulativeRev = 0;
  for (const p of sortedByRev) {
    const rev = productRevenueMap.get(p.id) || 0;
    cumulativeRev += rev;
    const ratio = totalCatalogRevenue > 0 ? (cumulativeRev / totalCatalogRevenue) * 100 : 0;
    if (ratio <= 80) {
      abcMap.set(p.id, 'A');
    } else if (ratio <= 95) {
      abcMap.set(p.id, 'B');
    } else {
      abcMap.set(p.id, 'C');
    }
  }

  for (const p of (products || [])) {
    if (!p) continue;
    totalSkus++;
    const onHand = Number(p.currentStock) || Number(p.openingStock) || 0;
    totalUnitsOnHand += onHand;

    const reserved = reservedMap.get(p.id) || 0;
    const available = Math.max(0, onHand - reserved);
    const incoming = incomingMap.get(p.id) || 0;
    const projectedAvailable = available + incoming;

    const unitCost = Number(p.purchasePrice) || 0;
    const invVal = onHand * unitCost;
    const availVal = available * unitCost;
    const incVal = incoming * unitCost;

    inventoryValue += invVal;
    availableStockValue += availVal;
    incomingStockValue += incVal;

    const sales = salesMap.get(p.id) || { totalSold: 0, lastSale: null };
    const avgDailyDemand = Number((sales.totalSold / 30).toFixed(2));
    const daysOfStock = avgDailyDemand > 0 ? Math.round(available / avgDailyDemand) : null;

    const lowThreshold = Number(p.lowStockThreshold) || 10;

    let stockStatus: 'HEALTHY' | 'LOW_STOCK' | 'REORDER_SOON' | 'STOCKOUT_RISK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'DEAD_STOCK' = 'HEALTHY';

    const lastSaleTime = sales.lastSale ? new Date(sales.lastSale).getTime() : (p.createdAt ? new Date(p.createdAt).getTime() : now);
    const daysSinceLastSale = Math.floor((now - lastSaleTime) / (1000 * 60 * 60 * 24));

    if (onHand <= 0) {
      stockStatus = 'OUT_OF_STOCK';
      stockoutRiskSkus++;
    } else if (daysSinceLastSale >= 90 && avgDailyDemand === 0) {
      stockStatus = 'DEAD_STOCK';
      deadStockValue += invVal;
    } else if (available <= lowThreshold) {
      stockStatus = 'LOW_STOCK';
      lowStockSkus++;
      if (daysOfStock !== null && daysOfStock <= 7 && incoming === 0) {
        stockStatus = 'STOCKOUT_RISK';
        stockoutRiskSkus++;
      }
    } else if (daysOfStock !== null && daysOfStock > 120) {
      stockStatus = 'OVERSTOCK';
      overstockValue += invVal;
    }

    const abcClass = abcMap.get(p.id) || 'C';

    positions.push({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      category: p.category || 'General',
      onHand,
      reserved,
      available,
      incoming,
      projectedAvailable,
      unitCost,
      inventoryValue: invVal,
      availableStockValue: availVal,
      incomingStockValue: incVal,
      averageDailyDemand: avgDailyDemand,
      daysOfStock,
      stockStatus,
      abcClass,
      agingDays: daysSinceLastSale,
      lastSaleDate: sales.lastSale
    });
  }

  const kpis: InventoryKPIs = {
    totalSkus,
    totalUnitsOnHand,
    inventoryValue: Number(inventoryValue.toFixed(2)),
    availableStockValue: Number(availableStockValue.toFixed(2)),
    incomingStockValue: Number(incomingStockValue.toFixed(2)),
    lowStockSkus,
    stockoutRiskSkus,
    deadStockValue: Number(deadStockValue.toFixed(2)),
    overstockValue: Number(overstockValue.toFixed(2))
  };

  return { positions, kpis };
}

export async function fetchInventorySettings(): Promise<InventoryIntelligenceSettings> {
  const path = 'inventory_intelligence_settings';
  try {
    const docRef = doc(db, path, 'global_inventory_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_INVENTORY_SETTINGS, ...snap.data(), id: snap.id } as InventoryIntelligenceSettings;
    }
  } catch (err) {
    console.warn('Failed to load inventory settings:', err);
  }
  return DEFAULT_INVENTORY_SETTINGS;
}

export async function saveInventorySettings(settings: Partial<InventoryIntelligenceSettings>, user: AuthUser): Promise<void> {
  const path = 'inventory_intelligence_settings';
  try {
    const docRef = doc(db, path, 'global_inventory_settings');
    await setDoc(docRef, {
      ...DEFAULT_INVENTORY_SETTINGS,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedByUserId: user.uid || user.id,
      updatedByUserName: user.name
    }, { merge: true });

    await addDoc(collection(db, 'inventory_intelligence_audit_logs'), {
      action: 'INVENTORY_THRESHOLD_UPDATED',
      performedByUserId: user.uid || user.id,
      performedByUserName: user.name,
      performedByUserRole: user.role,
      timestamp: new Date().toISOString(),
      details: 'Updated inventory intelligence configuration thresholds'
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${path}/global_inventory_settings`);
  }
}

export async function logInventoryAudit(action: string, user: AuthUser, details: string): Promise<void> {
  try {
    await addDoc(collection(db, 'inventory_intelligence_audit_logs'), {
      action,
      performedByUserId: user.uid || user.id,
      performedByUserName: user.name,
      performedByUserRole: user.role,
      timestamp: new Date().toISOString(),
      details
    });
  } catch (err) {
    console.warn('Failed to log inventory audit:', err);
  }
}

export function exportInventoryReportCSV(positions: InventoryPosition[]): void {
  const rows = [
    ['Glowzaa B2B Advanced Inventory & Warehouse Intelligence Report'],
    ['Generated At', new Date().toLocaleString()],
    [''],
    ['SKU', 'Product Name', 'Category', 'On Hand', 'Reserved', 'Available', 'Incoming', 'Unit Cost (৳)', 'Total Value (৳)', 'Status', 'ABC', 'Days of Stock']
  ];

  for (const p of positions) {
    rows.push([
      p.sku,
      `"${p.productName.replace(/"/g, '""')}"`,
      p.category,
      String(p.onHand),
      String(p.reserved),
      String(p.available),
      String(p.incoming),
      String(p.unitCost),
      String(p.inventoryValue),
      p.stockStatus,
      p.abcClass,
      p.daysOfStock !== null ? String(p.daysOfStock) : 'N/A'
    ]);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Glowzaa_Inventory_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
