import {
  Payment,
  Expense,
  Customer,
  Order,
  CashHandover,
  AuthUser,
  CashAccountBalance,
  CashFlowLiquiditySummary,
  CashFlowKPIs,
  ARBucket,
  CollectionPriorityItem,
  UpcomingPayableItem,
  CashForecastPeriod,
  CashFlowSettings,
  CashFlowAuditLogEntry,
  CashScenarioParams,
  CashScenarioResult,
  CashDataQualityIssue
} from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreService';

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_CASH_FLOW_SETTINGS: CashFlowSettings = {
  id: 'global_cash_settings',
  minimumCashReserve: 300000,
  warningThresholdDays: 21,
  updatedAt: new Date().toISOString()
};

// ============================================================================
// LIQUIDITY & ACCOUNTS
// ============================================================================

export function getCurrentLiquidity(payments: Payment[], cashHandovers: CashHandover[]): CashFlowLiquiditySummary {
  let cashTotal = 0;
  let bankTotal = 0;
  let mobileTotal = 0;

  const validPayments = (payments || []).filter(p => p && !p.isReversed);
  
  for (const p of validPayments) {
    const amt = Number(p.amount) || 0;
    const method = (p.paymentMethod || '').toLowerCase();
    if (method.includes('bkash') || method.includes('nagad') || method.includes('rocket') || method.includes('mobile')) {
      mobileTotal += amt;
    } else if (method.includes('bank') || method.includes('transfer') || method.includes('cheque')) {
      bankTotal += amt;
    } else {
      cashTotal += amt;
    }
  }

  const acceptedHandovers = (cashHandovers || []).filter(h => h && h.status === 'accepted');
  for (const h of acceptedHandovers) {
    cashTotal += Number(h.amount) || 0;
  }

  const totalKnownLiquidity = Math.max(0, cashTotal + bankTotal + mobileTotal);

  const accounts: CashAccountBalance[] = [
    {
      accountId: 'acc_cash_drawer',
      accountName: 'Physical Cash Drawer',
      type: 'cash',
      balance: Math.max(0, cashTotal),
      lastSyncedAt: new Date().toISOString(),
      isConnected: true
    },
    {
      accountId: 'acc_bank_primary',
      accountName: 'Prime Bank Ltd (Corporate B2B)',
      type: 'bank',
      balance: Math.max(0, bankTotal),
      lastSyncedAt: new Date().toISOString(),
      provider: 'Prime Bank',
      isConnected: true
    },
    {
      accountId: 'acc_mfs_wallet',
      accountName: 'bKash/Nagad Merchant Wallet',
      type: 'mobile_banking',
      balance: Math.max(0, mobileTotal),
      lastSyncedAt: new Date().toISOString(),
      provider: 'bKash / Nagad',
      isConnected: true
    }
  ];

  const dataConfidence = validPayments.length > 5 ? 'HIGH' : validPayments.length > 0 ? 'MEDIUM' : 'LOW';

  return {
    availableCash: Math.max(0, cashTotal),
    bankBalance: Math.max(0, bankTotal),
    mobileBankingBalance: Math.max(0, mobileTotal),
    totalKnownLiquidity,
    accounts,
    lastUpdated: new Date().toISOString(),
    dataConfidence
  };
}

// ============================================================================
// ACTUAL CASH INFLOW & OUTFLOW
// ============================================================================

export function getActualCashInflows(payments: Payment[], cashHandovers: CashHandover[], startDate?: Date, endDate?: Date): number {
  let totalInflow = 0;
  const uniqueIds = new Set<string>();

  const validPayments = (payments || []).filter(p => {
    if (!p || p.isReversed) return false;
    if (uniqueIds.has(p.id)) return false;
    
    const pDate = new Date(p.createdAt || Date.now());
    if (startDate && pDate < startDate) return false;
    if (endDate && pDate > endDate) return false;

    uniqueIds.add(p.id);
    return true;
  });

  for (const p of validPayments) {
    totalInflow += Number(p.amount) || 0;
  }

  const validHandovers = (cashHandovers || []).filter(h => {
    if (!h || h.status !== 'accepted') return false;
    const hDate = new Date(h.submittedAt || Date.now());
    if (startDate && hDate < startDate) return false;
    if (endDate && hDate > endDate) return false;
    return true;
  });

  for (const h of validHandovers) {
    totalInflow += Number(h.amount) || 0;
  }

  return Number(totalInflow.toFixed(2));
}

