import { 
  collection, doc, getDoc, getDocs, setDoc, query, where, 
  runTransaction, writeBatch, orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  PurchaseOrder, PurchaseOrderItem, AuthUser, InventoryTransaction, Product,
  GoodsReceipt, GoodsReceiptItem, GoodsReceiptStatus, PurchaseOrderStatus
} from '../types';
import { recordProcurementAuditLog, cleanUndefined } from './firestoreService';

/**
 * Generate unique, concurrency-safe GRN number
 * Format: GZ-GRN-YYYY-XXXXXX
 */
function generateGRNNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GZ-GRN-${year}-${timestamp}${random}`;
}

export interface ReceivingException {
  id: string;
  goodsReceiptId: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  damagedQuantity: number;
  rejectedQuantity: number;
  discrepancyType: 'none' | 'short' | 'over' | 'damaged' | 'wrong_product' | 'mixed';
  discrepancyReason?: string | null;
  notes?: string | null;
  receivedDate: string;
  status: GoodsReceiptStatus;
}

export interface POReceivingHistorySummary {
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string;
  poStatus: PurchaseOrderStatus;
  totalOrderedQuantity: number;
  totalReceivedQuantity: number;
  totalAcceptedQuantity: number;
  totalDamagedQuantity: number;
  totalRejectedQuantity: number;
  totalRemainingQuantity: number;
  varianceQuantity: number;
  receipts: Array<{
    id: string;
    grnNumber: string;
    receivedAt: string;
    receivedByUserName: string;
    status: GoodsReceiptStatus;
    totalReceivedQuantity: number;
    totalAcceptedQuantity: number;
    totalDamagedQuantity: number;
    totalRejectedQuantity: number;
    subtotalReceivedValueBDT: number;
  }>;
}

/**
 * Creates a Goods Receipt from an active Purchase Order
 */
export async function createGoodsReceipt(
  purchaseOrder: PurchaseOrder,
  items: GoodsReceiptItem[],
  currentUser: AuthUser,
  deliveryNoteNumber?: string,
  supplierInvoiceNumber?: string,
  transportReference?: string,
  notes?: string,
  allowOverReceiving: boolean = false
): Promise<{ success: boolean; error?: string; grnId?: string }> {
  try {
    if (!currentUser) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const eligibleStatuses: PurchaseOrderStatus[] = [
      'approved', 'sent_to_supplier', 'supplier_confirmed', 
      'in_transit', 'partially_received', 'received'
    ];

    if (!eligibleStatuses.includes(purchaseOrder.status)) {
      return { 
        success: false, 
        error: `Purchase order status "${purchaseOrder.status}" is not eligible for receiving.` 
      };
    }

    if (items.length === 0) {
      return { success: false, error: 'At least one line item must be received.' };
    }

    let totalOrderedQuantity = 0;
    let totalReceivedQuantity = 0;
    let totalAcceptedQuantity = 0;
    let totalRejectedQuantity = 0;
    let totalDamagedQuantity = 0;
    let subtotalReceivedValueBDT = 0;
    let hasDiscrepancy = false;

    for (const item of items) {
      if (item.receivedQuantity < 0 || item.acceptedQuantity < 0 || item.rejectedQuantity < 0 || item.damagedQuantity < 0) {
        return { success: false, error: `Quantities cannot be negative for product ${item.productName}.` };
      }
      if (item.acceptedQuantity + item.rejectedQuantity + item.damagedQuantity > item.receivedQuantity) {
        return { 
          success: false, 
          error: `Accepted (${item.acceptedQuantity}) + Rejected (${item.rejectedQuantity}) + Damaged (${item.damagedQuantity}) cannot exceed Received Quantity (${item.receivedQuantity}) for ${item.productName}.` 
        };
      }
      
      // Over-receiving protection: by default do not allow
      if (!allowOverReceiving && item.receivedQuantity > item.remainingQuantity) {
        return { 
          success: false, 
          error: `Over-receiving not allowed. Product "${item.productName}" received ${item.receivedQuantity} units, but only ${item.remainingQuantity} units remain on the PO.` 
        };
      }

      // Classify discrepancy
      if (item.damagedQuantity > 0 && item.rejectedQuantity > 0) {
        item.discrepancyType = 'mixed';
        hasDiscrepancy = true;
      } else if (item.damagedQuantity > 0) {
        item.discrepancyType = 'damaged';
        hasDiscrepancy = true;
      } else if (item.rejectedQuantity > 0) {
        item.discrepancyType = 'wrong_product';
        hasDiscrepancy = true;
      } else if (item.receivedQuantity < item.remainingQuantity) {
        item.discrepancyType = 'short';
        hasDiscrepancy = true;
      } else if (item.receivedQuantity > item.remainingQuantity) {
        item.discrepancyType = 'over';
        hasDiscrepancy = true;
      } else {
        item.discrepancyType = 'none';
      }

      totalOrderedQuantity += item.orderedQuantity;
      totalReceivedQuantity += item.receivedQuantity;
      totalAcceptedQuantity += item.acceptedQuantity;
      totalRejectedQuantity += item.rejectedQuantity;
      totalDamagedQuantity += item.damagedQuantity;
      subtotalReceivedValueBDT += item.acceptedValueBDT;
    }

    const grnId = doc(collection(db, 'goods_receipts')).id;
    const now = new Date().toISOString();
    const grnNumber = generateGRNNumber();
    
    const grn: GoodsReceipt = {
      id: grnId,
      grnNumber,
      purchaseOrderId: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      supplierId: purchaseOrder.supplierId,
      supplierName: purchaseOrder.supplierName,
      status: 'pending_post',
      receivedByUserId: currentUser.uid || currentUser.id,
      receivedByUserName: currentUser.name,
      receivedAt: now,
      deliveryNoteNumber: deliveryNoteNumber || null,
      supplierInvoiceNumber: supplierInvoiceNumber || null,
      transportReference: transportReference || null,
      notes: notes || null,
      totalOrderedQuantity,
      totalReceivedQuantity,
      totalAcceptedQuantity,
      totalRejectedQuantity,
      totalDamagedQuantity,
      subtotalReceivedValueBDT,
      createdAt: now,
      updatedAt: now
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'goods_receipts', grnId), cleanUndefined(grn));

    items.forEach(item => {
      const itemId = doc(collection(db, 'goods_receipt_items')).id;
      item.id = itemId;
      item.goodsReceiptId = grnId;
      item.purchaseOrderId = purchaseOrder.id;
      item.createdAt = now;
      item.updatedAt = now;
      batch.set(doc(db, 'goods_receipt_items', itemId), cleanUndefined(item));
    });

    await batch.commit();

    await recordProcurementAuditLog(
      'GOODS_RECEIPT_CREATED',
      grnId,
      `Goods Receipt ${grnNumber} created for PO ${purchaseOrder.poNumber}. Total Received: ${totalReceivedQuantity}, Accepted: ${totalAcceptedQuantity}, Damaged: ${totalDamagedQuantity}`,
      currentUser
    );

    if (hasDiscrepancy) {
      await recordProcurementAuditLog(
        'PURCHASE_RECEIVING_DISCREPANCY',
        grnId,
        `Receiving discrepancy detected on GRN ${grnNumber} for PO ${purchaseOrder.poNumber}. Damaged: ${totalDamagedQuantity}, Rejected: ${totalRejectedQuantity}`,
        currentUser
      );
    }

    return { success: true, grnId };
  } catch (err: any) {
    console.error('Error creating Goods Receipt:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing draft or pending_post Goods Receipt
 */
export async function updateGoodsReceipt(
  grnId: string,
  updates: Partial<GoodsReceipt>,
  items?: GoodsReceiptItem[],
  currentUser?: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const grnRef = doc(db, 'goods_receipts', grnId);
    const grnSnap = await getDoc(grnRef);
    if (!grnSnap.exists()) return { success: false, error: 'Goods Receipt not found' };

    const grn = grnSnap.data() as GoodsReceipt;
    if (grn.status === 'posted') {
      return { success: false, error: 'Posted Goods Receipts cannot be edited directly.' };
    }
    if (grn.status === 'cancelled') {
      return { success: false, error: 'Cancelled Goods Receipts cannot be edited.' };
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(grnRef, cleanUndefined({
      ...updates,
      updatedAt: now
    }));

    if (items && items.length > 0) {
      for (const item of items) {
        if (item.id) {
          const itemRef = doc(db, 'goods_receipt_items', item.id);
          batch.update(itemRef, cleanUndefined({
            ...item,
            updatedAt: now
          }));
        }
      }
    }

    await batch.commit();

    if (currentUser) {
      await recordProcurementAuditLog(
        'GOODS_RECEIPT_UPDATED',
        grnId,
        `Goods Receipt ${grn.grnNumber} updated`,
        currentUser
      );
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch a single Goods Receipt by ID
 */
export async function getGoodsReceipt(grnId: string): Promise<GoodsReceipt | null> {
  try {
    const snap = await getDoc(doc(db, 'goods_receipts', grnId));
    if (!snap.exists()) return null;
    return snap.data() as GoodsReceipt;
  } catch (err) {
    console.error('Error fetching GRN:', err);
    return null;
  }
}

/**
 * Fetch all Goods Receipts
 */
export async function getGoodsReceipts(): Promise<GoodsReceipt[]> {
  try {
    const q = query(collection(db, 'goods_receipts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GoodsReceipt);
  } catch (err) {
    console.error('Error fetching GRNs:', err);
    return [];
  }
}

/**
 * Fetch all Goods Receipts for a specific Purchase Order
 */
export async function getGoodsReceiptsForPurchaseOrder(poId: string): Promise<GoodsReceipt[]> {
  try {
    const q = query(collection(db, 'goods_receipts'), where('purchaseOrderId', '==', poId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GoodsReceipt).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching GRNs for PO:', err);
    return [];
  }
}

/**
 * Fetch all items for a specific Goods Receipt
 */
export async function getGoodsReceiptItems(grnId: string): Promise<GoodsReceiptItem[]> {
  try {
    const q = query(collection(db, 'goods_receipt_items'), where('goodsReceiptId', '==', grnId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GoodsReceiptItem);
  } catch (err) {
    console.error('Error fetching GRN items:', err);
    return [];
  }
}

/**
 * ATOMIC INVENTORY POSTING (postGoodsReceipt)
 * This is the single canonical point where physical stock increases.
 * Executes atomically in a Firestore transaction with duplicate posting protection.
 */
export async function postGoodsReceipt(
  grnId: string, 
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Only authorized Admin users can post goods receipts to inventory.' };
    }

    // Step 1: Pre-fetch GRN Items
    const itemsSnap = await getDocs(query(collection(db, 'goods_receipt_items'), where('goodsReceiptId', '==', grnId)));
    const grnItems = itemsSnap.docs.map(d => d.data() as GoodsReceiptItem);
    if (grnItems.length === 0) {
      return { success: false, error: 'Goods Receipt contains no line items to post.' };
    }

    let poIdForAudit = '';
    let grnNumberForAudit = '';
    let poNumberForAudit = '';
    let isFullyReceivedStatus = false;
    let totalAcceptedUnitsForAudit = 0;

    await runTransaction(db, async (transaction) => {
      // 1. Read GRN doc
      const grnRef = doc(db, 'goods_receipts', grnId);
      const grnDoc = await transaction.get(grnRef);
      if (!grnDoc.exists()) throw new Error('Goods Receipt not found.');
      const grn = grnDoc.data() as GoodsReceipt;

      // Duplicate Posting Guard
      if (grn.status === 'posted') {
        throw new Error('This Goods Receipt has already been posted. Duplicate inventory posting is strictly prohibited.');
      }
      if (grn.status === 'cancelled') {
        throw new Error('This Goods Receipt is cancelled and cannot be posted.');
      }

      poIdForAudit = grn.purchaseOrderId;
      grnNumberForAudit = grn.grnNumber;
      poNumberForAudit = grn.poNumber;

      // 2. Read PO doc
      const poRef = doc(db, 'purchase_orders', grn.purchaseOrderId);
      const poDoc = await transaction.get(poRef);
      if (!poDoc.exists()) throw new Error('Associated Purchase Order not found.');
      const po = poDoc.data() as PurchaseOrder;

      if (po.status === 'cancelled' || po.status === 'closed' || po.status === 'rejected') {
        throw new Error(`Cannot post receiving for a Purchase Order with status "${po.status}".`);
      }

      // 3. Read all PO items
      const poItemDocs: { [id: string]: PurchaseOrderItem } = {};
      for (const grnItem of grnItems) {
        const poItemRef = doc(db, 'purchase_order_items', grnItem.purchaseOrderItemId);
        const poItemSnap = await transaction.get(poItemRef);
        if (!poItemSnap.exists()) {
          throw new Error(`Purchase order item not found for product "${grnItem.productName}".`);
        }
        poItemDocs[grnItem.purchaseOrderItemId] = poItemSnap.data() as PurchaseOrderItem;
      }

      // 4. Read all Product docs
      const productDocs: { [id: string]: Product } = {};
      for (const grnItem of grnItems) {
        const productRef = doc(db, 'products', grnItem.productId);
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) {
          throw new Error(`Product "${grnItem.productName}" not found in inventory catalog.`);
        }
        productDocs[grnItem.productId] = productSnap.data() as Product;
      }

      // 5. Pre-read all PO items for overall PO status calculation
      const allPoItemsSnap = await getDocs(query(collection(db, 'purchase_order_items'), where('purchaseOrderId', '==', po.id)));
      const allPoItems = allPoItemsSnap.docs.map(d => d.data() as PurchaseOrderItem);

      const now = new Date().toISOString();

      // 6. Perform all updates
      for (const grnItem of grnItems) {
        const poItem = poItemDocs[grnItem.purchaseOrderItemId];
        const product = productDocs[grnItem.productId];

        // Stock increase: strictly by accepted quantity
        if (grnItem.acceptedQuantity > 0) {
          totalAcceptedUnitsForAudit += grnItem.acceptedQuantity;
          const previousStock = Number(product.currentStock ?? 0);
          const newStock = previousStock + grnItem.acceptedQuantity;
          const lowStockThreshold = product.lowStockThreshold || 5;
          const stockStatus = newStock === 0 ? 'out_of_stock' : (newStock <= lowStockThreshold ? 'low_stock' : 'in_stock');

          // Update Product
          const productRef = doc(db, 'products', grnItem.productId);
          transaction.update(productRef, {
            currentStock: newStock,
            stockStatus,
            updatedAt: now
          });

          // Write InventoryTransaction to canonical inventoryTransactions collection
          const invTransId = doc(collection(db, 'inventoryTransactions')).id;
          const invTrans: InventoryTransaction = {
            id: invTransId,
            productId: product.id,
            productName: product.name,
            sku: product.sku || '',
            previousStock,
            adjustmentQuantity: grnItem.acceptedQuantity,
            newStock,
            type: 'stock_in',
            reason: `Goods Receipt ${grn.grnNumber} (PO: ${po.poNumber})`,
            userId: currentUser.uid || currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            createdAt: now,
            
            unitCost: grnItem.unitPurchasePriceBDT,
            totalCost: grnItem.acceptedValueBDT,
            purchaseOrderId: po.id,
            purchaseOrderItemId: poItem.id,
            goodsReceiptId: grn.id,
            grnNumber: grn.grnNumber,
            supplierId: po.supplierId,
            supplierName: po.supplierName
          };
          transaction.set(doc(db, 'inventoryTransactions', invTransId), cleanUndefined(invTrans));
        }

        // Update PO Item quantities
        const newReceivedQuantity = (poItem.receivedQuantity || 0) + grnItem.receivedQuantity;
        const newRemaining = Math.max(0, poItem.orderedQuantity - newReceivedQuantity);
        
        const poItemRef = doc(db, 'purchase_order_items', grnItem.purchaseOrderItemId);
        transaction.update(poItemRef, {
          receivedQuantity: newReceivedQuantity,
          remainingQuantity: newRemaining,
          updatedAt: now
        });
      }

      // 7. Calculate new overall PO received and remaining quantities
      let newPoTotalReceived = 0;
      let newPoTotalRemaining = 0;
      let isFullyReceived = true;

      for (const poItem of allPoItems) {
        let itemReceived = poItem.receivedQuantity || 0;
        const matchingGrnItem = grnItems.find(g => g.purchaseOrderItemId === poItem.id);
        if (matchingGrnItem) {
          itemReceived += matchingGrnItem.receivedQuantity;
        }
        const itemRemaining = Math.max(0, poItem.orderedQuantity - itemReceived);
        
        newPoTotalReceived += itemReceived;
        newPoTotalRemaining += itemRemaining;

        if (itemRemaining > 0) {
          isFullyReceived = false;
        }
      }

      isFullyReceivedStatus = isFullyReceived;
      const newPoStatus: PurchaseOrderStatus = isFullyReceived ? 'received' : 'partially_received';

      // Update PO
      transaction.update(poRef, {
        status: newPoStatus,
        totalReceivedQuantity: newPoTotalReceived,
        totalRemainingQuantity: newPoTotalRemaining,
        updatedAt: now
      });

      // Update GRN
      transaction.update(grnRef, {
        status: 'posted',
        postedAt: now,
        postedByUserId: currentUser.uid || currentUser.id,
        postedByUserName: currentUser.name,
        updatedAt: now
      });
    });

    // Step 8: Record immutable audit logs
    await recordProcurementAuditLog(
      'GOODS_RECEIPT_POSTED',
      grnId,
      `Goods Receipt ${grnNumberForAudit} posted. Stock increased by ${totalAcceptedUnitsForAudit} usable units into inventory.`,
      currentUser
    );

    await recordProcurementAuditLog(
      'INVENTORY_STOCK_IN_FROM_GOODS_RECEIPT',
      grnId,
      `Atomic stock-in completed for GRN ${grnNumberForAudit} under PO ${poNumberForAudit}`,
      currentUser
    );

    await recordProcurementAuditLog(
      isFullyReceivedStatus ? 'PURCHASE_ORDER_RECEIVED' : 'PURCHASE_ORDER_PARTIALLY_RECEIVED',
      poIdForAudit,
      `Purchase Order ${poNumberForAudit} status updated to "${isFullyReceivedStatus ? 'received' : 'partially_received'}" after GRN posting.`,
      currentUser
    );

    return { success: true };
  } catch (err: any) {
    console.error('Error posting Goods Receipt:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Admin reconciliation & closure of a Purchase Order
 * Closes the PO while strictly preserving all historical variances
 */
export async function reconcilePurchaseOrder(
  poId: string, 
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Only Admin users can reconcile and close purchase orders.' };
    }

    const poRef = doc(db, 'purchase_orders', poId);
    const poSnap = await getDoc(poRef);
    if (!poSnap.exists()) return { success: false, error: 'Purchase order not found.' };
    
    const po = poSnap.data() as PurchaseOrder;
    if (po.status === 'closed') {
      return { success: false, error: 'This Purchase Order is already closed.' };
    }

    const now = new Date().toISOString();
    await setDoc(poRef, { 
      status: 'closed', 
      updatedAt: now 
    }, { merge: true });

    await recordProcurementAuditLog(
      'PURCHASE_ORDER_RECONCILED',
      poId,
      `Purchase Order ${po.poNumber} closed and reconciled. Historical variance: ${po.totalRemainingQuantity} remaining units.`,
      currentUser
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Cancel a draft or pending_post Goods Receipt
 */
export async function cancelGoodsReceipt(
  grnId: string, 
  reason: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Only Admin users can cancel goods receipts.' };
    }

    const grnRef = doc(db, 'goods_receipts', grnId);
    const grnSnap = await getDoc(grnRef);
    if (!grnSnap.exists()) return { success: false, error: 'Goods Receipt not found.' };
    const grn = grnSnap.data() as GoodsReceipt;

    if (grn.status === 'posted') {
      return { 
        success: false, 
        error: 'Cannot cancel a posted Goods Receipt. Posted inventory cannot be silently deleted.' 
      };
    }
    if (grn.status === 'cancelled') {
      return { success: false, error: 'This Goods Receipt is already cancelled.' };
    }

    const now = new Date().toISOString();
    await setDoc(grnRef, {
      status: 'cancelled',
      cancelledAt: now,
      cancelledByUserId: currentUser.uid || currentUser.id,
      cancellationReason: reason,
      updatedAt: now
    }, { merge: true });

    await recordProcurementAuditLog(
      'GOODS_RECEIPT_CANCELLED',
      grnId,
      `Goods Receipt ${grn.grnNumber} cancelled. Reason: ${reason}`,
      currentUser
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetches all receiving exceptions and discrepancies
 */
export async function getReceivingExceptions(): Promise<ReceivingException[]> {
  try {
    const receipts = await getGoodsReceipts();
    const exceptions: ReceivingException[] = [];

    for (const receipt of receipts) {
      const items = await getGoodsReceiptItems(receipt.id);
      for (const item of items) {
        if (
          item.damagedQuantity > 0 || 
          item.rejectedQuantity > 0 || 
          (item.discrepancyType && item.discrepancyType !== 'none') ||
          item.receivedQuantity < item.orderedQuantity
        ) {
          exceptions.push({
            id: item.id,
            goodsReceiptId: receipt.id,
            grnNumber: receipt.grnNumber,
            purchaseOrderId: receipt.purchaseOrderId,
            poNumber: receipt.poNumber,
            supplierId: receipt.supplierId,
            supplierName: receipt.supplierName,
            productId: item.productId,
            productName: item.productName,
            orderedQuantity: item.orderedQuantity,
            receivedQuantity: item.receivedQuantity,
            acceptedQuantity: item.acceptedQuantity,
            damagedQuantity: item.damagedQuantity,
            rejectedQuantity: item.rejectedQuantity,
            discrepancyType: item.discrepancyType || (item.damagedQuantity > 0 ? 'damaged' : item.rejectedQuantity > 0 ? 'wrong_product' : 'short'),
            discrepancyReason: item.discrepancyReason || item.notes || null,
            notes: item.notes || null,
            receivedDate: receipt.receivedAt || receipt.createdAt,
            status: receipt.status
          });
        }
      }
    }

    return exceptions;
  } catch (err) {
    console.error('Error fetching receiving exceptions:', err);
    return [];
  }
}

/**
 * Fetches structured receiving history and variance summary for a Purchase Order
 */
export async function getPurchaseOrderReceivingHistory(poId: string): Promise<POReceivingHistorySummary | null> {
  try {
    const poSnap = await getDoc(doc(db, 'purchase_orders', poId));
    if (!poSnap.exists()) return null;
    const po = poSnap.data() as PurchaseOrder;

    const receipts = await getGoodsReceiptsForPurchaseOrder(poId);

    let totalOrderedQuantity = po.totalOrderedQuantity || 0;
    let totalReceivedQuantity = 0;
    let totalAcceptedQuantity = 0;
    let totalDamagedQuantity = 0;
    let totalRejectedQuantity = 0;

    const receiptsList = receipts.map(r => {
      totalReceivedQuantity += (r.totalReceivedQuantity || 0);
      totalAcceptedQuantity += (r.totalAcceptedQuantity || 0);
      totalDamagedQuantity += (r.totalDamagedQuantity || 0);
      totalRejectedQuantity += (r.totalRejectedQuantity || 0);

      return {
        id: r.id,
        grnNumber: r.grnNumber,
        receivedAt: r.receivedAt || r.createdAt,
        receivedByUserName: r.receivedByUserName || '',
        status: r.status,
        totalReceivedQuantity: r.totalReceivedQuantity || 0,
        totalAcceptedQuantity: r.totalAcceptedQuantity || 0,
        totalDamagedQuantity: r.totalDamagedQuantity || 0,
        totalRejectedQuantity: r.totalRejectedQuantity || 0,
        subtotalReceivedValueBDT: r.subtotalReceivedValueBDT || 0
      };
    });

    const totalRemainingQuantity = Math.max(0, totalOrderedQuantity - totalReceivedQuantity);
    const varianceQuantity = totalOrderedQuantity - totalAcceptedQuantity;

    return {
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      poStatus: po.status,
      totalOrderedQuantity,
      totalReceivedQuantity,
      totalAcceptedQuantity,
      totalDamagedQuantity,
      totalRejectedQuantity,
      totalRemainingQuantity,
      varianceQuantity,
      receipts: receiptsList
    };
  } catch (err) {
    console.error('Error fetching PO receiving history:', err);
    return null;
  }
}
