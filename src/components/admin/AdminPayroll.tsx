import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  AuthUser, 
  StaffSalaryProfile, 
  MonthlyPayroll, 
  SalaryPayment, 
  StaffAdvanceLoan, 
  PayrollAdjustment,
  UserRole 
} from '../../types';
import { 
  fetchSalaryProfiles, 
  saveSalaryProfile, 
  fetchMonthlyPayrolls, 
  generateMonthlyPayrollForPeriod, 
  approveMonthlyPayroll, 
  cancelMonthlyPayroll, 
  recordSalaryPayment, 
  fetchSalaryPayments, 
  fetchAdvanceLoans, 
  createAdvanceLoan, 
  fetchPayrollAdjustments, 
  createPayrollAdjustment 
} from '../../services/payrollService';
import { fetchStaffUsers } from '../../services/staffAuthService';
import { SalarySlipModal } from '../shared/SalarySlipModal';
import { 
  Users, 
  DollarSign, 
  Calculator, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Filter, 
  Search, 
  Printer, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  FileSpreadsheet, 
  X, 
  Check, 
  Banknote, 
  Building2, 
  RefreshCw,
  Award,
  MinusCircle,
  HelpCircle,
  Edit3,
  ChevronRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

export const AdminPayroll: React.FC = () => {
  const { formatBDT, addToast } = useApp();
  const { currentUser } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'salaries' | 'monthly' | 'payments' | 'advances' | 'bonuses' | 'deductions' | 'slips' | 'reports'
  >('overview');

  // Selected Month Period (e.g. "2026-08")
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Data States
  const [staffList, setStaffList] = useState<AuthUser[]>([]);
  const [profiles, setProfiles] = useState<StaffSalaryProfile[]>([]);
  const [payrolls, setPayrolls] = useState<MonthlyPayroll[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [advanceLoans, setAdvanceLoans] = useState<StaffAdvanceLoan[]>([]);
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [editingProfile, setEditingProfile] = useState<StaffSalaryProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  const [payingPayroll, setPayingPayroll] = useState<MonthlyPayroll | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState<boolean>(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);

  const [selectedSlip, setSelectedSlip] = useState<{ payroll: MonthlyPayroll; payment?: SalaryPayment } | null>(null);

  // Form states
  const [profileForm, setProfileForm] = useState({
    staffId: '',
    userId: '',
    staffName: '',
    role: 'sales' as UserRole,
    department: 'Sales & Marketing',
    basicSalary: 20000,
    houseRent: 6000,
    medicalAllowance: 2000,
    transportAllowance: 2500,
    mobileAllowance: 1500,
    otherAllowance: 0,
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash' as 'Cash' | 'Bank Transfer' | 'Mobile Banking' | 'Other',
    transactionReference: '',
    notes: ''
  });

  const [advanceForm, setAdvanceForm] = useState({
    staffId: '',
    recordType: 'advance' as 'advance' | 'loan',
    amount: 5000,
    installmentAmount: 2500,
    issueDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    staffId: '',
    category: 'bonus' as 'bonus' | 'deduction',
    type: 'performance_bonus' as any,
    amount: 2000,
    reason: '',
    salesTarget: 0,
    salesAchievement: 0,
    commissionRate: 5,
    deliveryCount: 0
  });

  // Load All Data
  const loadPayrollData = async () => {
    setIsLoading(true);
    try {
      const [staffs, profs, pays, pmts, loans, adjs] = await Promise.all([
        fetchStaffUsers(),
        fetchSalaryProfiles(),
        fetchMonthlyPayrolls(period),
        fetchSalaryPayments(period),
        fetchAdvanceLoans(),
        fetchPayrollAdjustments(period)
      ]);

      setStaffList(staffs);
      setProfiles(profs);
      setPayrolls(pays);
      setPayments(pmts);
      setAdvanceLoans(loans);
      setAdjustments(adjs);
    } catch (err) {
      console.error('Error loading payroll data:', err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load payroll records.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollData();
  }, [period]);

  // Generate Monthly Payroll
  const handleGeneratePayroll = async () => {
    if (!currentUser) return;
    setIsGenerating(true);
    try {
      const activeStaff = staffList.filter(s => s.status === 'active');
      const res = await generateMonthlyPayrollForPeriod(period, activeStaff, currentUser);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Payroll Generated',
          message: `Created ${res.generatedCount} staff payroll documents for ${period} (Skipped ${res.skippedCount}).`
        });
        loadPayrollData();
      } else {
        addToast({ type: 'error', title: 'Error', message: res.message || 'Failed to generate payroll.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Edit Profile Modal
  const handleOpenProfileModal = (staff?: AuthUser, existingProf?: StaffSalaryProfile) => {
    if (existingProf) {
      setEditingProfile(existingProf);
      setProfileForm({
        staffId: existingProf.staffId,
        userId: existingProf.userId,
        staffName: existingProf.staffName,
        role: existingProf.role,
        department: existingProf.department,
        basicSalary: existingProf.basicSalary,
        houseRent: existingProf.houseRent,
        medicalAllowance: existingProf.medicalAllowance,
        transportAllowance: existingProf.transportAllowance,
        mobileAllowance: existingProf.mobileAllowance,
        otherAllowance: existingProf.otherAllowance,
        effectiveFrom: existingProf.effectiveFrom
      });
    } else if (staff) {
      setEditingProfile(null);
      const staffIdentifier = staff.staffId || staff.loginId || staff.uid;
      const basic = staff.monthlyTarget ? Math.round(staff.monthlyTarget * 0.2) : 20000;
      setProfileForm({
        staffId: staffIdentifier,
        userId: staff.uid,
        staffName: staff.name,
        role: staff.role,
        department: staff.role === 'sales' ? 'Sales & Marketing' : staff.role === 'delivery' ? 'Logistics & Delivery' : 'Administration',
        basicSalary: basic,
        houseRent: Math.round(basic * 0.3),
        medicalAllowance: 2000,
        transportAllowance: 2500,
        mobileAllowance: 1500,
        otherAllowance: 0,
        effectiveFrom: new Date().toISOString().split('T')[0]
      });
    }
    setIsProfileModalOpen(true);
  };

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const res = await saveSalaryProfile({
      id: editingProfile?.id,
      ...profileForm
    }, currentUser);

    if (res.success) {
      addToast({ type: 'success', title: 'Saved', message: 'Staff salary profile saved successfully.' });
      setIsProfileModalOpen(false);
      loadPayrollData();
    } else {
      addToast({ type: 'error', title: 'Error', message: res.message || 'Failed to save salary profile' });
    }
  };

  // Approve Payroll
  const handleApprovePayroll = async (payrollId: string) => {
    if (!currentUser) return;
    const res = await approveMonthlyPayroll(payrollId, currentUser);
    if (res.success) {
      addToast({ type: 'success', title: 'Approved', message: 'Payroll approved.' });
      loadPayrollData();
    } else {
      addToast({ type: 'error', title: 'Error', message: res.message || 'Failed to approve' });
    }
  };

  // Record Payment Submit
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayroll || !currentUser) return;

    const res = await recordSalaryPayment({
      payrollId: payingPayroll.id,
      payrollPeriod: payingPayroll.payrollPeriod,
      staffId: payingPayroll.staffId,
      userId: payingPayroll.userId,
      staffName: payingPayroll.staffName,
      amount: paymentForm.amount,
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod,
      transactionReference: paymentForm.transactionReference,
      notes: paymentForm.notes
    }, currentUser);

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Payment Recorded',
        message: `Disbursed ${formatBDT(paymentForm.amount)} to ${payingPayroll.staffName}`
      });
      setIsPaymentModalOpen(false);
      setPayingPayroll(null);
      loadPayrollData();
    } else {
      addToast({ type: 'error', title: 'Payment Failed', message: res.message || 'Failed to record payment' });
    }
  };

  // Save Advance/Loan
  const handleSaveAdvanceLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !advanceForm.staffId) return;

    const staff = staffList.find(s => (s.staffId || s.loginId || s.uid) === advanceForm.staffId);
    if (!staff) {
      addToast({ type: 'error', title: 'Error', message: 'Please select a valid staff member' });
      return;
    }

    const res = await createAdvanceLoan({
      staffId: advanceForm.staffId,
      userId: staff.uid,
      staffName: staff.name,
      recordType: advanceForm.recordType,
      amount: Number(advanceForm.amount),
      issueDate: advanceForm.issueDate,
      reason: advanceForm.reason,
      installmentAmount: Number(advanceForm.installmentAmount),
      notes: '',
      createdBy: currentUser.uid
    }, currentUser);

    if (res.success) {
      addToast({ type: 'success', title: 'Issued', message: `${advanceForm.recordType.toUpperCase()} recorded successfully.` });
      setIsAdvanceModalOpen(false);
      loadPayrollData();
    } else {
      addToast({ type: 'error', title: 'Error', message: res.message || 'Failed to record advance/loan' });
    }
  };

  // Save Bonus / Deduction
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !adjustmentForm.staffId) return;

    const staff = staffList.find(s => (s.staffId || s.loginId || s.uid) === adjustmentForm.staffId);
    if (!staff) return;

    let computedAmount = Number(adjustmentForm.amount);
    if (adjustmentForm.type === 'sales_commission' && adjustmentForm.salesAchievement > 0) {
      computedAmount = Math.round((adjustmentForm.salesAchievement * adjustmentForm.commissionRate) / 100);
    }

    const res = await createPayrollAdjustment({
      staffId: adjustmentForm.staffId,
      userId: staff.uid,
      staffName: staff.name,
      payrollPeriod: period,
      category: adjustmentForm.category,
      type: adjustmentForm.type,
      amount: computedAmount,
      reason: adjustmentForm.reason,
      salesTarget: adjustmentForm.salesTarget,
      salesAchievement: adjustmentForm.salesAchievement,
      commissionRate: adjustmentForm.commissionRate,
      commissionAmount: computedAmount,
      deliveryCount: adjustmentForm.deliveryCount,
      notes: '',
      createdBy: currentUser.uid
    }, currentUser);

    if (res.success) {
      addToast({ type: 'success', title: 'Adjustment Added', message: `${adjustmentForm.type} recorded.` });
      setIsAdjustmentModalOpen(false);
      loadPayrollData();
    } else {
      addToast({ type: 'error', title: 'Error', message: res.message || 'Failed to add adjustment' });
    }
  };

  // Overall Stats
  const totalMonthlyPayroll = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const paidAmount = payrolls.reduce((s, p) => s + p.paidAmount, 0);
  const pendingAmount = payrolls.reduce((s, p) => s + p.dueAmount, 0);
  const totalBonus = payrolls.reduce((s, p) => s + (p.totalBonus + p.totalCommission + p.totalIncentives), 0);
  const totalDeduction = payrolls.reduce((s, p) => s + p.totalDeductions, 0);

  const outstandingAdvances = advanceLoans
    .filter(a => a.recordType === 'advance' && a.status === 'active')
    .reduce((s, a) => s + a.remainingBalance, 0);

  const outstandingLoans = advanceLoans
    .filter(a => a.recordType === 'loan' && a.status === 'active')
    .reduce((s, a) => s + a.remainingBalance, 0);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden sm:overflow-x-visible">
      
      {/* Top Banner & Month Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#087F7A] to-emerald-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white">Staff HR & Payroll Management</h1>
              <p className="text-[11px] sm:text-xs text-teal-300/80 mt-0.5">B2B Employee Salaries, Allowances, Commissions, Loans & Payslips</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Period Picker */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700 text-xs text-white">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span className="font-semibold text-slate-300">Payroll Month:</span>
              </div>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-900 text-white font-bold px-2 py-1 rounded border border-slate-700 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <button
              onClick={handleGeneratePayroll}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-xl shadow-xs transition-all disabled:opacity-50 min-h-[38px] w-full sm:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate {period} Payroll
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-1 mt-4 sm:mt-6 border-t border-slate-800/80 pt-3 sm:pt-4 overflow-x-auto text-xs scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'overview', label: 'Overview', icon: <Building2 className="w-3.5 h-3.5" /> },
            { id: 'salaries', label: 'Staff Salaries', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'monthly', label: 'Monthly Payroll', icon: <Calculator className="w-3.5 h-3.5" /> },
            { id: 'payments', label: 'Salary Payments', icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: 'advances', label: 'Advances & Loans', icon: <Banknote className="w-3.5 h-3.5" /> },
            { id: 'bonuses', label: 'Bonuses & Incentives', icon: <Award className="w-3.5 h-3.5" /> },
            { id: 'deductions', label: 'Deductions', icon: <MinusCircle className="w-3.5 h-3.5" /> },
            { id: 'slips', label: 'Salary Slips', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'reports', label: 'Payroll Reports', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold whitespace-nowrap shrink-0 transition-all min-h-[38px] ${
                activeTab === tab.id
                  ? 'bg-teal-500 text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-[#087F7A] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* TAB 1: PAYROLL OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Monthly</span>
                  <span className="text-lg sm:text-2xl font-black text-slate-900 mt-1 block">{formatBDT(totalMonthlyPayroll)}</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 block">Period: {period}</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Paid Amount</span>
                  <span className="text-lg sm:text-2xl font-black text-emerald-700 mt-1 block">{formatBDT(paidAmount)}</span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 sm:mt-1 block">Disbursed to staff</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] sm:text-xs font-semibold text-amber-700 uppercase tracking-wider block">Pending / Due</span>
                  <span className="text-lg sm:text-2xl font-black text-amber-700 mt-1 block">{formatBDT(pendingAmount)}</span>
                  <span className="text-[10px] sm:text-[11px] text-amber-600 mt-0.5 sm:mt-1 block">Awaiting payment</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] sm:text-xs font-semibold text-teal-700 uppercase tracking-wider block">Bonus & Incentives</span>
                  <span className="text-lg sm:text-2xl font-black text-teal-700 mt-1 block">{formatBDT(totalBonus)}</span>
                  <span className="text-[10px] sm:text-[11px] text-teal-600 mt-0.5 sm:mt-1 block">Commissions & rewards</span>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] sm:text-xs font-semibold text-red-700 uppercase tracking-wider block">Total Deductions</span>
                  <span className="text-lg sm:text-2xl font-black text-red-700 mt-1 block">{formatBDT(totalDeduction)}</span>
                  <span className="text-[10px] sm:text-[11px] text-red-600 mt-0.5 sm:mt-1 block">Absence, loans & advances</span>
                </div>
              </div>

              {/* Outstanding Advances & Loans summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block">Outstanding Salary Advances</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">{formatBDT(outstandingAdvances)}</span>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Short-term advance balance pending recovery</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('advances'); setIsAdvanceModalOpen(true); }}
                    className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors min-h-[38px]"
                  >
                    + Issue Advance
                  </button>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block">Outstanding Staff Loans</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">{formatBDT(outstandingLoans)}</span>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Long-term loan balance pending recovery</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('advances'); setIsAdvanceModalOpen(true); }}
                    className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-white bg-[#087F7A] hover:bg-teal-700 rounded-xl transition-colors min-h-[38px]"
                  >
                    + Issue Loan
                  </button>
                </div>
              </div>

              {/* Staff Payroll Status Summary */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 sm:mb-4">Payroll Status Breakdown — {period}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                  {['draft', 'approved', 'partially_paid', 'paid'].map((statusKey) => {
                    const count = payrolls.filter(p => p.status === statusKey).length;
                    const sum = payrolls.filter(p => p.status === statusKey).reduce((s, p) => s + p.netSalary, 0);
                    return (
                      <div key={statusKey} className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 block">{statusKey.replace('_', ' ')}</span>
                        <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between mt-1.5 sm:mt-2 gap-1">
                          <span className="text-lg sm:text-2xl font-black text-slate-900">{count} Staff</span>
                          <span className="text-[11px] sm:text-xs font-bold text-teal-700">{formatBDT(sum)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF SALARIES */}
          {activeTab === 'salaries' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
                <div className="relative flex-1 max-w-full sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">Total Staff: {staffList.length}</span>
              </div>

              {/* Mobile View: Staff Cards */}
              <div className="block md:hidden space-y-3">
                {staffList
                  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.staffId || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((staff) => {
                    const staffIdentifier = staff.staffId || staff.loginId || staff.uid;
                    const prof = profiles.find(p => p.staffId === staffIdentifier || p.userId === staff.uid);
                    const basic = prof ? prof.basicSalary : (staff.monthlyTarget ? Math.round(staff.monthlyTarget * 0.2) : 20000);
                    const gross = prof ? prof.grossSalary : (basic + Math.round(basic * 0.3) + 2000 + 2500 + 1500);

                    return (
                      <div key={staff.uid} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{staff.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{staffIdentifier}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                              {staff.role}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                              Active
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Department</span>
                            <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">{prof?.department || 'Operations'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Effective From</span>
                            <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">{prof?.effectiveFrom || 'Current'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Basic Salary</span>
                            <span className="font-semibold text-slate-900 text-[11px] block mt-0.5">{formatBDT(basic)}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-100">
                            <span className="text-[10px] text-teal-700 block font-semibold">Gross Salary</span>
                            <span className="font-bold text-teal-900 text-xs block mt-0.5">{formatBDT(gross)}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenProfileModal(staff, prof)}
                          className="w-full inline-flex items-center justify-center gap-1 py-2 px-3 text-xs font-semibold text-[#087F7A] bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors min-h-[38px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Manage Salary Profile
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Desktop View: Staff Table */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role & Dept</th>
                      <th className="py-3 px-4">Basic Salary</th>
                      <th className="py-3 px-4">Allowances</th>
                      <th className="py-3 px-4">Gross Salary</th>
                      <th className="py-3 px-4">Effective From</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList
                      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.staffId || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((staff) => {
                        const staffIdentifier = staff.staffId || staff.loginId || staff.uid;
                        const prof = profiles.find(p => p.staffId === staffIdentifier || p.userId === staff.uid);
                        const basic = prof ? prof.basicSalary : (staff.monthlyTarget ? Math.round(staff.monthlyTarget * 0.2) : 20000);
                        const gross = prof ? prof.grossSalary : (basic + Math.round(basic * 0.3) + 2000 + 2500 + 1500);

                        return (
                          <tr key={staff.uid} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {staff.name}
                              <span className="block text-[10px] text-slate-400 font-mono">{staffIdentifier}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="capitalize font-semibold text-slate-700">{staff.role}</span>
                              <span className="block text-[10px] text-slate-400">{prof?.department || 'Operations'}</span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{formatBDT(basic)}</td>
                            <td className="py-3 px-4 text-slate-600">{formatBDT(gross - basic)}</td>
                            <td className="py-3 px-4 font-bold text-teal-800 text-sm">{formatBDT(gross)}</td>
                            <td className="py-3 px-4 text-slate-500">{prof?.effectiveFrom || 'Current'}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                Active
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleOpenProfileModal(staff, prof)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#087F7A] bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors min-h-[36px]"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Manage Salary
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MONTHLY PAYROLL */}
          {activeTab === 'monthly' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Monthly Payroll Records — {period}</h3>
                  <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Total: {payrolls.length}</span>
                </div>

                {/* Mobile View: Payroll Cards */}
                <div className="block md:hidden space-y-3 p-3.5">
                  {payrolls.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No payroll generated for period {period}. Click "Generate {period} Payroll" above to batch process.
                    </div>
                  ) : (
                    payrolls.map((pr) => (
                      <div key={pr.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{pr.staffName}</span>
                            <span className="text-[10px] text-slate-500 uppercase block mt-0.5">{pr.role} | {pr.staffId}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            pr.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pr.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : pr.status === 'approved'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {pr.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Financial breakdown */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Gross Salary</span>
                            <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">{formatBDT(pr.grossSalary)}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Bonus / Comm.</span>
                            <span className="font-semibold text-teal-700 text-[11px] block mt-0.5">+{formatBDT(pr.totalBonus + pr.totalCommission + pr.totalIncentives)}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Deductions</span>
                            <span className="font-semibold text-red-600 text-[11px] block mt-0.5">-{formatBDT(pr.totalDeductions)}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100">
                            <span className="text-[10px] text-teal-800 font-semibold block">Net Salary</span>
                            <span className="font-black text-slate-900 text-xs block mt-0.5">{formatBDT(pr.netSalary)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 px-1">
                          <span className="text-emerald-700 font-semibold text-[11px]">Paid: {formatBDT(pr.paidAmount)}</span>
                          <span className="text-amber-700 font-bold text-[11px]">Due: {formatBDT(pr.dueAmount)}</span>
                        </div>

                        {/* Actions row */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
                          {pr.status === 'draft' && (
                            <button
                              onClick={() => handleApprovePayroll(pr.id)}
                              className="flex-1 py-2 px-3 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors min-h-[38px] text-center"
                            >
                              Approve
                            </button>
                          )}

                          {pr.status !== 'paid' && pr.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setPayingPayroll(pr);
                                setPaymentForm({
                                  amount: pr.dueAmount,
                                  paymentDate: new Date().toISOString().split('T')[0],
                                  paymentMethod: 'Cash',
                                  transactionReference: '',
                                  notes: ''
                                });
                                setIsPaymentModalOpen(true);
                              }}
                              className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors min-h-[38px] text-center"
                            >
                              Pay Salary
                            </button>
                          )}

                          <button
                            onClick={() => {
                              const pay = payments.find(p => p.payrollId === pr.id);
                              setSelectedSlip({ payroll: pr, payment: pay });
                            }}
                            className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors min-h-[38px] text-center"
                          >
                            Slip
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop View: Payroll Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                        <th className="py-3 px-4">Staff</th>
                        <th className="py-3 px-4">Gross</th>
                        <th className="py-3 px-4">Bonus / Commission</th>
                        <th className="py-3 px-4">Deductions</th>
                        <th className="py-3 px-4">Net Salary</th>
                        <th className="py-3 px-4">Paid</th>
                        <th className="py-3 px-4">Due</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payrolls.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">
                            No payroll generated for period {period}. Click "Generate {period} Payroll" above to batch process.
                          </td>
                        </tr>
                      ) : (
                        payrolls.map((pr) => (
                          <tr key={pr.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {pr.staffName}
                              <span className="block text-[10px] text-slate-400 capitalize">{pr.role} | {pr.staffId}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-800">{formatBDT(pr.grossSalary)}</td>
                            <td className="py-3 px-4 text-teal-700 font-semibold">
                              +{formatBDT(pr.totalBonus + pr.totalCommission + pr.totalIncentives)}
                            </td>
                            <td className="py-3 px-4 text-red-600 font-semibold">
                              -{formatBDT(pr.totalDeductions)}
                            </td>
                            <td className="py-3 px-4 font-black text-slate-900 text-sm">{formatBDT(pr.netSalary)}</td>
                            <td className="py-3 px-4 font-semibold text-emerald-700">{formatBDT(pr.paidAmount)}</td>
                            <td className="py-3 px-4 font-semibold text-amber-700">{formatBDT(pr.dueAmount)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                pr.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pr.status === 'partially_paid'
                                  ? 'bg-amber-100 text-amber-800'
                                  : pr.status === 'approved'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {pr.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {pr.status === 'draft' && (
                                <button
                                  onClick={() => handleApprovePayroll(pr.id)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors"
                                >
                                  Approve
                                </button>
                              )}

                              {pr.status !== 'paid' && pr.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    setPayingPayroll(pr);
                                    setPaymentForm({
                                      amount: pr.dueAmount,
                                      paymentDate: new Date().toISOString().split('T')[0],
                                      paymentMethod: 'Cash',
                                      transactionReference: '',
                                      notes: ''
                                    });
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                                >
                                  Pay Salary
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  const pay = payments.find(p => p.payrollId === pr.id);
                                  setSelectedSlip({ payroll: pr, payment: pay });
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                              >
                                Slip
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SALARY PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Salary Disbursal Ledger</h3>
                <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Total: {payments.length}</span>
              </div>

              {/* Mobile View: Payments Cards */}
              <div className="block md:hidden space-y-3 p-3.5">
                {payments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No salary payment transactions recorded for period {period}.
                  </div>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-mono text-[10px] text-slate-500">{p.id}</span>
                        <span className="text-[11px] font-semibold text-slate-700">{p.paymentDate}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">{p.staffName}</span>
                          <span className="text-[10px] text-slate-500">Period: {p.payrollPeriod}</span>
                        </div>
                        <span className="font-bold text-emerald-800 text-base">{formatBDT(p.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-800">
                          {p.paymentMethod}
                        </span>
                        <span className="font-mono text-slate-500">Ref: {p.transactionReference || 'N/A'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Payments Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-3 px-4">Txn ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Disbursed Amount</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Ref / Txn No</th>
                      <th className="py-3 px-4">Disbursed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No salary payment transactions recorded for period {period}.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{p.id}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{p.paymentDate}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{p.staffName}</td>
                          <td className="py-3 px-4 text-slate-600">{p.payrollPeriod}</td>
                          <td className="py-3 px-4 font-bold text-emerald-800 text-sm">{formatBDT(p.amount)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono">{p.transactionReference || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-600">{p.paidByName || 'HQ Finance'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ADVANCES & LOANS */}
          {activeTab === 'advances' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Staff Advance & Loan Records</h3>
                <button
                  onClick={() => setIsAdvanceModalOpen(true)}
                  className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl hover:opacity-95 transition-opacity inline-flex items-center justify-center min-h-[38px]"
                >
                  + Issue New Advance / Loan
                </button>
              </div>

              {/* Mobile View: Advances Cards */}
              <div className="block md:hidden space-y-3">
                {advanceLoans.length === 0 ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500">
                    No salary advances or loans recorded.
                  </div>
                ) : (
                  advanceLoans.map((al) => (
                    <div key={al.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                          al.recordType === 'advance' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'
                        }`}>
                          {al.recordType}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          al.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {al.status}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{al.staffName}</span>
                        <span className="text-[10px] text-slate-500">Issued: {al.issueDate}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">Original Amount</span>
                          <span className="font-bold text-slate-900 text-[11px] block mt-0.5">{formatBDT(al.amount)}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">Repaid Amount</span>
                          <span className="font-semibold text-emerald-700 text-[11px] block mt-0.5">{formatBDT(al.repaymentAmount)}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-red-50/80 border border-red-100">
                          <span className="text-[10px] text-red-700 font-semibold block">Remaining Balance</span>
                          <span className="font-bold text-red-900 text-xs block mt-0.5">{formatBDT(al.remainingBalance)}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">Monthly Deduction</span>
                          <span className="font-semibold text-slate-800 text-[11px] block mt-0.5">{formatBDT(al.installmentAmount)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Advances Table */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-3 px-4">Record Type</th>
                      <th className="py-3 px-4">Staff Name</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Original Amount</th>
                      <th className="py-3 px-4">Repaid Amount</th>
                      <th className="py-3 px-4">Remaining Balance</th>
                      <th className="py-3 px-4">Monthly Installment</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {advanceLoans.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No salary advances or loans recorded.
                        </td>
                      </tr>
                    ) : (
                      advanceLoans.map((al) => (
                        <tr key={al.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold capitalize text-slate-900">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                              al.recordType === 'advance' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'
                            }`}>
                              {al.recordType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{al.staffName}</td>
                          <td className="py-3 px-4 text-slate-600">{al.issueDate}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{formatBDT(al.amount)}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">{formatBDT(al.repaymentAmount)}</td>
                          <td className="py-3 px-4 font-bold text-red-700">{formatBDT(al.remainingBalance)}</td>
                          <td className="py-3 px-4 text-slate-700">{formatBDT(al.installmentAmount)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              al.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {al.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: BONUSES & INCENTIVES */}
          {activeTab === 'bonuses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Bonuses, Sales Commission & Delivery Incentives</h3>
                <button
                  onClick={() => {
                    setAdjustmentForm(prev => ({ ...prev, category: 'bonus', type: 'performance_bonus' }));
                    setIsAdjustmentModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl hover:opacity-95 transition-opacity inline-flex items-center justify-center min-h-[38px]"
                >
                  + Add Bonus / Incentive
                </button>
              </div>

              {/* Mobile View: Bonus Cards */}
              <div className="block md:hidden space-y-3">
                {adjustments.filter(a => a.category === 'bonus').length === 0 ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500">
                    No bonus or incentive adjustments recorded for {period}.
                  </div>
                ) : (
                  adjustments.filter(a => a.category === 'bonus').map((adj) => (
                    <div key={adj.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900 text-sm">{adj.staffName}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-900 capitalize">
                          {adj.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-500">Period: {adj.payrollPeriod}</span>
                        <span className="font-bold text-emerald-700 text-sm">{formatBDT(adj.amount)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <strong>Reason:</strong> {adj.reason || 'N/A'}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Bonus Table */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-3 px-4">Staff</th>
                      <th className="py-3 px-4">Incentive Type</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adjustments.filter(a => a.category === 'bonus').length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No bonus or incentive adjustments recorded for {period}.
                        </td>
                      </tr>
                    ) : (
                      adjustments.filter(a => a.category === 'bonus').map((adj) => (
                        <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{adj.staffName}</td>
                          <td className="py-3 px-4 font-semibold text-teal-800 capitalize">{adj.type.replace('_', ' ')}</td>
                          <td className="py-3 px-4 font-bold text-emerald-700 text-sm">{formatBDT(adj.amount)}</td>
                          <td className="py-3 px-4 text-slate-600">{adj.payrollPeriod}</td>
                          <td className="py-3 px-4 text-slate-600">{adj.reason || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: DEDUCTIONS */}
          {activeTab === 'deductions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Salary Deductions & Penalties</h3>
                <button
                  onClick={() => {
                    setAdjustmentForm(prev => ({ ...prev, category: 'deduction', type: 'absence_deduction' }));
                    setIsAdjustmentModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center justify-center min-h-[38px]"
                >
                  + Add Deduction
                </button>
              </div>

              {/* Mobile View: Deductions Cards */}
              <div className="block md:hidden space-y-3">
                {adjustments.filter(a => a.category === 'deduction').length === 0 ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500">
                    No deductions recorded for {period}.
                  </div>
                ) : (
                  adjustments.filter(a => a.category === 'deduction').map((adj) => (
                    <div key={adj.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900 text-sm">{adj.staffName}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-900 capitalize">
                          {adj.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-500">Period: {adj.payrollPeriod}</span>
                        <span className="font-bold text-red-700 text-sm">{formatBDT(adj.amount)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <strong>Reason:</strong> {adj.reason || 'N/A'}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Deductions Table */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-3 px-4">Staff</th>
                      <th className="py-3 px-4">Deduction Type</th>
                      <th className="py-3 px-4">Deduction Amount</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adjustments.filter(a => a.category === 'deduction').length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No deductions recorded for {period}.
                        </td>
                      </tr>
                    ) : (
                      adjustments.filter(a => a.category === 'deduction').map((adj) => (
                        <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{adj.staffName}</td>
                          <td className="py-3 px-4 font-semibold text-red-700 capitalize">{adj.type.replace('_', ' ')}</td>
                          <td className="py-3 px-4 font-bold text-red-700 text-sm">{formatBDT(adj.amount)}</td>
                          <td className="py-3 px-4 text-slate-600">{adj.payrollPeriod}</td>
                          <td className="py-3 px-4 text-slate-600">{adj.reason || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: SALARY SLIPS */}
          {activeTab === 'slips' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1 sm:mb-2">Generate & Print Staff Payslips</h3>
                <p className="text-xs text-slate-500 mb-4">Click "Payslip" on any staff payroll below to generate a printable B2B salary slip.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {payrolls.map((pr) => (
                    <div key={pr.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{pr.staffName}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{pr.role} | {pr.payrollPeriod}</span>
                        <span className="font-bold text-teal-800 text-xs block mt-1">Net: {formatBDT(pr.netSalary)}</span>
                      </div>
                      <button
                        onClick={() => {
                          const pay = payments.find(p => p.payrollId === pr.id);
                          setSelectedSlip({ payroll: pr, payment: pay });
                        }}
                        className="px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1 min-h-[36px] shrink-0"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Payslip
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: PAYROLL REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Monthly B2B Payroll Executive Summary Report</h3>
                  <p className="text-xs text-slate-500">Period: {period} | Official Glowzaa Financial Record</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl transition-all inline-flex items-center justify-center gap-2 min-h-[38px]"
                >
                  <Printer className="w-4 h-4" />
                  Print Executive Report
                </button>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 uppercase text-[9px] sm:text-[10px] font-bold block">Gross Remuneration</span>
                    <span className="text-base sm:text-xl font-bold text-slate-900 mt-1 block">
                      {formatBDT(payrolls.reduce((s, p) => s + p.grossSalary, 0))}
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 uppercase text-[9px] sm:text-[10px] font-bold block">Variable Incentives</span>
                    <span className="text-base sm:text-xl font-bold text-teal-800 mt-1 block">
                      {formatBDT(totalBonus)}
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 uppercase text-[9px] sm:text-[10px] font-bold block">Recoveries & Deductions</span>
                    <span className="text-base sm:text-xl font-bold text-red-700 mt-1 block">
                      {formatBDT(totalDeduction)}
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 uppercase text-[9px] sm:text-[10px] font-bold block">Final Net Committed</span>
                    <span className="text-base sm:text-xl font-bold text-emerald-800 mt-1 block">
                      {formatBDT(totalMonthlyPayroll)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Department Wise Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
                    {['Sales & Marketing', 'Logistics & Delivery', 'Administration'].map((dept) => {
                      const deptPayrolls = payrolls.filter(p => p.department === dept);
                      const deptTotal = deptPayrolls.reduce((s, p) => s + p.netSalary, 0);
                      return (
                        <div key={dept} className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                          <span className="font-bold text-slate-900 block">{dept}</span>
                          <div className="flex justify-between items-baseline mt-2">
                            <span className="text-slate-500">{deptPayrolls.length} Employees</span>
                            <span className="font-bold text-teal-800 text-sm">{formatBDT(deptTotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: MANAGE SALARY PROFILE */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-[calc(100vw-24px)] max-w-lg p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Configure Staff Salary Profile</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Staff Member</label>
                <input
                  type="text"
                  disabled
                  value={`${profileForm.staffName} (${profileForm.staffId})`}
                  className="w-full px-3 py-2 bg-slate-100 rounded-xl font-semibold text-slate-800 border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Basic Salary (BDT)</label>
                  <input
                    type="number"
                    required
                    value={profileForm.basicSalary}
                    onChange={(e) => setProfileForm({ ...profileForm, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">House Rent (BDT)</label>
                  <input
                    type="number"
                    value={profileForm.houseRent}
                    onChange={(e) => setProfileForm({ ...profileForm, houseRent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Medical</label>
                  <input
                    type="number"
                    value={profileForm.medicalAllowance}
                    onChange={(e) => setProfileForm({ ...profileForm, medicalAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Transport</label>
                  <input
                    type="number"
                    value={profileForm.transportAllowance}
                    onChange={(e) => setProfileForm({ ...profileForm, transportAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-slate-700 block mb-1">Mobile</label>
                  <input
                    type="number"
                    value={profileForm.mobileAllowance}
                    onChange={(e) => setProfileForm({ ...profileForm, mobileAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 flex justify-between items-center text-xs">
                <span className="font-bold text-teal-900">Gross Salary:</span>
                <span className="font-black text-teal-900 text-sm">
                  {formatBDT(
                    Number(profileForm.basicSalary) +
                    Number(profileForm.houseRent) +
                    Number(profileForm.medicalAllowance) +
                    Number(profileForm.transportAllowance) +
                    Number(profileForm.mobileAllowance) +
                    Number(profileForm.otherAllowance)
                  )}
                </span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl hover:opacity-95 min-h-[38px]"
                >
                  Save Salary Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD SALARY PAYMENT */}
      {isPaymentModalOpen && payingPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-[calc(100vw-24px)] max-w-md p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Record Salary Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1 text-xs">
              <p><strong>Employee:</strong> {payingPayroll.staffName} ({payingPayroll.staffId})</p>
              <p><strong>Period:</strong> {payingPayroll.payrollPeriod}</p>
              <p><strong>Net Salary:</strong> {formatBDT(payingPayroll.netSalary)}</p>
              <p><strong>Remaining Due:</strong> <span className="text-amber-700 font-bold">{formatBDT(payingPayroll.dueAmount)}</span></p>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Disbursal Amount (BDT)</label>
                <input
                  type="number"
                  required
                  max={payingPayroll.dueAmount}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-sm text-emerald-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Mobile Banking">Mobile Banking (bKash/Nagad)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Txn Ref / Cheque No (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. BKSH-9812401"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs min-h-[38px]"
                >
                  Confirm Disbursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ISSUE ADVANCE / LOAN */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-[calc(100vw-24px)] max-w-md p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Issue Salary Advance / Loan</h3>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvanceLoan} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Record Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdvanceForm({ ...advanceForm, recordType: 'advance' })}
                    className={`py-2 rounded-xl font-bold border ${advanceForm.recordType === 'advance' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    Salary Advance
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceForm({ ...advanceForm, recordType: 'loan' })}
                    className={`py-2 rounded-xl font-bold border ${advanceForm.recordType === 'loan' ? 'bg-teal-100 border-teal-300 text-teal-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    Staff Loan
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Staff Member</label>
                <select
                  required
                  value={advanceForm.staffId}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, staffId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="">-- Choose Staff --</option>
                  {staffList.map((s) => {
                    const sid = s.staffId || s.loginId || s.uid;
                    return <option key={s.uid} value={sid}>{s.name} ({sid})</option>;
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Amount (BDT)</label>
                  <input
                    type="number"
                    required
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Monthly Deduction</label>
                  <input
                    type="number"
                    required
                    value={advanceForm.installmentAmount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, installmentAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency family medical advance"
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl min-h-[38px]"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD BONUS / DEDUCTION */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-[calc(100vw-24px)] max-w-md p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Add Payroll Adjustment</h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Adjustment Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, category: 'bonus', type: 'performance_bonus' })}
                    className={`py-2 rounded-xl font-bold border ${adjustmentForm.category === 'bonus' ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    Bonus / Incentive
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, category: 'deduction', type: 'absence_deduction' })}
                    className={`py-2 rounded-xl font-bold border ${adjustmentForm.category === 'deduction' ? 'bg-red-100 border-red-300 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    Deduction
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Staff Member</label>
                <select
                  required
                  value={adjustmentForm.staffId}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, staffId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="">-- Choose Staff --</option>
                  {staffList.map((s) => {
                    const sid = s.staffId || s.loginId || s.uid;
                    return <option key={s.uid} value={sid}>{s.name} ({sid})</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Type</label>
                <select
                  value={adjustmentForm.type}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  {adjustmentForm.category === 'bonus' ? (
                    <>
                      <option value="performance_bonus">Performance Bonus</option>
                      <option value="sales_commission">Sales Commission</option>
                      <option value="delivery_incentive">Delivery Incentive</option>
                      <option value="target_achievement">Target Achievement Bonus</option>
                      <option value="special_bonus">Special Eid / Festival Bonus</option>
                      <option value="other_incentive">Other Incentive</option>
                    </>
                  ) : (
                    <>
                      <option value="absence_deduction">Absence Deduction</option>
                      <option value="late_deduction">Late Attendance Deduction</option>
                      <option value="damage_loss_recovery">Damage / Loss Recovery</option>
                      <option value="other_deduction">Other Deduction</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount (BDT)</label>
                <input
                  type="number"
                  required
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent sales target achievement"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl min-h-[38px]"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY SLIP MODAL */}
      {selectedSlip && (
        <SalarySlipModal
          payroll={selectedSlip.payroll}
          payment={selectedSlip.payment}
          onClose={() => setSelectedSlip(null)}
        />
      )}

    </div>
  );
};
