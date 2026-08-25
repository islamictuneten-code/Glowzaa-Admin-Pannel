import React from 'react';
import { MonthlyPayroll, SalaryPayment } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Printer, Building2, CheckCircle2, ShieldCheck, FileText, Banknote, Calendar, User } from 'lucide-react';

interface SalarySlipModalProps {
  payroll: MonthlyPayroll | null;
  payment?: SalaryPayment | null;
  onClose: () => void;
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({ payroll, payment, onClose }) => {
  const { formatBDT } = useApp();

  if (!payroll) return null;

  const handlePrint = () => {
    window.print();
  };

  const periodDate = new Date(payroll.payrollPeriod + '-01');
  const monthYearStr = periodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-[calc(100vw-24px)] max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 print:shadow-none print:border-none print:m-0 print:w-full">
        
        {/* Modal Header Actions (Hidden in Print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 shrink-0" />
            <h3 className="font-semibold text-xs sm:text-base text-white truncate">Staff Salary Slip — {monthYearStr}</h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-lg shadow-xs transition-all min-h-[34px]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Salary Slip</span>
              <span className="sm:hidden">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 text-slate-800 bg-white print:p-6 print:space-y-4" id="salary-slip-printable">
          
          {/* B2B Header & Branding */}
          <div className="flex flex-col sm:flex-row items-start justify-between border-b border-slate-200 pb-4 sm:pb-6 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#087F7A] to-emerald-700 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-xs">
                  G
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">GLOWZAA</h1>
                  <p className="text-[10px] sm:text-xs font-semibold text-teal-700 uppercase tracking-widest">B2B Wholesale Commerce</p>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-2">
                Dhaka Central HQ & Fulfillment Hub, Bangladesh<br />
                Phone: +880 1700-000000 | Email: hr@glowzaab2b.com
              </p>
            </div>
            <div className="sm:text-right">
              <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] sm:text-xs font-bold rounded-md uppercase tracking-wider border border-slate-200">
                Official Payslip
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1 sm:mt-2">{monthYearStr}</h2>
              <p className="text-[10px] sm:text-xs text-slate-500">Ref: {payroll.id}</p>
            </div>
          </div>

          {/* Employee Info Grid */}
          <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block uppercase text-[9px] sm:text-[10px] tracking-wider font-semibold">Employee Name</span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm block truncate">{payroll.staffName}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[9px] sm:text-[10px] tracking-wider font-semibold">Staff ID</span>
              <span className="font-semibold text-slate-800 block truncate">{payroll.staffId}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[9px] sm:text-[10px] tracking-wider font-semibold">Role</span>
              <span className="font-semibold text-slate-800 capitalize block truncate">{payroll.role} Staff</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[9px] sm:text-[10px] tracking-wider font-semibold">Department</span>
              <span className="font-semibold text-slate-800 block truncate">{payroll.department || 'Operations'}</span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 print:grid-cols-2 print:gap-4">
            
