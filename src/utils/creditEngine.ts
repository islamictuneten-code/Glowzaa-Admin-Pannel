import { Customer, Order, Payment, CreditCheckMode, CustomerRiskLevel } from '../types';

export interface CreditUtilizationInfo {
  utilizationPercent: number; // Raw percentage (can exceed 100%)
  clampedPercent: number; // 0 - 100% for progress bars
  availableCredit: number; // Max(creditLimit - currentDue, 0)
  category: 'HEALTHY' | 'MODERATE' | 'WARNING' | 'CRITICAL' | 'OVER LIMIT';
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  barColor: string;
}

export interface CustomerRiskInfo {
  level: CustomerRiskLevel;
  scoreLabel: string;
  reason: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  disclaimer: string;
}

export interface CreditCheckResult {
  allowed: boolean;
  requiresAdminOverride: boolean;
  requiresWarningConfirmation: boolean;
  mode: CreditCheckMode;
  isCreditHold: boolean;
  creditLimit: number;
  currentDue: number;
  availableCredit: number;
  newOrderDueAmount: number;
  projectedDue: number;
  excessAmount: number;
  reason?: string;
}

/**
 * Calculates available credit ensuring it never drops below 0.
 * Formula: max(creditLimit - currentDue, 0)
 */
export function calculateAvailableCredit(creditLimit?: number | null, currentDue?: number | null): number {
  const limit = Math.max(0, Number(creditLimit) || 0);
  const due = Math.max(0, Number(currentDue) || 0);
  return Math.max(0, limit - due);
}

/**
 * Calculates credit utilization percentage.
 * Formula: if creditLimit > 0: (currentDue / creditLimit) * 100 else: 0
 */
export function calculateCreditUtilization(creditLimit?: number | null, currentDue?: number | null): number {
  const limit = Number(creditLimit) || 0;
  const due = Number(currentDue) || 0;
  if (limit <= 0) return 0;
  return (due / limit) * 100;
}

/**
 * Categorizes credit utilization into standard enterprise risk tiers.
 * 0–49%: HEALTHY
 * 50–74%: MODERATE
 * 75–89%: WARNING
 * 90–99%: CRITICAL
 * 100%+: OVER LIMIT
 */
export function getCreditUtilizationInfo(creditLimit?: number | null, currentDue?: number | null): CreditUtilizationInfo {
  const limit = Math.max(0, Number(creditLimit) || 0);
  const due = Math.max(0, Number(currentDue) || 0);
  const availableCredit = calculateAvailableCredit(limit, due);
  const rawUtilization = calculateCreditUtilization(limit, due);
  const clampedPercent = Math.min(100, Math.max(0, Math.round(rawUtilization)));

  if (limit === 0) {
    return {
      utilizationPercent: 0,
      clampedPercent: 0,
      availableCredit: 0,
      category: due > 0 ? 'WARNING' : 'HEALTHY',
      label: due > 0 ? 'No Credit Limit (Cash Only)' : 'Cash Account',
      badgeBg: due > 0 ? 'bg-amber-50' : 'bg-slate-50',
      badgeText: due > 0 ? 'text-amber-800' : 'text-slate-700',
      badgeBorder: due > 0 ? 'border-amber-200' : 'border-slate-200',
      barColor: due > 0 ? 'bg-amber-500' : 'bg-slate-400'
    };
  }

  if (rawUtilization >= 100) {
    return {
      utilizationPercent: rawUtilization,
      clampedPercent: 100,
      availableCredit: 0,
      category: 'OVER LIMIT',
      label: 'Over Credit Limit',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-300',
      barColor: 'bg-rose-600'
    };
  }

  if (rawUtilization >= 90) {
    return {
      utilizationPercent: rawUtilization,
      clampedPercent,
      availableCredit,
      category: 'CRITICAL',
      label: 'Critical Exposure (90-99%)',
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-700',
      badgeBorder: 'border-orange-300',
      barColor: 'bg-orange-500'
    };
  }

  if (rawUtilization >= 75) {
    return {
      utilizationPercent: rawUtilization,
      clampedPercent,
      availableCredit,
      category: 'WARNING',
      label: 'Warning (75-89%)',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-300',
      barColor: 'bg-amber-500'
    };
  }

  if (rawUtilization >= 50) {
    return {
      utilizationPercent: rawUtilization,
      clampedPercent,
      availableCredit,
      category: 'MODERATE',
      label: 'Moderate (50-74%)',
      badgeBg: 'bg-teal-50',
      badgeText: 'text-[#0F766E]',
      badgeBorder: 'border-teal-200',
      barColor: 'bg-[#0F766E]'
    };
  }

  return {
    utilizationPercent: rawUtilization,
    clampedPercent,
    availableCredit,
    category: 'HEALTHY',
    label: 'Healthy (0-49%)',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    barColor: 'bg-emerald-500'
  };
}

