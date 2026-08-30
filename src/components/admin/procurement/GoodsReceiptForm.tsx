import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { PurchaseOrder, PurchaseOrderItem, GoodsReceiptItem } from '../../../types';
import { getPurchaseOrderItems } from '../../../services/purchaseOrderService';
import { createGoodsReceipt } from '../../../services/grnService';
import { Modal } from '../../shared/Modal';
import { 
  Loader2, PackageCheck, AlertCircle, CheckCircle2, 
  ShieldAlert, ArrowRight, Truck, FileText 
} from 'lucide-react';

interface GoodsReceiptFormProps {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemFormState {
  received: number;
  accepted: number;
  damaged: number;
  rejected: number;
  notes: string;
}

export const GoodsReceiptForm: React.FC<GoodsReceiptFormProps> = ({ purchaseOrder, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { formatBDT } = useApp();
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Document metadata
  const [deliveryNote, setDeliveryNote] = useState('');
  const [supplierInvoice, setSupplierInvoice] = useState('');
  const [transportRef, setTransportRef] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');

  // Item form states
  const [itemStates, setItemStates] = useState<{ [poItemId: string]: ItemFormState }>({});

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const items = await getPurchaseOrderItems(purchaseOrder.id);
        setPoItems(items);
        
        const initial: { [id: string]: ItemFormState } = {};
        items.forEach(item => {
          const rem = Math.max(0, item.remainingQuantity);
          initial[item.id] = {
            received: rem,
            accepted: rem,
            damaged: 0,
            rejected: 0,
            notes: ''
          };
        });
        setItemStates(initial);
      } catch (err) {
        console.error('Error fetching PO items:', err);
        setErrorMessage('Failed to load purchase order line items.');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [purchaseOrder.id]);

  const handleFieldChange = (
    poItemId: string, 
    field: 'received' | 'accepted' | 'damaged' | 'rejected', 
    val: number
  ) => {
    setErrorMessage(null);
    const cleanVal = Math.max(0, isNaN(val) ? 0 : val);

    setItemStates(prev => {
      const current = { ...prev[poItemId] };
      current[field] = cleanVal;

      // Auto-rebalance accepted quantity when received, damaged, or rejected change
      if (field === 'received' || field === 'damaged' || field === 'rejected') {
        const totalLoss = current.damaged + current.rejected;
        current.accepted = Math.max(0, current.received - totalLoss);
      } else if (field === 'accepted') {
        // If accepted is manually adjusted, verify sum
        if (current.accepted + current.damaged + current.rejected > current.received) {
          current.received = current.accepted + current.damaged + current.rejected;
        }
      }

      return { ...prev, [poItemId]: current };
    });
  };

  const handleNotesChange = (poItemId: string, notes: string) => {
    setItemStates(prev => ({
      ...prev,
      [poItemId]: {
        ...prev[poItemId],
        notes
      }
    }));
  };

  // Calculate live summary stats
  let totalReceived = 0;
  let totalAccepted = 0;
  let totalDamaged = 0;
  let totalRejected = 0;
  let totalStockIncreaseValue = 0;

  poItems.forEach(item => {
    const st = itemStates[item.id];
    if (st) {
      totalReceived += st.received;
      totalAccepted += st.accepted;
      totalDamaged += st.damaged;
      totalRejected += st.rejected;
      totalStockIncreaseValue += (st.accepted * (item.unitPurchasePriceBDT || 0));
    }
  });

  const handleSave = async () => {
    if (!currentUser) {
      setErrorMessage('User session expired. Please sign in again.');
      return;
    }

    setErrorMessage(null);

    // Validate quantities
    const grnItems: GoodsReceiptItem[] = [];
    for (const poItem of poItems) {
      const st = itemStates[poItem.id];
      if (!st) continue;

      if (st.received > 0) {
        if (st.accepted + st.damaged + st.rejected > st.received) {
          setErrorMessage(`Item "${poItem.productName}": Accepted (${st.accepted}) + Damaged (${st.damaged}) + Rejected (${st.rejected}) cannot exceed Received (${st.received}).`);
          return;
        }

        if (st.received > poItem.remainingQuantity) {
          setErrorMessage(`Over-receiving not allowed for "${poItem.productName}". Received (${st.received}) exceeds remaining (${poItem.remainingQuantity}).`);
          return;
        }

        grnItems.push({
          id: '',
          goodsReceiptId: '',
          purchaseOrderId: purchaseOrder.id,
          purchaseOrderItemId: poItem.id,
          productId: poItem.productId,
          productName: poItem.productName,
          orderedQuantity: poItem.orderedQuantity,
          previouslyReceivedQuantity: poItem.receivedQuantity || 0,
          receivedQuantity: st.received,
          acceptedQuantity: st.accepted,
          rejectedQuantity: st.rejected,
          damagedQuantity: st.damaged,
          remainingQuantity: poItem.remainingQuantity,
          unitPurchasePriceBDT: poItem.unitPurchasePriceBDT,
          acceptedValueBDT: st.accepted * poItem.unitPurchasePriceBDT,
          notes: st.notes || null,
          createdAt: '',
          updatedAt: ''
        });
      }
    }

    if (grnItems.length === 0) {
      setErrorMessage('Please specify received quantities for at least one item.');
      return;
    }

    setSaving(true);
    try {
      const res = await createGoodsReceipt(
        purchaseOrder,
        grnItems,
        currentUser,
        deliveryNote,
        supplierInvoice,
        transportRef,
        receiptNotes
      );

      if (res.success) {
        onSuccess();
      } else {
        setErrorMessage(res.error || 'Failed to create Goods Receipt');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={() => !saving && onClose()} 
      title={`Receive Goods — ${purchaseOrder.poNumber}`} 
      maxWidth="5xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F766E]" />
          <p className="text-sm text-slate-500 font-medium">Loading PO line items & stock ledger...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Supplier</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{purchaseOrder.supplierName}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">PO Number</span>
              <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{purchaseOrder.poNumber}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">PO Status</span>
              <p className="font-bold uppercase text-[#0F766E] text-sm mt-0.5">{purchaseOrder.status.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Remaining to Receive</span>
              <p className="font-bold text-amber-700 text-sm mt-0.5">{purchaseOrder.totalRemainingQuantity} Units</p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Logistics References */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Note / Challan #</label>
              <input 
                type="text" 
                value={deliveryNote}
                onChange={e => setDeliveryNote(e.target.value)}
                placeholder="e.g. CH-2026-991"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-[#0F766E] focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Invoice #</label>
              <input 
                type="text" 
                value={supplierInvoice}
                onChange={e => setSupplierInvoice(e.target.value)}
                placeholder="e.g. INV-8823"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-[#0F766E] focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transport / Vehicle Ref</label>
              <input 
                type="text" 
                value={transportRef}
                onChange={e => setTransportRef(e.target.value)}
                placeholder="e.g. Dhaka Metro-Ta 11-4450"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-[#0F766E] focus:border-[#0F766E]"
              />
            </div>
          </div>

          {/* Line Items Table & Mobile Cards */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Item Receiving Inspection</span>
              <span className="text-xs text-slate-500 font-medium">{poItems.length} Products on PO</span>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-2 text-center">Ordered</th>
                    <th className="py-3 px-2 text-center">Remaining</th>
                    <th className="py-3 px-2 text-center w-24">Receive Qty</th>
                    <th className="py-3 px-2 text-center w-24">Accepted</th>
                    <th className="py-3 px-2 text-center w-20">Damaged</th>
                    <th className="py-3 px-2 text-center w-20">Rejected</th>
                    <th className="py-3 px-3">Item Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poItems.map(item => {
                    const st = itemStates[item.id];
                    if (!st) return null;
                    const hasDiscrepancy = st.damaged > 0 || st.rejected > 0 || (st.received < item.remainingQuantity);

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${hasDiscrepancy ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">Unit Cost: {formatBDT(item.unitPurchasePriceBDT)}</p>
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-500">{item.orderedQuantity}</td>
                        <td className="py-3 px-2 text-center font-bold text-amber-700">{item.remainingQuantity}</td>
                        <td className="py-3 px-2 text-center">
                          <input 
                            type="number"
                            min="0"
                            max={item.remainingQuantity}
                            value={st.received}
                            onChange={e => handleFieldChange(item.id, 'received', parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 text-center font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0F766E] focus:border-[#0F766E]"
                          />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input 
                            type="number"
                            min="0"
                            max={st.received}
                            value={st.accepted}
                            onChange={e => handleFieldChange(item.id, 'accepted', parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 text-center font-bold text-emerald-700 bg-emerald-50/50 border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input 
                            type="number"
                            min="0"
                            value={st.damaged}
                            onChange={e => handleFieldChange(item.id, 'damaged', parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 text-center font-bold text-rose-700 bg-rose-50/50 border border-rose-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input 
                            type="number"
                            min="0"
                            value={st.rejected}
                            onChange={e => handleFieldChange(item.id, 'rejected', parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 text-center font-bold text-amber-700 bg-amber-50/50 border border-amber-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input 
                            type="text"
                            value={st.notes}
                            onChange={e => handleNotesChange(item.id, e.target.value)}
                            placeholder="Optional reason..."
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0F766E]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {poItems.map(item => {
                const st = itemStates[item.id];
                if (!st) return null;

                return (
                  <div key={item.id} className="p-4 space-y-3 bg-white">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{item.productName}</p>
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Ordered: {item.orderedQuantity}</span>
                        <span className="font-semibold text-amber-700">Remaining: {item.remainingQuantity}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Receive Qty</label>
                        <input 
                          type="number"
                          min="0"
                          value={st.received}
                          onChange={e => handleFieldChange(item.id, 'received', parseInt(e.target.value))}
                          className="w-full min-h-[44px] px-3 py-2 text-center font-bold text-slate-900 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Accepted</label>
                        <input 
                          type="number"
                          min="0"
                          value={st.accepted}
                          onChange={e => handleFieldChange(item.id, 'accepted', parseInt(e.target.value))}
                          className="w-full min-h-[44px] px-3 py-2 text-center font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-rose-700 mb-1">Damaged</label>
                        <input 
                          type="number"
                          min="0"
                          value={st.damaged}
                          onChange={e => handleFieldChange(item.id, 'damaged', parseInt(e.target.value))}
                          className="w-full min-h-[44px] px-3 py-2 text-center font-bold text-rose-800 bg-rose-50 border border-rose-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-amber-700 mb-1">Rejected</label>
                        <input 
                          type="number"
                          min="0"
                          value={st.rejected}
                          onChange={e => handleFieldChange(item.id, 'rejected', parseInt(e.target.value))}
                          className="w-full min-h-[44px] px-3 py-2 text-center font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Totals Bar */}
          <div className="bg-[#0F766E]/5 border border-[#0F766E]/20 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">Total Received</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{totalReceived} Units</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">Accepted (Stock-In)</span>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{totalAccepted} Units</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">Damaged / Rejected</span>
              <p className="text-lg font-bold text-rose-600 mt-0.5">{totalDamaged + totalRejected} Units</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">Est. Stock-In Value</span>
              <p className="text-lg font-bold text-[#0F766E] mt-0.5">{formatBDT(totalStockIncreaseValue)}</p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <button 
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 min-h-[44px] text-slate-600 font-semibold text-sm hover:text-slate-900"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || totalReceived === 0}
              className="px-6 py-2.5 min-h-[44px] bg-[#0F766E] text-white font-bold text-sm rounded-xl shadow-md hover:bg-[#0d645d] disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              <span>Create Goods Receipt</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
