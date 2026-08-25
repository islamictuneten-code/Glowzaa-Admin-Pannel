import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  StaffSalaryProfile, 
  MonthlyPayroll, 
  PayrollAdjustment, 
  StaffAdvanceLoan, 
  SalaryPayment, 
  PayrollSummaryStats,
  AuthUser 
} from '../types';
import { writeAuditLogSafely } from './staffAuthService';

// Helper to remove undefined fields before writing to Firestore
function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const newObj: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
}

// ==========================================
// 1. SALARY PROFILES
// ==========================================

export async function fetchSalaryProfiles(): Promise<StaffSalaryProfile[]> {
  try {
    const q = query(collection(db, 'staffSalaryProfiles'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as StaffSalaryProfile));
  } catch (error) {
    console.error('Error fetching salary profiles:', error);
    return [];
  }
}

export async function getSalaryProfileByStaffId(staffId: string): Promise<StaffSalaryProfile | null> {
  try {
    if (!staffId) return null;
    const q = query(
      collection(db, 'staffSalaryProfiles'), 
      where('staffId', '==', staffId),
      where('salaryStatus', '==', 'active')
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as StaffSalaryProfile;
    }

    // Secondary fallback: query by userId
    const qUser = query(
      collection(db, 'staffSalaryProfiles'),
      where('userId', '==', staffId),
      where('salaryStatus', '==', 'active')
    );
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      const docSnap = snapUser.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as StaffSalaryProfile;
    }

    return null;
  } catch (error) {
    console.error('Error getting salary profile by staffId:', error);
    return null;
  }
}

export async function saveSalaryProfile(
  profileData: Partial<StaffSalaryProfile> & { staffId: string; userId: string; staffName: string; role: any },
  actorUser: AuthUser
): Promise<{ success: boolean; id: string; message?: string }> {
  try {
    const now = new Date().toISOString();
    const docId = profileData.id || `salary_profile_${profileData.staffId}`;
    
    const basic = Number(profileData.basicSalary || 0);
    const house = Number(profileData.houseRent || 0);
    const medical = Number(profileData.medicalAllowance || 0);
    const transport = Number(profileData.transportAllowance || 0);
    const mobile = Number(profileData.mobileAllowance || 0);
    const other = Number(profileData.otherAllowance || 0);
    const gross = basic + house + medical + transport + mobile + other;

    const existingDocRef = doc(db, 'staffSalaryProfiles', docId);
    const existingSnap = await getDoc(existingDocRef);

    const payload: StaffSalaryProfile = {
      id: docId,
      staffId: profileData.staffId,
      userId: profileData.userId,
      staffName: profileData.staffName,
      role: profileData.role,
      department: profileData.department || (profileData.role === 'sales' ? 'Sales & Marketing' : profileData.role === 'delivery' ? 'Logistics & Delivery' : 'Administration'),
      basicSalary: basic,
      houseRent: house,
      medicalAllowance: medical,
      transportAllowance: transport,
      mobileAllowance: mobile,
      otherAllowance: other,
      grossSalary: gross,
      effectiveFrom: profileData.effectiveFrom || now.split('T')[0],
      effectiveTo: profileData.effectiveTo || '',
      salaryStatus: profileData.salaryStatus || 'active',
      createdAt: existingSnap.exists() ? (existingSnap.data().createdAt || now) : now,
      updatedAt: now,
      createdBy: existingSnap.exists() ? (existingSnap.data().createdBy || actorUser.uid) : actorUser.uid,
      updatedBy: actorUser.uid
    };

    await setDoc(existingDocRef, cleanUndefined(payload), { merge: true });

    // Write audit log
    await writeAuditLogSafely({
      action: existingSnap.exists() ? 'STAFF_SALARY_UPDATED' : 'STAFF_SALARY_CREATED',
      targetUserId: profileData.userId,
      targetUserLoginId: profileData.staffId,
      targetUserName: profileData.staffName,
      targetRole: profileData.role,
      performedByUserId: actorUser.uid,
      performedByUserName: actorUser.name,
      details: `Basic: ৳${basic.toLocaleString()}, Gross: ৳${gross.toLocaleString()}`
    });

    return { success: true, id: docId };
  } catch (error: any) {
    console.error('Error saving salary profile:', error);
    return { success: false, id: '', message: error.message || 'Failed to save salary profile' };
  }
}