export function getActualCashOutflows(expenses: Expense[], payments: Payment[], startDate?: Date, endDate?: Date): number {
  let totalOutflow = 0;

  const validExpenses = (expenses || []).filter(e => {
    if (!e || e.deleted || e.status !== 'approved') return false;
    const eDate = new Date(e.expenseDate || e.createdAt || Date.now());
    if (startDate && eDate < startDate) return false;
    if (endDate && eDate > endDate) return false;
    return true;
  });

  for (const e of validExpenses) {
    totalOutflow += Number(e.amount) || 0;
  }

  const outgoingPayments = (payments || []).filter(p => {
    if (!p || p.isReversed) return false;
    const isOutgoing = (p.paymentType || '').toLowerCase() === 'outgoing' || (p.notes || '').toLowerCase().includes('supplier payment');
    if (!isOutgoing) return false;

    const pDate = new Date(p.createdAt || Date.now());
    if (startDate && pDate < startDate) return false;
    if (endDate && pDate > endDate) return false;
    return true;
  });

  for (const p of outgoingPayments) {
    totalOutflow += Number(p.amount) || 0;
  }

  return Number(totalOutflow.toFixed(2));
}

export function getNetCashFlow(inflows: number, outflows: number): number {
  return Number((inflows - outflows).toFixed(2));
}

// ============================================================================
// RECEIVABLES & AR AGING
// ============================================================================

export function getReceivables(customers: Customer[]): { totalReceivable: number; currentDue: number; overdueDue: number; advanceBalance: number } {
  let totalReceivable = 0;
  let currentDue = 0;
  let overdueDue = 0;
  let advanceBalance = 0;

  for (const c of (customers || [])) {
    const due = Number(c.currentDue) || 0;
    if (due > 0) {
      totalReceivable += due;
      const lastOrderDays = c.lastOrderDate ? (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24) : 0;
      if (lastOrderDays <= 30) {
        currentDue += due;
      } else {
        overdueDue += due;
      }
    } else if (due < 0) {
      advanceBalance += Math.abs(due);
    }
  }

  return {
    totalReceivable: Number(totalReceivable.toFixed(2)),
    currentDue: Number(currentDue.toFixed(2)),
    overdueDue: Number(overdueDue.toFixed(2)),
    advanceBalance: Number(advanceBalance.toFixed(2))
  };
}

export function getReceivableAging(customers: Customer[]): ARBucket[] {
  let currentAmt = 0, currentCount = 0;
  let b1_7Amt = 0, b1_7Count = 0;
  let b8_30Amt = 0, b8_30Count = 0;
  let b31_60Amt = 0, b31_60Count = 0;
  let b61_90Amt = 0, b61_90Count = 0;
  let b90PlusAmt = 0, b90PlusCount = 0;

  let totalDueSum = 0;

  for (const c of (customers || [])) {
    const due = Number(c.currentDue) || 0;
    if (due <= 0) continue;
    totalDueSum += due;

    const days = c.lastOrderDate ? Math.max(0, Math.floor((Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))) : 15;

    if (days === 0) {
      currentAmt += due;
      currentCount++;
    } else if (days <= 7) {
      b1_7Amt += due;
      b1_7Count++;
    } else if (days <= 30) {
      b8_30Amt += due;
      b8_30Count++;
    } else if (days <= 60) {
      b31_60Amt += due;
      b31_60Count++;
    } else if (days <= 90) {
      b61_90Amt += due;
      b61_90Count++;
    } else {
      b90PlusAmt += due;
      b90PlusCount++;
    }
  }

  const safeDiv = (val: number) => (totalDueSum > 0 ? Number(((val / totalDueSum) * 100).toFixed(1)) : 0);

  return [
    { bucket: 'Current', amount: Number(currentAmt.toFixed(2)), customerCount: currentCount, percentage: safeDiv(currentAmt) },
    { bucket: '1–7 Days', amount: Number(b1_7Amt.toFixed(2)), customerCount: b1_7Count, percentage: safeDiv(b1_7Amt) },
    { bucket: '8–30 Days', amount: Number(b8_30Amt.toFixed(2)), customerCount: b8_30Count, percentage: safeDiv(b8_30Amt) },
    { bucket: '31–60 Days', amount: Number(b31_60Amt.toFixed(2)), customerCount: b31_60Count, percentage: safeDiv(b31_60Amt) },
    { bucket: '61–90 Days', amount: Number(b61_90Amt.toFixed(2)), customerCount: b61_90Count, percentage: safeDiv(b61_90Amt) },
    { bucket: '90+ Days', amount: Number(b90PlusAmt.toFixed(2)), customerCount: b90PlusCount, percentage: safeDiv(b90PlusAmt) }
  ];
}

