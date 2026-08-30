import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, OrderItem, PaymentMethod, ProductCategory } from '../../types';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  MapPin, 
  CreditCard, 
  AlertTriangle, 
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Shield,
  Lock,
  X
} from 'lucide-react';
import { Badge } from '../shared/Badge';
import { 
  checkOrderCreditEligibility, 
  getCreditUtilizationInfo,
  calculateCustomerRisk 
} from '../../utils/creditEngine';
import { formatBDT } from '../../utils/formatters';

export const SalesNewOrder: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    products, 
    customers, 
    categories, 
    currentSalesUser, 
    createOrder, 
    setSalesTab, 
    formatBDT: fmtBDT,
    addToast
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Commercial Billing details
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('Deliver before 5 PM to shop counter.');

  // Admin Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [warningConfirmed, setWarningConfirmed] = useState(false);

  const filteredCustomers = customers.filter(c => 
    (c.shopName || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.ownerName || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch) ||
    (c.district || '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || filteredCustomers[0];

  // Available catalog products for order
  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
                          (p.sku || '').toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory && p.currentStock > 0;
  });

  // Calculate Order Totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.subtotal || item.totalPrice || (item.quantity * item.unitPrice)), 0);
  const discountAmount = Math.round(subtotal * (discountPct / 100));
  const netTotal = Math.max(0, subtotal - discountAmount);
  const dueAmount = Math.max(0, netTotal - paidAmount);

  // Credit Engine Eligibility Evaluation
  const orderCreditDue = Math.max(0, netTotal - (Number(paidAmount) || 0));
  const creditCheck = selectedCustomer 
    ? checkOrderCreditEligibility(selectedCustomer, orderCreditDue, isAdmin)
    : {
        allowed: true,
        requiresAdminOverride: false,
        requiresWarningConfirmation: false,
        mode: 'NONE' as const,
        isCreditHold: false,
        creditLimit: 0,
        currentDue: 0,
        availableCredit: 0,
        newOrderDueAmount: 0,
        projectedDue: 0,
        excessAmount: 0
      };

  const customerCreditInfo = selectedCustomer ? getCreditUtilizationInfo(selectedCustomer.creditLimit, selectedCustomer.currentDue) : null;
  const customerRisk = selectedCustomer ? calculateCustomerRisk(selectedCustomer) : null;

  const handleAddItem = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existingIndex = orderItems.findIndex(i => i.productId === productId);
    if (existingIndex > -1) {
      const currentQty = orderItems[existingIndex].quantity;
      if (currentQty < prod.currentStock) {
        const updated = [...orderItems];
        const newQty = currentQty + 1;
        const total = newQty * (updated[existingIndex].unitPrice || prod.wholesalePrice);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          subtotal: total,
          totalPrice: total
        };
        setOrderItems(updated);
      } else {
        addToast({
          type: 'warning',
          title: 'Stock Limit Reached',
          message: `Only ${prod.currentStock} units of ${prod.name} currently in warehouse stock.`
        });
      }
    } else {
      const newItem: OrderItem = {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        category: prod.category,
        quantity: 1,
        unitPrice: prod.wholesalePrice,
        purchasePrice: prod.purchasePrice,
        minSellingPrice: prod.minSellingPrice,
        mrp: prod.mrp,
        unit: prod.unit,
        subtotal: prod.wholesalePrice,
        totalPrice: prod.wholesalePrice
      };
      setOrderItems([...orderItems, newItem]);
    }
  };

  const handleUpdateQty = (productId: string, newQty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (newQty > prod.currentStock) {
      addToast({
        type: 'warning',
        title: 'Stock Exceeded',
        message: `Requested quantity exceeds available stock (${prod.currentStock} ${prod.unit}).`
      });
      return;
    }

    const clampedQty = Math.min(newQty, prod.currentStock);
    setOrderItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const total = clampedQty * item.unitPrice;
        return {
          ...item,
          quantity: clampedQty,
          subtotal: total,
          totalPrice: total
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setOrderItems(prev => prev.filter(i => i.productId !== productId));
  };

  const executeOrderCreation = async (adminOverridePayload?: { isOverridden: boolean; overrideReason: string; overriddenBy: string }) => {
    if (!selectedCustomer) return;

    setIsSubmitting(true);
    try {
      const res = await createOrder({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.ownerName,
        shopName: selectedCustomer.shopName,
        ownerName: selectedCustomer.ownerName,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
        area: selectedCustomer.area,
        district: selectedCustomer.district,
        salesUserId: currentSalesUser.id,
        salesUserName: currentSalesUser.name,
        items: orderItems,
        subtotal,
        totalDiscount: discountAmount,
        discount: discountAmount,
        grandTotal: netTotal,
        paidAmount: Number(paidAmount),
        notes: adminOverridePayload?.isOverridden
          ? `${notes} [ADMIN OVERRIDE: ${adminOverridePayload.overrideReason}]`.trim()
          : notes,
        paymentMethod,
        orderStatus: 'pending',
        adminOverride: adminOverridePayload
      });

      if (res.success) {
        setSalesTab('my_orders');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      addToast({
        type: 'error',
        title: 'Customer Required',
        message: 'Please select a registered retail shop customer.'
      });
      return;
    }

    if (orderItems.length === 0) {
      addToast({
        type: 'error',
        title: 'Cart is Empty',
        message: 'Please add at least one product to the order.'
      });
      return;
    }

    // Evaluate Credit Engine Rules
    if (!creditCheck.allowed) {
      if (creditCheck.requiresAdminOverride) {
        if (isAdmin) {
          setIsOverrideModalOpen(true);
          return;
        }
        addToast({
          type: 'error',
          title: creditCheck.isCreditHold ? 'Account on Credit Hold' : 'Credit Limit Exceeded',
          message: creditCheck.reason || 'Admin override is required to book this order.'
        });
        return;
      }

      if (creditCheck.requiresWarningConfirmation && !warningConfirmed) {
        const confirmProceed = window.confirm(
          `CREDIT WARNING:\n${creditCheck.reason}\n\nProjected Due: ৳${creditCheck.projectedDue.toLocaleString()} vs Limit: ৳${creditCheck.creditLimit.toLocaleString()}.\n\nDo you wish to proceed with booking this order?`
        );
        if (!confirmProceed) return;
        setWarningConfirmed(true);
      } else if (!creditCheck.requiresWarningConfirmation) {
        addToast({
          type: 'error',
          title: 'Order Blocked by Credit Policy',
          message: creditCheck.reason || 'This order exceeds the approved credit limit and is blocked.'
        });
        return;
      }
    }

    await executeOrderCreation();
  };

  const handleAdminOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim() || !currentUser) {
      addToast({
        type: 'warning',
        title: 'Reason Required',
        message: 'Please enter a justification for overriding the credit policy.'
      });
      return;
    }

    setIsOverrideModalOpen(false);
    await executeOrderCreation({
      isOverridden: true,
      overrideReason: overrideReason.trim(),
      overriddenBy: currentUser.uid
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Create Wholesale Order</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              Smart Credit Guard Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Book wholesale consignments with real-time credit limit verification and ledger projection.
          </p>
        </div>

        <div className="text-left sm:text-right bg-slate-50 p-2.5 sm:p-0 rounded-lg sm:bg-transparent w-full sm:w-auto border sm:border-0 border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Booking Officer</span>
          <span className="text-xs font-bold text-slate-900">{currentSalesUser.name}</span>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column (Catalog & Product Selector) - 7 Cols */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Customer Selector & Smart Credit Card */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#0F766E]" />
                  Select Retail Shop / Reseller *
                </label>
                <span className="text-[11px] text-slate-400">Showing {customers.length} verified accounts</span>
              </div>

              <select
                value={selectedCustomerId}
                onChange={e => {
                  setSelectedCustomerId(e.target.value);
                  setWarningConfirmed(false);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]/20 cursor-pointer"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.shopName} ({c.ownerName}) — {c.area}, {c.district} | Due: {formatBDT(c.currentDue || 0)} {c.creditHold ? '[ON HOLD]' : ''}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Proprietor</span>
                      <span className="font-semibold text-slate-800 truncate block">{selectedCustomer.ownerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Phone</span>
                      <span className="font-semibold text-slate-800">{selectedCustomer.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Current Due</span>
                      <span className={`font-bold ${(selectedCustomer.currentDue || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatBDT(selectedCustomer.currentDue || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Credit Limit</span>
                      <span className="font-bold text-slate-900">{formatBDT(selectedCustomer.creditLimit || 0)}</span>
                    </div>
                  </div>

                  {/* Smart Credit Mode & Risk Bar */}
                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">Mode:</span>
                      <span className="px-1.5 py-0.5 rounded font-bold bg-slate-200 text-slate-800 text-[10px]">
                        {selectedCustomer.creditCheckMode || 'NONE'}
                      </span>
                      {customerRisk && (
                        <span className={`px-1.5 py-0.5 rounded font-bold border ${customerRisk.badgeBg} ${customerRisk.badgeText} ${customerRisk.badgeBorder} text-[10px]`}>
                          {customerRisk.level}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500">Available Credit: </span>
                      <strong className="text-emerald-700 font-bold">
                        {formatBDT(Math.max(0, (selectedCustomer.creditLimit || 0) - (selectedCustomer.currentDue || 0)))}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Credit Hold Banner */}
              {selectedCustomer?.creditHold && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Administrative Credit Hold Active</span>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      {selectedCustomer.creditHoldReason || 'Orders on credit are locked for this customer.'} 
                      {isAdmin ? ' (Admin: Override available below)' : ' (Please ask customer to settle due or contact Admin)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Credit Block / Warning Banner */}
              {!creditCheck.allowed && !selectedCustomer?.creditHold && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  creditCheck.requiresAdminOverride ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${creditCheck.requiresAdminOverride ? 'text-rose-600' : 'text-amber-600'}`} />
                  <div>
                    <span className="font-bold block">
                      {creditCheck.requiresAdminOverride ? 'Credit Limit Hard-Block' : 'Credit Limit Warning'}
                    </span>
                    <p className="text-[11px] mt-0.5">
                      {creditCheck.reason}
                    </p>
                    <div className="mt-1 font-semibold text-[10px]">
                      Projected Due: {formatBDT(creditCheck.projectedDue)} | Excess: {formatBDT(creditCheck.excessAmount)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Selector */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#0F766E]" />
                  Catalog Products & Cosmetics Master
                </h2>
              </div>

              {/* Filter and Search */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by SKU or product name..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]/20"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c, idx) => (
                    <option key={`ord-cat-${c}-${idx}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredProducts.map(prod => {
                  const existing = orderItems.find(i => i.productId === prod.id);
                  const isSelected = !!existing;

                  return (
                    <div
                      key={prod.id}
                      className={`p-3 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                        isSelected 
                          ? 'border-teal-300 bg-teal-50/40 shadow-2xs' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 block truncate">{prod.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{prod.sku} • {prod.category}</span>
                          
                          <div className="mt-1 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Wholesale:</span>
                              <span className="font-bold text-[#0F766E]">{formatBDT(prod.wholesalePrice)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">Available:</span>
                              <span className="font-semibold text-slate-700">{prod.currentStock} {prod.unit}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                        {isSelected ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(prod.id, existing.quantity - 1)}
                              className="w-6.5 h-6.5 rounded-md bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer active:scale-95 transition-all text-xs"
                            >
                              -
                            </button>
                            <span className="font-bold text-slate-900 px-1.5 text-xs">{existing.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(prod.id, existing.quantity + 1)}
                              disabled={existing.quantity >= prod.currentStock}
                              className="w-6.5 h-6.5 rounded-md bg-[#0F766E] hover:bg-[#115E59] text-white flex items-center justify-center font-bold disabled:opacity-50 cursor-pointer active:scale-95 transition-all text-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddItem(prod.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-[#0F766E] text-white font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            + Add to Order
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* Right Column (Wholesale Order Cart & Invoice Checkout) - 5 Cols */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#0F766E]" />
                  <h2 className="font-bold text-slate-900 text-xs sm:text-sm">Order Items ({orderItems.length})</h2>
                </div>
                {orderItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderItems([])}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                {orderItems.map(item => (
                  <div key={item.productId} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-900 block truncate">{item.productName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.quantity} x {formatBDT(item.unitPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-900">{formatBDT(item.totalPrice)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {orderItems.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="text-xs font-semibold">No items selected yet.</p>
                    <span className="text-[11px]">Click items from the catalog on the left.</span>
                  </div>
                )}
              </div>

              {/* Pricing & Commercial Terms */}
              {orderItems.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-900">{formatBDT(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Wholesale Discount (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={discountPct}
                      onChange={e => setDiscountPct(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-right font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Net Total:</span>
                    <span className="text-[#0F766E] font-extrabold">{formatBDT(netTotal)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Advance Paid (৳)</label>
                      <input
                        type="number"
                        min="0"
                        max={netTotal}
                        value={paidAmount}
                        onChange={e => setPaidAmount(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium cursor-pointer"
                      >
                        <option value="Cash">Cash (COD)</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between font-bold text-rose-600 pt-1">
                    <span>Due on Delivery:</span>
                    <span>{formatBDT(dueAmount)}</span>
                  </div>

                  <div className="pt-2">
                    <label className="font-semibold text-slate-700 block mb-1">Scheduled Drop-off Date</label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Delivery Notes</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900"
                    />
                  </div>

                  {/* Submission Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || orderItems.length === 0 || (!creditCheck.allowed && !isAdmin)}
                    className={`w-full py-2.5 rounded-lg text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 mt-2 cursor-pointer active:scale-98 ${
                      !creditCheck.allowed
                        ? isAdmin
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-slate-400 cursor-not-allowed'
                        : 'bg-[#0F766E] hover:bg-[#115E59]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Order in Firestore...</span>
                      </>
                    ) : !creditCheck.allowed ? (
                      isAdmin ? (
                        <>
                          <Shield className="w-4 h-4" />
                          <span>Admin Override & Book Order</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Credit Policy Blocked</span>
                        </>
                      )
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Book Wholesale Order</span>
                      </>
                    )}
                  </button>

                  {!creditCheck.allowed && !isAdmin && (
                    <p className="text-[10px] text-rose-600 text-center mt-1 font-medium">
                      Order creation blocked by credit policy. Collect full advance payment or request admin approval.
                    </p>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>
      </form>

      {/* Admin Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Admin Credit Policy Override</h3>
              </div>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminOverrideSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <span className="font-bold block">Credit Exception Details:</span>
                <p>{creditCheck.reason}</p>
                <div className="text-[11px] pt-1 font-semibold text-amber-800">
                  Projected Due: {formatBDT(creditCheck.projectedDue)} | Limit: {formatBDT(creditCheck.creditLimit)}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Justification / Business Reason for Override (Mandatory) *
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Approved by Director for Eid seasonal stock. Customer promised post-dated cheque."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#0F766E] outline-hidden resize-none"
                  required
                />
              </div>

              <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                ⚠️ This override will be recorded in the permanent audit trail with your Administrator ID: <strong>{currentUser?.name}</strong>.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!overrideReason.trim()}
                  className="px-5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 rounded-lg shadow-sm"
                >
                  Confirm Override & Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