// ==========================================
// 2. MONTHLY PAYROLL PROCESSING
// ==========================================

export async function fetchMonthlyPayrolls(period?: string): Promise<MonthlyPayroll[]> {
  try {
    let q = query(collection(db, 'monthlyPayrolls'), orderBy('createdAt', 'desc'));
    if (period) {
      q = query(collection(db, 'monthlyPayrolls'), where('payrollPeriod', '==', period));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as MonthlyPayroll));
  } catch (error) {
    console.error('Error fetching monthly payrolls:', error);
    return [];
  }
}

/**
 * Deterministic Payroll Generation
 * Prevents duplicate payroll for same staff + period (e.g. "2026-08_seller01")
 */
export async function generateMonthlyPayrollForPeriod(
  period: string, // YYYY-MM e.g. "2026-08"
  activeStaffList: AuthUser[],
  actorUser: AuthUser
): Promise<{ success: boolean; generatedCount: number; skippedCount: number; message?: string }> {
  try {
    const now = new Date().toISOString();
    let generatedCount = 0;
    let skippedCount = 0;

    // Fetch all active salary profiles first
    const profiles = await fetchSalaryProfiles();
    const profileMap = new Map<string, StaffSalaryProfile>();
    profiles.forEach(p => {
      if (p.salaryStatus === 'active') {
        profileMap.set(p.staffId, p);
        profileMap.set(p.userId, p);
      }
    });

    // Fetch existing adjustments for this period
    const adjustments = await fetchPayrollAdjustments(period);

    // Fetch active loans/advances
    const loans = await fetchAdvanceLoans();

    for (const staff of activeStaffList) {
      const staffIdentifier = staff.staffId || staff.loginId || staff.uid;
      const deterministicId = `${period}_${staffIdentifier}`;

      // Check if already exists
      const docRef = doc(db, 'monthlyPayrolls', deterministicId);
      const existingSnap = await getDoc(docRef);

      if (existingSnap.exists()) {
        skippedCount++;
        continue;
      }

      // Get salary profile or fallback from user defaults
      const profile = profileMap.get(staffIdentifier) || profileMap.get(staff.uid);

      const basic = profile ? profile.basicSalary : (staff.monthlyTarget ? Math.round(staff.monthlyTarget * 0.2) : 15000);
      const houseRent = profile ? profile.houseRent : Math.round(basic * 0.3);
      const medical = profile ? profile.medicalAllowance : 1500;
      const transport = profile ? profile.transportAllowance : 2000;
      const mobile = profile ? profile.mobileAllowance : 1000;
      const other = profile ? profile.otherAllowance : 0;
      const gross = basic + houseRent + medical + transport + mobile + other;

      // Calculate adjustments for this staff + period
      const staffAdjustments = adjustments.filter(a => a.staffId === staffIdentifier || a.userId === staff.uid);
      
      const totalBonus = staffAdjustments.filter(a => a.category === 'bonus' && a.type !== 'sales_commission' && a.type !== 'delivery_incentive').reduce((s, a) => s + a.amount, 0);
      const totalCommission = staffAdjustments.filter(a => a.type === 'sales_commission').reduce((s, a) => s + a.amount, 0);
      const totalIncentives = staffAdjustments.filter(a => a.type === 'delivery_incentive' || a.type === 'other_incentive').reduce((s, a) => s + a.amount, 0);

      const totalAbsenceDeduction = staffAdjustments.filter(a => a.type === 'absence_deduction').reduce((s, a) => s + a.amount, 0);
      const totalLateDeduction = staffAdjustments.filter(a => a.type === 'late_deduction').reduce((s, a) => s + a.amount, 0);
      const totalOtherDeductions = staffAdjustments.filter(a => a.type === 'damage_loss_recovery' || a.type === 'other_deduction').reduce((s, a) => s + a.amount, 0);

      // Advance & Loan deductions from active records
      const staffLoans = loans.filter(l => (l.staffId === staffIdentifier || l.userId === staff.uid) && l.status === 'active' && l.remainingBalance > 0);
      const totalAdvanceDeduction = staffLoans.filter(l => l.recordType === 'advance').reduce((s, l) => s + Math.min(l.installmentAmount || l.remainingBalance, l.remainingBalance), 0);
      const totalLoanInstallment = staffLoans.filter(l => l.recordType === 'loan').reduce((s, l) => s + Math.min(l.installmentAmount || l.remainingBalance, l.remainingBalance), 0);

      const totalDeductions = totalAbsenceDeduction + totalLateDeduction + totalAdvanceDeduction + totalLoanInstallment + totalOtherDeductions;
      const netSalary = Math.max(0, (gross + totalCommission + totalBonus + totalIncentives) - totalDeductions);

      const newPayroll: MonthlyPayroll = {
        id: deterministicId,
        payrollPeriod: period,
        staffId: staffIdentifier,
        userId: staff.uid,
        staffName: staff.name,
        role: staff.role,
        department: profile?.department || (staff.role === 'sales' ? 'Sales & Marketing' : staff.role === 'delivery' ? 'Logistics & Delivery' : 'Administration'),
        basicSalary: basic,
        houseRent,
        medicalAllowance: medical,
        transportAllowance: transport,
        mobileAllowance: mobile,
        otherAllowance: other,
        totalAllowances: houseRent + medical + transport + mobile + other,
        grossSalary: gross,
        totalCommission,
        totalBonus,
        totalIncentives,
        totalAbsenceDeduction,
        totalLateDeduction,
        totalAdvanceDeduction,
        totalLoanInstallment,
        totalOtherDeductions,
        totalDeductions,
        netSalary,
        paidAmount: 0,
        dueAmount: netSalary,
        status: 'draft',
        createdAt: now,
        createdBy: actorUser.uid,
        updatedAt: now
      };

      await setDoc(docRef, cleanUndefined(newPayroll));
      generatedCount++;
    }

    // Write audit log
    await writeAuditLogSafely({
      action: 'PAYROLL_GENERATED',
      targetUserId: 'ALL_STAFF',
      targetUserName: `${period} Monthly Payroll Batch`,
      targetRole: 'staff',
      performedByUserId: actorUser.uid,
      performedByUserName: actorUser.name,
      details: `Generated ${generatedCount} records for period ${period} (Skipped ${skippedCount})`
    });

    return { success: true, generatedCount, skippedCount };
  } catch (error: any) {
    console.error('Error generating monthly payroll:', error);
    return { success: false, generatedCount: 0, skippedCount: 0, message: error.message };
  }
}

