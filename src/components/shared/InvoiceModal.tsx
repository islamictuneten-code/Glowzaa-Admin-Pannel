import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from './Modal';
import { DeliveryPaymentModal } from '../delivery/DeliveryPaymentModal';
import { 
  Printer, 
  Download, 
  Sparkles, 
  Building2, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote
} from 'lucide-react';

export const InvoiceModal: React.FC = () => {
  const { viewingOrder, setViewingOrder, formatBDT, deliveryHistory } = useApp();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  if (!viewingOrder) return null;

  const orderHistory = (deliveryHistory || [])
    .filter(h => h.orderId === viewingOrder.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Modal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        title={`Commercial Wholesale Invoice: ${viewingOrder.orderNumber}`}
        subtitle={`Customer: ${viewingOrder.shopName}`}
        maxWidth="3xl"
      >
        <div className="space-y-6 text-slate-800 text-xs">
          
          {/* Actions header */}
          <div className="flex justify-end items-center gap-2 pb-3 border-b border-slate-200 print:hidden">
            {viewingOrder.orderStatus !== 'cancelled' && viewingOrder.orderStatus !== 'returned' && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs"
              >
                <Banknote className="w-3.5 h-3.5" />
                Collect Payment
              </button>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print Challan & Invoice
            </button>
          </div>

        {/* Invoice Printable Sheet */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-xs print:border-none print:p-0">
          
          {/* Top Brand Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">GLOWZAA</h1>
                  <p className="text-[10px] text-[#087F7A] font-bold tracking-wider uppercase">Brand Distribution & Wholesale</p>
                </div>
              </div>
              
              <div className="mt-3 space-y-0.5 text-slate-500 text-[11px]">
                <p>Corporate Warehouse & Head Office Hub</p>
                <p>Shailkupa Head Office, Jhenaidah, Bangladesh</p>
                <p>Hotline: +880 9612-456999 | Email: wholesale@glowzaa.com</p>
                <p>BIN / Trade License: 004910294-0101 (VAT Compliant)</p>
              </div>
            </div>

            <div className="text-right sm:self-center bg-slate-50 p-4 rounded-xl border border-slate-200 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Wholesale Invoice #</span>
              <span className="text-base font-mono font-bold text-slate-900">{viewingOrder.orderNumber}</span>
              <div className="mt-2 text-[11px] text-slate-600 space-y-0.5">
                <p><span className="text-slate-400">Date:</span> {viewingOrder.createdDate || (viewingOrder.createdAt ? new Date(viewingOrder.createdAt).toISOString().split('T')[0] : 'Today')}</p>
                <p><span className="text-slate-400">Payment:</span> <span className="font-semibold">{viewingOrder.paymentMethod || 'Cash'}</span></p>
                <p>
                  <span className="text-slate-400">Delivery:</span>{' '}
                  <span className="capitalize font-semibold text-blue-600">{(viewingOrder.deliveryStatus || 'pending').replace('_', ' ')}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Billed To & Logistics Dispatch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                Billed To (Retail Shop):
              </span>
              <h3 className="font-bold text-slate-900 text-sm">{viewingOrder.shopName}</h3>
              <p className="text-slate-600 text-xs">Proprietor: {viewingOrder.ownerName || viewingOrder.customerName}</p>
              <p className="text-slate-500 text-xs mt-1">{viewingOrder.address || viewingOrder.customerAddress}</p>
              <p className="text-slate-500 text-xs">{viewingOrder.area}, {viewingOrder.district}</p>
              <p className="text-slate-700 text-xs font-medium mt-1">Phone: {viewingOrder.phone || viewingOrder.customerPhone}</p>
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                Distribution & Field Staff:
              </span>
              <div className="space-y-1 text-xs text-slate-700">
                <p><span className="text-slate-500">Sales Officer:</span> <span className="font-semibold text-slate-900">{viewingOrder.salesSellerName || viewingOrder.salesUserName || 'Sales Desk'}</span></p>
                <p><span className="text-slate-500">Courier / Driver:</span> <span className="font-semibold text-slate-900">{viewingOrder.deliveryStaffName || 'Unassigned'}</span></p>
                {viewingOrder.assignedAt && (
                  <p><span className="text-slate-500">Assigned At:</span> <span className="font-mono text-slate-800">{new Date(viewingOrder.assignedAt).toLocaleString('en-BD')}</span> ({viewingOrder.assignedByName || 'Admin'})</p>
                )}
                {viewingOrder.failureReason && (
                  <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px] space-y-0.5">
                    <p className="font-bold flex items-center gap-1 text-rose-800">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Delivery Failure Info:
                    </p>
                    <p><span className="font-medium text-rose-700">Reason:</span> {viewingOrder.failureReason}</p>
                    {viewingOrder.failedAt && <p><span className="font-medium text-rose-700">Failed At:</span> {new Date(viewingOrder.failedAt).toLocaleString('en-BD')}</p>}
                    <p><span className="font-medium text-rose-700">Attempts:</span> {viewingOrder.deliveryAttemptCount || 1}</p>
                  </div>
                )}
                {viewingOrder.notes && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">Note: {viewingOrder.notes}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">SL</th>
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Wholesale Rate</th>
                  <th className="py-2.5 px-3 text-right">MRP (Pcs)</th>
                  <th className="py-2.5 px-3 text-right">Total (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(viewingOrder.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 block">{item.productName}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{item.category || 'Beauty & Cosmetics'}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'pcs'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-slate-900 block">{item.orderedQuantity ?? item.quantity}</span>
                      {item.deliveredQuantity !== undefined && item.deliveredQuantity > 0 && (
                        <span className="text-[10px] text-emerald-700 block font-medium">
                          Delivered: {item.deliveredQuantity}
                        </span>
                      )}
                      {item.remainingQuantity !== undefined && item.remainingQuantity > 0 && (
                        <span className="text-[10px] text-amber-700 block font-medium">
                          Remaining: {item.remainingQuantity}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatBDT(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{formatBDT(item.mrp || item.unitPrice * 1.3)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatBDT(item.subtotal || item.totalPrice || (item.quantity * item.unitPrice))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="w-full sm:w-1/2 space-y-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Terms & Remittance Notice:</span>
                <p>1. Please inspect cartons and barcode tamper-proof seals upon delivery.</p>
                <p>2. Payment due within invoice credit limit days. bKash Merchant: 01711-294820 (Counter 1).</p>
                <p>3. Damage or discrepancy claims must be logged within 24 hours.</p>
              </div>

              {viewingOrder.receivedBy && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center justify-between pb-1 border-b border-emerald-200/80">
                    <div className="flex items-center gap-1 font-extrabold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Proof of Delivery (POD)
                    </div>
                    {viewingOrder.deliveryDate && (
                      <span className="text-[10px] font-semibold text-emerald-700">
                        {new Date(viewingOrder.deliveryDate).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  <p><span className="text-emerald-700 font-medium">Received By:</span> <span className="font-bold text-emerald-950">{viewingOrder.receivedBy}</span></p>
                  {viewingOrder.podNotes && <p className="text-[11px] text-emerald-800 italic">"Notes: {viewingOrder.podNotes}"</p>}
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-semibold">{formatBDT(viewingOrder.subtotal)}</span>
              </div>
              
              {(viewingOrder.discount || viewingOrder.totalDiscount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Wholesale Discount:</span>
                  <span className="font-semibold">-{formatBDT(viewingOrder.discount || viewingOrder.totalDiscount || 0)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Net Payable Amount:</span>
                <span className="text-rose-600 font-extrabold">{formatBDT(viewingOrder.totalAmount || viewingOrder.grandTotal || 0)}</span>
              </div>

              <div className="border-t border-slate-200/80 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Paid / Advance:</span>
                  <span className="font-semibold text-emerald-700">{formatBDT(viewingOrder.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700">
                  <span>Remaining Due:</span>
                  <span>{formatBDT(viewingOrder.dueAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery History Log */}
          {orderHistory.length > 0 && (
            <div className="pt-4 border-t border-slate-200 print:hidden">
              <h4 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Delivery Audit & Status History Trail
              </h4>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Status Transition</th>
                      <th className="py-2 px-3">Assigned / Driver</th>
                      <th className="py-2 px-3">Performed By</th>
                      <th className="py-2 px-3">Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {orderHistory.map((h) => (
                      <tr key={h.id || h.historyId}>
                        <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(h.createdAt).toLocaleString('en-BD', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2 px-3 font-semibold capitalize">
                          <span className="text-slate-400">{h.previousStatus.replace('_', ' ')}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className={h.newStatus === 'delivered' ? 'text-emerald-700 font-bold' : h.newStatus === 'failed' ? 'text-rose-700 font-bold' : 'text-slate-900'}>
                            {h.newStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-800">{h.deliveryStaffName || '-'}</td>
                        <td className="py-2 px-3 text-slate-800">{h.performedByName || 'Staff'}</td>
                        <td className="py-2 px-3 text-slate-600 italic">{h.failureReason || h.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signature lines */}
          <div className="pt-10 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-400 border-t border-slate-200">
            <div>
              <div className="border-b border-slate-300 w-32 mx-auto mb-1"></div>
              <span>Prepared By (Sales)</span>
            </div>
            <div>
              <div className="border-b border-slate-300 w-32 mx-auto mb-1"></div>
              <span>Dispatched (Warehouse)</span>
            </div>
            <div>
              <div className="border-b border-slate-300 w-32 mx-auto mb-1"></div>
              <span>Customer / Shop Receiver</span>
            </div>
          </div>

        </div>

      </div>
    </Modal>

    <DeliveryPaymentModal
      isOpen={isPaymentModalOpen}
      order={viewingOrder}
      onClose={() => setIsPaymentModalOpen(false)}
    />
  </>
  );
};
