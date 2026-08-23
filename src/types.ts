export type UserRole = 'admin' | 'sales' | 'delivery';

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
  | 'customers'
  | 'products'
  | 'create_order'
  | 'my_orders'
  | 'pending_orders'
  | 'expenses'
  | 'customer_due'
  | 'sales_history'
  | 'sales_summary';

export type DeliveryTab = 
  | 'dashboard'
  | 'assigned_orders'
  | 'today_deliveries'
  | 'pending_deliveries'
  | 'delivered_orders'
  | 'returned_orders'
  | 'due_collection'
  | 'money_collected'
  | 'expenses'
  | 'collection_history';

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