export function getCollectionPriority(customers: Customer[]): CollectionPriorityItem[] {
  const items: CollectionPriorityItem[] = [];

  for (const c of (customers || [])) {
    const due = Number(c.currentDue) || 0;
    if (due <= 0) continue;

    const days = c.lastOrderDate ? Math.max(0, Math.floor((Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))) : 20;
    
    let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (days > 60 || due > 100000) {
      priority = 'CRITICAL';
    } else if (days > 30 || due > 50000) {
      priority = 'HIGH';
    } else if (days > 14 || due > 20000) {
      priority = 'MEDIUM';
    }

    items.push({
      customerId: c.id,
      customerName: c.shopName ? `${c.shopName} (${c.ownerName})` : c.ownerName,
      phone: c.phone || '',
      district: c.district || 'Dhaka',
      overdueAmount: due,
      daysOverdue: days,
      totalDue: due,
      priority,
      creditStatus: c.status || 'Active'
    });
  }

  const weight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  items.sort((a, b) => weight[b.priority] - weight[a.priority] || b.overdueAmount - a.overdueAmount);

  return items;
}

// ============================================================================
// ACCOUNTS PAYABLE & UPCOMING PAYABLES
// ============================================================================

export function getUpcomingPayables(expenses: Expense[]): UpcomingPayableItem[] {
  const items: UpcomingPayableItem[] = [];

  const pendingExpenses = (expenses || []).filter(e => e && !e.deleted && e.status !== 'rejected');
  for (const e of pendingExpenses) {
    items.push({
      id: e.id,
      type: 'expense',
      payeeName: e.vendorName || e.category || 'Operating Expense',
      amount: Number(e.amount) || 0,
      dueDate: e.expenseDate || new Date().toISOString(),
      status: e.status,
      sourceRef: `Expense: ${e.title || e.id}`
    });
  }

  return items;
}

export function getCommittedCash(expenses: Expense[]): number {
  const upcoming = getUpcomingPayables(expenses);
  const total = upcoming.reduce((sum, item) => sum + item.amount, 0);
  return Number(total.toFixed(2));
}

// ============================================================================
// CASH FORECAST & RISK ENGINE
// ============================================================================

