import { collection, doc, getDoc, getDocs, query, where, orderBy, writeBatch, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  AuthUser, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  PurchaseRequest, 
  PurchaseRequestItem, 
  Product, 
  Supplier 
} from '../types';
import { cleanUndefined, recordProcurementAuditLog } from './firestoreService';

export async function createPurchaseOrderFromRequest(
  requestId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    
    // Verify Purchase Request exists
    const prRef = doc(db, 'purchase_requests', requestId);
    const prSnap = await getDoc(prRef);
    if (!prSnap.exists()) return { success: false, error: 'Purchase request not found.' };
    
    const request = { id: prSnap.id, ...(prSnap.data() as any) } as PurchaseRequest;
    
    // Verify Purchase Request is approved
    if (request.status !== 'approved') {
      return { success: false, error: 'Purchase request must be approved before conversion.' };
    }

    if (!request.supplierId) {
      return { success: false, error: 'Purchase request must have a supplier assigned.' };
    }

    // Verify supplier exists and is active
    const supSnap = await getDoc(doc(db, 'suppliers', request.supplierId));
    if (!supSnap.exists()) return { success: false, error: 'Assigned supplier does not exist.' };
    
    const supplier = supSnap.data() as Supplier;
    if (supplier.status !== 'active') return { success: false, error: 'Assigned supplier is not active.' };

    const itemsSnap = await getDocs(query(collection(db, 'purchase_request_items'), where('purchaseRequestId', '==', requestId)));
    const reqItems = itemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseRequestItem));

    if (reqItems.length === 0) return { success: false, error: 'Purchase request has no items.' };

    // Validations and calculations
    let subtotalBDT = 0;
    let totalOrderedQuantity = 0;

    for (const item of reqItems) {
      if (!item.requestedQuantity || item.requestedQuantity <= 0) {
        return { success: false, error: `Invalid requested quantity for ${item.productName}.` };
      }
      if (item.estimatedUnitPrice === undefined || item.estimatedUnitPrice < 0) {
        return { success: false, error: `Invalid estimated unit price for ${item.productName}.` };
      }
      const prodSnap = await getDoc(doc(db, 'products', item.productId));
      if (!prodSnap.exists()) {
        return { success: false, error: `Product ${item.productName} does not exist.` };
      }
      
      subtotalBDT += (item.requestedQuantity * item.estimatedUnitPrice);
      totalOrderedQuantity += item.requestedQuantity;
    }

    const discountBDT = 0;
    const transportCostBDT = 0;
    const otherCostBDT = 0;
    const totalAmountBDT = subtotalBDT - discountBDT + transportCostBDT + otherCostBDT;

    const poNumber = `GZ-PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const poRef = doc(collection(db, 'purchase_orders'));
    const batch = writeBatch(db);

    batch.set(poRef, cleanUndefined({
      id: poRef.id,
      poNumber,
      purchaseRequestId: requestId,
      supplierId: request.supplierId,
      supplierName: request.supplierName || supplier.name,
      status: 'draft', // Created as draft
      createdByUserId: currentUser.uid || currentUser.id || '',
      createdByUserName: currentUser.name || 'Staff',
      approvedByUserId: null,
      approvedByUserName: null,
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      sentToSupplierAt: null,
      supplierConfirmedAt: null,
      expectedDeliveryDate: null,
      supplierReferenceNumber: null,
      paymentTerms: supplier.paymentTerms || 'Net 30',
      currency: supplier.currency || 'BDT',
      subtotalBDT,
      discountBDT,
      transportCostBDT,
      otherCostBDT,
      totalAmountBDT,
      totalOrderedQuantity,
      totalReceivedQuantity: 0,
      totalRemainingQuantity: totalOrderedQuantity,
      notes: request.reason || '',
      rejectionReason: null,
      cancellationReason: null,
      version: 1
    }));

    for (const item of reqItems) {
      const lineTotal = item.requestedQuantity * item.estimatedUnitPrice;
      const poItemRef = doc(collection(db, 'purchase_order_items'));
      batch.set(poItemRef, cleanUndefined({
        id: poItemRef.id,
        purchaseOrderId: poRef.id,
        productId: item.productId,
        productName: item.productName,
        supplierProductId: null,
        supplierSku: null,
        orderedQuantity: item.requestedQuantity,
        receivedQuantity: 0,
        remainingQuantity: item.requestedQuantity,
        unitPurchasePriceBDT: item.estimatedUnitPrice,
        discountBDT: 0,
        totalLineAmountBDT: lineTotal,
        expectedDeliveryDate: null,
        notes: null,
        createdAt: now,
        updatedAt: now
      }));
    }

    batch.update(prRef, {
      status: 'converted',
      updatedAt: now
    });

    await batch.commit();
    await recordProcurementAuditLog('PURCHASE_ORDER_CREATED', poRef.id, poNumber, currentUser, 'Created PO from Purchase Request');
    return { success: true, id: poRef.id };
  } catch (err: any) {
    console.error('Error creating purchase order:', err);
    return { success: false, error: err?.message || 'Failed to create purchase order.' };
  }
}

export async function getPurchaseOrder(orderId: string): Promise<{ order: PurchaseOrder; items: PurchaseOrderItem[] } | null> {
  try {
    const poSnap = await getDoc(doc(db, 'purchase_orders', orderId));
    if (!poSnap.exists()) return null;

    const order = { id: poSnap.id, ...(poSnap.data() as any) } as PurchaseOrder;
    const itemsSnap = await getDocs(query(collection(db, 'purchase_order_items'), where('purchaseOrderId', '==', orderId)));
    const items = itemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrderItem));

    return { order, items };
  } catch (err) {
    console.error('Error getting purchase order:', err);
    return null;
  }
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const snap = await getDocs(query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrder));
  } catch (err) {
    console.warn('Error fetching purchase orders with orderBy, falling back:', err);
    try {
      const snap = await getDocs(collection(db, 'purchase_orders'));
      return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrder));
    } catch (fallbackErr) {
      console.error('Error fetching purchase orders:', fallbackErr);
      return [];
    }
  }
}

export async function getPurchaseOrdersBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
  try {
    const snap = await getDocs(query(collection(db, 'purchase_orders'), where('supplierId', '==', supplierId), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrder));
  } catch (err) {
    return [];
  }
}

export async function getPurchaseOrdersByStatus(status: PurchaseOrder['status']): Promise<PurchaseOrder[]> {
  try {
    const snap = await getDocs(query(collection(db, 'purchase_orders'), where('status', '==', status), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrder));
  } catch (err) {
    return [];
  }
}

export async function getPurchaseOrderItems(orderId: string): Promise<PurchaseOrderItem[]> {
  try {
    const snap = await getDocs(query(collection(db, 'purchase_order_items'), where('purchaseOrderId', '==', orderId)));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as PurchaseOrderItem));
  } catch (err) {
    return [];
  }
}

export async function submitPurchaseOrderForApproval(orderId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (order.status !== 'draft') {
      return { success: false, error: 'Only draft purchase orders can be submitted for approval.' };
    }
    if (currentUser.role === 'sales' && order.createdByUserId !== (currentUser.uid || currentUser.id)) {
        return { success: false, error: 'Not authorized to submit this purchase order.' };
    }

    await updateDoc(poRef, {
      status: 'pending_approval',
      updatedAt: new Date().toISOString()
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_SUBMITTED', orderId, order.poNumber, currentUser, 'Submitted PO for approval');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit.' };
  }
}

export async function approvePurchaseOrder(orderId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    if (currentUser.role !== 'admin') return { success: false, error: 'Only admin can approve purchase orders.' };
    
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (order.createdByUserId === (currentUser.uid || currentUser.id)) {
      return { success: false, error: 'User cannot approve their own purchase order.' };
    }
    if (order.status !== 'pending_approval') {
      return { success: false, error: 'Purchase order must be pending approval to be approved.' };
    }

    const now = new Date().toISOString();
    await updateDoc(poRef, {
      status: 'approved',
      approvedAt: now,
      approvedByUserId: currentUser.uid || currentUser.id || '',
      approvedByUserName: currentUser.name || 'Admin',
      updatedAt: now
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_APPROVED', orderId, order.poNumber, currentUser, 'Approved purchase order');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to approve.' };
  }
}

export async function rejectPurchaseOrder(orderId: string, reason: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    if (currentUser.role !== 'admin') return { success: false, error: 'Only admin can reject purchase orders.' };
    
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (order.status !== 'pending_approval') {
      return { success: false, error: 'Purchase order must be pending approval to be rejected.' };
    }

    const now = new Date().toISOString();
    await updateDoc(poRef, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: now
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_REJECTED', orderId, order.poNumber, currentUser, `Rejected PO: ${reason}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reject.' };
  }
}