export async function approveMonthlyPayroll(
  payrollId: string, 
  actorUser: AuthUser
): Promise<{ success: boolean; message?: string }> {
  try {
    const docRef = doc(db, 'monthlyPayrolls', payrollId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, message: 'Payroll record not found' };
    }
    const data = snap.data() as MonthlyPayroll;
    if (data.status === 'paid' || data.status === 'cancelled') {
      return { success: false, message: `Cannot approve payroll in '${data.status}' status` };
    }

    const now = new Date().toISOString();
    await updateDoc(docRef, {
      status: 'approved',
      approvedBy: actorUser.uid,
      approvedByName: actorUser.name,
      approvedAt: now,
      updatedAt: now
    });

    await writeAuditLogSafely({
      action: 'PAYROLL_APPROVED',
      targetUserId: data.userId,
      targetUserLoginId: data.staffId,
      targetUserName: data.staffName,
      targetRole: data.role,
      performedByUserId: actorUser.uid,
      performedByUserName: actorUser.name,
      details: `Approved Net Salary: ৳${data.netSalary.toLocaleString()} for ${data.payrollPeriod}`
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error approving payroll:', error);
    return { success: false, message: error.message };
  }
}

export async function cancelMonthlyPayroll(
  payrollId: string, 
  actorUser: AuthUser
): Promise<{ success: boolean; message?: string }> {
  try {
    const docRef = doc(db, 'monthlyPayrolls', payrollId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, message: 'Payroll record not found' };
    }
    const data = snap.data() as MonthlyPayroll;
    if (data.status === 'paid' || data.paidAmount > 0) {
      return { success: false, message: 'Financially Immutable: Cannot cancel a paid or partially paid payroll' };
    }

    const now = new Date().toISOString();
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: now
    });

    await writeAuditLogSafely({
      action: 'PAYROLL_CANCELLED',
      targetUserId: data.userId,
      targetUserLoginId: data.staffId,
      targetUserName: data.staffName,
      targetRole: data.role,
      performedByUserId: actorUser.uid,
      performedByUserName: actorUser.name,
      details: `Cancelled payroll for ${data.payrollPeriod}`
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling payroll:', error);
    return { success: false, message: error.message };
  }
}

