import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { useApp } from '../../context/AppContext';
import { Order, Customer, PaymentMethodOption } from '../../types';
import { Banknote, CheckCircle2, AlertCircle, ShieldCheck, Wallet, ArrowRight } from 'lucide-react';

interface DeliveryPaymentModalProps {
  isOpen: boolean;
  order: Order | null;
  customer?: Customer | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeliveryPaymentModal: React.FC<DeliveryPaymentModalProps> = ({
  isOpen,
  order,
  customer: providedCustomer,
  onClose,
  onSuccess
}) => {
  const { customers, recordPayment, formatBDT } = useApp();

  // Find target customer
  const targetCustomerId = order?.customerId || providedCustomer?.id || '';
  const matchedCustomer = customers.find(c => c.id === targetCustomerId) || providedCustomer;

  // Calculation values
  const grandTotal = Math.round(Number(order?.grandTotal || order?.totalAmount) || 0);
  const paidAmount = Math.round(Number(order?.paidAmount) || 0);
  const remainingOrderDue = Math.max(0, grandTotal - paidAmount);
  const customerCurrentDue = Math.round(Number(matchedCustomer?.currentDue) || 0);

  // Form states
  const [paymentType, setPaymentType] = useState<'Order Payment' | 'Due Collection'>(
    remainingOrderDue > 0 ? 'Order Payment' : 'Due Collection'
  );

  const initialAmount = paymentType === 'Order Payment' ? remainingOrderDue : customerCurrentDue;
  const [amount, setAmount] = useState<number | ''>(initialAmount > 0 ? initialAmount : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('Cash');
  const [notes, setNotes] = useState('');

  // Confirmation step state
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When modal or type changes, update default amount
  React.useEffect(() => {
    if (paymentType === 'Order Payment') {
      setAmount(remainingOrderDue > 0 ? remainingOrderDue : '');
    } else {
      setAmount(customerCurrentDue > 0 ? customerCurrentDue : '');
    }
    setErrorMessage(null);
    setIsConfirming(false);
  }, [paymentType, remainingOrderDue, customerCurrentDue, isOpen]);

  if (!isOpen) return null;

  const numAmount = Math.round(Number(amount) || 0);

  // Validation logic
  const maxAllowedAmount = paymentType === 'Order Payment' ? remainingOrderDue : customerCurrentDue;

  const validateInput = (): string | null => {
    if (isNaN(numAmount) || numAmount <= 0) {
      return 'Collection amount must be greater than ৳0.';
    }
    if (paymentType === 'Order Payment') {
      if (order?.orderStatus === 'cancelled') {
        return 'Cannot collect payment for a cancelled order.';
      }
      if (order?.orderStatus === 'returned') {
        return 'Cannot collect payment for a returned order.';
      }
      if (remainingOrderDue <= 0) {
        return 'This order has ৳0 remaining due.';
      }
      if (numAmount > remainingOrderDue) {
        return `Order payment (৳${numAmount.toLocaleString()}) cannot exceed remaining order due (৳${remainingOrderDue.toLocaleString()}).`;
      }
    } else {
      if (customerCurrentDue <= 0) {
        return 'Customer has ৳0 outstanding due balance.';
      }
      if (numAmount > customerCurrentDue) {
        return `Due collection (৳${numAmount.toLocaleString()}) cannot exceed customer current due (৳${customerCurrentDue.toLocaleString()}).`;
      }
    }
    return null;
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateInput();
    if (error) {
      setErrorMessage(error);
      return;
    }
    setErrorMessage(null);
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    const error = validateInput();
    if (error) {
      setErrorMessage(error);
      setIsConfirming(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Create a deterministic idempotency key for network retry protection
    const timestamp = Date.now();
    const referenceTag = order ? `ORD-${order.id}` : `CUST-${targetCustomerId}`;
    const idempotencyKey = `PAY-IDEM-${referenceTag}-${numAmount}-${timestamp}`;

    try {
      const res = await recordPayment({
        customerId: targetCustomerId,
        customerName: matchedCustomer?.shopName || order?.shopName || 'Retail Customer',
        amount: numAmount,
        paymentMethod,
        paymentType,
        orderId: paymentType === 'Order Payment' ? order?.id : null,
        orderNumber: paymentType === 'Order Payment' ? order?.orderNumber : null,
        notes: notes.trim() || `Delivery Collection via ${paymentMethod}`
      });

      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to process delivery collection.');
        setIsConfirming(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during payment processing.');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delivery Payment Collection"
      subtitle={order ? `Order #${order.orderNumber} • ${order.shopName}` : matchedCustomer?.shopName || 'Retail Customer'}
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs">
        
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-rose-900 block text-xs">Validation / Collection Error</span>
              <p className="text-[11px] text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Financial Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Retail Shop</span>
            <span className="font-bold text-slate-900 block truncate">{matchedCustomer?.shopName || order?.shopName || 'N/A'}</span>
            <span className="text-[10px] text-slate-500">{matchedCustomer?.ownerName || order?.ownerName}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Total</span>
            <span className="font-mono font-bold text-slate-900 block">{order ? formatBDT(grandTotal) : 'N/A'}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Paid: {order ? formatBDT(paidAmount) : 'N/A'}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Order Due</span>
            <span className="font-mono font-extrabold text-rose-600 block">{order ? formatBDT(remainingOrderDue) : 'N/A'}</span>
            <span className="text-[10px] text-slate-400">Order #{order?.orderNumber || '-'}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Current Due</span>
            <span className="font-mono font-extrabold text-amber-700 block">{formatBDT(customerCurrentDue)}</span>
            <span className="text-[10px] text-slate-400">Total Outstanding</span>
          </div>
        </div>

        {!isConfirming ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            
            {/* Payment Type Selection */}
            <div>
              <label className="font-bold text-slate-800 block mb-1.5">Select Collection Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!order || remainingOrderDue <= 0}
                  onClick={() => setPaymentType('Order Payment')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentType === 'Order Payment'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white'
                  }`}
                >
                  <span className="font-bold block text-xs">Order Payment</span>
                  <span className="text-[11px] opacity-80 block">
                    Collect against Order #{order?.orderNumber || 'N/A'} (Max: {formatBDT(remainingOrderDue)})
                  </span>
                </button>

                <button
                  type="button"
                  disabled={customerCurrentDue <= 0}
                  onClick={() => setPaymentType('Due Collection')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentType === 'Due Collection'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white'
                  }`}
                >
                  <span className="font-bold block text-xs">Customer Due Collection</span>
                  <span className="text-[11px] opacity-80 block">
                    Collect outstanding customer ledger due (Max: {formatBDT(customerCurrentDue)})
                  </span>
                </button>
              </div>
            </div>

            {/* Collection Amount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-800">Amount Collected (৳) *</label>
                <span className="text-[11px] font-semibold text-slate-500">
                  Maximum allowed: <span className="font-bold text-emerald-700">{formatBDT(maxAllowedAmount)}</span>
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-bold text-slate-400">
                  ৳
                </div>
                <input
                  type="number"
                  min="1"
                  max={maxAllowedAmount}
                  required
                  value={amount}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : Math.round(Number(e.target.value));
                    setAmount(val);
                  }}
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-extrabold text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={`Enter amount in Taka (e.g., ${maxAllowedAmount})`}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethodOption)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Cash">Cash (Collected on Spot)</option>
                  <option value="bKash">Mobile Banking - bKash</option>
                  <option value="Nagad">Mobile Banking - Nagad</option>
                  <option value="Bank Transfer">Bank Wire / Cheque</option>
                  <option value="Other">Other Gateway</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Remarks / Note</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Driver pouch cash, bKash TXN ID"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
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
                <Banknote className="w-4 h-4" />
                <span>Review Collection (৳{numAmount ? numAmount.toLocaleString() : '0'})</span>
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Screen */
          <div className="space-y-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-950 text-sm">
                  Confirm collection of {formatBDT(numAmount)}?
                </h4>
                <p className="text-amber-800 text-[11px]">
                  This will atomically write a payment voucher and credit customer ledger in Firestore.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-1.5 text-[11px] text-slate-700">
              <p>• Shop: <span className="font-bold text-slate-900">{matchedCustomer?.shopName || order?.shopName}</span></p>
              <p>• Type: <span className="font-bold text-slate-900">{paymentType}</span> {order ? `(Order #${order.orderNumber})` : ''}</p>
              <p>• Method: <span className="font-bold text-emerald-800">{paymentMethod}</span></p>
              <p>• Amount: <span className="font-extrabold text-emerald-700 text-xs">{formatBDT(numAmount)}</span></p>
              {paymentType === 'Order Payment' && order && (
                <p>• Remaining Order Due After Payment: <span className="font-bold text-slate-900">{formatBDT(Math.max(0, remainingOrderDue - numAmount))}</span></p>
              )}
              <p>• Customer Current Due After Payment: <span className="font-bold text-slate-900">{formatBDT(Math.max(0, customerCurrentDue - numAmount))}</span></p>
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
                {isSubmitting ? 'Processing Transaction...' : 'Confirm & Save Payment'}
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