export async function sendPurchaseOrderToSupplier(orderId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    if (currentUser.role !== 'admin') return { success: false, error: 'Only admin can send purchase orders to supplier.' };
    
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (order.status !== 'approved') {
      return { success: false, error: 'Purchase order must be approved before sending.' };
    }

    const now = new Date().toISOString();
    await updateDoc(poRef, {
      status: 'sent_to_supplier',
      sentToSupplierAt: now,
      updatedAt: now
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_SENT', orderId, order.poNumber, currentUser, 'Sent PO to supplier');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send.' };
  }
}

export async function confirmSupplierPurchaseOrder(orderId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    if (currentUser.role !== 'admin') return { success: false, error: 'Only admin can confirm supplier orders.' };
    
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (order.status !== 'sent_to_supplier') {
      return { success: false, error: 'Purchase order must be sent to supplier before it can be confirmed.' };
    }

    const now = new Date().toISOString();
    await updateDoc(poRef, {
      status: 'supplier_confirmed',
      supplierConfirmedAt: now,
      updatedAt: now
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_SUPPLIER_CONFIRMED', orderId, order.poNumber, currentUser, 'Supplier confirmed PO');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to confirm.' };
  }
}

export async function requestPurchaseOrderRevision(orderId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    if (currentUser.role !== 'admin') return { success: false, error: 'Only admin can request PO revision.' };
    
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (order.status !== 'approved' && order.status !== 'rejected') {
      return { success: false, error: 'Only approved or rejected purchase orders can be revised.' };
    }

    const now = new Date().toISOString();
    await updateDoc(poRef, {
      status: 'draft',
      version: (order.version || 1) + 1,
      updatedAt: now
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_REVISED', orderId, order.poNumber, currentUser, 'Created revision draft for PO');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to revise.' };
  }
}

