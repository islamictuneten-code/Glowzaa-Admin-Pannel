import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { Badge } from '../shared/Badge';
import { Modal } from '../shared/Modal';
import { DistrictSelect } from '../shared/DistrictSelect';
import { BANGLADESH_DIVISIONS_AND_DISTRICTS, ALL_64_BD_DISTRICTS } from '../../data/bangladeshDistricts';
import { 
  Users, 
  Search, 
  PlusCircle, 
  Phone, 
  MapPin, 
  Building2, 
  UserCheck,
  Eye,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
  UserPlus,
  Clock,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  Store,
  FileText
} from 'lucide-react';

export const AdminCustomers: React.FC = () => {
  const { 
    customers, 
    salesStaff, 
    createCustomer, 
    updateCustomer, 
    toggleCustomerStatus,
    assignSalesSellerToCustomer,
    deleteCustomer,
    checkDuplicatePhone,
    setViewingCustomer, 
    formatBDT,
    isCustomersLoading 
  } = useApp();

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [assigningCustomer, setAssigningCustomer] = useState<Customer | null>(null);
  const [newSellerId, setNewSellerId] = useState('');

  // Form State for Add / Edit
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
    assignedSalesUserId: '',
    creditLimit: 100000,
    paymentTermDays: 15,
    tradeLicenseNo: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Extract all unique districts and areas present in data
  const districtsInUse = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.district) set.add(c.district);
    });
    return Array.from(set).sort();
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        c.shopName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.alternatePhone && c.alternatePhone.includes(q)) ||
        c.area.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        c.district.toLowerCase().includes(q) ||
        (c.customerId && c.customerId.toLowerCase().includes(q)) ||
        (c.assignedSalesUserName && c.assignedSalesUserName.toLowerCase().includes(q));

      const matchesDistrict = selectedDistrict === 'all' || c.district === selectedDistrict;
      const matchesSeller = selectedSeller === 'all' || 
        c.assignedSalesUserId === selectedSeller || 
        c.assignedSalesSellerId === selectedSeller;
      const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;

      return matchesSearch && matchesDistrict && matchesSeller && matchesStatus;
    });
  }, [customers, search, selectedDistrict, selectedSeller, selectedStatus]);

  // KPI Calculations
  const totalCustomers = customers.length;
  const activeCount = customers.filter(c => c.status === 'active').length;
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  const totalLifetimeSales = customers.reduce((sum, c) => sum + (c.totalPurchase || 0), 0);

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
      assignedSalesUserId: salesStaff[0]?.id || '',
      creditLimit: 100000,
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
      assignedSalesUserId: cust.assignedSalesUserId || cust.assignedSalesSellerId || salesStaff[0]?.id || '',
      creditLimit: cust.creditLimit || 100000,
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
      const assignedStaff = salesStaff.find(s => s.id === formData.assignedSalesUserId);
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
        assignedSalesUserId: assignedStaff?.id || salesStaff[0]?.id || '',
        assignedSalesUserName: assignedStaff?.name || salesStaff[0]?.name || 'Unassigned',
        assignedSalesSellerId: assignedStaff?.id || salesStaff[0]?.id || '',
        assignedSalesSellerName: assignedStaff?.name || salesStaff[0]?.name || 'Unassigned',
        creditLimit: Number(formData.creditLimit) || 100000,
        paymentTermDays: Number(formData.paymentTermDays) || 15,
        tradeLicenseNo: formData.tradeLicenseNo.trim(),
        notes: formData.notes.trim(),
        status: formData.status
      };

      // Check duplicate phone if not forced
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

  const handleQuickAssign = async () => {
    if (!assigningCustomer || !newSellerId) return;
    const staff = salesStaff.find(s => s.id === newSellerId);
    if (!staff) return;

    await assignSalesSellerToCustomer(assigningCustomer.id, staff.id, staff.name);
    setAssigningCustomer(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomerId) return;
    await deleteCustomer(deletingCustomerId);
    setDeletingCustomerId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Retail Shops & Resellers</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {totalCustomers} Registered
                </span>
                {isCustomersLoading && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage B2B retail partner directory, credit terms, assigned field officers, and territory mapping in Bangladesh.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Onboard New Retail Shop</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Retail Network</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalCustomers} Shops</div>
          <span className="text-[11px] text-slate-500 font-medium">{activeCount} active merchant accounts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Districts Covered</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{districtsInUse.length} Districts</div>
          <span className="text-[11px] text-slate-500">Dhaka, Ctg, Sylhet & more</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Lifetime Purchase</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(totalLifetimeSales)}</div>
          <span className="text-[10px] font-semibold text-slate-400">Calculated from B2B orders</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-rose-500 block tracking-wider">Total Outstanding Due</span>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{formatBDT(totalOutstanding)}</div>
          <span className="text-[10px] font-semibold text-slate-400">Calculated from ledger</span>
        </div>
      </div>

      {/* Search and Multi-Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by shop name, proprietor, phone (+880), area, district, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* District Filter */}
            <div className="min-w-[170px]">
              <DistrictSelect
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                includeAllOption={true}
                allOptionLabel={`All Districts (${ALL_64_BD_DISTRICTS.length})`}
                className="py-2 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            {/* Sales Seller Filter */}
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
            >
              <option value="all">All Assigned Officers</option>
              {salesStaff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
            >
              <option value="all">All Status</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Inactive Accounts</option>
            </select>

            {(selectedDistrict !== 'all' || selectedSeller !== 'all' || selectedStatus !== 'all' || search) && (
              <button
                onClick={() => {
                  setSelectedDistrict('all');
                  setSelectedSeller('all');
                  setSelectedStatus('all');
                  setSearch('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> of {totalCustomers} retail shops</span>
          <span className="text-[10px] text-slate-400">All customer profiles are backed in Firebase Firestore</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Shop Name & Owner</th>
                <th className="py-3 px-4">Contact Phone & Area</th>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Assigned Sales Seller</th>
                <th className="py-3 px-4 text-right">Total Purchase</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Current Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Store className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No Retail Customers Found</p>
                    <p className="text-xs text-slate-400 mt-1">Try refining your search terms or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Shop Name & Owner */}
                    <td className="py-3 px-4">
                      <div 
                        onClick={() => setViewingCustomer(cust)}
                        className="cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors block">
                            {cust.shopName}
                          </span>
                          {cust.customerId && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-semibold">
                              {cust.customerId}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">Proprietor: {cust.ownerName}</span>
                      </div>
                    </td>

                    {/* Contact Phone & Area */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-900 font-mono font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {cust.phone}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                          {cust.area || cust.address}
                        </span>
                      </div>
                    </td>

                    {/* District */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{cust.district}</span>
                      {cust.city && cust.city !== cust.district && (
                        <span className="text-[10px] text-slate-400">{cust.city}</span>
                      )}
                    </td>

                    {/* Assigned Seller */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <span className="font-semibold text-slate-800 block text-xs">
                            {cust.assignedSalesUserName || cust.assignedSalesSellerName || 'Unassigned'}
                          </span>
                          <span className="text-[10px] text-slate-400">Terms: Net {cust.paymentTermDays || 15}d</span>
                        </div>
                        <button
                          onClick={() => {
                            setAssigningCustomer(cust);
                            setNewSellerId(cust.assignedSalesUserId || cust.assignedSalesSellerId || salesStaff[0]?.id || '');
                          }}
                          title="Reassign Sales Seller"
                          className="p-1 rounded-md hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Total Purchase (Financial Summary) */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-slate-900">
                        {formatBDT(cust.totalPurchase || 0)}
                      </span>
                    </td>

                    {/* Total Paid */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-emerald-600">
                        {formatBDT(cust.totalPaid || 0)}
                      </span>
                    </td>

                    {/* Current Due */}
                    <td className="py-3 px-4 text-right">
                      <span className={`font-extrabold ${(cust.currentDue || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatBDT(cust.currentDue || 0)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleCustomerStatus(cust.id, cust.status === 'inactive' ? 'inactive' : 'active')}
                        title={`Click to mark ${cust.status === 'active' ? 'Inactive' : 'Active'}`}
                        className="cursor-pointer"
                      >
                        <Badge status={cust.status} size="sm" />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingCustomer(cust)}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                          title="View Profile & Ledger"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ledger</span>
                        </button>

                        <button
                          onClick={() => openEditModal(cust)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingCustomerId(cust.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Customer from Firestore"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Onboard / Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Retail Reseller"
        subtitle="Register B2B cosmetic retailer, boutique, or salon in Bangladesh"
        maxWidth="2xl"
      >
        <form onSubmit={(e) => handleSaveCustomer(e, false)} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Shop Name */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Shop / Business Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Al-Madina Cosmetics & Beauty Hub"
                value={formData.shopName}
                onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white"
              />
            </div>

            {/* Owner Name */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Owner / Proprietor Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Alhaj Md. Nurul Islam"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white"
              />
            </div>

            {/* Primary Phone */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Primary Phone (WhatsApp) *</label>
              <input
                type="text"
                required
                placeholder="+880 1711-XXXXXX"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Checked for duplicates before saving</span>
            </div>

            {/* Alternate Phone */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Alternate Phone (Optional)</label>
              <input
                type="text"
                placeholder="+880 1819-XXXXXX"
                value={formData.alternatePhone}
                onChange={e => setFormData({ ...formData, alternatePhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white"
              />
            </div>

            {/* Email */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="shop.email@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            {/* Trade License */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Trade License / BIN (Optional)</label>
              <input
                type="text"
                placeholder="TRAD/DSCC/019284/2024"
                value={formData.tradeLicenseNo}
                onChange={e => setFormData({ ...formData, tradeLicenseNo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white"
              />
            </div>

            {/* Full Street Address */}
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Full Shop Address *</label>
              <input
                type="text"
                required
                placeholder="Shop 14-16, 2nd Floor, Chawkbazar Super Market, Old Dhaka"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            {/* Area / Market */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Area / Market / Thana *</label>
              <input
                type="text"
                required
                placeholder="e.g. Chawkbazar, Dhanmondi, GEC Circle"
                value={formData.area}
                onChange={e => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            {/* District */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">District * (All 64 Districts)</label>
              <DistrictSelect
                required
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value, city: e.target.value })}
              />
            </div>

            {/* City */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">City / Town</label>
              <input
                type="text"
                placeholder="e.g. Dhaka, Chittagong"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            {/* Assigned Sales Seller */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assigned Sales Officer</label>
              <select
                value={formData.assignedSalesUserId}
                onChange={e => setFormData({ ...formData, assignedSalesUserId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white"
              >
                {salesStaff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.territory.split('(')[0].trim()})</option>
                ))}
              </select>
            </div>

            {/* Approved Credit Limit */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Approved Credit Limit (৳)</label>
              <input
                type="number"
                min="0"
                step="5000"
                value={formData.creditLimit}
                onChange={e => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:bg-white"
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Terms Schedule</label>
              <select
                value={formData.paymentTermDays}
                onChange={e => setFormData({ ...formData, paymentTermDays: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white"
              >
                <option value={0}>Cash on Delivery (0 Days)</option>
                <option value={7}>Net 7 Days</option>
                <option value={15}>Net 15 Days</option>
                <option value={30}>Net 30 Days</option>
                <option value={45}>Net 45 Days</option>
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Merchant Notes / Delivery Instructions</label>
              <textarea
                rows={2}
                placeholder="Preferred delivery timings, contact persons, or notes..."
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
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : (
                <span>Complete Onboarding</span>
              )}
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
          subtitle={`Proprietor: ${editingCustomer.ownerName} | ID: ${editingCustomer.customerId || editingCustomer.id}`}
          maxWidth="2xl"
        >
          <form onSubmit={(e) => handleSaveCustomer(e, false)} className="space-y-4 text-xs">
            
            {/* Financial Status Banner (Read-only) */}
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
                <span className="text-sm font-bold text-rose-600">{formatBDT(editingCustomer.currentDue || 0)}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center -mt-2">
              ℹ️ Financial totals are computed automatically from B2B Orders and Collections.
            </p>

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

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Full Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Area / Market *</label>
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

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Sales Officer</label>
                <select
                  value={formData.assignedSalesUserId}
                  onChange={e => setFormData({ ...formData, assignedSalesUserId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                >
                  {salesStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Approved Credit Limit (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.creditLimit}
                  onChange={e => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Term (Days)</label>
                <select
                  value={formData.paymentTermDays}
                  onChange={e => setFormData({ ...formData, paymentTermDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                >
                  <option value={0}>Cash on Delivery (0 Days)</option>
                  <option value={7}>Net 7 Days</option>
                  <option value={15}>Net 15 Days</option>
                  <option value={30}>Net 30 Days</option>
                  <option value={45}>Net 45 Days</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Internal Notes</label>
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
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Duplicate Phone Warning Confirmation Dialog */}
      {duplicateWarning.isOpen && (
        <Modal
          isOpen={duplicateWarning.isOpen}
          onClose={() => setDuplicateWarning({ isOpen: false })}
          title="Duplicate Phone Number Detected"
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
                    <p className="text-slate-600 font-mono">Phone: {duplicateWarning.existingCustomer.phone}</p>
                  </div>
                )}
                <p className="text-amber-800 mt-2 font-medium">
                  Do you want to confirm and proceed registering another shop with this phone number?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateWarning({ isOpen: false })}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel & Change Phone
              </button>
              <button
                type="button"
                onClick={handleConfirmDuplicate}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
              >
                {isSubmitting ? 'Saving...' : 'Yes, Proceed & Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Reassign Seller Modal */}
      {assigningCustomer && (
        <Modal
          isOpen={!!assigningCustomer}
          onClose={() => setAssigningCustomer(null)}
          title="Reassign Sales Officer"
          subtitle={`For ${assigningCustomer.shopName}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Select Field Officer</label>
              <select
                value={newSellerId}
                onChange={e => setNewSellerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
              >
                {salesStaff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.territory.split('(')[0].trim()})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAssigningCustomer(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAssign}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomerId && (
        <Modal
          isOpen={!!deletingCustomerId}
          onClose={() => setDeletingCustomerId(null)}
          title="Delete Customer Profile"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
              <p className="font-bold text-rose-900">Are you sure you want to delete this customer?</p>
              <p className="mt-1 text-rose-700">
                This document will be permanently removed from Firestore.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCustomerId(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
              >
                Delete from Firestore
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
