import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Expense, ExpenseCategory, ExpenseStatus } from '../../types';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  DollarSign, 
  Calendar, 
  User, 
  CreditCard, 
  Building2, 
  AlertCircle,
  Eye,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  MoreVertical
} from 'lucide-react';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Utilities',
  'Fuel & Transport',
  'Packaging',
  'Salaries & Commissions',
  'Marketing',
  'Office & Supplies',
  'Customs & Logistics',
  'Vehicle Repair & Maintenance',
  'Warehouse & Maintenance',
  'Other'
];

export const AdminExpenses: React.FC = () => {
  const { 
    expenses, 
    isExpensesLoading, 
    addExpense, 
    approveExpense, 
    rejectExpense, 
    editExpense, 
    deleteExpense,
    formatBDT,
    role 
  } = useApp();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'admin' && role === 'admin';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month'>('all');

  // Active 3-dot action menu for mobile cards
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [rejectingExpense, setRejectingExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Utilities' as ExpenseCategory,
    amount: '',
    paymentMethod: 'Cash',
    vendorName: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
    autoApprove: false
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (exp.deleted) return false;

      // Staff can only view all or own? System requirement: "Staff users see their own submitted claims or read-only list". Let's show all, but restrict actions for non-admin.
      
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        exp.expenseNumber.toLowerCase().includes(searchLower) ||
        exp.title.toLowerCase().includes(searchLower) ||
        (exp.vendorName && exp.vendorName.toLowerCase().includes(searchLower)) ||
        exp.spentByUserName.toLowerCase().includes(searchLower) ||
        exp.category.toLowerCase().includes(searchLower);

      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const expDate = new Date(exp.expenseDate);
        const now = new Date();
        if (dateFilter === 'this_month') {
          matchesDate = expDate.getFullYear() === now.getFullYear() && expDate.getMonth() === now.getMonth();
        } else if (dateFilter === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          matchesDate = expDate.getFullYear() === lastMonth.getFullYear() && expDate.getMonth() === lastMonth.getMonth();
        }
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [expenses, searchTerm, categoryFilter, statusFilter, dateFilter]);

  // Financial KPI Metrics (Integer Safe)
  const metrics = useMemo(() => {
    const activeExps = expenses.filter(e => !e.deleted);
    const approved = activeExps.filter(e => e.status === 'approved');
    const pending = activeExps.filter(e => e.status === 'pending');

    const totalApproved = approved.reduce((sum, e) => sum + Math.round(e.amount || 0), 0);
    const totalPending = pending.reduce((sum, e) => sum + Math.round(e.amount || 0), 0);
    const pendingCount = pending.length;

    // This Month Approved
    const now = new Date();
    const thisMonthApproved = approved
      .filter(e => {
        const d = new Date(e.expenseDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, e) => sum + Math.round(e.amount || 0), 0);

    return {
      totalApproved,
      totalPending,
      pendingCount,
      thisMonthApproved,
      totalCount: activeExps.length
    };
  }, [expenses]);

  // Form Handlers
  const handleOpenAddModal = () => {
    setFormData({
      title: '',
      category: 'Utilities',
      amount: '',
      paymentMethod: 'Cash',
      vendorName: '',
      expenseDate: new Date().toISOString().split('T')[0],
      description: '',
      autoApprove: false
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title,
      category: exp.category as ExpenseCategory,
      amount: exp.amount.toString(),
      paymentMethod: exp.paymentMethod,
      vendorName: exp.vendorName || '',
      expenseDate: exp.expenseDate,
      description: exp.description || '',
      autoApprove: exp.status === 'approved'
    });
    setFormError('');
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Expense title is required.');
      return;
    }
    const numAmount = parseInt(formData.amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid positive integer amount in BDT.');
      return;
    }
    if (!formData.expenseDate) {
      setFormError('Expense date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addExpense({
        title: formData.title.trim(),
        category: formData.category,
        amount: numAmount,
        paymentMethod: formData.paymentMethod,
        vendorName: formData.vendorName.trim() || null,
        expenseDate: formData.expenseDate,
        description: formData.description.trim(),
        autoApprove: isAdmin && formData.autoApprove === true
      });

      if (res.success) {
        setIsAddModalOpen(false);
      } else {
        setFormError(res.error || 'Failed to record expense.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Expense title is required.');
      return;
    }
    const numAmount = parseInt(formData.amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid positive integer amount in BDT.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await editExpense(editingExpense.id, {
        title: formData.title.trim(),
        category: formData.category,
        amount: numAmount,
        paymentMethod: formData.paymentMethod,
        vendorName: formData.vendorName.trim() || null,
        expenseDate: formData.expenseDate,
        description: formData.description.trim()
      });

      if (res.success) {
        setEditingExpense(null);
      } else {
        setFormError(res.error || 'Failed to update expense.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while updating expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (expenseId: string) => {
    if (!isAdmin) return;
    await approveExpense(expenseId);
  };

  const handleConfirmReject = async () => {
    if (!rejectingExpense || !rejectionReason.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await rejectExpense(rejectingExpense.id, rejectionReason.trim());
      if (res.success) {
        setRejectingExpense(null);
        setRejectionReason('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      await deleteExpense(expenseId);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-xl border border-teal-100 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-teal-600 shrink-0" />
            <span className="truncate">Operating Expenses</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Track, approve, and manage operating expenditures directly synced with Profit & Loss statement
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          {isAdmin ? 'Record Operating Expense' : 'Submit Expense Claim'}
        </button>
      </div>

      {/* KPI Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Approved OPEX */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-teal-100 shadow-sm flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total Approved OPEX
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 truncate">
              {formatBDT(metrics.totalApproved)}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1 truncate">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> P&L Deducted
            </p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 2: This Month Approved OPEX */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-teal-100 shadow-sm flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              This Month Approved
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-teal-700 mt-1 truncate">
              {formatBDT(metrics.thisMonthApproved)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Current Period Run
            </p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 3: Pending Claims */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Pending Approval
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1 truncate">
              {formatBDT(metrics.totalPending)}
            </h3>
            <p className="text-xs text-amber-700 font-medium mt-1 flex items-center gap-1 truncate">
              <Clock className="w-3.5 h-3.5 shrink-0" /> {metrics.pendingCount} awaiting review
            </p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Metric 4: Total Expense Claims */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total Claims
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1 truncate">
              {metrics.totalCount}
            </h3>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Across all categories
            </p>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-teal-100 shadow-sm space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, expense #, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Review</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All Dates</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Container */}
      <div className="bg-white rounded-xl border border-teal-100 shadow-sm overflow-hidden">
        {isExpensesLoading ? (
          <div className="p-8 text-center text-slate-500">
            <Clock className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
            Loading expenses from Firestore...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No Operating Expenses Found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting filters or record a new expense.</p>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW (< md): Stacked Responsive Expense Cards (Zero Horizontal Overflow) */}
            <div className="block md:hidden p-3 sm:p-4 space-y-3 bg-slate-50/60">
              {filteredExpenses.map((exp) => (
                <div
                  key={`mob-exp-${exp.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3 relative hover:border-teal-200 transition-colors"
                >
                  {/* Card Header: Title & 3-Dot Action Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">
                        {exp.title}
                      </h4>
                      <div className="font-mono text-xs font-semibold text-teal-700 break-all mt-0.5">
                        {exp.expenseNumber}
                      </div>
                    </div>

                    {/* 3-Dot Action Menu Button */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === exp.id ? null : exp.id)}
                        className="p-1.5 -mr-1 -mt-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                        aria-label="Expense Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu Popover */}
                      {activeMenuId === exp.id && (
                        <>
                          {/* Backdrop to dismiss menu */}
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 top-8 z-40 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setViewingExpense(exp);
                              }}
                              className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-50 font-medium text-slate-700 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              View Details
                            </button>

                            {isAdmin && exp.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleApprove(exp.id);
                                }}
                                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-emerald-50 text-emerald-700 font-medium transition-colors border-t border-slate-100"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Approve
                              </button>
                            )}

                            {isAdmin && exp.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setRejectingExpense(exp);
                                }}
                                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-red-50 text-red-600 font-medium transition-colors"
                              >
                                <X className="w-3.5 h-3.5 text-red-500" />
                                Reject
                              </button>
                            )}

                            {(isAdmin || (exp.spentByUserId === currentUser?.uid && exp.status === 'pending')) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleOpenEditModal(exp);
                                }}
                                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-medium transition-colors border-t border-slate-100"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-500" />
                                Edit Expense
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleDelete(exp.id);
                                }}
                                className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-red-50 text-red-600 font-medium transition-colors border-t border-slate-100"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Category & Vendor */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200 max-w-full truncate">
                      {exp.category}
                    </span>
                    {exp.vendorName ? (
                      <span className="text-slate-600 text-xs flex items-center gap-1 min-w-0 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{exp.vendorName}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No vendor listed</span>
                    )}
                  </div>

                  {/* Amount and Payment Method Box */}
                  <div className="flex items-center justify-between p-2.5 sm:p-3 bg-teal-50/60 border border-teal-100 rounded-xl">
                    <div className="min-w-0">
                      <span className="text-[10px] text-teal-800 font-semibold uppercase tracking-wider block">
                        Amount (BDT)
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 leading-tight">
                        {formatBDT(exp.amount)}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 uppercase block font-medium">Method</span>
                      <span className="inline-block text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs mt-0.5">
                        {exp.paymentMethod}
                      </span>
                    </div>
                  </div>

                  {/* Status, Date, & Spender Info */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    {/* Status Badge */}
                    <div className="shrink-0">
                      {exp.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {exp.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending
                        </span>
                      )}
                      {exp.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      )}
                    </div>

                    {/* Expense Date & Spender */}
                    <div className="text-right text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{exp.expenseDate}</span>
                    </div>
                  </div>

                  {/* Submitted By */}
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-400">Recorded By:</span>
                    <span className="font-medium text-slate-700 truncate ml-1">{exp.spentByUserName}</span>
                  </div>

                  {/* Quick Action Buttons for Pending Expenses (Admin Direct Review) */}
                  {isAdmin && exp.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleApprove(exp.id)}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingExpense(exp)}
                        className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* DESKTOP VIEW (>= md): Full Data Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                    <th className="px-4 py-3">Expense # & Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Expense Date</th>
                    <th className="px-4 py-3 text-right">Amount (BDT)</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Spent By</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-teal-50/30 transition-colors">
                      {/* Expense # & Title */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{exp.title}</div>
                        <div className="text-xs text-teal-700 font-mono mt-0.5">{exp.expenseNumber}</div>
                        {exp.vendorName && (
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" /> {exp.vendorName}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
                          {exp.category}
                        </span>
                      </td>

                      {/* Expense Date */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {exp.expenseDate}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatBDT(exp.amount)}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {exp.paymentMethod}
                        </span>
                      </td>

                      {/* Spent By */}
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <div className="font-medium text-slate-800">{exp.spentByUserName}</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {exp.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {exp.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium rounded-full">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Review
                          </span>
                        )}
                        {exp.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-medium rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setViewingExpense(exp)}
                            title="View Details"
                            className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Admin Approvals for Pending Expenses */}
                          {isAdmin && exp.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(exp.id)}
                                title="Approve Expense"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => setRejectingExpense(exp)}
                                title="Reject Expense"
                                className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}

                          {/* Edit for Admin OR Staff (if pending own) */}
                          {(isAdmin || (exp.spentByUserId === currentUser?.uid && exp.status === 'pending')) && (
                            <button
                              onClick={() => handleOpenEditModal(exp)}
                              title="Edit Expense"
                              className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete for Admin */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(exp.id)}
                              title="Delete Record"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Record Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-teal-100 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="px-5 py-3.5 bg-teal-800 text-white flex items-center justify-between shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-200" />
                {isAdmin ? 'Record Operating Expense' : 'Submit Expense Claim'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-teal-100 hover:text-white hover:bg-teal-700/60 p-1.5 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-5 sm:p-6 space-y-4 overflow-y-auto grow">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse Electricity Bill August 2026"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="e.g. 15000"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold"
                  />
                </div>
              </div>

              {/* Payment Method & Expense Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Vendor Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Vendor / Payee Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka Power Distribution Co. / Service Provider"
                  value={formData.vendorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendorName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Add optional notes or reference info..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Admin Auto Approve Checkbox */}
              {isAdmin && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="checkbox"
                    id="autoApprove"
                    checked={formData.autoApprove}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoApprove: e.target.checked }))}
                    className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="autoApprove" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Auto-approve immediately (Skip pending review & deduct from P&L)
                  </label>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : isAdmin ? 'Record Expense' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-teal-100 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="px-5 py-3.5 bg-teal-800 text-white flex items-center justify-between shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-200" />
                Edit Expense ({editingExpense.expenseNumber})
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-teal-100 hover:text-white hover:bg-teal-700/60 p-1.5 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-5 sm:p-6 space-y-4 overflow-y-auto grow">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  value={formData.vendorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendorName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm shadow-sm"
                >
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Expense Reason Modal */}
      {rejectingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="px-5 py-3.5 bg-red-700 text-white flex items-center justify-between shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Reject Expense Claim
              </h3>
              <button
                type="button"
                onClick={() => setRejectingExpense(null)}
                className="text-red-200 hover:text-white hover:bg-red-600/60 p-1.5 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto grow">
              <p className="text-sm text-slate-600">
                Rejecting claim <span className="font-semibold text-slate-800">{rejectingExpense.expenseNumber}</span> ({rejectingExpense.title}) for <span className="font-bold text-slate-900">{formatBDT(rejectingExpense.amount)}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Duplicate submission, invalid receipt voucher attached, or unauthorized purchase..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingExpense(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectionReason.trim() || isSubmitting}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Expense Detail Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-teal-100 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-base sm:text-lg">{viewingExpense.title}</h3>
                <p className="text-xs text-teal-400 font-mono">{viewingExpense.expenseNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-sm text-slate-700 overflow-y-auto grow">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase">Amount</span>
                  <div className="text-xl font-extrabold text-slate-900">{formatBDT(viewingExpense.amount)}</div>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 uppercase">Status</span>
                  <div className="mt-1">
                    {viewingExpense.status === 'approved' && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full inline-flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {viewingExpense.status === 'pending' && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                    {viewingExpense.status === 'rejected' && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full inline-flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 divide-y divide-slate-100">
                <div className="flex justify-between items-start gap-2 py-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Category:</span>
                  <span className="font-semibold text-slate-800 text-right break-words">{viewingExpense.category}</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Expense Date:</span>
                  <span className="font-semibold text-slate-800 text-right">{viewingExpense.expenseDate}</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Payment Method:</span>
                  <span className="font-semibold text-slate-800 text-right">{viewingExpense.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Vendor / Payee:</span>
                  <span className="font-semibold text-slate-800 text-right break-words">{viewingExpense.vendorName || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1.5">
                  <span className="text-slate-500 font-medium shrink-0">Submitted By:</span>
                  <span className="font-semibold text-slate-800 text-right break-words">{viewingExpense.spentByUserName}</span>
                </div>
                {viewingExpense.approvedByUserName && (
                  <div className="flex justify-between items-start gap-2 py-1.5">
                    <span className="text-slate-500 font-medium shrink-0">Approved / Reviewed By:</span>
                    <span className="font-semibold text-slate-800 text-right break-words">{viewingExpense.approvedByUserName}</span>
                  </div>
                )}
                {viewingExpense.approvedAt && (
                  <div className="flex justify-between items-start gap-2 py-1.5">
                    <span className="text-slate-500 font-medium shrink-0">Approval Time:</span>
                    <span className="font-semibold text-slate-800 text-right">{new Date(viewingExpense.approvedAt).toLocaleString()}</span>
                  </div>
                )}
                {viewingExpense.rejectionReason && (
                  <div className="py-2 bg-red-50 p-3 rounded-lg border border-red-200 text-red-800">
                    <span className="font-bold block text-xs uppercase mb-1">Rejection Reason:</span>
                    {viewingExpense.rejectionReason}
                  </div>
                )}
                {viewingExpense.description && (
                  <div className="py-2">
                    <span className="text-slate-500 font-medium block mb-1">Notes / Description:</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
                      {viewingExpense.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingExpense(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