export async function cancelPurchaseOrder(orderId: string, reason: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    if (currentUser.role !== 'admin') return { success: false, error: 'Only admin can cancel POs.' };
    
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (['received', 'closed', 'cancelled'].includes(order.status)) {
      return { success: false, error: 'Purchase order cannot be cancelled in its current state.' };
    }

    const now = new Date().toISOString();
    await updateDoc(poRef, {
      status: 'cancelled',
      cancellationReason: reason,
      updatedAt: now
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_CANCELLED', orderId, order.poNumber, currentUser, `Cancelled PO: ${reason}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel.' };
  }
}

export async function closePurchaseOrder(orderId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    if (currentUser.role !== 'admin') return { success: false, error: 'Only admin can close POs.' };
    
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (order.status !== 'received' && order.status !== 'partially_received') {
      return { success: false, error: 'Only received or partially received POs can be closed.' };
    }

    const now = new Date().toISOString();
    await updateDoc(poRef, {
      status: 'closed',
      updatedAt: now
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_STATUS_CHANGED', orderId, order.poNumber, currentUser, 'Closed PO');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to close.' };
  }
}

export async function markPurchaseOrderInTransit(orderId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser) return { success: false, error: 'Authentication required.' };
    if (currentUser.role !== 'admin') return { success: false, error: 'Only admin can mark PO in transit.' };
    
    const poRef = doc(db, 'purchase_orders', orderId);
    const snap = await getDoc(poRef);
    if (!snap.exists()) return { success: false, error: 'Purchase order not found.' };

    const order = snap.data() as PurchaseOrder;
    if (order.status !== 'supplier_confirmed') {
      return { success: false, error: 'PO must be supplier confirmed before marking in transit.' };
    }

    const now = new Date().toISOString();
    await updateDoc(poRef, {
      status: 'in_transit',
      updatedAt: now
    });

    await recordProcurementAuditLog('PURCHASE_ORDER_STATUS_CHANGED', orderId, order.poNumber, currentUser, 'Marked PO In Transit');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to mark in transit.' };
  }
}