// ==========================================
// 3. SALARY PAYMENT (TRANSACTIONAL INTEGRITY)
// ==========================================

export async function recordSalaryPayment(
  paymentInput: {
    payrollId: string;
    payrollPeriod: string;
    staffId: string;
    userId: string;
    staffName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Banking' | 'Other';
    transactionReference?: string;
    notes?: string;
  },
  actorUser: AuthUser
): Promise<{ success: boolean; paymentId?: string; message?: string }> {
  try {
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const payrollRef = doc(db, 'monthlyPayrolls', paymentInput.payrollId);
      const payrollSnap = await transaction.get(payrollRef);

      if (!payrollSnap.exists()) {
        throw new Error('Payroll record not found');
      }

      const payroll = payrollSnap.data() as MonthlyPayroll;

      if (payroll.status === 'cancelled') {
        throw new Error('Cannot process payment for cancelled payroll');
      }

      const currentPaid = Number(payroll.paidAmount || 0);
      const newPaidAmount = currentPaid + Number(paymentInput.amount);
      const newDueAmount = Math.max(0, payroll.netSalary - newPaidAmount);

      if (newPaidAmount > payroll.netSalary + 1) {
        throw new Error(`Payment amount (৳${paymentInput.amount}) exceeds remaining due amount (৳${payroll.dueAmount})`);
      }

      const newStatus = newDueAmount <= 0 ? 'paid' : 'partially_paid';

      // 1. Update Monthly Payroll
      transaction.update(payrollRef, {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newStatus,
        updatedAt: now
      });

      // 2. Create Salary Payment Document
      const paymentRef = doc(db, 'salaryPayments', paymentId);
      const paymentPayload: SalaryPayment = {
        id: paymentId,
        payrollId: paymentInput.payrollId,
        payrollPeriod: paymentInput.payrollPeriod,
        staffId: paymentInput.staffId,
        userId: paymentInput.userId,
        staffName: paymentInput.staffName,
        amount: Number(paymentInput.amount),
        paymentDate: paymentInput.paymentDate,
        paymentMethod: paymentInput.paymentMethod,
        transactionReference: paymentInput.transactionReference || '',
        notes: paymentInput.notes || '',
        paidBy: actorUser.uid,
        paidByName: actorUser.name,
        status: 'PAID',
        createdAt: now
      };
      transaction.set(paymentRef, cleanUndefined(paymentPayload));
    });

    // Write audit log outside transaction
    await writeAuditLogSafely({
      action: 'SALARY_PAYMENT_COMPLETED',
      targetUserId: paymentInput.userId,
      targetUserLoginId: paymentInput.staffId,
      targetUserName: paymentInput.staffName,
      targetRole: 'staff',
      performedByUserId: actorUser.uid,
      performedByUserName: actorUser.name,
      details: `Paid ৳${paymentInput.amount.toLocaleString()} via ${paymentInput.paymentMethod} for period ${paymentInput.payrollPeriod}`
    });

    return { success: true, paymentId };
  } catch (error: any) {
    console.error('Error recording salary payment:', error);
    return { success: false, message: error.message };
  }
}

export async function fetchSalaryPayments(period?: string, staffId?: string): Promise<SalaryPayment[]> {
  try {
    let q = query(collection(db, 'salaryPayments'), orderBy('createdAt', 'desc'));
    if (period && staffId) {
      q = query(collection(db, 'salaryPayments'), where('payrollPeriod', '==', period), where('staffId', '==', staffId));
    } else if (period) {
      q = query(collection(db, 'salaryPayments'), where('payrollPeriod', '==', period));
    } else if (staffId) {
      q = query(collection(db, 'salaryPayments'), where('staffId', '==', staffId));
    }
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as SalaryPayment));

    if (staffId && results.length === 0) {
      // Fallback query by userId
      const qUser = period
        ? query(collection(db, 'salaryPayments'), where('payrollPeriod', '==', period), where('userId', '==', staffId))
        : query(collection(db, 'salaryPayments'), where('userId', '==', staffId));
      const userSnapshot = await getDocs(qUser);
      if (!userSnapshot.empty) {
        results = userSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as SalaryPayment));
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching salary payments:', error);
    return [];
  }
}

