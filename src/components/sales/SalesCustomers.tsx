import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { Badge } from '../shared/Badge';
import { Modal } from '../shared/Modal';
import { DistrictSelect } from '../shared/DistrictSelect';
import { 
  Users, 
  Search, 
  Phone, 
  MapPin, 
  PlusCircle, 
  ShoppingCart, 
  Eye,
  AlertCircle,
  Edit2,
  Store,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const SalesCustomers: React.FC = () => {
  const { 
    customers, 
    currentSalesUser, 
    createCustomer,
    updateCustomer,
    checkDuplicatePhone,
    setViewingCustomer, 
    setSalesTab, 
    formatBDT,
    isCustomersLoading 
  } = useApp();

  const [search, setSearch] = useState('');
  const [viewScope, setViewScope] = useState<'assigned' | 'all'>('assigned');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    phone: '+880 1',
    alternatePhone: '',
    email: '',
    address: '',
    area: '',
    city: 'Dhaka',
    district: 'Dhaka',
    creditLimit: 50000,
    paymentTermDays: 15,
    tradeLicenseNo: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Duplicate Phone Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isOpen: boolean;
    existingCustomer?: Customer;
    pendingData?: any;
    isEditing?: boolean;
    targetId?: string;
  }>({
    isOpen: false
  });

  // Filter customers by assigned sales rep or all
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const isAssigned = c.assignedSalesUserId === currentSalesUser.id || 
                         c.assignedSalesSellerId === currentSalesUser.id;
      if (viewScope === 'assigned' && !isAssigned) return false;

      const q = search.toLowerCase().trim();
      if (!q) return true;

      return (
        c.shopName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.alternatePhone && c.alternatePhone.includes(q)) ||
        c.area.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        (c.customerId && c.customerId.toLowerCase().includes(q))
      );
    });
  }, [customers, currentSalesUser.id, viewScope, search]);

  const assignedCount = customers.filter(c => 
    c.assignedSalesUserId === currentSalesUser.id || 
    c.assignedSalesSellerId === currentSalesUser.id
  ).length;

  const totalAssignedSales = customers
    .filter(c => c.assignedSalesUserId === currentSalesUser.id || c.assignedSalesSellerId === currentSalesUser.id)
    .reduce((sum, c) => sum + (c.totalPurchase || 0), 0);

  const totalAssignedDue = customers
    .filter(c => c.assignedSalesUserId === currentSalesUser.id || c.assignedSalesSellerId === currentSalesUser.id)
    .reduce((sum, c) => sum + (c.currentDue || 0), 0);

  const resetForm = () => {
    setFormData({
      shopName: '',
      ownerName: '',
      phone: '+880 1',
      alternatePhone: '',
      email: '',
      address: '',
      area: '',
      city: 'Dhaka',
      district: 'Dhaka',
      creditLimit: 50000,
      paymentTermDays: 15,
      tradeLicenseNo: '',
      notes: '',
      status: 'active'
    });
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      shopName: cust.shopName,
      ownerName: cust.ownerName,
      phone: cust.phone,
      alternatePhone: cust.alternatePhone || '',
      email: cust.email || '',
      address: cust.address,
      area: cust.area || '',
      city: cust.city || cust.district,
      district: cust.district,
      creditLimit: cust.creditLimit || 50000,
      paymentTermDays: cust.paymentTermDays || 15,
      tradeLicenseNo: cust.tradeLicenseNo || '',
      notes: cust.notes || '',
      status: (cust.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive'
    });
  };

  const handleSaveCustomer = async (e: React.FormEvent, forceSave: boolean = false) => {
    if (e) e.preventDefault();
    if (!formData.shopName.trim() || !formData.ownerName.trim() || !formData.phone.trim()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        shopName: formData.shopName.trim(),
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        area: formData.area.trim(),
        city: formData.city.trim() || formData.district,
        district: formData.district,
        assignedSalesUserId: currentSalesUser.id,
        assignedSalesUserName: currentSalesUser.name,
        assignedSalesSellerId: currentSalesUser.id,
        assignedSalesSellerName: currentSalesUser.name,
        creditLimit: Number(formData.creditLimit) || 50000,
        paymentTermDays: Number(formData.paymentTermDays) || 15,
        tradeLicenseNo: formData.tradeLicenseNo.trim(),
        notes: formData.notes.trim(),
        status: formData.status
      };

      if (!forceSave) {
        const dupCheck = await checkDuplicatePhone(
          formData.phone,
          editingCustomer ? editingCustomer.id : undefined
        );

        if (dupCheck.isDuplicate && dupCheck.existingCustomer) {
          setIsSubmitting(false);
          setDuplicateWarning({
            isOpen: true,
            existingCustomer: dupCheck.existingCustomer,
            pendingData: payload,
            isEditing: Boolean(editingCustomer),
            targetId: editingCustomer?.id
          });
          return;
        }
      }

      if (editingCustomer) {
        await updateCustomer({
          id: editingCustomer.id,
          ...payload
        });
        setEditingCustomer(null);
      } else {
        await createCustomer(payload);
        setIsAddModalOpen(false);
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!duplicateWarning.pendingData) return;
    setIsSubmitting(true);
    try {
      if (duplicateWarning.isEditing && duplicateWarning.targetId) {
        await updateCustomer({
          id: duplicateWarning.targetId,
          ...duplicateWarning.pendingData
        });
        setEditingCustomer(null);
      } else {
        await createCustomer(duplicateWarning.pendingData);
        setIsAddModalOpen(false);
      }
      setDuplicateWarning({ isOpen: false });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E]">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">My Retail Shop Portfolio</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
                  {assignedCount} Assigned Shops
                </span>
                {isCustomersLoading && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Territory: <strong className="text-slate-800">{currentSalesUser.territory}</strong>. Onboard shops, take wholesale orders, and track dues.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Onboard Retail Client</span>
          </button>

          <button
            onClick={() => setSalesTab('create_order')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-teal-200" />
            <span>Book Order</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">My Client Shops</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{assignedCount} Shops</div>
          <span className="text-[11px] text-slate-500">{currentSalesUser.name}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Territory B2B Sales</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{formatBDT(totalAssignedSales)}</div>
          <span className="text-[10px] text-slate-400">Lifetime volume</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-red-500 block tracking-wider">Outstanding Portfolio Due</span>
          <div className="text-lg sm:text-xl font-bold text-red-600 mt-1">{formatBDT(totalAssignedDue)}</div>
          <span className="text-[10px] text-slate-400">Total client dues</span>
        </div>
      </div>

      {/* Controls: Search and View Scope */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shops, proprietor, phone (+880), area..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          />
        </div>

        {/* View Scope Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setViewScope('assigned')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewScope === 'assigned' 
                ? 'bg-white text-slate-900 shadow-2xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Assigned Shops ({assignedCount})
          </button>
          <button
            onClick={() => setViewScope('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewScope === 'all' 
                ? 'bg-white text-slate-900 shadow-2xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Company Shops ({customers.length})
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Retail Shop & Owner</th>
                <th className="py-2.5 px-3">Contact Phone & Area</th>
                <th className="py-2.5 px-3">Assigned Rep</th>
                <th className="py-2.5 px-3 text-right">Lifetime Purchase</th>
                <th className="py-2.5 px-3 text-right">Current Due</th>
                <th className="py-2.5 px-3 text-right">Credit Limit</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Store className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No Retail Shops Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {viewScope === 'assigned' 
                        ? 'No shops currently assigned to your profile in this territory.' 
                        : 'No shops match your search query.'}
                    </p>
                    <button
                      onClick={openAddModal}
                      className="mt-3 px-3 py-1.5 bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Onboard First Client</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <div 
                        onClick={() => setViewingCustomer(cust)}
                        className="cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors block">
                            {cust.shopName}
                          </span>
                          {cust.customerId && (
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                              {cust.customerId}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">Proprietor: {cust.ownerName}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-900 font-mono font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {cust.phone}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                          {cust.area}, {cust.district}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800 block text-xs">
                        {cust.assignedSalesUserName || cust.assignedSalesSellerName || 'Unassigned'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatBDT(cust.totalPurchase || 0)}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${(cust.currentDue || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {formatBDT(cust.currentDue || 0)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                      {formatBDT(cust.creditLimit || 0)}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <Badge status={cust.status} size="sm" />
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingCustomer(cust)}
                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Profile & Ledger"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ledger</span>
                        </button>

                        <button
                          onClick={() => openEditModal(cust)}
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Edit Customer Info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSalesTab('create_order')}
                          className="px-2 py-1 rounded-md bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Book Wholesale Order"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Order</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Retail Shop"
        subtitle={`Will be assigned to your territory: ${currentSalesUser.territory}`}
        maxWidth="2xl"
      >
        <form onSubmit={(e) => handleSaveCustomer(e, false)} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Shop / Business Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Priyo Beauty Care"
                value={formData.shopName}
                onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Owner / Proprietor Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Md. Ashikur Rahman"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Primary Phone (WhatsApp) *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Alternate Phone</label>
              <input
                type="text"
                value={formData.alternatePhone}
                onChange={e => setFormData({ ...formData, alternatePhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Shop Full Address *</label>
              <input
                type="text"
                required
                placeholder="e.g. Shop 4B, Central Plaza, GEC Circle"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Area / Thana *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dhanmondi, GEC, Uttara"
                value={formData.area}
                onChange={e => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">District * (All 64 Districts)</label>
              <DistrictSelect
                required
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value, city: e.target.value })}
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Trade License / BIN</label>
              <input
                type="text"
                value={formData.tradeLicenseNo}
                onChange={e => setFormData({ ...formData, tradeLicenseNo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Terms</label>
              <select
                value={formData.paymentTermDays}
                onChange={e => setFormData({ ...formData, paymentTermDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white"
              >
                <option value={0}>Cash on Delivery (0 Days)</option>
                <option value={7}>Net 7 Days</option>
                <option value={15}>Net 15 Days</option>
                <option value={30}>Net 30 Days</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Notes / Delivery Instructions</label>
              <input
                type="text"
                placeholder="Specific delivery timings or owner preferences..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? 'Saving to Firestore...' : 'Onboard Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <Modal
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          title={`Edit ${editingCustomer.shopName}`}
          subtitle={`Proprietor: ${editingCustomer.ownerName}`}
          maxWidth="2xl"
        >
          <form onSubmit={(e) => handleSaveCustomer(e, false)} className="space-y-4 text-xs">
            
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Purchase</span>
                <span className="text-sm font-bold text-slate-900">{formatBDT(editingCustomer.totalPurchase || 0)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Paid</span>
                <span className="text-sm font-bold text-emerald-600">{formatBDT(editingCustomer.totalPaid || 0)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Current Due</span>
                <span className="text-sm font-bold text-red-600">{formatBDT(editingCustomer.currentDue || 0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={formData.shopName}
                  onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Primary Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alternate Phone</label>
                <input
                  type="text"
                  value={formData.alternatePhone}
                  onChange={e => setFormData({ ...formData, alternatePhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Area *</label>
                <input
                  type="text"
                  required
                  value={formData.area}
                  onChange={e => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">District * (All 64 Districts)</label>
                <DistrictSelect
                  required
                  value={formData.district}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Update Details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Duplicate Phone Warning */}
      {duplicateWarning.isOpen && (
        <Modal
          isOpen={duplicateWarning.isOpen}
          onClose={() => setDuplicateWarning({ isOpen: false })}
          title="Duplicate Phone Number Warning"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 text-sm">Existing Customer Match</p>
                <p className="text-amber-800 mt-1">
                  A registered retail partner already uses this phone number:
                </p>
                {duplicateWarning.existingCustomer && (
                  <div className="mt-2 p-2 bg-white/80 rounded-lg border border-amber-200">
                    <p className="font-bold text-slate-900">{duplicateWarning.existingCustomer.shopName}</p>
                    <p className="text-slate-600">Owner: {duplicateWarning.existingCustomer.ownerName}</p>
                    <p className="text-slate-600">Location: {duplicateWarning.existingCustomer.area}, {duplicateWarning.existingCustomer.district}</p>
                  </div>
                )}
                <p className="text-amber-800 mt-2 font-medium">
                  Confirm to register another shop under this phone number?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateWarning({ isOpen: false })}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel & Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmDuplicate}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-2xs cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Yes, Save Anyway'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