export type ApplicableBadgeType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'CREDIT HOLD'
  | 'OVER CREDIT LIMIT'
  | 'OVERDUE'
  | 'GOOD STANDING';

/**
 * Returns only applicable status badges for a customer.
 * Avoids showing redundant or conflicting badges simultaneously.
 */
export function getCustomerApplicableBadges(customer: Customer, isOverdueOverride?: boolean): {
  type: ApplicableBadgeType;
  label: string;
  className: string;
}[] {
  const badges: { type: ApplicableBadgeType; label: string; className: string }[] = [];
  const limit = Math.max(0, Number(customer.creditLimit) || 0);
  const due = Math.max(0, Number(customer.currentDue) || 0);
  const isHold = customer.creditHold === true;
  const isOverLimit = limit > 0 && due > limit;
  const isOverdue = isOverdueOverride || customer.status === 'overdue_hold';

  // 1. Credit Hold (Highest Priority Status)
  if (isHold) {
    badges.push({
      type: 'CREDIT HOLD',
      label: 'Credit Hold',
      className: 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
    });
  }

  // 2. Over Limit
  if (isOverLimit) {
    badges.push({
      type: 'OVER CREDIT LIMIT',
      label: 'Over Limit',
      className: 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
    });
  }

  // 3. Overdue
  if (isOverdue && !isHold) {
    badges.push({
      type: 'OVERDUE',
      label: 'Overdue Balance',
      className: 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
    });
  }

  // 4. Good Standing (Only when active, no hold, no overdue, utilization < 75%)
  const utilization = calculateCreditUtilization(limit, due);
  if (customer.status === 'active' && !isHold && !isOverLimit && !isOverdue && utilization < 75) {
    badges.push({
      type: 'GOOD STANDING',
      label: 'Good Standing',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
    });
  }

  // 5. Active / Inactive
  if (customer.status === 'inactive') {
    badges.push({
      type: 'INACTIVE',
      label: 'Inactive',
      className: 'bg-slate-100 text-slate-700 border-slate-300'
    });
  } else if (badges.length === 0) {
    badges.push({
      type: 'ACTIVE',
      label: 'Active',
      className: 'bg-teal-50 text-teal-700 border-teal-200'
    });
  }

  return badges;
}

/**
 * Calculates a derived customer risk indicator based purely on internal ledger metrics.
 * Note: Clearly labeled as "Internal business risk indicator", not an official credit score.
 */
export function calculateCustomerRisk(
  customer: Customer,
  _orders?: Order[],
  _payments?: Payment[]
): CustomerRiskInfo {
  const limit = Math.max(0, Number(customer.creditLimit) || 0);
  const due = Math.max(0, Number(customer.currentDue) || 0);
  const totalPurchase = Math.max(0, Number(customer.totalPurchase) || 0);
  const utilization = calculateCreditUtilization(limit, due);
  const isHold = customer.creditHold === true;
  const isOverdue = customer.status === 'overdue_hold';

  const disclaimer = 'Internal business risk indicator based on Glowzaa transaction history and credit utilization — not an external credit bureau score.';

  if (isHold) {
    return {
      level: 'HIGH RISK',
      scoreLabel: 'Elevated Risk (Credit Hold)',
      reason: customer.creditHoldReason || 'Manual administrative credit hold active.',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-300',
      disclaimer
    };
  }

  if (limit > 0 && due > limit) {
    return {
      level: 'HIGH RISK',
      scoreLabel: 'High Risk (Limit Breach)',
      reason: `Outstanding balance of ৳${due.toLocaleString()} exceeds allocated limit of ৳${limit.toLocaleString()}.`,
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200',
      disclaimer
    };
  }

  if (isOverdue) {
    return {
      level: 'HIGH RISK',
      scoreLabel: 'High Risk (Overdue Invoices)',
      reason: 'Past-due receivables requiring immediate collection.',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200',
      disclaimer
    };
  }

  if (utilization >= 75 || (totalPurchase > 0 && due > totalPurchase * 0.65)) {
    return {
      level: 'MEDIUM RISK',
      scoreLabel: 'Moderate Risk',
      reason: utilization >= 75 
        ? `High credit utilization (${Math.round(utilization)}%).`
        : 'Elevated debt-to-purchase volume ratio.',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
      disclaimer
    };
  }

  return {
    level: 'LOW RISK',
    scoreLabel: 'Low Risk',
    reason: 'Healthy payment velocity and disciplined credit utilization.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    disclaimer
  };
}