// ==========================================
// 4. ADVANCES & LOANS MANAGEMENT
// ==========================================

export async function fetchAdvanceLoans(staffId?: string): Promise<StaffAdvanceLoan[]> {
  try {
    let q = query(collection(db, 'staffLoans'), orderBy('createdAt', 'desc'));
    if (staffId) {
      q = query(collection(db, 'staffLoans'), where('staffId', '==', staffId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as StaffAdvanceLoan));
  } catch (error) {
    console.error('Error fetching advance loans:', error);
    return [];
  }
}

export async function createAdvanceLoan(
  input: Omit<StaffAdvanceLoan, 'id' | 'createdAt' | 'repaymentAmount' | 'remainingBalance' | 'status'>,
  actorUser: AuthUser
): Promise<{ success: boolean; id?: string; message?: string }> {
  try {
    const docId = `AL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const amount = Number(input.amount || 0);

    const payload: StaffAdvanceLoan = {
      id: docId,
      staffId: input.staffId,
      userId: input.userId,
      staffName: input.staffName,
      recordType: input.recordType,
      amount,
      issueDate: input.issueDate || now.split('T')[0],
      reason: input.reason || '',
      repaymentAmount: 0,
      remainingBalance: amount,
      installmentAmount: Number(input.installmentAmount || amount),
      status: 'active',
      notes: input.notes || '',
      createdBy: actorUser.uid,
      createdAt: now
    };

    await setDoc(doc(db, 'staffLoans', docId), cleanUndefined(payload));

    await writeAuditLogSafely({
      action: input.recordType === 'advance' ? 'SALARY_ADVANCE_CREATED' : 'STAFF_LOAN_CREATED',
      targetUserId: input.userId,
      targetUserLoginId: input.staffId,
      targetUserName: input.staffName,
      targetRole: 'staff',
      performedByUserId: actorUser.uid,
      performedByUserName: actorUser.name,
      details: `${input.recordType.toUpperCase()} ৳${amount.toLocaleString()} issued`
    });

    return { success: true, id: docId };
  } catch (error: any) {
    console.error('Error creating advance/loan:', error);
    return { success: false, message: error.message };
  }
}

// ==========================================
// 5. BONUSES, INCENTIVES & DEDUCTIONS
// ==========================================

export async function fetchPayrollAdjustments(period?: string, staffId?: string): Promise<PayrollAdjustment[]> {
  try {
    let q = query(collection(db, 'payrollAdjustments'), orderBy('createdAt', 'desc'));
    if (period && staffId) {
      q = query(collection(db, 'payrollAdjustments'), where('payrollPeriod', '==', period), where('staffId', '==', staffId));
    } else if (period) {
      q = query(collection(db, 'payrollAdjustments'), where('payrollPeriod', '==', period));
    } else if (staffId) {
      q = query(collection(db, 'payrollAdjustments'), where('staffId', '==', staffId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as PayrollAdjustment));
  } catch (error) {
    console.error('Error fetching payroll adjustments:', error);
    return [];
  }
}

export async function createPayrollAdjustment(
  input: Omit<PayrollAdjustment, 'id' | 'createdAt'>,
  actorUser: AuthUser
): Promise<{ success: boolean; id?: string; message?: string }> {
  try {
    const docId = `ADJ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const payload: PayrollAdjustment = {
      id: docId,
      ...input,
      createdAt: now
    };

    await setDoc(doc(db, 'payrollAdjustments', docId), cleanUndefined(payload));

    await writeAuditLogSafely({
      action: input.category === 'bonus' ? 'BONUS_ADDED' : 'DEDUCTION_ADDED',
      targetUserId: input.userId,
      targetUserLoginId: input.staffId,
      targetUserName: input.staffName,
      targetRole: 'staff',
      performedByUserId: actorUser.uid,
      performedByUserName: actorUser.name,
      details: `${input.type} ৳${input.amount.toLocaleString()} for ${input.payrollPeriod}`
    });

    return { success: true, id: docId };
  } catch (error: any) {
    console.error('Error creating payroll adjustment:', error);
    return { success: false, message: error.message };
  }
}
