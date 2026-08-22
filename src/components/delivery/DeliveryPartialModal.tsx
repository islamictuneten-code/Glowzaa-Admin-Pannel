import React, { useState } from 'react';
import { 
  CheckCircle2, 
  X, 
  UserCheck, 
  FileText, 
  Package, 
  AlertCircle, 
  Calendar, 
  Building2, 
  MapPin, 
  Phone, 
  ShieldCheck,
  CheckSquare,
  MinusCircle,
  PlusCircle
} from 'lucide-react';
import { Modal } from '../shared/Modal';
import { Order, OrderItem } from '../../types';
import { useApp } from '../../context/AppContext';

interface DeliveryPartialModalProps {
  order: Order;
  onClose: () => void;
}

export const DeliveryPartialModal: React.FC<DeliveryPartialModalProps> = ({ order, onClose }) => {
  const { submitPartialDelivery } = useApp();

  // Initialize input state for newly delivered quantity per SKU
  const [newDeliveries, setNewDeliveries] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    order.items.forEach(item => {
      const orderedQty = item.orderedQuantity ?? item.quantity;
      const deliveredQty = item.deliveredQuantity ?? 0;
      const remainingQty = Math.max(0, orderedQty - deliveredQty);
      // Default input to full remaining quantity for quick 1-click delivery
      initial[item.sku] = remainingQty;
    });
    return initial;
  });

  const [receivedBy, setReceivedBy] = useState<string>(order.receivedBy || order.ownerName || '');
  const [podNotes, setPodNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // Compute metrics across order
  const itemAnalysis = order.items.map(item => {
    const orderedQty = item.orderedQuantity ?? item.quantity;
    const prevDelivered = item.deliveredQuantity ?? 0;
    const prevRemaining = Math.max(0, orderedQty - prevDelivered);
    const newlyDelivered = Math.max(0, newDeliveries[item.sku] ?? 0);
    const finalDelivered = prevDelivered + newlyDelivered;
    const finalRemaining = Math.max(0, orderedQty - finalDelivered);

    return {
      item,
      orderedQty,
      prevDelivered,
      prevRemaining,
      newlyDelivered,
      finalDelivered,
      finalRemaining
    };
  });

  const totalNewlyDelivered = itemAnalysis.reduce((acc, curr) => acc + curr.newlyDelivered, 0);
  const totalFinalRemaining = itemAnalysis.reduce((acc, curr) => acc + curr.finalRemaining, 0);
  const isWillBeFullyDelivered = totalFinalRemaining === 0;

  const handleQuantityChange = (sku: string, val: number, maxAllowed: number) => {
    if (errorMessage) setErrorMessage(null);
    const sanitized = Math.min(Math.max(0, isNaN(val) ? 0 : val), maxAllowed);
    setNewDeliveries(prev => ({
      ...prev,
      [sku]: sanitized
    }));
  };

  const handleQuickFillAll = (mode: 'full' | 'zero') => {
    if (errorMessage) setErrorMessage(null);
    const updated: Record<string, number> = {};
    order.items.forEach(item => {
      const orderedQty = item.orderedQuantity ?? item.quantity;
      const deliveredQty = item.deliveredQuantity ?? 0;
      const remainingQty = Math.max(0, orderedQty - deliveredQty);
      updated[item.sku] = mode === 'full' ? remainingQty : 0;
    });
    setNewDeliveries(updated);
  };

  const validateInputs = (): boolean => {
    if (!receivedBy.trim()) {
      setErrorMessage('Please enter the name of the person receiving the packages.');
      return false;
    }

    if (totalNewlyDelivered <= 0) {
      setErrorMessage('At least one item must have a delivered quantity greater than 0.');
      return false;
    }

    for (const item of itemAnalysis) {
      if (item.newlyDelivered > item.prevRemaining) {
        setErrorMessage(
          `Delivered quantity for ${item.item.productName} cannot exceed remaining quantity (${item.prevRemaining}).`
        );
        return false;
      }
    }

    setErrorMessage(null);
    return true;
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateInputs()) {
      setIsConfirming(true);
    }
  };

  const handleFinalSubmit = async () => {
    if (!validateInputs()) return;

    setIsSubmitting(true);
    try {
      const payload = itemAnalysis.map(i => ({
        productId: i.item.productId,
        sku: i.item.sku,
        newlyDeliveredQuantity: i.newlyDelivered
      }));

      const res = await submitPartialDelivery(order.id, payload, {
        receivedBy: receivedBy.trim(),
        podNotes: podNotes.trim()
      });

      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to record delivery.');
        setIsConfirming(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing delivery.');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTimestamp = new Date().toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Modal isOpen={true} onClose={onClose} title={`Record Delivery - Order #${order.orderNumber}`}>
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Consignment Header Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>{order.shopName}</span>
              <span className="text-slate-400">({order.ownerName})</span>
            </div>
            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              #{order.orderNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{order.phone || order.customerPhone}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{order.address || order.customerAddress}, {order.area}</span>
            </div>
          </div>
        </div>

        {/* Quick Fill Controls & Mode Indicator */}
        <div className="flex items-center justify-between gap-2 bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
            <Package className="w-4 h-4 text-purple-600" />
            <span>Item Delivery Breakdown</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFillAll('full')}
              className="px-2.5 py-1 bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 font-semibold rounded-lg text-[11px] transition-colors"
            >
              Fill All Available
            </button>
            <button
              type="button"
              onClick={() => handleQuickFillAll('zero')}
              className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg text-[11px] transition-colors"
            >
              Reset 0
            </button>
          </div>
        </div>

        {/* Item Quantity Input Cards */}
        <div className="space-y-2">
          {itemAnalysis.map(({ item, orderedQty, prevDelivered, prevRemaining, newlyDelivered, finalRemaining }) => {
            const isFullyDeliveredItem = finalRemaining === 0;

            return (
              <div 
                key={item.sku}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-purple-200 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{item.productName}</h5>
                    <span className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold text-slate-800">Ordered: {orderedQty}</span>
                    {prevDelivered > 0 && (
                      <div className="text-[10px] text-emerald-700 font-semibold">
                        Previously Delivered: {prevDelivered}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-[11px] text-slate-600">
                    <span>Available Remaining: </span>
                    <strong className="text-purple-900 font-extrabold">{prevRemaining}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Delivering Now:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.sku, newlyDelivered - 1, prevRemaining)}
                        disabled={newlyDelivered <= 0}
                        className="p-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min={0}
                        max={prevRemaining}
                        value={newlyDelivered}
                        onChange={e => handleQuantityChange(item.sku, parseInt(e.target.value, 10), prevRemaining)}
                        className="w-16 text-center py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                      />

                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.sku, newlyDelivered + 1, prevRemaining)}
                        disabled={newlyDelivered >= prevRemaining}
                        className="p-1 rounded bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-slate-500">
                    New Total Delivered: <strong className="text-slate-900">{prevDelivered + newlyDelivered} / {orderedQty}</strong>
                  </span>
                  <span className={`font-semibold ${isFullyDeliveredItem ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isFullyDeliveredItem ? '✓ Fully Delivered' : `Remaining after this: ${finalRemaining}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Outcome Badge */}
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
          isWillBeFullyDelivered 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2 font-bold">
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>Target Delivery Outcome:</span>
          </div>
          <span className="font-extrabold px-2.5 py-0.5 rounded-md bg-white border shadow-2xs">
            {isWillBeFullyDelivered ? 'FULL DELIVERY (DELIVERED)' : 'PARTIAL DELIVERY (PARTIALLY DELIVERED)'}
          </span>
        </div>

        {!isConfirming ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-3 pt-2 border-t border-slate-200">
            {/* Receiver Name */}
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">
                Receiver Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={receivedBy}
                  onChange={e => {
                    setReceivedBy(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Name of person receiving parcel (e.g. Shop Manager / Owner)"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 text-slate-900"
                />
              </div>
            </div>

            {/* Delivery Notes */}
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">
                Delivery Notes <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <textarea
                  rows={2}
                  value={podNotes}
                  onChange={e => setPodNotes(e.target.value)}
                  placeholder="e.g. Partial delivery approved by shop owner due to carton space limit"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Review & Save Delivery</span>
              </button>
            </div>
          </form>
        ) : (
          /* Final Confirmation Review */
          <div className="space-y-4 p-4 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-purple-950 text-sm">
                  Confirm {isWillBeFullyDelivered ? 'Full' : 'Partial'} Delivery for Order #{order.orderNumber}?
                </h4>
                <p className="text-purple-800 text-[11px]">
                  This will record delivery history in Firestore and update the order status to {isWillBeFullyDelivered ? 'Delivered' : 'Partially Delivered'}.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-purple-200 space-y-1 text-slate-700">
              <p>• Shop: <span className="font-bold text-slate-900">{order.shopName}</span></p>
              <p>• Receiver: <span className="font-extrabold text-purple-900">{receivedBy}</span></p>
              <p>• Delivered Items: <span className="font-bold text-slate-900">{totalNewlyDelivered} units delivering now</span></p>
              <p>• Remaining Balance: <span className="font-bold text-slate-900">{totalFinalRemaining} units remaining for retry</span></p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Edit Quantities
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? 'Recording Delivery...' : 'Confirm Delivery Record'}
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
