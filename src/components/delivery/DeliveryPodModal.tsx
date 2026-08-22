import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { CheckCircle2, AlertCircle, ShieldCheck, UserCheck, FileText, MapPin, Phone, Calendar } from 'lucide-react';

interface DeliveryPodModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeliveryPodModal: React.FC<DeliveryPodModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess
}) => {
  const { submitProofOfDelivery } = useApp();

  const [receivedBy, setReceivedBy] = useState('');
  const [podNotes, setPodNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentTimestamp, setCurrentTimestamp] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReceivedBy('');
      setPodNotes('');
      setIsConfirming(false);
      setIsSubmitting(false);
      setErrorMessage(null);
      setCurrentTimestamp(new Date().toLocaleString('en-BD', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }));
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const validate = (): string | null => {
    if (!receivedBy.trim()) {
      return 'Receiver name is required.';
    }
    if (order.deliveryStatus === 'delivered') {
      return 'This order has already been marked as Delivered.';
    }
    if (order.deliveryStatus !== 'in_transit') {
      return 'Only orders currently In Transit can be marked as Delivered. Please start delivery first.';
    }
    return null;
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setErrorMessage(err);
      return;
    }
    setErrorMessage(null);
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    const err = validate();
    if (err) {
      setErrorMessage(err);
      setIsConfirming(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitProofOfDelivery(order.id, receivedBy.trim(), podNotes.trim());
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to record Proof of Delivery.');
        setIsConfirming(false);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred during POD submission.');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Proof of Delivery (POD) Confirmation"
      subtitle={`Order #${order.orderNumber} • ${order.shopName}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-rose-900 block text-xs">Delivery Confirmation Error</span>
              <p className="text-[11px] text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Customer & Order Logistics Info Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer / Retail Shop</span>
              <span className="font-bold text-slate-900 block text-sm">{order.shopName}</span>
              <span className="text-[11px] text-slate-600 block">Proprietor: {order.ownerName || order.customerName}</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-semibold">{order.phone || order.customerPhone || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{order.address || order.customerAddress}, {order.area}, {order.district}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Delivery Timestamp: <span className="font-bold text-slate-900">{currentTimestamp}</span>
            </span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Current Status: {order.deliveryStatus ? order.deliveryStatus.toUpperCase().replace('_', ' ') : 'IN TRANSIT'}
            </span>
          </div>
        </div>

        {!isConfirming ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            
            {/* Receiver Name (Mandatory) */}
            <div>
              <label className="font-bold text-slate-800 block mb-1">
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
                  placeholder="Full name of person receiving parcel (e.g., Shop Owner / Manager)"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Required field to verify physical drop-off acknowledgment.</p>
            </div>

            {/* Delivery Notes (Optional) */}
            <div>
              <label className="font-bold text-slate-800 block mb-1">
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
                  placeholder="e.g., Handed to shop manager Mr. Karim, verified package count in good condition"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Delivered</span>
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Prompt */
          <div className="space-y-4 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-950 text-sm">
                  Confirm delivery for Order #{order.orderNumber}?
                </h4>
                <p className="text-emerald-800 text-[11px]">
                  This will record Proof of Delivery in Firestore and update the order status to Delivered.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-1.5 text-[11px] text-slate-700">
              <p>• Shop: <span className="font-bold text-slate-900">{order.shopName}</span></p>
              <p>• Received By: <span className="font-extrabold text-emerald-900">{receivedBy}</span></p>
              <p>• Delivery Timestamp: <span className="font-bold text-slate-900">{currentTimestamp}</span></p>
              {podNotes.trim() && (
                <p>• Notes: <span className="font-medium text-slate-800 italic">"{podNotes.trim()}"</span></p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Back / Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? 'Recording Delivery...' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
