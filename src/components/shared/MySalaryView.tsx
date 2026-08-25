import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { MonthlyPayroll, SalaryPayment, StaffSalaryProfile } from '../../types';
import { 
  getSalaryProfileByStaffId, 
  fetchMonthlyPayrolls, 
  fetchSalaryPayments 
} from '../../services/payrollService';
import { SalarySlipModal } from './SalarySlipModal';
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Building2, 
  CreditCard,
  Briefcase,
  ShieldCheck
} from 'lucide-react';

export const MySalaryView: React.FC = () => {
  const { currentUser } = useAuth();
  const { formatBDT } = useApp();

  const [profile, setProfile] = useState<StaffSalaryProfile | null>(null);
  const [payrolls, setPayrolls] = useState<MonthlyPayroll[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedSlip, setSelectedSlip] = useState<{ payroll: MonthlyPayroll; payment?: SalaryPayment } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const staffId = currentUser.staffId || currentUser.loginId || currentUser.uid;

    async function loadData() {
      setIsLoading(true);
      try {
        const [prof, allPayrolls, allPayments] = await Promise.all([
          getSalaryProfileByStaffId(staffId),
          fetchMonthlyPayrolls(),
          fetchSalaryPayments(undefined, staffId)
        ]);

        setProfile(prof);
        const myPayrolls = allPayrolls.filter(p => p.staffId === staffId || p.userId === currentUser?.uid);
        setPayrolls(myPayrolls);
        setPayments(allPayments);
      } catch (err) {
        console.error('Error loading my salary data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#087F7A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const latestPayroll = payrolls[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">My Salary & Payslips</h1>
              <p className="text-xs text-teal-300/80">View current salary structure, allowances, and monthly payslips</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Logged in as</span>
            <span className="font-semibold text-white">{currentUser?.name} ({currentUser?.loginId || currentUser?.role})</span>
          </div>
        </div>
      </div>

      {/* Salary Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Basic Salary</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {profile ? formatBDT(profile.basicSalary) : formatBDT(latestPayroll?.basicSalary || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Base remuneration</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Allowances</span>
          <span className="text-2xl font-bold text-teal-700 mt-1 block">
            {profile ? formatBDT(profile.grossSalary - profile.basicSalary) : formatBDT(latestPayroll?.totalAllowances || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">House, Medical, Transport, Mobile</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Monthly Gross</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">
            {profile ? formatBDT(profile.grossSalary) : formatBDT(latestPayroll?.grossSalary || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Basic + Total Allowances</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Latest Net Salary</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {latestPayroll ? formatBDT(latestPayroll.netSalary) : 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {latestPayroll ? `Period: ${latestPayroll.payrollPeriod}` : 'No payroll generated'}
          </span>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#087F7A]" />
            Monthly Payslip History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Basic</th>
                <th className="py-3 px-4">Gross</th>
                <th className="py-3 px-4">Commissions / Bonus</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Payable</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No payslips found. Payrolls generated by HR will appear here.
                  </td>
                </tr>
              ) : (
                payrolls.map((pr) => {
                  const pay = payments.find(p => p.payrollId === pr.id);
                  return (
                    <tr key={pr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{pr.payrollPeriod}</td>
                      <td className="py-3 px-4 text-slate-700">{formatBDT(pr.basicSalary)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{formatBDT(pr.grossSalary)}</td>
                      <td className="py-3 px-4 text-teal-700 font-semibold">
                        +{formatBDT(pr.totalCommission + pr.totalBonus + pr.totalIncentives)}
                      </td>
                      <td className="py-3 px-4 text-red-600 font-semibold">
                        -{formatBDT(pr.totalDeductions)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        {formatBDT(pr.netSalary)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          pr.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pr.status === 'partially_paid'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {pr.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedSlip({ payroll: pr, payment: pay })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#087F7A] bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          View Slip
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Modal */}
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
