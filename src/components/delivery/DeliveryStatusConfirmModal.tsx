import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Order, DeliveryStatus } from '../../types';
import { Truck, CheckCircle2, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';

interface DeliveryStatusConfirmModalProps {
  order: Order | null;
  targetStatus: DeliveryStatus | null;
  onClose: () => void;
  onConfirm: (orderId: string, status: DeliveryStatus, options?: { failureReason?: string }) => Promise<void>;
}

export const DeliveryStatusConfirmModal: React.FC<DeliveryStatusConfirmModalProps> = ({
  order,
  targetStatus,
  onClose,
  onConfirm
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failureReason, setFailureReason] = useState('');

  if (!order || !targetStatus) return null;

  const getConfig = () => {
    switch (targetStatus) {
      case 'in_transit':
        return {
          title: 'Start Delivery Run',
          message: `Are you sure you want to start delivery for Order #${order.orderNumber}?`,
          detail: `This will mark consignment for ${order.shopName} (${order.area}) as In Transit.`,
          btnText: 'Confirm Start Delivery',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          icon: <Truck className="w-6 h-6 text-indigo-600" />
        };
      case 'delivered':
        return {
          title: 'Mark as Delivered',
          message: 'Are you sure you want to mark this order as Delivered?',
          detail: `Consignment #${order.orderNumber} for ${order.shopName} will be recorded as delivered.`,
          btnText: 'Confirm Delivered',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        };
      case 'failed':
        return {
          title: 'Mark Delivery Failed',
          message: 'Are you sure you want to mark this order as Delivery Failed?',
          detail: `Order #${order.orderNumber} for ${order.shopName} drop-off was unsuccessful.`,
          btnText: 'Confirm Delivery Failed',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
          icon: <XCircle className="w-6 h-6 text-rose-600" />
        };
      case 'returned':
        return {
          title: 'Mark as Returned',
          message: 'Are you sure you want to mark this order as Returned?',
          detail: `Order #${order.orderNumber} for ${order.shopName} will be marked as returned consignment.`,
          btnText: 'Confirm Mark Returned',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          icon: <RotateCcw className="w-6 h-6 text-amber-600" />
        };
      default:
        return {
          title: 'Update Delivery Status',
          message: `Are you sure you want to update status to ${targetStatus}?`,
          detail: `Order #${order.orderNumber}`,
          btnText: 'Confirm Update',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
          icon: <AlertTriangle className="w-6 h-6 text-blue-600" />
        };
    }
  };

  const config = getConfig();

  const handleConfirm = async () => {
    if (targetStatus === 'failed' && !failureReason.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(order.id, targetStatus, { failureReason: failureReason.trim() });
      setFailureReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = targetStatus !== 'failed' || failureReason.trim().length > 0;

  return (
    <Modal
      isOpen={!!order && !!targetStatus}
      onClose={onClose}
      title={config.title}
      subtitle={`Order #${order.orderNumber} • ${order.shopName}`}
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="shrink-0 p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
            {config.icon}
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="font-bold text-slate-900 text-sm">{config.message}</h4>
            <p className="text-slate-600 leading-relaxed">{config.detail}</p>
          </div>
        </div>

        {targetStatus === 'failed' && (
          <div className="space-y-1.5 p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl">
            <label className="block text-xs font-bold text-rose-900">
              Reason for Delivery Failure <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              placeholder="e.g., Customer shop closed, Customer rejected parcel, Customer unavailable by phone..."
              className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
              required
            />
            {failureReason.trim() === '' && (
              <p className="text-[11px] font-medium text-rose-600">
                A valid failure reason is required to mark delivery as failed.
              </p>
            )}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-600 space-y-1 text-[11px]">
          <span className="font-semibold text-slate-800 block">Verification Summary:</span>
          <p>• Retail Shop: <span className="font-bold text-slate-900">{order.shopName}</span> ({order.ownerName})</p>
          <p>• Address: <span className="font-medium text-slate-800">{order.address}, {order.area}</span></p>
          <p>• Order Total: <span className="font-bold text-slate-900">{order.grandTotal || order.totalAmount} BDT</span></p>
        </div>

        <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !isFormValid}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${config.btnClass}`}
          >
            {isSubmitting ? 'Updating...' : config.btnText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