export function getCashForecast(
  liquidity: CashFlowLiquiditySummary,
  receivables: { totalReceivable: number; overdueDue: number },
  committedPayables: number,
  monthlyExpensesEstimate: number
): CashForecastPeriod[] {
  const opening = liquidity.totalKnownLiquidity;

  const exp7 = receivables.totalReceivable * 0.15;
  const exp30 = receivables.totalReceivable * 0.45;
  const exp60 = receivables.totalReceivable * 0.70;
  const exp90 = receivables.totalReceivable * 0.85;

  const exp7DaysExpense = (monthlyExpensesEstimate / 30) * 7;
  const exp30DaysExpense = monthlyExpensesEstimate;
  const exp60DaysExpense = monthlyExpensesEstimate * 2;
  const exp90DaysExpense = monthlyExpensesEstimate * 3;

  const closing7 = opening + exp7 - (committedPayables * 0.5) - exp7DaysExpense;
  const closing30 = opening + exp30 - committedPayables - exp30DaysExpense;
  const closing60 = opening + exp60 - committedPayables - exp60DaysExpense;
  const closing90 = opening + exp90 - committedPayables - exp90DaysExpense;

  return [
    {
      periodLabel: '7 Days',
      openingCash: opening,
      expectedCollections: Number(exp7.toFixed(2)),
      committedPayables: Number((committedPayables * 0.5).toFixed(2)),
      expectedExpenses: Number(exp7DaysExpense.toFixed(2)),
      projectedClosingCash: Number(closing7.toFixed(2)),
      confidence: 'HIGH',
      shortageRisk: closing7 < 100000
    },
    {
      periodLabel: '30 Days',
      openingCash: opening,
      expectedCollections: Number(exp30.toFixed(2)),
      committedPayables: Number(committedPayables.toFixed(2)),
      expectedExpenses: Number(exp30DaysExpense.toFixed(2)),
      projectedClosingCash: Number(closing30.toFixed(2)),
      confidence: 'MEDIUM',
      shortageRisk: closing30 < 300000
    },
    {
      periodLabel: '60 Days',
      openingCash: opening,
      expectedCollections: Number(exp60.toFixed(2)),
      committedPayables: Number(committedPayables.toFixed(2)),
      expectedExpenses: Number(exp60DaysExpense.toFixed(2)),
      projectedClosingCash: Number(closing60.toFixed(2)),
      confidence: 'LOW',
      shortageRisk: closing60 < 300000
    },
    {
      periodLabel: '90 Days',
      openingCash: opening,
      expectedCollections: Number(exp90.toFixed(2)),
      committedPayables: Number(committedPayables.toFixed(2)),
      expectedExpenses: Number(exp90DaysExpense.toFixed(2)),
      projectedClosingCash: Number(closing90.toFixed(2)),
      confidence: 'LOW',
      shortageRisk: closing90 < 300000
    }
  ];
}

export function getCashHealthScore(
  liquidity: CashFlowLiquiditySummary,
  receivables: { totalReceivable: number; overdueDue: number },
  minimumReserve: number
): { score: number; status: 'HEALTHY' | 'WATCH' | 'RISK' | 'CRITICAL' } {
  let score = 100;
  const totalLiq = liquidity.totalKnownLiquidity;

  if (totalLiq < minimumReserve) {
    score -= 40;
  } else if (totalLiq < minimumReserve * 1.5) {
    score -= 20;
  }

  const overdueRatio = receivables.totalReceivable > 0 ? receivables.overdueDue / receivables.totalReceivable : 0;
  if (overdueRatio > 0.5) {
    score -= 30;
  } else if (overdueRatio > 0.25) {
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));

  let status: 'HEALTHY' | 'WATCH' | 'RISK' | 'CRITICAL' = 'HEALTHY';
  if (score < 40) status = 'CRITICAL';
  else if (score < 65) status = 'RISK';
  else if (score < 80) status = 'WATCH';

  return { score, status };
}

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

export function runCashScenario(
  currentLiquidity: number,
  expectedCollections: number,
  committedPayables: number,
  params: CashScenarioParams
): CashScenarioResult {
  const adjustedCollections = expectedCollections * (1 + params.collectionBoostPercent / 100);
  const adjustedPayables = committedPayables * (1 + params.supplierPaymentShiftDays > 0 ? 0.95 : 1.0);
  const adjustedExpenses = committedPayables * (1 + params.expenseChangePercent / 100);

  const projectedClosing = currentLiquidity + adjustedCollections - adjustedPayables - adjustedExpenses;
  const baseClosing = currentLiquidity + expectedCollections - committedPayables;
  const diff = projectedClosing - baseClosing;

  let risk = 'HEALTHY';
  if (projectedClosing < 100000) risk = 'CRITICAL';
  else if (projectedClosing < 300000) risk = 'RISK';

  return {
    scenarioName: 'Custom Simulation',
    projectedClosingCash: Number(projectedClosing.toFixed(2)),
    cashDifference: Number(diff.toFixed(2)),
    riskStatus: risk,
    description: `Simulation with +${params.collectionBoostPercent}% collection boost & ${params.expenseChangePercent}% expense shift.`
  };
}

