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
  | 'settings';

export type SalesTab = 
  | 'dashboard'
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
  | 'my_salary';

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

