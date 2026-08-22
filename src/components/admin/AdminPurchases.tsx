import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseBill, PurchaseItem } from '../../types';
import { Modal } from '../shared/Modal';
import { DateRangeFilter } from '../shared/DateRangeFilter';
import { DateRangeState, DEFAULT_DATE_RANGE, isWithinDateRange } from '../../lib/dateUtils';
import { 
  ShoppingBag, 
  PlusCircle, 
  Search, 
  Boxes, 
  DollarSign, 
  FileText,
  Calendar,
  Building,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../shared/Badge';

export const AdminPurchases: React.FC = () => {
  const { purchases, products, addPurchase, formatBDT } = useApp();

  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeState>(DEFAULT_DATE_RANGE);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<PurchaseBill | null>(null);

  // Form State
  const [supplierName, setSupplierName] = useState('Bangkok Glow Import Logistics');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('IMP-BKK-8891');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(100);
  const [unitCost, setUnitCost] = useState<number>(products[0]?.purchasePrice || 350);
  const [paidAmount, setPaidAmount] = useState<number>(35000);
  const [notes, setNotes] = useState('Customs cleared at Chittagong Port.');

  const totalPurchasesVolume = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  const handleProductSelect = (pId: string) => {
    setSelectedProductId(pId);
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setUnitCost(prod.purchasePrice);
    }
  };

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const totalAmount = quantity * unitCost;
    const now = new Date().toISOString().split('T')[0];
    const dueAmount = Math.max(0, totalAmount - paidAmount);

    const purchaseItem: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      totalCost: totalAmount
    };

    addPurchase({
      supplierName,
      supplierInvoiceNo,
      purchaseDate: now,
      items: [purchaseItem],
      totalAmount,
      paidAmount: Number(paidAmount),
      dueAmount,
      paymentStatus: dueAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      notes
    });

    setIsAddModalOpen(false);
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.billNumber.toLowerCase().includes(search.toLowerCase()) ||
                          p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
                          p.supplierInvoiceNo.toLowerCase().includes(search.toLowerCase());
    const matchesDate = isWithinDateRange(p.purchaseDate, dateRange);
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Purchase & Stock In Bills</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {purchases.length} Purchase Invoices
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Log supplier shipments, update warehouse inventory stock, and track accounts payable.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Inward Stock Bill</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Inward Stock Cost</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(totalPurchasesVolume)}</div>
          <span className="text-[11px] text-slate-500">Cumulative supplier procurement</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Supplier Paid</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {formatBDT(purchases.reduce((sum, p) => sum + p.paidAmount, 0))}
          </div>
          <span className="text-[11px] text-slate-500">Remitted via LC & Bank Transfer</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Accounts Payable Due</span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">
            {formatBDT(purchases.reduce((sum, p) => sum + p.dueAmount, 0))}
          </div>
          <span className="text-[11px] text-slate-500">Outstanding supplier balances</span>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Bill # or Supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            totalCount={purchases.length}
            filteredCount={filteredPurchases.length}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Bill # & Supplier</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Items Received</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Paid Amount</th>
                <th className="py-3 px-4 text-right">Supplier Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map(bill => (
                <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 block">{bill.billNumber}</span>
                    <span className="text-[11px] text-slate-500">{bill.supplierName} ({bill.supplierInvoiceNo})</span>
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {bill.purchaseDate}
                  </td>

                  <td className="py-3 px-4">
                    {bill.items.map((it, i) => (
                      <span key={i} className="font-medium text-slate-800 block">
                        {it.productName} (<span className="font-bold text-rose-700">+{it.quantity}</span> pcs @ {formatBDT(it.unitCost)})
                      </span>
                    ))}
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatBDT(bill.totalAmount)}
                  </td>

                  <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                    {formatBDT(bill.paidAmount)}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <span className={`font-extrabold ${bill.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {formatBDT(bill.dueAmount)}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <Badge status={bill.paymentStatus} size="sm" />
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setViewingBill(bill)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inward Stock Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Inward Stock / Purchase Bill"
        subtitle="Receipt from manufacturer, importer, or local vendor (adds directly to stock)"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Supplier / Vendor Name *</label>
            <input
              type="text"
              required
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Supplier Invoice / LC Ref #</label>
            <input
              type="text"
              value={supplierInvoiceNo}
              onChange={e => setSupplierInvoiceNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Product Inflow Specifications</span>
            
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Select Catalog SKU to Restock *</label>
              <select
                value={selectedProductId}
                onChange={e => handleProductSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Current: {p.currentStock} pcs</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Received Quantity (Units) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Unit Purchase Cost (৳) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={unitCost}
                  onChange={e => setUnitCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">Total Purchase Value:</span>
              <span className="font-bold text-slate-900 text-sm">{formatBDT(quantity * unitCost)}</span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Advance / Paid Amount (৳)</label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={e => setPaidAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-emerald-700"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Notes / Warehouse Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
            >
              Confirm & Replenish Stock
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