// ============================================================================
// DATA QUALITY & SETTINGS
// ============================================================================

export function getCashFlowDataQuality(payments: Payment[], expenses: Expense[]): CashDataQualityIssue[] {
  const issues: CashDataQualityIssue[] = [];

  for (const p of (payments || [])) {
    if (!p.amount || Number(p.amount) <= 0) {
      issues.push({
        id: `pay_amt_${p.id}`,
        severity: 'critical',
        entityType: 'Payment',
        entityId: p.id,
        description: `Payment ${p.id} has invalid or zero amount.`
      });
    }
  }

  for (const e of (expenses || [])) {
    if (!e.amount || Number(e.amount) <= 0) {
      issues.push({
        id: `exp_amt_${e.id}`,
        severity: 'warning',
        entityType: 'Expense',
        entityId: e.id,
        description: `Expense ${e.id} has invalid amount.`
      });
    }
  }

  return issues;
}

export async function fetchCashFlowSettings(): Promise<CashFlowSettings> {
  const path = 'cash_flow_settings';
  try {
    const docRef = doc(db, path, 'global_cash_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_CASH_FLOW_SETTINGS, ...snap.data(), id: snap.id } as CashFlowSettings;
    }
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
      handleFirestoreError(err, OperationType.GET, `${path}/global_cash_settings`);
    } else {
      console.warn('Cash flow settings not found, using default:', err);
    }
  }
  return DEFAULT_CASH_FLOW_SETTINGS;
}

export async function saveCashFlowSettings(settings: Partial<CashFlowSettings>, user: AuthUser): Promise<void> {
  const path = 'cash_flow_settings';
  try {
    const docRef = doc(db, path, 'global_cash_settings');
    await setDoc(docRef, {
      ...DEFAULT_CASH_FLOW_SETTINGS,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedByUserId: user.uid || user.id,
      updatedByUserName: user.name
    }, { merge: true });

    await addDoc(collection(db, 'cash_flow_audit_logs'), {
      action: 'CASH_RESERVE_UPDATED',
      performedByUserId: user.uid || user.id,
      performedByUserName: user.name,
      performedByUserRole: user.role,
      timestamp: new Date().toISOString(),
      details: `Updated minimum cash reserve to ৳${settings.minimumCashReserve || 300000}`
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${path}/global_cash_settings`);
  }
}

export async function logCashFlowAudit(action: string, user: AuthUser, details: string): Promise<void> {
  try {
    await addDoc(collection(db, 'cash_flow_audit_logs'), {
      action,
      performedByUserId: user.uid || user.id,
      performedByUserName: user.name,
      performedByUserRole: user.role,
      timestamp: new Date().toISOString(),
      details
    });
  } catch (err) {
    console.warn('Failed to log cash flow audit:', err);
  }
}

export function exportCashFlowReportCSV(summary: any, receivables: any): void {
  const rows = [
    ['Glowzaa B2B Cash Flow & Financial Control Report'],
    ['Generated At', new Date().toLocaleString()],
    [''],
    ['LIQUIDITY SUMMARY'],
    ['Available Cash', summary.availableCash],
    ['Bank Balance', summary.bankBalance],
    ['Mobile Banking Balance', summary.mobileBankingBalance],
    ['Total Known Liquidity', summary.totalKnownLiquidity],
    [''],
    ['RECEIVABLES & PAYABLES'],
    ['Total Receivables', receivables.totalReceivable],
    ['Current Due', receivables.currentDue],
    ['Overdue Due', receivables.overdueDue],
    ['Advance Balance', receivables.advanceBalance]
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Glowzaa_Cash_Flow_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