/**
 * Checks whether an order is eligible under the customer's credit control settings.
 * Handles NONE, WARNING, and BLOCK modes along with Credit Hold rules.
 */
export function checkOrderCreditEligibility(
  customer: Customer,
  newOrderDueAmount: number,
  isUserAdmin: boolean
): CreditCheckResult {
  const mode: CreditCheckMode = customer.creditCheckMode || 'NONE';
  const creditLimit = Math.max(0, Number(customer.creditLimit) || 0);
  const currentDue = Math.max(0, Number(customer.currentDue) || 0);
  const availableCredit = calculateAvailableCredit(creditLimit, currentDue);
  const orderCreditDue = Math.max(0, Number(newOrderDueAmount) || 0);
  const projectedDue = currentDue + orderCreditDue;
  const isCreditHold = customer.creditHold === true;
  const excessAmount = creditLimit > 0 ? Math.max(0, projectedDue - creditLimit) : 0;

  // Case 1: Customer is on Credit Hold
  if (isCreditHold) {
    if (isUserAdmin) {
      return {
        allowed: false,
        requiresAdminOverride: true,
        requiresWarningConfirmation: false,
        mode,
        isCreditHold: true,
        creditLimit,
        currentDue,
        availableCredit,
        newOrderDueAmount: orderCreditDue,
        projectedDue,
        excessAmount,
        reason: `Customer "${customer.shopName}" is on Administrative Credit Hold (${customer.creditHoldReason || 'No reason specified'}). Admin override is required to proceed.`
      };
    } else {
      return {
        allowed: false,
        requiresAdminOverride: false,
        requiresWarningConfirmation: false,
        mode,
        isCreditHold: true,
        creditLimit,
        currentDue,
        availableCredit,
        newOrderDueAmount: orderCreditDue,
        projectedDue,
        excessAmount,
        reason: `Customer "${customer.shopName}" is on Credit Hold (${customer.creditHoldReason || 'HQ clearance required'}). Sales staff cannot book credit orders for this account.`
      };
    }
  }

  // Case 2: Mode = BLOCK and credit limit is exceeded by projected due
  if (mode === 'BLOCK' && creditLimit > 0 && projectedDue > creditLimit) {
    if (isUserAdmin) {
      return {
        allowed: false,
        requiresAdminOverride: true,
        requiresWarningConfirmation: false,
        mode,
        isCreditHold: false,
        creditLimit,
        currentDue,
        availableCredit,
        newOrderDueAmount: orderCreditDue,
        projectedDue,
        excessAmount,
        reason: `Credit Limit Exceeded: Projected due (৳${projectedDue.toLocaleString()}) exceeds allocated limit of ৳${creditLimit.toLocaleString()} by ৳${excessAmount.toLocaleString()}. Admin override is required.`
      };
    } else {
      return {
        allowed: false,
        requiresAdminOverride: false,
        requiresWarningConfirmation: false,
        mode,
        isCreditHold: false,
        creditLimit,
        currentDue,
        availableCredit,
        newOrderDueAmount: orderCreditDue,
        projectedDue,
        excessAmount,
        reason: `Credit Limit Exceeded: Projected due (৳${projectedDue.toLocaleString()}) exceeds allocated limit of ৳${creditLimit.toLocaleString()} by ৳${excessAmount.toLocaleString()}. Order booking is blocked under Credit Control policy.`
      };
    }
  }

  // Case 3: Mode = WARNING and credit limit is exceeded
  if (mode === 'WARNING' && creditLimit > 0 && projectedDue > creditLimit) {
    return {
      allowed: true,
      requiresAdminOverride: false,
      requiresWarningConfirmation: true,
      mode,
      isCreditHold: false,
      creditLimit,
      currentDue,
      availableCredit,
      newOrderDueAmount: orderCreditDue,
      projectedDue,
      excessAmount,
      reason: `Credit Limit Warning: Projected balance of ৳${projectedDue.toLocaleString()} will exceed the customer's credit limit of ৳${creditLimit.toLocaleString()} by ৳${excessAmount.toLocaleString()}.`
    };
  }

  // Case 4: Within limits or mode = NONE
  return {
    allowed: true,
    requiresAdminOverride: false,
    requiresWarningConfirmation: false,
    mode,
    isCreditHold: false,
    creditLimit,
    currentDue,
    availableCredit,
    newOrderDueAmount: orderCreditDue,
    projectedDue,
    excessAmount: 0
  };
}
