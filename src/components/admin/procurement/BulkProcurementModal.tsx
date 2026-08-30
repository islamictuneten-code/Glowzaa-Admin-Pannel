import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShoppingBag, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { 
  ProcurementRecommendation, 
  AuthUser, 
  ProcurementSettings 
} from '../../../types';
import { createBulkPOsFromRecommendations } from '../../../services/smartProcurementService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedRecommendations: ProcurementRecommendation[];
  currentUser: AuthUser;
  settings: ProcurementSettings;
  onSuccess: () => void;
}

export const BulkProcurementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedRecommendations,
  currentUser,
  settings,
  onSuccess
}) => {
  if (!isOpen) return null;

  // Prepare initial items with default quantities and suppliers
  const [items, setItems] = useState(() => 
    selectedRecommendations.map(rec => {
      const supplierId = rec.preferredSupplier?.supplierId || (rec.alternativeSuppliers[0]?.supplierId || '');
      const supplierName = rec.preferredSupplier?.supplierName || (rec.alternativeSuppliers[0]?.supplierName || 'Manual Selection Required');
      const unitPrice = rec.preferredSupplier?.unitPriceBDT || rec.unitPriceBDT || 0;
      const orderQuantity = rec.recommendedQuantity > 0 ? rec.recommendedQuantity : 50;

      return {
        recommendation: rec,
        supplierId,
        supplierName,
        orderQuantity,
        unitPrice
      };
    })
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group summary by Supplier
  const supplierGroups = useMemo(() => {
    const map = new Map<string, {
      supplierId: string;
      supplierName: string;
      itemCount: number;
      totalUnits: number;
      totalCostBDT: number;
    }>();

    for (const it of items) {
      const key = it.supplierId || 'unassigned';
      const prev = map.get(key) || {
        supplierId: it.supplierId,
        supplierName: it.supplierName,
        itemCount: 0,
        totalUnits: 0,
        totalCostBDT: 0
      };
      prev.itemCount += 1;
      prev.totalUnits += it.orderQuantity;
      prev.totalCostBDT += (it.orderQuantity * it.unitPrice);
      map.set(key, prev);
    }

    return Array.from(map.values());
  }, [items]);

  const grandTotalUnits = items.reduce((sum, it) => sum + it.orderQuantity, 0);
  const grandTotalCostBDT = items.reduce((sum, it) => sum + (it.orderQuantity * it.unitPrice), 0);

  const handleUpdateItemQty = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].orderQuantity = Math.max(1, qty);
    setItems(updated);
  };

  const handleBulkSubmit = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Only admins can execute procurement orders.');
      return;
    }

    const unassigned = items.find(it => !it.supplierId);
    if (unassigned) {
      setError(`Please assign a supplier to "${unassigned.recommendation.productName}" before proceeding.`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const res = await createBulkPOsFromRecommendations(items, currentUser);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.errors?.join(', ') || 'Failed to create bulk purchase orders.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred during bulk generation.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#0F766E] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-800/60 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Bulk Purchase Order Review</h2>
              <p className="text-xs text-teal-100/90">
                Review {selectedRecommendations.length} selected items to batch generate Purchase Orders by supplier
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier PO Grouping Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Purchase Orders to be Generated ({supplierGroups.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {supplierGroups.map((grp, idx) => (
                <div key={grp.supplierId || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0F766E]" />
                    <span className="font-bold text-sm text-slate-900">{grp.supplierName}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Items</div>
                      <div className="font-bold text-slate-800">{grp.itemCount} SKUs</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Units</div>
                      <div className="font-bold text-slate-800">{grp.totalUnits} pcs</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Estimated Value</div>
                      <div className="font-bold text-[#0F766E]">৳{grp.totalCostBDT.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Itemized Product List ({items.length})
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-center">Order Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {items.map((it, idx) => (
                    <tr key={it.recommendation.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{it.recommendation.productName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SKU: {it.recommendation.sku || 'N/A'}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{it.supplierName}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={it.orderQuantity}
                          onChange={e => handleUpdateItemQty(idx, Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ৳{it.unitPrice}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                        ৳{(it.orderQuantity * it.unitPrice).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Summary & Confirmation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div>
              <span className="text-slate-500">Total Units: </span>
              <strong className="text-slate-900 font-mono">{grandTotalUnits.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-500">Total Value: </span>
              <strong className="text-[#0F766E] text-base font-mono">৳{grandTotalCostBDT.toLocaleString()}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#0d645e] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing ? 'Generating POs...' : `Create ${supplierGroups.length} Separate PO(s)`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