            {/* EARNINGS & ALLOWANCES */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-50/80 border-b border-emerald-100 px-3.5 sm:px-4 py-2 flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-emerald-900 uppercase tracking-wider">Earnings & Allowances</span>
                <span className="text-[11px] sm:text-xs font-bold text-emerald-700">Amount (BDT)</span>
              </div>
              <div className="p-3 sm:p-4 space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.basicSalary)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">House Rent Allowance</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.houseRent)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Medical Allowance</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.medicalAllowance)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Transport Allowance</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.transportAllowance)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Mobile Allowance</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.mobileAllowance)}</span>
                </div>
                {payroll.otherAllowance > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Other Allowances</span>
                    <span className="font-semibold text-slate-800">{formatBDT(payroll.otherAllowance)}</span>
                  </div>
                )}
                {payroll.totalCommission > 0 && (
                  <div className="flex justify-between pt-1 font-semibold text-teal-800">
                    <span>Sales Commission</span>
                    <span>{formatBDT(payroll.totalCommission)}</span>
                  </div>
                )}
                {payroll.totalBonus > 0 && (
                  <div className="flex justify-between pt-1 font-semibold text-teal-800">
                    <span>Performance Bonus</span>
                    <span>{formatBDT(payroll.totalBonus)}</span>
                  </div>
                )}
                {payroll.totalIncentives > 0 && (
                  <div className="flex justify-between pt-1 font-semibold text-teal-800">
                    <span>Delivery Incentives</span>
                    <span>{formatBDT(payroll.totalIncentives)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-xs sm:text-sm font-bold text-emerald-900 border-t border-slate-200">
                  <span>Gross Earnings</span>
                  <span>{formatBDT(payroll.grossSalary + payroll.totalCommission + payroll.totalBonus + payroll.totalIncentives)}</span>
                </div>
              </div>
            </div>

            {/* DEDUCTIONS */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-red-50/80 border-b border-red-100 px-3.5 sm:px-4 py-2 flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold text-red-900 uppercase tracking-wider">Deductions & Recoveries</span>
                <span className="text-[11px] sm:text-xs font-bold text-red-700">Amount (BDT)</span>
              </div>
              <div className="p-3 sm:p-4 space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Salary Advance Recovery</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.totalAdvanceDeduction)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Staff Loan Installment</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.totalLoanInstallment)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Absence Deduction</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.totalAbsenceDeduction)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Late Attendance Deduction</span>
                  <span className="font-semibold text-slate-800">{formatBDT(payroll.totalLateDeduction)}</span>
                </div>
                {payroll.totalOtherDeductions > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Other Deductions / Loss</span>
                    <span className="font-semibold text-slate-800">{formatBDT(payroll.totalOtherDeductions)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-xs sm:text-sm font-bold text-red-900 border-t border-slate-200">
                  <span>Total Deductions</span>
                  <span>{formatBDT(payroll.totalDeductions)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* NET SALARY HIGHLIGHT BOX */}
          <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xs print:bg-slate-900 print:text-white">
            <div>
              <span className="text-[10px] sm:text-xs font-semibold text-teal-400 uppercase tracking-widest block">Net Salary Payable</span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">{formatBDT(payroll.netSalary)}</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                Amount Paid: <span className="text-emerald-400 font-semibold">{formatBDT(payroll.paidAmount)}</span> | 
                Balance Due: <span className="text-amber-400 font-semibold">{formatBDT(payroll.dueAmount)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider ${
                payroll.status === 'paid' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : payroll.status === 'partially_paid'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              }`}>
                {payroll.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* PAYMENT DETAILS IF PAID */}
          {payment && (
            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3.5 text-xs space-y-1">
              <span className="font-bold text-teal-900 block mb-1">Payment Confirmation</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
                <div><strong className="text-slate-900">Payment Date:</strong> {payment.paymentDate}</div>
                <div><strong className="text-slate-900">Payment Method:</strong> {payment.paymentMethod}</div>
                <div><strong className="text-slate-900">Ref / Txn ID:</strong> {payment.transactionReference || 'N/A'}</div>
              </div>
            </div>
          )}

          {/* FOOTER & SIGNATURES */}
          <div className="pt-6 sm:pt-10 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-xs text-slate-500 print:pt-8">
            <div>
              <div className="h-8 sm:h-10 border-b border-slate-300 w-40 sm:w-48 mb-1"></div>
              <p className="font-semibold text-slate-800">Employee Signature</p>
              <p className="text-[10px]">Date: _________________</p>
            </div>
            <div className="sm:text-right flex flex-col sm:items-end">
              <div className="h-8 sm:h-10 border-b border-slate-300 w-40 sm:w-48 mb-1"></div>
              <p className="font-semibold text-slate-800">Authorized HR & Finance Officer</p>
              <p className="text-[10px]">GLOWZAA B2B Wholesale Commerce</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
