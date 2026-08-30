export interface GpsStatusInfo {
  state: 'connected' | 'searching' | 'offline' | 'timeout' | 'requesting' | 'excellent' | 'good' | 'weak';
  label: string;
  subLabel: string;
  accuracyMeters: number | null;
}

export type UserRole = 'admin' | 'sales' | 'delivery';

export interface DeviceSessionInfo {
  sessionId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ipOrLocation?: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

export interface AuthUser {
  uid: string;
  id?: string;
  loginId?: string; // Username / Login ID e.g. "seller01", "delivery01"
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  lastLoginAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  avatar?: string;
  photoURL?: string;
  title?: string;
  department?: string;
  staffId?: string;
  salesStaffId?: string;
  deliveryStaffId?: string;
  territory?: string;
  assignedArea?: string;
  assignedZones?: string[];
  vehicleNumber?: string;
  vehicleType?: 'Covered Van' | 'Motorcycle' | 'Mini-Truck' | 'Bicycle Delivery' | string;
  monthlyTarget?: number;
  commissionRate?: number;
  sessionRevokedAt?: string;
  sessionVersion?: number;
  activeSessions?: DeviceSessionInfo[];
}

export interface AuditLog {
  id?: string;
  action: 
    | 'STAFF_ACCOUNT_CREATED' 
    | 'STAFF_ACCOUNT_DISABLED' 
    | 'STAFF_ACCOUNT_ENABLED' 
    | 'STAFF_ROLE_CHANGED' 
    | 'STAFF_PASSWORD_RESET' 
    | 'STAFF_PROFILE_UPDATED'
    | 'STAFF_ALL_DEVICES_LOGGED_OUT'
    | 'STAFF_SESSION_REVOKED'
    | 'SUPPLIER_CREATED'
    | 'SUPPLIER_UPDATED'
    | 'SUPPLIER_DEACTIVATED'
    | 'SUPPLIER_PRODUCT_CREATED'
    | 'SUPPLIER_PRODUCT_UPDATED'
    | 'PURCHASE_REQUEST_CREATED'
    | 'PURCHASE_REQUEST_UPDATED'
    | 'PURCHASE_REQUEST_APPROVED'
    | 'PURCHASE_REQUEST_REJECTED'
    | 'PURCHASE_REQUEST_CANCELLED'
    | 'PURCHASE_ORDER_CREATED'
    | 'PURCHASE_ORDER_SUBMITTED'
    | 'PURCHASE_ORDER_APPROVED'
    | 'PURCHASE_ORDER_REJECTED'
    | 'PURCHASE_ORDER_SENT'
    | 'PURCHASE_ORDER_SUPPLIER_CONFIRMED'
    | 'PURCHASE_ORDER_CHANGE_REQUESTED'
    | 'PURCHASE_ORDER_REVISED'
    | 'PURCHASE_ORDER_CANCELLED'
    | 'PURCHASE_ORDER_STATUS_CHANGED'
    | 'GOODS_RECEIPT_CREATED'
    | 'GOODS_RECEIPT_UPDATED'
    | 'GOODS_RECEIPT_POSTED'
    | 'GOODS_RECEIPT_CANCELLED'
    | 'PURCHASE_ORDER_PARTIALLY_RECEIVED'
    | 'PURCHASE_ORDER_RECEIVED'
    | 'PURCHASE_ORDER_RECONCILED'
    | 'INVENTORY_STOCK_IN_FROM_GOODS_RECEIPT'
    | 'PURCHASE_RECEIVING_DISCREPANCY'
    | 'SUPPLIER_SCORECARD_SETTINGS_UPDATED'
    | 'SUPPLIER_PERFORMANCE_SNAPSHOT_CREATED'
    | 'SUPPLIER_PERFORMANCE_RECALCULATED'
    | 'SUPPLIER_SCORE_OVERRIDE'
    | string;
  targetUserId: string;
  targetUserName: string;
  targetRole: string;
  performedByUserId: string;
  performedByUserName: string;
  timestamp: string;
  details?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export type ProductCategory = 
  | 'Makeup & Cosmetics'
  | 'Skincare'
  | 'Hair Care'
  | 'Hair Accessories'
  | 'Fashion Accessories'
  | 'Personal Care'
  | 'Kids Products'
  | 'Gift & Lifestyle'
  | 'Other Products';

export type AdminTab = 
  | 'dashboard'
  | 'executive_bi'
  | 'sales_intelligence'
  | 'messages'
  | 'field_tracking'
  | 'notifications'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'orders'
  | 'packing'
  | 'purchases'
  | 'purchase_orders'
  | 'goods_receipts'
  | 'supplier_performance'
  | 'price_intelligence'
  | 'expenses'
  | 'sales_staff'
  | 'delivery_staff'
  | 'staff_management'
  | 'payroll'
  | 'payments'
  | 'customer_due'
  | 'collections'
  | 'sales_reports'
  | 'inventory_reports'
  | 'profit_loss'
  | 'warehouses'
  | 'settings'
  | 'business_alerts'
  | 'sales_forecast'
  | 'inventory_intelligence'
  | 'smart_procurement'
  | 'cash_flow_center';

export type SalesTab = 
  | 'dashboard'
  | 'sales_intelligence'
  | 'messages'
  | 'customers'
  | 'products'
  | 'create_order'
  | 'my_orders'
  | 'pending_orders'
  | 'expenses'
  | 'customer_due'
  | 'sales_history'
  | 'sales_summary'
  | 'my_salary'
  | 'business_alerts'
  | 'sales_forecast';

export type DeliveryTab = 
  | 'dashboard'
  | 'messages'
  | 'assigned_orders'
  | 'today_deliveries'
  | 'pending_deliveries'
  | 'delivered_orders'
  | 'returned_orders'
  | 'due_collection'
  | 'money_collected'
  | 'expenses'
  | 'collection_history'
  | 'my_salary';

export type OrderStatus = 
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'packing'
  | 'ready_for_delivery'
  | 'processing'
  | 'dispatched'
  | 'partially_delivered'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'completed'
  | 'Draft'
  | 'Pending'
  | 'Confirmed'
  | 'Packing'
  | 'Ready for Delivery'
  | 'Processing'
  | 'Dispatched'
  | 'Partially Delivered'
  | 'Delivered'
  | 'Returned'
  | 'Cancelled'
  | 'Completed';

export type DeliveryStatus = 
  | 'unassigned'
  | 'assigned'
  | 'packing'
  | 'ready_for_delivery'
  | 'in_transit'
  | 'partially_delivered'
  | 'delivered'
  | 'returned'
  | 'failed';

export type PaymentStatus = 
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'due'
  | 'Paid'
  | 'Partially Paid'
  | 'Unpaid';

export type PaymentMethod = 
  | 'Cash'
  | 'bKash'
  | 'Nagad'
  | 'Bank Transfer'
  | 'Other'
  | 'bKash / Nagad'
  | 'Cheque'
  | 'Credit Account (Net 30)';

export type PaymentMethodOption = 
  | 'cash' 
  | 'bkash' 
  | 'nagad' 
  | 'rocket' 
  | 'bank_transfer' 
  | 'cheque' 
  | 'other'
  | 'Cash' 
  | 'bKash' 
  | 'Nagad' 
  | 'Bank Transfer' 
  | 'Other';

export type PaymentTypeOption = 
  | 'order_payment'
  | 'due_collection'
  | 'advance_payment'
  | 'adjustment'
  | 'reversal'
  | 'Order Payment' 
  | 'Due Collection' 
  | 'Advance Payment' 
  | 'Adjustment' 
  | 'Reversal';

export type LedgerTransactionType = 'SALE' | 'ORDER' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';

export type CashHandoverStatus = 'pending' | 'accepted' | 'rejected';

export interface CashHandover {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  collectionIds: string[];
  status: CashHandoverStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  paymentId?: string;
  paymentNumber: string; // Format: GLW-PAY-YYYYMMDD-XXXX
  customerId: string;
  customerName: string;
  orderId?: string | null;
  orderNumber?: string | null;
  amount: number; // Integer-safe BDT (> 0)
  paymentMethod: PaymentMethodOption | string;
  paymentType: PaymentTypeOption | string;
  referenceNumber?: string;
  isAdvance?: boolean;
  receivedByUserId?: string;
  receivedByName?: string;
  receivedByRole?: string;
  collectedByUserId?: string;
  collectedByUserName?: string;
  collectedByUserRole?: string;
  driverId?: string;
  reconciledWithAdmin?: boolean;
  handoverStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  handoverId?: string | null;
  notes?: string;
  isReversed?: boolean;
  reversedAt?: string;
  reversedByUserId?: string;
  reversedByUserName?: string;
  reversalReason?: string;
  reversalOfPaymentId?: string;
  createdAt: string;
  createdBy: string;
}

export interface CustomerLedgerEntry {
  id: string;
  ledgerId?: string;
  customerId: string;
  customerName: string;
  type: LedgerTransactionType | string;
  referenceId: string; // orderId, paymentId, returnId, etc.
  referenceNumber: string; // ORD-xxx, GLW-PAY-xxx, etc.
  debit: number; // Increases customer balance (e.g. SALE)
  credit: number; // Decreases customer balance (e.g. PAYMENT, RETURN)
  balanceAfterTransaction?: number;
  balance?: number;
  runningBalance?: number;
  description: string;
  performedByUserId?: string;
  performedByUserName?: string;
  createdBy?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  category?: ProductCategory | string;
  quantity: number;
  orderedQuantity?: number;
  deliveredQuantity?: number;
  remainingQuantity?: number;
  packedQuantity?: number;
  unitPrice: number; // Selling price in ৳ (default wholesale price)
  price?: number;
  wholesalePrice?: number;
  discount?: number; // Total or per-item discount in ৳
  subtotal?: number; // (unitPrice * quantity) - discount
  totalPrice?: number; // Alias for subtotal for backward compatibility
  purchasePrice?: number; // Cost in ৳ for profit calculation
  mrp?: number; // MRP in ৳
  minSellingPrice?: number; // Floor price in ৳
  unit?: string;
  image?: string;
}

export interface Order {
  id: string;
  orderId?: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  shopName: string;
  ownerName: string;
  customerPhone?: string;
  phone: string;
  customerAddress?: string;
  address: string;
  area: string;
  city?: string;
  district: string;
  salesUserId?: string;
  salesUserName?: string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  salesSellerId: string;
  salesSellerName: string;
  deliveryStaffId?: string;
  deliveryStaffName?: string;
  items: OrderItem[];
  subtotal: number;
  totalDiscount?: number;
  discount: number;
  tax?: number;
  grandTotal?: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | string;
  createdDate?: string;
  deliveryDate?: string;
  returnReason?: string;
  receivedBy?: string;
  podNotes?: string;
  notes?: string;
  priority?: 'normal' | 'high' | 'urgent';
  stockDeducted?: boolean;
  stockRestored?: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  returnedAt?: string;
  returnedBy?: string;
  assignedAt?: string;
  assignedBy?: string;
  assignedByName?: string;
  failureReason?: string;
  failedAt?: string;
  deliveryAttemptCount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface DeliveredItemRecord {
  productId: string;
  productName: string;
  sku: string;
  newlyDelivered: number;
  totalDelivered: number;
  remaining: number;
  orderedQuantity: number;
}

export interface DeliveryHistoryEntry {
  id?: string;
  historyId: string;
  orderId: string;
  orderNumber: string;
  previousStatus: DeliveryStatus;
  newStatus: DeliveryStatus;
  deliveryStaffId?: string;
  deliveryStaffName?: string;
  performedBy: string;
  performedByName: string;
  notes?: string;
  createdAt: string;
  failureReason?: string;
  deliveredItems?: DeliveredItemRecord[];
}

export type CreditCheckMode = 'NONE' | 'WARNING' | 'BLOCK';
export type CustomerRiskLevel = 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';

export interface CustomerNote {
  id: string;
  noteId?: string;
  customerId: string;
  note: string;
  createdBy: string;
  createdByName: string;
  createdByRole?: UserRole | string;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  customerId?: string;
  shopName: string;
  ownerName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: string;
  area: string;
  city?: string;
  district: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracyMeters?: number | null;
  isGpsVerified?: boolean;
  locationCapturedAt?: string | null;
  locationCapturedByUserId?: string | null;
  notes?: string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  assignedSalesSellerId?: string;
  assignedSalesSellerName?: string;
  creditLimit?: number;
  creditCheckMode?: CreditCheckMode;
  creditHold?: boolean;
  creditHoldReason?: string;
  creditReviewDate?: string;
  creditNote?: string;
  riskLevel?: CustomerRiskLevel;
  totalPurchase: number;
  totalPaid: number;
  totalReturned?: number;
  currentDue: number;
  advanceBalance?: number;
  paymentTermDays?: number;
  status: 'active' | 'inactive' | 'overdue_hold';
  tradeLicenseNo?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  lastPaymentDate?: string;
  lastOrderDate?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  slug?: string;
  status: 'active' | 'inactive';
}

export interface CategoryDoc {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  status: 'active' | 'inactive';
  order?: number;
  subCategories?: SubCategory[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  tradeLicense: string;
  binNumber: string;
  defaultCreditLimit: number;
  shortDescription: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  managerName: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryId?: string;
  subCategory?: string;
  brand?: string;
  brandName?: string;
  image: string;
  description?: string;
  status: 'active' | 'inactive';
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  purchasePrice: number; // Cost in ৳
  wholesalePrice: number; // B2B Wholesale rate in ৳
  mrp: number; // Retail MSRP in ৳
  minSellingPrice?: number; // Minimum Floor Price in ৳
  openingStock?: number;
  currentStock: number;
  lowStockThreshold: number;
  unit: string;
  barcode?: string;
  size?: string;
  color?: string;
  variant?: string;
  warehouseLocation?: string;
  warehouseId?: string; // Add this
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  previousStock: number;
  adjustmentQuantity: number;
  newStock: number;
  type: 'stock_in' | 'adjustment' | 'damage' | 'audit' | 'return' | 'sample';
  reason: string;
  userId: string;
  userName: string;
  userRole: string;
  createdAt: string;

  // Added for Goods Receiving (GRN) traceability
  unitCost?: number;
  totalCost?: number;
  purchaseOrderId?: string;
  purchaseOrderItemId?: string;
  goodsReceiptId?: string;
  grnNumber?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  supplierName: string;
  supplierPhone?: string;
  supplierInvoiceNo?: string;
  purchaseDate: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus?: 'paid' | 'partial' | 'unpaid';
  status: 'received' | 'ordered' | 'partial';
  notes?: string;
}

export interface SalesStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  territory: string;
  monthlyTarget: number;
  achievedSales: number;
  totalOrders: number;
  commissionRate: number; // e.g. 2.0%
  activeCustomers: number;
  avatar: string;
  photoURL?: string;
  status: 'active' | 'on_leave';
}

export interface DeliveryStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedArea: string;
  assignedZones?: string[];
  vehicleNumber: string;
  vehicleType: 'Covered Van' | 'Motorcycle' | 'Mini-Truck' | 'Bicycle Delivery';
  activeDeliveriesToday: number;
  completedDeliveriesToday: number;
  cashInHand: number;
  avatar: string;
  photoURL?: string;
  status: 'on_duty' | 'available' | 'off_duty';
}

export interface CollectionRecord {
  id: string;
  collectionNumber: string;
  orderId?: string;
  orderNumber?: string;
  customerId: string;
  shopName: string;
  ownerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  collectedByRole: 'delivery' | 'sales' | 'admin';
  collectorId: string;
  collectorName: string;
  collectedAt: string;
  referenceNo?: string;
  reconciledWithAdmin: boolean;
  handoverStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  handoverId?: string | null;
  notes?: string;
}

export type ExpenseCategory = 
  | 'Rent'
  | 'Utilities'
  | 'Fuel & Transport'
  | 'Packaging'
  | 'Salaries & Commissions'
  | 'Marketing'
  | 'Office & Supplies'
  | 'Customs & Logistics'
  | 'Vehicle Repair & Maintenance'
  | 'Warehouse & Maintenance'
  | 'Other';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  expenseNumber: string; // e.g. GLW-EXP-20260822-0001
  category: ExpenseCategory | string;
  amount: number; // Integer-safe BDT
  title: string;
  description?: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'bKash' | 'Nagad' | string;
  vendorName?: string | null;
  spentByUserId: string;
  spentByUserName: string;
  approvedByUserId?: string | null;
  approvedByUserName?: string | null;
  approvedAt?: string | null;
  status: ExpenseStatus;
  expenseDate: string; // YYYY-MM-DD
  rejectionReason?: string;
  notes?: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedByUserId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// PAYROLL & HR MANAGEMENT MODULE DATA TYPES
// ==========================================

export interface StaffSalaryProfile {
  id: string; // Document ID (usually staffId or auto-generated)
  staffId: string; // e.g. "seller01", "deliv-01", "admin01" or staff uid
  userId: string; // Auth User UID
  staffName: string;
  role: UserRole;
  department: string;
  basicSalary: number;
  houseRent: number;
  medicalAllowance: number;
  transportAllowance: number;
  mobileAllowance: number;
  otherAllowance: number;
  grossSalary: number; // Calculated: basic + sum(allowances)
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD (null for current)
  salaryStatus: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export type PayrollStatus = 'draft' | 'approved' | 'partially_paid' | 'paid' | 'cancelled';

export interface MonthlyPayroll {
  id: string; // Deterministic: `${payrollPeriod}_${staffId}` e.g. "2026-08_seller01"
  payrollPeriod: string; // YYYY-MM e.g. "2026-08"
  staffId: string;
  userId: string;
  staffName: string;
  role: UserRole;
  department: string;
  basicSalary: number;
  houseRent: number;
  medicalAllowance: number;
  transportAllowance: number;
  mobileAllowance: number;
  otherAllowance: number;
  totalAllowances: number;
  grossSalary: number;
  totalCommission: number;
  totalBonus: number;
  totalIncentives: number;
  totalAbsenceDeduction: number;
  totalLateDeduction: number;
  totalAdvanceDeduction: number;
  totalLoanInstallment: number;
  totalOtherDeductions: number;
  totalDeductions: number;
  netSalary: number; // (grossSalary + totalCommission + totalBonus + totalIncentives) - totalDeductions
  paidAmount: number;
  dueAmount: number;
  status: PayrollStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export type AdjustmentCategory = 'bonus' | 'deduction';

export type AdjustmentType = 
  | 'performance_bonus'
  | 'sales_commission'
  | 'delivery_incentive'
  | 'target_achievement'
  | 'special_bonus'
  | 'other_incentive'
  | 'advance_deduction'
  | 'loan_installment'
  | 'absence_deduction'
  | 'late_deduction'
  | 'damage_loss_recovery'
  | 'other_deduction';

export interface PayrollAdjustment {
  id: string;
  staffId: string;
  userId: string;
  staffName: string;
  payrollPeriod: string; // YYYY-MM
  category: AdjustmentCategory;
  type: AdjustmentType;
  amount: number;
  reason: string;
  notes?: string;
  // Sales specific optional
  salesTarget?: number;
  salesAchievement?: number;
  achievementPercentage?: number;
  commissionRate?: number;
  commissionAmount?: number;
  // Delivery specific optional
  deliveryCount?: number;
  successfulDeliveries?: number;
  codCollectionAmount?: number;
  deliveryIncentive?: number;
  createdAt: string;
  createdBy: string;
}

export type AdvanceLoanStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface StaffAdvanceLoan {
  id: string;
  staffId: string;
  userId: string;
  staffName: string;
  recordType: 'advance' | 'loan';
  amount: number;
  issueDate: string; // YYYY-MM-DD
  reason: string;
  repaymentAmount: number; // Total paid back
  remainingBalance: number; // amount - repaymentAmount
  installmentAmount: number; // Expected monthly deduction
  status: AdvanceLoanStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type SalaryPaymentStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'REVERSED';

export interface SalaryPayment {
  id: string;
  payrollId: string;
  payrollPeriod: string;
  staffId: string;
  userId: string;
  staffName: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Banking' | 'Other';
  transactionReference?: string;
  notes?: string;
  paidBy: string;
  paidByName?: string;
  status: SalaryPaymentStatus;
  createdAt: string;
}

export interface PayrollSummaryStats {
  totalStaff: number;
  activeStaff: number;
  totalMonthlyPayroll: number;
  paidAmount: number;
  pendingAmount: number;
  totalBonus: number;
  totalDeduction: number;
  outstandingAdvances: number;
  outstandingLoans: number;
}

// ============================================================================
// STEP 14: FIELD SALES TRACKING SYSTEM TYPES
// ============================================================================

export type GpsConnectionState =
  | 'idle'
  | 'requesting'
  | 'searching'
  | 'connected'
  | 'weak'
  | 'temporarily_lost'
  | 'permission_denied'
  | 'gps_disabled'
  | 'timeout'
  | 'offline';

export type LocationReadiness = 
  | 'checking' 
  | 'ready' 
  | 'permission_required' 
  | 'permission_denied' 
  | 'gps_unavailable' 
  | 'weak_accuracy' 
  | 'stale' 
  | 'unsupported';

export type FieldDutyStatus = 'active' | 'ended' | 'auto_closed';

export type TrackingStatus = 'on_field' | 'off_duty';

export type GpsFreshnessStatus = 'live' | 'delayed' | 'stale' | 'unavailable';

export type NetworkConnectionStatus = 'online' | 'offline';

export interface FieldDutySession {
  id: string;
  sessionId: string;
  userId: string;
  userLoginId: string;
  userName: string;
  territory?: string | null;
  assignedArea?: string | null;
  status: FieldDutyStatus;
  startedAt: string;
  endedAt?: string | null;
  startLatitude?: number | null;
  startLongitude?: number | null;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastLocationUpdateAt?: string | null;
  batteryLevel?: number | null;
  gpsAccuracyMeters?: number | null;
  totalVisitsCompleted: number;
  totalOrdersBooked: number;
  totalOrdersAmountBDT: number;
  totalPaymentsCollectedBDT: number;
  totalDistanceKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface GpsLocationPing {
  id: string;
  pingId: string;
  sessionId: string;
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  timestamp: string;
  batteryLevel?: number | null;
  isCharging?: boolean | null;
  networkOnline?: boolean | null;
}

export type CustomerVisitOutcome = 'order_booked' | 'payment_collected' | 'no_sale' | 'follow_up';

export interface CustomerVisit {
  id: string;
  visitId: string;
  sessionId: string;
  userId: string;
  userName: string;
  customerId: string;
  shopName: string;
  ownerName: string;
  checkInTime: string;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkInAccuracyMeters?: number | null;
  checkOutTime?: string | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  checkOutAccuracyMeters?: number | null;
  durationMinutes?: number | null;
  visitOutcome?: CustomerVisitOutcome | null;
  notes?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  distanceFromShopMeters?: number | null;
  isGpsVerified?: boolean;
  verificationStatus?: 'verified' | 'rejected' | 'unverified';
  rejectionReason?: string | null;
}

// ============================================================================
// STEP 15: PUSH NOTIFICATIONS & STAFF COMMUNICATION TYPES
// ============================================================================

export type CommunicationDevicePlatform = 'Android' | 'Windows' | 'macOS' | 'iOS' | 'Linux' | 'Unknown';
export type DevicePermissionStatus = 'granted' | 'denied' | 'default' | 'prompt';

export interface CommunicationDevice {
  id: string; // unique registration id e.g. `dev_${userId}_${sanitizedDeviceId}`
  userId: string;
  role: UserRole | string;
  userName: string;
  platform: CommunicationDevicePlatform | string;
  browser: string;
  deviceLabel: string;
  fcmToken: string;
  permissionStatus: DevicePermissionStatus;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CommunicationNotificationType =
  | 'message'
  | 'announcement'
  | 'urgent'
  | 'order'
  | 'delivery'
  | 'payment'
  | 'field'
  | 'system';

export type CommunicationActionType =
  | 'none'
  | 'communication'
  | 'order'
  | 'delivery'
  | 'payment'
  | 'field_tracking'
  | 'announcement';

export interface CommunicationNotification {
  id: string;
  recipientUserId: string; // 'all' | 'role:sales' | 'role:delivery' | 'role:admin' | specific user UID
  recipientRole: 'all' | 'sales' | 'delivery' | 'admin' | 'individual' | string;
  recipientUserName?: string;
  senderUserId: string;
  senderName: string;
  senderRole?: UserRole | string;
  type: CommunicationNotificationType;
  title: string;
  body: string;
  priority: 'normal' | 'important' | 'urgent';
  actionType: CommunicationActionType;
  actionTarget?: string;
  relatedId?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
  expiresAt?: string | null;
}

export interface NotificationPreferences {
  announcements: boolean;
  importantUpdates: boolean;
  deliveryUpdates: boolean;
  paymentUpdates: boolean;
  fieldSalesUpdates: boolean;
  systemNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface StaffPushToken {
  id: string;
  tokenId?: string;
  userId: string;
  userLoginId?: string;
  userName?: string;
  role: UserRole | string;
  token: string;
  deviceType: 'android' | 'desktop' | 'mobile_browser' | 'unknown';
  browser: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  isActive: boolean;
}

export type NotificationType =
  | 'admin_note'
  | 'order_instruction'
  | 'delivery_instruction'
  | 'field_task'
  | 'payment_reminder'
  | 'announcement'
  | 'urgent'
  | 'system';

export type NotificationPriority = 'normal' | 'important' | 'urgent';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface StaffNotification {
  id: string;
  notificationId: string;
  recipientUserId: string; // 'all' or specific userId or role e.g. 'role:sales', 'role:delivery'
  recipientUserName?: string;
  recipientRole: UserRole | 'all' | string;
  senderUserId: string;
  senderUserName: string;
  senderRole: UserRole | string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  relatedOrderId?: string;
  relatedOrderNumber?: string;
  relatedCustomerId?: string;
  relatedCustomerName?: string;
  actionUrl?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  status: NotificationStatus;
  isRead: boolean;
  expiresAt?: string;
  fcmMessageId?: string;
  deviceCount?: number;
}

// ============================================================================
// STEP 15 - PHASE 2: PRIVATE REAL-TIME TEXT MESSAGING SYSTEM TYPES
// ============================================================================

export type CommunicationMessageStatus = 'sent' | 'delivered' | 'seen';

export interface ParticipantTypingState {
  isTyping: boolean;
  updatedAt: string;
  userName?: string;
}

export interface CommunicationConversation {
  id: string; // Deterministic ID: sort([uid1, uid2]).join('_')
  participantIds: string[];
  participantNames: Record<string, string>;
  participantRoles: Record<string, string>;
  lastMessage: string;
  lastMessageSenderId: string;
  lastMessageAt: string; // ISO timestamp
  unreadCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  typing?: Record<string, ParticipantTypingState>;
}

export interface CommunicationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string; // 'admin' | 'sales' | 'delivery'
  receiverId: string;
  text: string;
  status: CommunicationMessageStatus;
  sentAt: string; // ISO timestamp
  deliveredAt?: string | null;
  seenAt?: string | null;
  isDeleted?: boolean;
}

// ============================================================================
// STEP 15 - PHASE 3: PREMIUM REAL-TIME VOICE CALLING SYSTEM TYPES
// ============================================================================

export type VoiceCallStatus =
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'rejected'
  | 'missed'
  | 'cancelled'
  | 'ended'
  | 'failed';

export type VoiceCallDirection = 'incoming' | 'outgoing';

export type VoiceCallConnectionState =
  | 'excellent'
  | 'good'
  | 'poor'
  | 'reconnecting'
  | 'failed'
  | 'disconnected';

export type VoiceCallSignalType = 'offer' | 'answer' | 'ice-candidate' | 'hangup';

export interface VoiceCallSignalCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface VoiceCallSignal {
  id: string;
  callId: string;
  senderId: string;
  receiverId?: string;
  type: VoiceCallSignalType;
  sdp?: string;
  candidate?: VoiceCallSignalCandidate;
  createdAt: string;
}

export interface VoiceCall {
  id: string;
  callerId: string;
  callerName: string;
  callerRole: 'admin' | 'sales' | 'delivery' | string;
  callerAvatar?: string;
  callerPhone?: string;

  receiverId: string;
  receiverName: string;
  receiverRole: 'admin' | 'sales' | 'delivery' | string;
  receiverAvatar?: string;
  receiverPhone?: string;

  conversationId?: string;

  callType: 'voice';

  status: VoiceCallStatus;

  startedAt: string; // ISO timestamp
  answeredAt?: string | null;
  endedAt?: string | null;

  durationSeconds?: number;
  endReason?: string;

  createdAt: string;
  updatedAt: string;
}

export interface VoiceCallKPIs {
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  rejectedCalls: number;
  totalTalkTimeSeconds: number;
}

// ============================================================================
// STEP 15 - PHASE 4: ADVANCED VOICE CALL MANAGEMENT & GROUP COMMUNICATION
// ============================================================================

export type GroupCallStatus = 'initializing' | 'active' | 'ended';
export type GroupCallParticipantStatus = 'invited' | 'ringing' | 'connected' | 'rejected' | 'missed' | 'left' | 'failed';

export interface GroupCallParticipant {
  uid: string;
  name: string;
  role: string;
  status: GroupCallParticipantStatus;
  joinedAt?: string;
  leftAt?: string;
  isMuted?: boolean;
}

export interface GroupCall {
  id: string;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: string;
  
  type: 'group' | 'broadcast';
  status: GroupCallStatus;
  
  participantIds: string[];
  participants: Record<string, GroupCallParticipant>; // Keyed by uid
  
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number;
  
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type AnnouncementAudience = 'all_staff' | 'all_sellers' | 'all_delivery' | 'selected';

export interface Announcement {
  id: string;
  senderId: string;
  senderName: string;
  
  message: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  selectedUserIds?: string[];
  
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  
  sentAt: string;
}

export interface CallQueueEntry {
  id: string;
  callerId: string;
  callerName: string;
  
  targetId: string;
  targetName: string;
  targetRole: string;
  
  status: 'queued' | 'calling' | 'completed' | 'cancelled';
  
  queuedAt: string;
  calledAt?: string;
}

// ============================================================================
// STEP 16: SMART SALES & CUSTOMER INTELLIGENCE SYSTEM TYPES
// ============================================================================

export type CustomerSegment = 
  | 'HIGH VALUE' 
  | 'GROWING' 
  | 'STABLE' 
  | 'DECLINING' 
  | 'AT RISK' 
  | 'OVERDUE' 
  | 'CREDIT HOLD' 
  | 'INACTIVE';

export interface SalesTrendPoint {
  date: string; // YYYY-MM-DD or label
  sales: number; // ৳ Completed/Delivered/Confirmed orders
  ordersCount: number;
  collections: number; // ৳ Payments received
}

export interface SellerPerformanceSummary {
  sellerId: string;
  sellerLoginId?: string;
  sellerName: string;
  territory: string;
  monthlyTarget: number;
  sales: number;
  achievementRate: number; // 0-100+ % (0 if no target)
  hasTarget: boolean;
  ordersCount: number;
  collections: number;
  totalDue: number;
  assignedCustomersCount: number;
  activeCustomersCount: number;
  visitsCount: number;
  visitsWithOrder: number;
  conversionRate: number; // (visitsWithOrder / visitsCount) * 100
  fieldDistanceKm: number;
  averageOrderValue: number;
  rank?: number;
}

export interface CustomerIntelligenceSummary {
  customerId: string;
  shopName: string;
  ownerName: string;
  phone: string;
  district: string;
  territory?: string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  segment: CustomerSegment;
  totalSales: number;
  ordersCount: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  orderFrequencyDays: number | null;
  salesCurrent30d: number;
  salesPrevious30d: number;
  salesChangePercent: number | null; // e.g. -35% or +20%
  creditLimit: number;
  currentDue: number;
  availableCredit: number;
  creditUtilizationPercent: number;
  creditHold: boolean;
  creditCheckMode: string;
  visitsCount: number;
  conversionRate: number;
  riskIndicators: string[];
  recommendedActions: string[];
}

export interface ProductPerformanceSummary {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  revenue: number;
  ordersCount: number;
  currentStock: number;
  wholesalePrice: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  velocity: 'fast' | 'medium' | 'slow';
}

export type BusinessAlertSeverity = 'critical' | 'warning' | 'info' | 'opportunity' | 'high' | 'medium';

export interface BusinessAlert {
  id: string;
  type: 
    | 'OVERDUE' 
    | 'CREDIT_EXCEEDED' 
    | 'CREDIT_UTILIZATION_SEVERE'
    | 'CREDIT_UTILIZATION_HIGH'
    | 'SALES_DECLINING' 
    | 'BELOW_TARGET' 
    | 'NO_RECENT_ORDER' 
    | 'HIGH_VALUE_OPPORTUNITY' 
    | 'HIGH_GROWTH_CUSTOMER'
    | 'STRONG_PERFORMANCE'
    | 'TOP_SELLER'
    | 'LOW_VISIT_CONVERSION'
    | 'GPS_STALE'
    | 'LOW_STOCK'
    | 'PRODUCT_STOCKOUT_RISK'
    | 'PRODUCT_REORDER_REQUIRED'
    | 'PRODUCT_SALES_DECLINING'
    | 'PRODUCT_SALES_GROWING'
    | 'CUSTOMER_REORDER_OPPORTUNITY';
  category?: string;
  severity: BusinessAlertSeverity;
  title: string;
  description: string;
  targetType?: 'customer' | 'seller' | 'product' | 'system';
  entityType?: string;
  targetId?: string;
  entityId?: string;
  customerId?: string;
  customerName?: string;
  entityName?: string;
  sellerId?: string;
  sellerName?: string;
  relatedUserId?: string;
  relatedUserName?: string;
  metricValue?: string | number;
  metric?: string;
  previousValue?: string;
  currentValue?: string;
  changePercent?: string;
  actionLabel?: string;
  actionType?: string;
  status?: 'unread' | 'read' | 'dismissed' | 'actioned';
  createdAt?: string;
}

export type ForecastStatus = 'growing' | 'stable' | 'declining' | 'slow_moving' | 'insufficient_data';
export type DataQuality = 'excellent' | 'good' | 'limited' | 'insufficient';
export type ForecastConfidence = 'High' | 'Medium' | 'Low' | 'Insufficient Data';
export type ReorderPriority = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface ProductDemandForecast {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  historicalDays: number;
  totalUnitsSold: number;
  averageDailyUnits: number;
  averageWeeklyUnits: number;
  averageMonthlyUnits: number;
  forecast7Days: number;
  forecast14Days: number;
  forecast30Days: number;
  salesTrendPercent: number;
  confidence: ForecastConfidence;
  dataQuality: DataQuality;
  lastSaleDate: string | null;
  daysSinceLastSale: number | null;
  status: ForecastStatus;
  currentStock: number;
  daysOfStock: number | null;
  stockoutRisk7Days: boolean;
  stockoutRisk14Days: boolean;
}

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  currentStock: number;
  averageDailyDemand: number;
  leadTimeDays: number | null;
  safetyStock: number;
  reorderPoint: number | null;
  forecastDemand30Days: number;
  recommendedOrderQty: number;
  daysOfStock: number | null;
  priority: ReorderPriority;
  reason: string;
  dataQuality: DataQuality;
}

export interface CustomerReorderOpportunity {
  customerId: string;
  shopName: string;
  ownerName: string;
  phone: string;
  district: string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  lastOrderDate: string | null;
  orderFrequency: number;
  averageOrderIntervalDays: number | null;
  averageOrderValue: number;
  estimatedNextOrderWindow: string | null;
  status: 'due_soon' | 'overdue' | 'healthy' | 'insufficient_history';
  reason: string;
}

export interface SellerOpportunity {
  sellerId: string;
  sellerName: string;
  territory: string;
  customerOpportunities: {
    customerId: string;
    shopName: string;
    reason: string;
    suggestedAction: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface RepeatCustomerAnalysis {
  totalCustomers: number;
  repeatCustomers: number;
  oneTimeCustomers: number;
  zeroOrderCustomers: number;
  repeatPurchaseRate: number; // percentage
  newCustomerRate: number;
  inactiveCustomerRate: number;
}

export interface SalesIntelligenceSummary {
  totalSales: number;
  totalOrders: number;
  totalCollections: number;
  totalDue: number;
  averageOrderValue: number;
  activeSellersCount: number;
  activeCustomersCount: number;
  totalMonthlyTarget: number;
  totalAchievementPercent: number;
  hasTargetConfigured: boolean;
  repeatCustomerStats: RepeatCustomerAnalysis;
  topSellers: SellerPerformanceSummary[];
  topCustomers: CustomerIntelligenceSummary[];
  decliningCustomers: CustomerIntelligenceSummary[];
  topProducts: ProductPerformanceSummary[];
  slowMovingProducts: ProductPerformanceSummary[];
  businessAlerts: BusinessAlert[];
  trendPoints: SalesTrendPoint[];
}

export type SupplierStatus =
  | 'active'
  | 'inactive'
  | 'blocked';

export interface Supplier {
  id: string;
  supplierCode: string;

  name: string;
  companyName?: string;

  phone?: string;
  alternatePhone?: string;
  email?: string;

  address?: string;
  city?: string;
  district?: string;

  contactPerson?: string;

  status: SupplierStatus;

  paymentTerms?: string;
  currency?: string;

  defaultLeadTimeDays?: number;
  minimumOrderValue?: number;

  notes?: string;

  totalPurchaseAmountBDT: number;
  totalPurchaseOrders: number;

  lastPurchaseAt?: string | null;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface SupplierProduct {
  id: string;

  supplierId: string;
  productId: string;

  supplierName?: string;
  productName?: string;

  supplierSku?: string;

  purchasePrice: number;
  currency?: string;

  minimumOrderQuantity?: number;
  leadTimeDays?: number;

  isPreferredSupplier: boolean;
  isActive: boolean;

  lastPurchasePrice?: number;
  lastPurchaseAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

export type PurchaseRequestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'converted'
  | 'cancelled';

export interface PurchaseRequest {
  id: string;
  requestNumber: string;

  requestedByUserId: string;
  requestedByUserName: string;

  supplierId?: string | null;
  supplierName?: string | null;

  status: PurchaseRequestStatus;

  reason?: string;

  totalEstimatedAmountBDT: number;

  createdAt: string;
  updatedAt: string;

  approvedAt?: string | null;
  approvedByUserId?: string | null;
  approvedByUserName?: string | null;

  rejectedAt?: string | null;
  rejectedByUserId?: string | null;
  rejectionReason?: string | null;
}

export interface PurchaseRequestItem {
  id: string;

  purchaseRequestId: string;

  productId: string;
  productName: string;

  requestedQuantity: number;

  estimatedUnitPrice: number;
  estimatedTotalPrice: number;

  currentStock?: number;
  recommendedQuantity?: number;

  createdAt: string;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent_to_supplier'
  | 'supplier_confirmed'
  | 'in_transit'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'rejected'
  | 'cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;

  purchaseRequestId?: string | null;

  supplierId: string;
  supplierName: string;

  status: PurchaseOrderStatus;

  createdByUserId: string;
  createdByUserName: string;

  approvedByUserId?: string | null;
  approvedByUserName?: string | null;

  createdAt: string;
  updatedAt: string;

  approvedAt?: string | null;
  sentToSupplierAt?: string | null;
  supplierConfirmedAt?: string | null;

  expectedDeliveryDate?: string | null;

  supplierReferenceNumber?: string | null;

  paymentTerms?: string | null;

  currency: string;

  subtotalBDT: number;
  discountBDT: number;
  transportCostBDT: number;
  otherCostBDT: number;
  totalAmountBDT: number;

  totalOrderedQuantity: number;
  totalReceivedQuantity: number;
  totalRemainingQuantity: number;

  notes?: string | null;

  rejectionReason?: string | null;
  cancellationReason?: string | null;

  version: number;
}

export interface PurchaseOrderItem {
  id: string;

  purchaseOrderId: string;

  productId: string;
  productName: string;

  supplierProductId?: string | null;

  supplierSku?: string | null;

  orderedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;

  unitPurchasePriceBDT: number;

  discountBDT: number;
  totalLineAmountBDT: number;

  expectedDeliveryDate?: string | null;

  notes?: string | null;

  createdAt: string;
  updatedAt: string;
}





export type GoodsReceiptStatus =
  | 'draft'
  | 'pending_post'
  | 'posted'
  | 'cancelled';

export interface GoodsReceipt {
  id: string;
  grnNumber: string;

  purchaseOrderId: string;
  poNumber: string;

  supplierId: string;
  supplierName: string;

  status: GoodsReceiptStatus;

  receivedByUserId: string;
  receivedByUserName: string;

  receivedAt: string;

  deliveryNoteNumber?: string | null;
  supplierInvoiceNumber?: string | null;

  transportReference?: string | null;

  notes?: string | null;

  totalOrderedQuantity: number;
  totalReceivedQuantity: number;
  totalAcceptedQuantity: number;
  totalRejectedQuantity: number;
  totalDamagedQuantity: number;

  subtotalReceivedValueBDT: number;

  createdAt: string;
  updatedAt: string;

  postedAt?: string | null;
  postedByUserId?: string | null;
  postedByUserName?: string | null;

  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  cancellationReason?: string | null;
}

export interface GoodsReceiptItem {
  id: string;

  goodsReceiptId: string;

  purchaseOrderId: string;
  purchaseOrderItemId: string;

  productId: string;
  productName: string;

  orderedQuantity: number;

  previouslyReceivedQuantity: number;

  receivedQuantity: number;

  acceptedQuantity: number;

  rejectedQuantity: number;

  damagedQuantity: number;

  remainingQuantity: number;

  unitPurchasePriceBDT: number;

  acceptedValueBDT: number;

  discrepancyType?:
    | 'none'
    | 'short'
    | 'over'
    | 'damaged'
    | 'wrong_product'
    | 'mixed';

  discrepancyReason?: string | null;

  notes?: string | null;

  createdAt: string;
  updatedAt: string;
}

// ========================================================================
// STEP 17.4 — SUPPLIER PERFORMANCE & PURCHASE PRICE INTELLIGENCE TYPES
// ========================================================================

export interface SupplierScorecardWeights {
  deliveryWeight: number; // default: 30
  quantityAccuracyWeight: number; // default: 20
  qualityWeight: number; // default: 20
  priceWeight: number; // default: 15
  responsivenessWeight: number; // default: 10
  commitmentAccuracyWeight: number; // default: 5
}

export interface SupplierScorecardThresholds {
  minOtifRate: number; // default: 80 (%)
  maxDamageRate: number; // default: 3 (%)
  maxShortDeliveryRate: number; // default: 5 (%)
  maxPriceIncreasePercent: number; // default: 10 (%)
  minSupplierScore: number; // default: 60 (score out of 100)
  minOrderVolumeForScoring: number; // default: 1
}

export interface SupplierRatingBands {
  excellentMin: number; // 90
  goodMin: number; // 75
  averageMin: number; // 60
  poorMin: number; // 40
}

export interface SupplierScorecardSettings {
  id: string; // 'global'
  weights: SupplierScorecardWeights;
  thresholds: SupplierScorecardThresholds;
  ratingBands: SupplierRatingBands;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

export type SupplierPerformanceRating = 
  | 'Excellent' // Tier 1 Preferred
  | 'Good'      // Tier 2 Reliable
  | 'Average'   // Tier 3 Conditional
  | 'Poor'      // Tier 4 High Risk
  | 'Critical'  // Disqualified / Blocked
  | 'Unrated';  // Insufficient Data

export type SupplierRiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe' | 'Unknown';

export interface SupplierKPIs {
  totalPurchaseOrders: number;
  completedPurchaseOrders: number;
  cancelledPurchaseOrders: number;
  totalGoodsReceipts: number;
  
  totalOrderedUnits: number;
  totalReceivedUnits: number;
  totalAcceptedUnits: number;
  totalDamagedUnits: number;
  totalRejectedUnits: number;
  totalShortUnits: number;
  totalOverUnits: number;

  totalSpendBDT: number;
  totalAcceptedSpendBDT: number;
  totalDamagedLossBDT: number;

  // Normalized Percentages & Rates (0-100 or null if no baseline)
  onTimeDeliveryRate: number | null; // (On-time GRNs / Total GRNs) * 100
  inFullDeliveryRate: number | null; // (Accepted / Ordered) * 100
  otifRate: number | null; // On-Time-In-Full rate %
  fillRate: number | null; // (Received / Ordered) * 100
  shortDeliveryRate: number | null; // (Short / Ordered) * 100
  overDeliveryRate: number | null; // (Over / Ordered) * 100
  qualityAcceptanceRate: number | null; // (Accepted / Received) * 100
  damageRate: number | null; // (Damaged / Received) * 100
  rejectionRate: number | null; // (Rejected / Received) * 100
  priceCompetitivenessScore: number | null; // 0 - 100
  responsivenessScore: number | null; // 0 - 100
  commitmentAccuracyScore: number | null; // 0 - 100

  averageLeadTimeDays: number | null;
  averageDeliveryDelayDays: number | null;
}

export interface SupplierComponentScores {
  deliveryScore: number | null;
  quantityScore: number | null;
  qualityScore: number | null;
  priceScore: number | null;
  responsivenessScore: number | null;
  commitmentScore: number | null;
}

export interface SupplierActionRecommendation {
  id: string;
  title: string;
  category: 'quality' | 'delivery' | 'pricing' | 'contract' | 'volume';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  recommendation: string;
  evidenceMetric: string;
  suggestedAction: string;
}

export interface SupplierPerformanceScore {
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  periodStart?: string;
  periodEnd?: string;
  overallScore: number | null; // null if unrated
  rating: SupplierPerformanceRating;
  riskLevel: SupplierRiskLevel;
  riskFactors: string[];
  kpis: SupplierKPIs;
  componentScores: SupplierComponentScores;
  normalizedWeights: { [key: string]: number };
  dataConfidence: 'High' | 'Medium' | 'Low' | 'Insufficient';
  totalEligiblePOs: number;
  totalGRNs: number;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  previousScore?: number | null;
  recommendations: SupplierActionRecommendation[];
  calculatedAt: string;
}

export interface SupplierPerformanceSnapshot {
  id: string;
  supplierId: string;
  supplierName: string;
  periodStart: string;
  periodEnd: string;
  overallScore: number | null;
  rating: SupplierPerformanceRating;
  riskLevel: SupplierRiskLevel;
  kpis: SupplierKPIs;
  dataConfidence: 'High' | 'Medium' | 'Low' | 'Insufficient';
  createdAt: string;
  createdByUserId?: string;
  createdByUserName?: string;
}

export interface SupplierProductPriceStat {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  supplierId: string;
  supplierName: string;
  currentPriceBDT: number;
  previousPriceBDT: number | null;
  minHistoricalPriceBDT: number;
  maxHistoricalPriceBDT: number;
  avgHistoricalPriceBDT: number;
  priceChangeBDT: number;
  priceChangePercent: number;
  trend: 'up' | 'down' | 'stable';
  effectiveUnitCostBDT: number; // Purchase price + waste/damage cost per accepted unit
  lastPurchaseDate: string;
  orderCount: number;
  totalQuantityPurchased: number;
}

export interface ProductSupplierBenchmark {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  minPriceBDT: number;
  maxPriceBDT: number;
  avgPriceBDT: number;
  supplierCount: number;
  priceSpreadBDT: number;
  priceSpreadPercent: number;
  bestValueSupplierId: string;
  bestValueSupplierName: string;
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    latestPriceBDT: number;
    effectiveCostBDT: number;
    overallScore: number | null;
    rating: SupplierPerformanceRating;
    otifRate: number | null;
    damageRate: number | null;
    leadTimeDays: number | null;
    lastPurchasedAt: string;
  }>;
}

export interface SupplierPriceAlert {
  id: string;
  supplierId: string;
  supplierName: string;
  productId?: string;
  productName?: string;
  alertType: 'price_hike' | 'low_otif' | 'high_damage' | 'short_shipment' | 'risk_escalation' | 'price_variance';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metricValue: number;
  thresholdValue: number;
  createdAt: string;
  isRead?: boolean;
  resolved?: boolean;
}

// ============================================================================
// STEP 17.5 — SMART PROCUREMENT DASHBOARD & AI PURCHASING RECOMMENDATIONS
// ============================================================================

export type ProcurementRecommendationType =
  | 'REORDER_NOW'
  | 'REORDER_SOON'
  | 'REORDER_PLANNED'
  | 'STOCKOUT_RISK'
  | 'OVERSTOCK'
  | 'EXCESS_INBOUND'
  | 'PRICE_OPPORTUNITY'
  | 'SUPPLIER_RISK'
  | 'LATE_PO_RISK'
  | 'DEMAND_SPIKE'
  | 'DEMAND_DROP'
  | 'NO_ACTION';

export type ProcurementPriority = 'critical' | 'high' | 'medium' | 'low' | 'planned';
export type ProcurementRecommendationStatus = 'new' | 'reviewed' | 'approved' | 'actioned' | 'dismissed' | 'expired';
export type ProcurementConfidence = 'High' | 'Medium' | 'Low' | 'Insufficient Data';
export type StockoutRiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | 'UNKNOWN';

export interface ProcurementSupplierOption {
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  unitPriceBDT: number | null;
  effectiveCostBDT: number | null;
  score: number | null;
  rating: SupplierPerformanceRating;
  riskLevel: SupplierRiskLevel;
  leadTimeDays: number | null;
  otifRate: number | null;
  damageRate: number | null;
  moq?: number;
  currency?: string;
  rank: 'preferred' | 'alternative_1' | 'alternative_2' | 'manual_selection_required';
  selectionReason?: string;
}

export interface ProcurementRecommendation {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  type: ProcurementRecommendationType;
  priority: ProcurementPriority;
  status: ProcurementRecommendationStatus;
  confidence: ProcurementConfidence;
  confidenceFactors: string[];
  
  // Inventory Positions
  currentStock: number;
  reservedStock: number;
  inboundStock: number;
  availableStock: number;
  projectedStock: number;
  
  // Demand & Velocity
  averageDailyDemand: number;
  weeklyVelocity: number;
  forecastDemand30Days: number;
  demandTrendPercent: number;
  
  // Supply Parameters
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  daysOfCover: number | null; // null if zero demand
  daysOfCoverText: string;
  
  // Stockout Risk
  stockoutRisk: StockoutRiskLevel;
  projectedStockoutDays: number | null;
  projectedStockoutDate: string | null;
  
  // Order Recommendations
  recommendedQuantity: number;
  targetStockLevel: number;
  unitPriceBDT: number | null;
  estimatedCostBDT: number | null;
  
  // Supplier Selection (STEP 17.4 Evaluated)
  preferredSupplier: ProcurementSupplierOption | null;
  alternativeSuppliers: ProcurementSupplierOption[];
  
  // Explainability & Traceability
  title: string;
  summary: string;
  reasons: string[];
  consequencesOfNoAction: string[];
  potentialSavingsBDT?: number;
  
  // Overstock / Excess Inbound Metrics
  excessUnits?: number;
  excessValueBDT?: number;
  openPORefs?: string[];
  
  // Admin Action & Audit tracking
  approvedQuantity?: number;
  overrideReason?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  actionedByUserId?: string;
  actionedByUserName?: string;
  dismissedByUserId?: string;
  dismissedByUserName?: string;
  dismissReason?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  actionedAt?: string;
  dismissedAt?: string;
}

export interface ProcurementKPIs {
  totalPurchaseSpendBDT: number;
  openPurchaseOrdersCount: number;
  openPurchaseOrdersValueBDT: number;
  inboundStockUnits: number;
  inboundStockValueBDT: number;
  reorderRequiredCount: number;
  criticalStockoutRiskCount: number;
  overstockProductCount: number;
  overstockValueBDT: number;
  supplierRiskCount: number;
  totalRecommendationsCount: number;
  criticalRecommendationsCount: number;
  savingsOpportunityBDT: number;
}

export interface ProcurementHealthSummary {
  overallHealthScore: number; // 0-100
  overallHealthStatus: 'EXCELLENT' | 'GOOD' | 'WATCH' | 'RISK';
  inventoryHealthScore: number; // 0-100
  inventoryHealthStatus: 'EXCELLENT' | 'GOOD' | 'WATCH' | 'RISK';
  supplierHealthScore: number; // 0-100
  supplierHealthStatus: 'EXCELLENT' | 'GOOD' | 'WATCH' | 'RISK';
  purchaseRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  stockoutRiskProductsCount: number;
  actualOpenCommitmentBDT: number;
  recommendedPurchaseCommitmentBDT: number;
  totalProjectedCommitmentBDT: number;
  forecastConfidence: 'High' | 'Medium' | 'Low' | 'Insufficient Data';
  healthFactors: string[];
}

export interface OpenPORiskItem {
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: string;
  totalAmountBDT: number;
  totalOrderedQuantity: number;
  totalReceivedQuantity: number;
  remainingQuantity: number;
  createdAt: string;
  expectedDeliveryDate: string | null;
  daysOverdue: number;
  riskType: 'LATE' | 'APPROACHING_DUE' | 'NO_RECEIPT' | 'PARTIAL_DELIVERY' | 'SUPPLIER_RISK' | 'NORMAL';
  riskSeverity: 'critical' | 'high' | 'medium' | 'low';
  riskReason: string;
}

export interface ProcurementSpendAnalytics {
  totalSpendBDT: number;
  openPOValueBDT: number;
  recommendedSpendBDT: number;
  spendBySupplier: Array<{
    supplierId: string;
    supplierName: string;
    spendBDT: number;
    percentage: number;
    orderCount: number;
  }>;
  spendByCategory: Array<{
    category: string;
    spendBDT: number;
    percentage: number;
    units: number;
  }>;
  spendByMonth: Array<{
    month: string;
    spendBDT: number;
    openPOValueBDT: number;
    orderCount: number;
  }>;
  savingsOpportunities: Array<{
    productId: string;
    productName: string;
    currentSupplierName: string;
    betterSupplierName: string;
    currentPriceBDT: number;
    betterPriceBDT: number;
    unitSavingBDT: number;
    estimatedPotentialSavingBDT: number;
    reason: string;
  }>;
}

export interface ProcurementAuditLogEntry {
  id: string;
  action: 
    | 'PROCUREMENT_RECOMMENDATION_CREATED'
    | 'PROCUREMENT_RECOMMENDATION_REFRESHED'
    | 'PROCUREMENT_RECOMMENDATION_VIEWED'
    | 'PROCUREMENT_RECOMMENDATION_APPROVED'
    | 'PROCUREMENT_RECOMMENDATION_DISMISSED'
    | 'PROCUREMENT_PO_CREATED_FROM_RECOMMENDATION'
    | 'PROCUREMENT_RECOMMENDATION_OVERRIDDEN';
  recommendationId?: string;
  productId?: string;
  productName?: string;
  supplierId?: string;
  supplierName?: string;
  recommendedQuantity?: number;
  approvedQuantity?: number;
  estimatedCostBDT?: number;
  overrideReason?: string;
  reason?: string;
  confidence?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  performedByUserId: string;
  performedByUserName: string;
  performedByUserRole: string;
  timestamp: string;
  details?: string;
}

export interface ProcurementSettings {
  id: string;
  highValueApprovalThresholdBDT: number; // e.g. 50000
  defaultLeadTimeDays: number;
  defaultSafetyStockDays: number;
  overstockThresholdDays: number;
  demandSpikeThresholdPercent: number;
  demandDropThresholdPercent: number;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

// ============================================================================
// STEP 18: EXECUTIVE SALES, PROFIT & BUSINESS INTELLIGENCE SYSTEM TYPES
// ============================================================================

export type DateRangePreset = 
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'this_month' 
  | 'last_month' 
  | 'this_quarter' 
  | 'this_year' 
  | 'last_year' 
  | 'custom';

export type ComparisonMode = 'previous_period' | 'same_period_last_year';

export interface DateRangeFilter {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  comparisonMode: ComparisonMode;
  prevStartDate: string; // YYYY-MM-DD
  prevEndDate: string;   // YYYY-MM-DD
}

export interface ExecutiveKPI {
  id: string;
  title: string;
  currentValue: number | null;
  previousValue: number | null;
  unit: 'BDT' | 'PERCENT' | 'COUNT' | 'DAYS';
  changeAmount: number | null;
  changePercent: number | null;
  trend: 'up' | 'down' | 'neutral' | 'na';
  isPositive: boolean; // whether "up" is good or bad
  statusLabel?: string;
  statusColor?: string;
  subtitle?: string;
  drilldownTab?: string;
  hasSufficientData: boolean;
}

export interface SalesProfitTrendPoint {
  dateKey: string;      // e.g. '2026-08-01' or 'Aug 01' or '2026-W34' or '2026-08'
  label: string;
  netSalesBDT: number;
  cogsBDT: number | null;
  grossProfitBDT: number | null;
  grossMarginPercent: number | null;
  prevNetSalesBDT?: number | null;
  targetSalesBDT?: number | null;
  ordersCount: number;
  aovBDT: number;
  discountBDT: number;
  returnBDT: number;
}

export interface ProductProfitabilityItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unitsSold: number;
  returnedUnits: number;
  grossSalesBDT: number;
  discountBDT: number;
  netSalesBDT: number;
  unitCostBDT: number | null;
  cogsBDT: number | null;
  grossProfitBDT: number | null;
  grossMarginPercent: number | null;
  averageSellingPriceBDT: number;
  ordersCount: number;
  currentStock: number;
  inventoryValueBDT: number | null;
  // Classification
  isHighSalesLowMargin: boolean;
  isLossMaking: boolean;
  marginClassification: 'high_margin' | 'normal' | 'low_margin' | 'negative' | 'unknown';
  rootCauseNotes: string[];
}

export interface CustomerProfitabilityItem {
  customerId: string;
  shopName: string;
  ownerName: string;
  phone: string;
  district: string;
  area: string;
  territory: string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  ordersCount: number;
  unitsBought: number;
  grossSalesBDT: number;
  discountBDT: number;
  netSalesBDT: number;
  cogsBDT: number | null;
  grossProfitBDT: number | null;
  grossMarginPercent: number | null;
  averageOrderValueBDT: number;
  currentDueBDT: number;
  creditLimitBDT: number;
  daysSinceLastOrder: number | null;
  lastOrderDate: string | null;
  isInactive: boolean;
  segment: CustomerSegment;
}

export interface SellerExecutiveSummary {
  sellerId: string;
  sellerLoginId?: string;
  sellerName: string;
  territory: string;
  monthlyTargetBDT: number;
  netSalesBDT: number;
  targetGapBDT: number;
  targetAchievementPercent: number | null;
  requiredDailySalesBDT: number | null; // required daily sales to meet target in remaining days
  targetStatus: 'on_track' | 'watch' | 'at_risk' | 'no_target';
  ordersCount: number;
  averageOrderValueBDT: number;
  cogsBDT: number | null;
  grossProfitBDT: number | null;
  grossMarginPercent: number | null;
  activeCustomersCount: number;
  totalDueGeneratedBDT: number;
  returnValueBDT: number;
  salesRank: number;
  profitRank: number;
  marginRank: number;
}

export interface RegionalSalesSummary {
  regionKey: string;
  regionType: 'district' | 'area' | 'territory';
  regionName: string;
  netSalesBDT: number;
  prevNetSalesBDT: number | null;
  growthPercent: number | null;
  growthStatus: 'fastest_growing' | 'growing' | 'stable' | 'declining' | 'na';
  ordersCount: number;
  activeCustomersCount: number;
  cogsBDT: number | null;
  grossProfitBDT: number | null;
  grossMarginPercent: number | null;
  averageOrderValueBDT: number;
  totalDueBDT: number;
}

export interface CategoryExecutiveSummary {
  categoryName: string;
  unitsSold: number;
  netSalesBDT: number;
  salesMixPercent: number; // contribution to total sales %
  cogsBDT: number | null;
  grossProfitBDT: number | null;
  grossMarginPercent: number | null;
  profitMixPercent: number | null; // contribution to total gross profit %
  mixDisparityPercent: number | null; // salesMix% - profitMix% (positive means high sales but low profit)
  growthPercent: number | null;
  ordersCount: number;
}

export interface ProfitWaterfallStep {
  label: string;
  amountBDT: number;
  type: 'base' | 'deduction' | 'subtotal' | 'total' | 'insufficient_data';
  color: string;
  tooltip: string;
  isAvailable: boolean;
}

export interface ExecutiveActionItem {
  id: string;
  category: 'MARGIN_RISK' | 'TARGET_RISK' | 'CUSTOMER_RISK' | 'GROWTH_OPPORTUNITY' | 'INVENTORY_RISK' | 'DISCOUNT_ALERT';
  severity: 'critical' | 'warning' | 'opportunity' | 'info';
  title: string;
  problem: string;
  evidence: string;
  recommendedAction: string;
  affectedCount: number;
  affectedRecords: Array<{
    id: string;
    label: string;
    secondaryLabel?: string;
    valueBDT?: number;
    metricValue?: string;
  }>;
  drilldownTab: string;
}

export interface ExecutiveAIInsight {
  id: string;
  type: 'executive_summary' | 'margin_analysis' | 'target_achievement' | 'customer_retention' | 'product_mix' | 'actionable_warning';
  title: string;
  insight: string;
  facts: string[];
  impactLevel: 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface DataQualityIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  entityType: 'product' | 'order' | 'customer' | 'seller' | 'expense';
  title: string;
  description: string;
  affectedCount: number;
  affectedItems: Array<{
    id: string;
    name: string;
    identifier?: string;
    issueDetails: string;
  }>;
  resolutionGuide: string;
}

export interface WhatIfSimulationParams {
  sellingPriceChangePercent: number; // e.g. +5%
  purchaseCostChangePercent: number;  // e.g. +10%
  salesVolumeChangePercent: number;    // e.g. +20%
}

export interface WhatIfSimulationResult {
  baselineNetSalesBDT: number;
  baselineCOGSBDT: number | null;
  baselineGrossProfitBDT: number | null;
  baselineGrossMarginPercent: number | null;
  
  simulatedNetSalesBDT: number;
  simulatedCOGSBDT: number | null;
  simulatedGrossProfitBDT: number | null;
  simulatedGrossMarginPercent: number | null;
  
  deltaSalesBDT: number;
  deltaSalesPercent: number | null;
  deltaProfitBDT: number | null;
  deltaProfitPercent: number | null;
  deltaMarginPoints: number | null; // e.g. +2.4 percentage points
}

export interface ExecutiveBISettings {
  id: string;
  lowMarginThresholdPercent: number;     // default 15%
  negativeMarginThresholdPercent: number;// default 0%
  highDiscountThresholdPercent: number;  // default 10%
  inactiveCustomerDays: number;          // default 60 (configurable 30/60/90)
  targetWarningThresholdPercent: number; // default 80%
  targetCriticalThresholdPercent: number;// default 60%
  profitDeclineThresholdPercent: number; // default 10%
  highSalesVolumeThresholdBDT: number;   // default 50000 BDT
  updatedAt: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

export interface ExecutiveBIAuditLogEntry {
  id: string;
  action: 
    | 'EXECUTIVE_DASHBOARD_VIEWED'
    | 'KPI_DEFINITION_UPDATED'
    | 'TARGET_UPDATED'
    | 'PROFITABILITY_THRESHOLD_UPDATED'
    | 'REPORT_EXPORTED'
    | 'EXECUTIVE_INSIGHT_GENERATED'
    | 'MANAGEMENT_RECOMMENDATION_VIEWED'
    | 'WHAT_IF_SIMULATION_RUN'
    | 'DATA_QUALITY_SCAN_RUN';
  performedByUserId: string;
  performedByUserName: string;
  performedByUserRole: string;
  timestamp: string;
  filterPreset?: string;
  reportName?: string;
  details?: string;
  recordIds?: string[];
}

export interface CashAccountBalance {
  accountId: string;
  accountName: string;
  type: 'cash' | 'bank' | 'mobile_banking' | 'other';
  balance: number;
  lastSyncedAt: string;
  provider?: string;
  isConnected: boolean;
}

export interface CashFlowLiquiditySummary {
  availableCash: number;
  bankBalance: number;
  mobileBankingBalance: number;
  totalKnownLiquidity: number;
  accounts: CashAccountBalance[];
  lastUpdated: string;
  dataConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CashFlowKPIs {
  openingCash: number;
  actualInflow: number;
  actualOutflow: number;
  netCashFlow: number;
  closingKnownCash: number;
  totalReceivables: number;
  upcomingPayables: number;
  cashRiskStatus: 'HEALTHY' | 'WATCH' | 'RISK' | 'CRITICAL';
  cashHealthScore: number;
}

export interface ARBucket {
  bucket: 'Current' | '1–7 Days' | '8–30 Days' | '31–60 Days' | '61–90 Days' | '90+ Days';
  amount: number;
  customerCount: number;
  percentage: number;
}

export interface CollectionPriorityItem {
  customerId: string;
  customerName: string;
  phone: string;
  district: string;
  overdueAmount: number;
  daysOverdue: number;
  totalDue: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  creditStatus: string;
}

export interface UpcomingPayableItem {
  id: string;
  type: 'supplier' | 'expense' | 'obligation';
  payeeName: string;
  amount: number;
  dueDate: string;
  status: string;
  sourceRef: string;
}

export interface CashForecastPeriod {
  periodLabel: '7 Days' | '30 Days' | '60 Days' | '90 Days';
  openingCash: number;
  expectedCollections: number;
  committedPayables: number;
  expectedExpenses: number;
  projectedClosingCash: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  shortageRisk: boolean;
  daysToShortage?: number;
}

export interface CashFlowSettings {
  id: string;
  minimumCashReserve: number;
  warningThresholdDays: number;
  updatedAt: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}

export interface CashFlowAuditLogEntry {
  id: string;
  action:
    | 'CASH_FLOW_DASHBOARD_VIEWED'
    | 'CASH_RESERVE_UPDATED'
    | 'CASH_REPORT_EXPORTED'
    | 'CASH_SCENARIO_SIMULATED'
    | 'RECONCILIATION_VIEWED'
    | 'DATA_QUALITY_SCANNED';
  performedByUserId: string;
  performedByUserName: string;
  performedByUserRole: string;
  timestamp: string;
  details?: string;
}

export interface CashScenarioParams {
  collectionDelayDays: number;
  collectionBoostPercent: number;
  supplierPaymentShiftDays: number;
  expenseChangePercent: number;
  salesGrowthPercent: number;
}

export interface CashScenarioResult {
  scenarioName: string;
  projectedClosingCash: number;
  cashDifference: number;
  riskStatus: string;
  description: string;
}

export interface CashDataQualityIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  entityType: string;
  entityId: string;
  description: string;
}



