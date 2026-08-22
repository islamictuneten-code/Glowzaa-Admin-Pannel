import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { 
  AdminTab, 
  AuthUser,
  CollectionRecord, 
  Customer, 
  DeliveryStaff, 
  DeliveryTab, 
  Order, 
  OrderStatus, 
  PaymentMethod, 
  PaymentStatus, 
  Product, 
  CategoryDoc,
  SubCategory,
  InventoryTransaction,
  PurchaseBill,
  SalesStaff, 
  SalesTab, 
  UserRole,
  ProductCategory,
  Payment,
  CustomerLedgerEntry,
  DeliveryHistoryEntry,
  CashHandover,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethodOption,
  PaymentTypeOption
} from '../types';
import { 
  INITIAL_COLLECTIONS, 
  INITIAL_CUSTOMERS, 
  INITIAL_DELIVERY_STAFF, 
  INITIAL_ORDERS, 
  INITIAL_PURCHASES, 
  INITIAL_SALES_STAFF,
  PRODUCT_CATEGORIES_LIST
} from '../data/mockData';
import {
  seedInitialCategoriesIfEmpty,
  seedInitialProductsIfEmpty,
  seedInitialCustomersIfEmpty,
  seedInitialOrdersIfEmpty,
  seedInitialPaymentsAndLedgerIfEmpty,
  seedInitialExpensesIfEmpty,
  subscribeCategories,
  subscribeProducts,
  subscribeInventoryTransactions,
  subscribeCustomers,
  subscribeOrders,
  subscribePayments,
  subscribeCustomerLedger,
  subscribeExpenses,
  createCategoryInFirestore,
  updateCategoryInFirestore,
  deleteCategoryFromFirestore,
  createProductInFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  adjustProductStockInFirestore,
  createCustomerInFirestore,
  updateCustomerInFirestore,
  toggleCustomerStatusInFirestore,
  assignSalesSellerToCustomerInFirestore,
  deleteCustomerFromFirestore,
  checkDuplicatePhoneInFirestore,
  createOrderInFirestore,
  confirmOrderInFirestore,
  cancelOrderInFirestore,
  returnOrderInFirestore,
  updateOrderInFirestore,
  assignDeliveryStaffInFirestore,
  updateDeliveryStatusInFirestore,
  submitProofOfDeliveryInFirestore,
  subscribeDeliveryHistory,
  recordPaymentInFirestore,
  reversePaymentInFirestore,
  markOrderPackingInFirestore,
  markOrderReadyForDeliveryInFirestore,
  submitPartialDeliveryInFirestore,
  subscribeCashHandovers,
  submitCashHandoverInFirestore,
  acceptCashHandoverInFirestore,
  rejectCashHandoverInFirestore,
  addExpenseInFirestore,
  approveExpenseInFirestore,
  rejectExpenseInFirestore,
  editExpenseInFirestore,
  deleteExpenseInFirestore,
  wipeAllApplicationDataInFirestore,
  resetDemoDataInFirestore
} from '../services/firestoreService';

export interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  salesTab: SalesTab;
  setSalesTab: (tab: SalesTab) => void;
  deliveryTab: DeliveryTab;
  setDeliveryTab: (tab: DeliveryTab) => void;

  // Data Wipe & Demo Reset Actions
  wipeAllData: () => Promise<{ success: boolean; error?: string }>;
  resetDemoData: () => Promise<{ success: boolean; error?: string }>;
  
  // Data from Firestore
  products: Product[];
  categoryDocs: CategoryDoc[];
  categories: ProductCategory[];
  inventoryTransactions: InventoryTransaction[];
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  customerLedger: CustomerLedgerEntry[];
  deliveryHistory: DeliveryHistoryEntry[];
  cashHandovers: CashHandover[];
  expenses: Expense[];
  isProductsLoading: boolean;
  isCategoriesLoading: boolean;
  isCustomersLoading: boolean;
  isOrdersLoading: boolean;
  isPaymentsLoading: boolean;
  isLedgerLoading: boolean;
  isExpensesLoading: boolean;
  
  // Downstream Collections
  purchases: PurchaseBill[];
  salesStaff: SalesStaff[];
  deliveryStaff: DeliveryStaff[];
  collections: CollectionRecord[];
  
  // Current simulated logged in users for role views
  currentSalesUser: SalesStaff;
  setCurrentSalesUser: (staff: SalesStaff) => void;
  currentDeliveryUser: DeliveryStaff;
  setCurrentDeliveryUser: (staff: DeliveryStaff) => void;
  
  // Firestore Product & Category Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateProduct: (product: Product) => Promise<{ success: boolean; error?: string }>;
  toggleProductStatus: (productId: string, currentStatus: 'active' | 'inactive') => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Firestore Category Actions
  createCategory: (data: { name: string; description?: string; status: 'active' | 'inactive'; subCategories?: SubCategory[] }) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateCategory: (categoryId: string, data: Partial<CategoryDoc>) => Promise<{ success: boolean; error?: string }>;
  toggleCategoryStatus: (categoryId: string, currentStatus: 'active' | 'inactive') => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (categoryId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Firestore Customer Actions
  createCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchase' | 'totalPaid' | 'currentDue'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateCustomer: (customer: Customer | ({ id: string } & Partial<Customer>)) => Promise<{ success: boolean; error?: string }>;
  toggleCustomerStatus: (customerId: string, currentStatus: 'active' | 'inactive') => Promise<{ success: boolean; error?: string }>;
  assignSalesSellerToCustomer: (customerId: string, salesUserId: string, salesUserName: string) => Promise<{ success: boolean; error?: string }>;
  deleteCustomer: (customerId: string) => Promise<{ success: boolean; error?: string }>;
  checkDuplicatePhone: (phone: string, excludeCustomerId?: string) => Promise<{ isDuplicate: boolean; existingCustomer?: Customer }>;

  // Firestore Inventory Actions
  adjustStock: (productId: string, adjustmentQuantity: number, reason: string, type?: 'adjustment' | 'stock_in' | 'damage' | 'audit' | 'return' | 'sample') => Promise<{ success: boolean; error?: string }>;
  
  // Firestore Order Actions
  createOrder: (orderData: {
    customerId: string;
    customerName?: string;
    shopName: string;
    ownerName: string;
    phone: string;
    address: string;
    area: string;
    district: string;
    salesUserId: string;
    salesUserName: string;
    items: any[];
    subtotal: number;
    totalDiscount?: number;
    discount?: number;
    grandTotal: number;
    paidAmount: number;
    notes?: string;
    paymentMethod?: string;
    orderStatus?: OrderStatus;
  }) => Promise<{ success: boolean; id?: string; orderNumber?: string; error?: string }>;
  confirmOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  cancelOrder: (orderId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  returnOrder: (orderId: string, returnReason?: string) => Promise<{ success: boolean; error?: string }>;
  updateOrder: (orderId: string, data: Partial<Order>) => Promise<{ success: boolean; error?: string }>;
  assignDeliveryToOrder: (orderId: string, deliveryStaffId: string) => Promise<{ success: boolean; error?: string }>;
  updateDeliveryStatus: (orderId: string, deliveryStatus: 'in_transit' | 'delivered' | 'failed' | 'returned', options?: { failureReason?: string; podNotes?: string; receivedBy?: string }) => Promise<{ success: boolean; error?: string }>;
  submitProofOfDelivery: (orderId: string, receivedBy: string, podNotes?: string) => Promise<{ success: boolean; error?: string }>;
  markOrderPacking: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  markOrderReadyForDelivery: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  submitPartialDelivery: (
    orderId: string, 
    itemDeliveries: { productId: string; sku: string; newlyDeliveredQuantity: number }[], 
    options?: { receivedBy?: string; podNotes?: string }
  ) => Promise<{ success: boolean; error?: string }>;

  // Firestore Real Payment & Customer Due Ledger Actions
  recordPayment: (paymentData: {
    customerId: string;
    customerName?: string;
    amount: number;
    paymentMethod: PaymentMethodOption | string;
    paymentType?: PaymentTypeOption | string;
    orderId?: string | null;
    orderNumber?: string | null;
    notes?: string;
    isAdvance?: boolean;
  }) => Promise<{ success: boolean; id?: string; paymentNumber?: string; error?: string }>;
  reversePayment: (paymentId: string, reversalReason: string) => Promise<{ success: boolean; error?: string }>;
  getCustomerLedger: (customerId: string) => CustomerLedgerEntry[];
  getCustomerPayments: (customerId: string) => Payment[];

  // Cash Handover & HQ Reconciliation Actions
  submitCashHandover: (driverId: string) => Promise<{ success: boolean; handoverId?: string; amount?: number; error?: string }>;
  acceptCashHandover: (handoverId: string) => Promise<{ success: boolean; error?: string }>;
  rejectCashHandover: (handoverId: string, rejectionReason: string) => Promise<{ success: boolean; error?: string }>;

  // Operating Expense Actions
  addExpense: (data: {
    title: string;
    category: ExpenseCategory | string;
    amount: number;
    paymentMethod: string;
    vendorName?: string | null;
    expenseDate: string;
    description?: string;
    autoApprove?: boolean;
  }) => Promise<{ success: boolean; expenseId?: string; expenseNumber?: string; error?: string }>;
  approveExpense: (expenseId: string) => Promise<{ success: boolean; error?: string }>;
  rejectExpense: (expenseId: string, rejectionReason: string) => Promise<{ success: boolean; error?: string }>;
  editExpense: (expenseId: string, updates: Partial<Expense>) => Promise<{ success: boolean; error?: string }>;
  deleteExpense: (expenseId: string) => Promise<{ success: boolean; error?: string }>;

  // Legacy & Downstream Actions
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdDate' | 'createdAt'>) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, orderStatus: OrderStatus, deliveryStaffId?: string) => Promise<void>;
  markOrderDelivered: (orderId: string, receivedBy: string, podNotes?: string, collectedAmount?: number, paymentMethod?: PaymentMethod) => Promise<void>;
  markOrderReturned: (orderId: string, returnReason: string) => Promise<void>;
  recordCollection: (params: {
    customerId: string;
    orderId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    referenceNo?: string;
  }) => CollectionRecord;
  reconcileCollection: (collectionId: string) => void;
  handoverDeliveryCash: (deliveryStaffId: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'totalPurchase' | 'totalPaid' | 'currentDue' | 'lastOrderDate' | 'createdAt'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  addPurchase: (purchase: Omit<PurchaseBill, 'id' | 'billNumber'>) => PurchaseBill;
  addCategory: (categoryName: string) => void;

  // Selected state for modals
  viewingOrder: Order | null;
  setViewingOrder: (order: Order | null) => void;
  viewingCustomer: Customer | null;
  setViewingCustomer: (customer: Customer | null) => void;
  viewingProduct: Product | null;
  setViewingProduct: (product: Product | null) => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Global search & helpers
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  formatBDT: (amount: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, firebaseUser, isAuthenticated, isLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(() => currentUser?.role || 'admin');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [salesTab, setSalesTab] = useState<SalesTab>('dashboard');
  const [deliveryTab, setDeliveryTab] = useState<DeliveryTab>('dashboard');

  // Real Firestore State for Products, Categories, Inventory, Customers, Orders, Payments, and Customer Ledger
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryDocs, setCategoryDocs] = useState<CategoryDoc[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerLedger, setCustomerLedger] = useState<CustomerLedgerEntry[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistoryEntry[]>([]);
  const [cashHandovers, setCashHandovers] = useState<CashHandover[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isCustomersLoading, setIsCustomersLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(true);
  const [isLedgerLoading, setIsLedgerLoading] = useState(true);
  const [isExpensesLoading, setIsExpensesLoading] = useState(true);

  // Derived Category String List for UI Dropdowns (Deduplicated)
  const categories: ProductCategory[] = useMemo(() => {
    const rawList = categoryDocs.length > 0 
      ? categoryDocs.map(c => c.name as ProductCategory) 
      : PRODUCT_CATEGORIES_LIST;
    return Array.from(new Set(rawList.filter(Boolean)));
  }, [categoryDocs]);

  const [purchases, setPurchases] = useState<PurchaseBill[]>(() => {
    const saved = localStorage.getItem('glowzaa_purchases');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
  });

  const [salesStaff, setSalesStaff] = useState<SalesStaff[]>(INITIAL_SALES_STAFF);
  const [deliveryStaff, setDeliveryStaff] = useState<DeliveryStaff[]>(INITIAL_DELIVERY_STAFF);
  
  const [collections, setCollections] = useState<CollectionRecord[]>(() => {
    const saved = localStorage.getItem('glowzaa_collections');
    return saved ? JSON.parse(saved) : INITIAL_COLLECTIONS;
  });

  const [currentSalesUser, setCurrentSalesUser] = useState<SalesStaff>(INITIAL_SALES_STAFF[0]);
  const [currentDeliveryUser, setCurrentDeliveryUser] = useState<DeliveryStaff>(INITIAL_DELIVERY_STAFF[0]);

  // Sync role and active staff profile from authenticated user
  useEffect(() => {
    if (currentUser) {
      setRole(currentUser.role);
      if (currentUser.role === 'sales') {
        const match = salesStaff.find(s => s.id === currentUser.staffId || s.email.toLowerCase() === currentUser.email.toLowerCase());
        if (match) {
          setCurrentSalesUser({
            ...match,
            photoURL: currentUser.photoURL || match.photoURL
          });
        } else {
          setCurrentSalesUser({
            id: currentUser.staffId || currentUser.uid,
            name: currentUser.name || 'Sales Staff',
            email: currentUser.email,
            phone: currentUser.phone || '+880 1700-000000',
            territory: currentUser.territory || 'Dhaka Territory',
            monthlyTarget: currentUser.monthlyTarget || 150000,
            achievedSales: 0,
            totalOrders: 0,
            commissionRate: currentUser.commissionRate || 2.0,
            activeCustomers: 0,
            avatar: currentUser.avatar || (currentUser.name || 'S').substring(0, 2).toUpperCase(),
            photoURL: currentUser.photoURL,
            status: 'active'
          });
        }
      } else if (currentUser.role === 'delivery') {
        const match = deliveryStaff.find(d => d.id === currentUser.staffId || (d as any).uid === currentUser.uid || d.email.toLowerCase() === currentUser.email.toLowerCase());
        if (match) {
          setCurrentDeliveryUser({
            ...match,
            photoURL: currentUser.photoURL || match.photoURL,
            id: match.id || currentUser.uid
          });
        } else {
          setCurrentDeliveryUser({
            id: currentUser.staffId || currentUser.uid,
            name: currentUser.name || currentUser.email.split('@')[0],
            email: currentUser.email,
            phone: currentUser.phone || '+880 1700-000000',
            assignedArea: currentUser.assignedArea || 'Dhaka Route',
            assignedZones: currentUser.assignedZones || ['Dhaka Central'],
            vehicleNumber: currentUser.vehicleNumber || 'Dhaka-Metro-D-01',
            vehicleType: (currentUser.vehicleType as any) || 'Delivery Van',
            activeDeliveriesToday: 0,
            completedDeliveriesToday: 0,
            cashInHand: 0,
            avatar: currentUser.avatar || (currentUser.name || 'D').substring(0, 2).toUpperCase(),
            photoURL: currentUser.photoURL,
            status: 'on_duty'
          });
        }
      }
    }
  }, [currentUser, salesStaff, deliveryStaff]);

  // Connect to Firestore real-time listeners for Products, Categories, Inventory, Customers, and Orders
  useEffect(() => {
    if (isLoading || !isAuthenticated || !firebaseUser) {
      setIsCategoriesLoading(false);
      setIsProductsLoading(false);
      setIsCustomersLoading(false);
      setIsOrdersLoading(false);
      setIsPaymentsLoading(false);
      setIsLedgerLoading(false);
      return;
    }

    let isMounted = true;

    // Note: Automatic seeding on empty collections is disabled to allow permanent data wipe.
    // Use "Reset Demo Data to Default" in Admin Settings to reseed demo data explicitly.

    // 1. Subscribe to Firestore Categories
    const unsubCategories = subscribeCategories((cats) => {
      if (isMounted) {
        const uniqueMap = new Map<string, CategoryDoc>();
        for (const cat of cats) {
          const key = (cat.name || '').toLowerCase().trim();
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, cat);
          }
        }
        setCategoryDocs(Array.from(uniqueMap.values()));
        setIsCategoriesLoading(false);
      }
    }, (err) => {
      console.error('Category sync error:', err);
      if (isMounted) setIsCategoriesLoading(false);
    });

    // 2. Subscribe to Firestore Products
    const unsubProducts = subscribeProducts((prods) => {
      if (isMounted) {
        setProducts(prods);
        setIsProductsLoading(false);
      }
    }, (err) => {
      console.error('Product sync error:', err);
      if (isMounted) setIsProductsLoading(false);
    });

    // 3. Subscribe to Firestore Inventory Transactions
    const unsubTransactions = subscribeInventoryTransactions((trans) => {
      if (isMounted) {
        setInventoryTransactions(trans);
      }
    }, (err) => {
      console.error('Inventory transactions sync error:', err);
    });

    // 4. Subscribe to Firestore Customers
    const unsubCustomers = subscribeCustomers((custs) => {
      if (isMounted) {
        setCustomers(custs);
        setIsCustomersLoading(false);
      }
    }, (err) => {
      console.error('Customers sync error:', err);
      if (isMounted) setIsCustomersLoading(false);
    });

    // 5. Subscribe to Firestore Orders
    const unsubOrders = subscribeOrders((ords) => {
      if (isMounted) {
        setOrders(ords);
        setIsOrdersLoading(false);
      }
    }, (err) => {
      console.error('Orders sync error:', err);
      if (isMounted) setIsOrdersLoading(false);
    });

    // 6. Subscribe to Firestore Payments
    const unsubPayments = subscribePayments((pmts) => {
      if (isMounted) {
        setPayments(pmts);
        setIsPaymentsLoading(false);
      }
    }, (err) => {
      console.error('Payments sync error:', err);
      if (isMounted) setIsPaymentsLoading(false);
    });

    // 7. Subscribe to Firestore Customer Ledger
    const unsubLedger = subscribeCustomerLedger((entries) => {
      if (isMounted) {
        setCustomerLedger(entries);
        setIsLedgerLoading(false);
      }
    }, (err) => {
      console.error('Customer ledger sync error:', err);
      if (isMounted) setIsLedgerLoading(false);
    });

    // 8. Subscribe to Firestore Delivery History
    const unsubHistory = subscribeDeliveryHistory((hist) => {
      if (isMounted) {
        setDeliveryHistory(hist);
      }
    }, (err) => {
      console.error('Delivery history sync error:', err);
    });

    // 9. Subscribe to Firestore Cash Handovers
    const unsubHandovers = subscribeCashHandovers((handovers) => {
      if (isMounted) {
        setCashHandovers(handovers);
      }
    }, (err) => {
      console.error('Cash handovers sync error:', err);
    });

    // 10. Subscribe to Firestore Expenses
    const unsubExpenses = subscribeExpenses((exps) => {
      if (isMounted) {
        setExpenses(exps);
        setIsExpensesLoading(false);
      }
    }, (err) => {
      console.error('Expenses sync error:', err);
      if (isMounted) setIsExpensesLoading(false);
    });

    return () => {
      isMounted = false;
      unsubCategories();
      unsubProducts();
      unsubTransactions();
      unsubCustomers();
      unsubOrders();
      unsubPayments();
      unsubLedger();
      unsubHistory();
      unsubHandovers();
      unsubExpenses();
    };
  }, [isAuthenticated, isLoading, firebaseUser]);

  // Dynamically calculate Driver Cash Pouch balance from Firestore payments & cash_handovers
  useEffect(() => {
    setDeliveryStaff(prevStaff => {
      return prevStaff.map(driver => {
        const unreconciledCash = payments
          .filter(p => {
            const pMethod = (p.paymentMethod || '').toString().toLowerCase();
            const pCollector = (p.collectedByUserId || '').toString();
            const pDriver = (p.driverId || '').toString();
            const isCash = pMethod === 'cash';
            const notReconciled = p.reconciledWithAdmin !== true;
            const notPendingOrAccepted = p.handoverStatus !== 'pending' && p.handoverStatus !== 'accepted';
            const notReversed = p.isReversed !== true;
            const matchesDriver = pDriver === driver.id ||
              pDriver === driver.uid ||
              pCollector === driver.id || 
              pCollector === driver.uid || 
              pCollector.toLowerCase() === (driver.email || '').toLowerCase() ||
              (driver.id === 'deliv-01' && p.collectedByUserRole === 'delivery');
            
            return isCash && notReconciled && notPendingOrAccepted && notReversed && matchesDriver;
          })
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        return {
          ...driver,
          cashInHand: unreconciledCash
        };
      });
    });
  }, [payments, cashHandovers]);

  useEffect(() => {
    if (currentDeliveryUser) {
      const activeDriverId = currentDeliveryUser.id;
      const unreconciledCash = payments
        .filter(p => {
          const pMethod = (p.paymentMethod || '').toString().toLowerCase();
          const pCollector = (p.collectedByUserId || '').toString();
          const pDriver = (p.driverId || '').toString();
          const isCash = pMethod === 'cash';
          const notReconciled = p.reconciledWithAdmin !== true;
          const notPendingOrAccepted = p.handoverStatus !== 'pending' && p.handoverStatus !== 'accepted';
          const notReversed = p.isReversed !== true;
          const matchesDriver = pDriver === activeDriverId ||
            pDriver === currentDeliveryUser.uid ||
            pCollector === activeDriverId || 
            pCollector === currentDeliveryUser.uid || 
            pCollector.toLowerCase() === (currentDeliveryUser.email || '').toLowerCase() ||
            (activeDriverId === 'deliv-01' && p.collectedByUserRole === 'delivery') ||
            (currentUser?.role === 'delivery' && (pDriver === currentUser.uid || pCollector === currentUser.uid || activeDriverId === 'deliv-01'));
          
          return isCash && notReconciled && notPendingOrAccepted && notReversed && matchesDriver;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      setCurrentDeliveryUser(prev => (prev && prev.cashInHand !== unreconciledCash) ? { ...prev, cashInHand: unreconciledCash } : prev);
    }
  }, [payments, cashHandovers, currentUser, currentDeliveryUser?.id, currentDeliveryUser?.uid]);

  // Synchronize collections state with live Firestore payments
  useEffect(() => {
    if (payments.length > 0) {
      const mappedPayments: CollectionRecord[] = payments.map(p => ({
        id: p.id,
        collectionNumber: p.paymentNumber,
        orderId: p.orderId || undefined,
        orderNumber: p.orderNumber || undefined,
        customerId: p.customerId,
        shopName: p.customerName || 'Retail Shop',
        ownerName: 'Merchant Owner',
        amount: p.amount,
        paymentMethod: (p.paymentMethod || 'Cash') as PaymentMethod,
        collectedByRole: (p.collectedByUserRole || 'delivery') as any,
        collectorId: p.driverId || p.collectedByUserId || 'deliv-01',
        collectorName: p.collectedByUserName || 'Staff',
        collectedAt: p.createdAt,
        referenceNo: p.referenceNumber || p.paymentNumber,
        reconciledWithAdmin: p.reconciledWithAdmin === true,
        handoverStatus: p.handoverStatus || 'none',
        handoverId: p.handoverId || null,
        notes: p.notes
      }));

      setCollections(mappedPayments);
    }
  }, [payments]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Persist auxiliary state
  useEffect(() => {
    localStorage.setItem('glowzaa_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('glowzaa_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('glowzaa_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('glowzaa_collections', JSON.stringify(collections));
  }, [collections]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const formatBDT = (amount: number) => {
    return `৳${Math.round(amount || 0).toLocaleString('en-IN')}`;
  };

  // -------------------------------------------------------------
  // FIRESTORE PRODUCT ACTIONS
  // -------------------------------------------------------------

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Authentication Error', message: 'You must be logged in to create products.' });
      return { success: false, error: 'User not authenticated' };
    }

    if (currentUser.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can add products to catalog.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const res = await createProductInFirestore(productData, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Product Created',
        message: `${productData.name} (${productData.sku}) has been saved to Firestore.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Failed to Add Product',
        message: res.error || 'Could not save product to database.'
      });
    }
    return res;
  };

  const updateProduct = async (product: Product) => {
    if (currentUser?.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can update products.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const res = await updateProductInFirestore(product.id, product);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Product Updated',
        message: `${product.name} details saved in Firestore.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Update Error',
        message: res.error || 'Failed to update product.'
      });
    }
    return res;
  };

  const toggleProductStatus = async (productId: string, currentStatus: 'active' | 'inactive') => {
    if (currentUser?.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can toggle product status.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await updateProductInFirestore(productId, { status: newStatus });
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Status Updated',
        message: `Product is now marked as ${newStatus.toUpperCase()}.`
      });
    }
    return res;
  };

  const deleteProduct = async (productId: string) => {
    if (currentUser?.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can delete products.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const res = await deleteProductFromFirestore(productId);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Product Removed',
        message: 'Product document has been deleted from catalog.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: res.error || 'Failed to delete product.'
      });
    }
    return res;
  };

  // -------------------------------------------------------------
  // FIRESTORE CATEGORY ACTIONS
  // -------------------------------------------------------------

  const createCategory = async (data: { name: string; description?: string; status: 'active' | 'inactive'; subCategories?: SubCategory[] }) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can create categories.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const res = await createCategoryInFirestore(data, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Category Created',
        message: `Category "${data.name}" added to Firestore catalog.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Category Error',
        message: res.error || 'Failed to create category.'
      });
    }
    return res;
  };

  const updateCategory = async (categoryId: string, data: Partial<CategoryDoc>) => {
    if (currentUser?.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can edit categories.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const res = await updateCategoryInFirestore(categoryId, data);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Category Updated',
        message: 'Category specifications updated successfully.'
      });
    }
    return res;
  };

  const toggleCategoryStatus = async (categoryId: string, currentStatus: 'active' | 'inactive') => {
    if (currentUser?.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can update category status.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await updateCategoryInFirestore(categoryId, { status: newStatus });
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Category Status Changed',
        message: `Category status updated to ${newStatus.toUpperCase()}.`
      });
    }
    return res;
  };

  const deleteCategory = async (categoryId: string) => {
    if (currentUser?.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can delete categories.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const res = await deleteCategoryFromFirestore(categoryId);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Category Deleted',
        message: 'Category removed from Firestore.'
      });
    }
    return res;
  };

  const addCategory = (categoryName: string) => {
    if (currentUser) {
      createCategory({
        name: categoryName,
        status: 'active',
        subCategories: []
      });
    }
  };

  // -------------------------------------------------------------
  // FIRESTORE INVENTORY STOCK ADJUSTMENT ACTION (ADMIN ONLY)
  // -------------------------------------------------------------

  const adjustStock = async (
    productId: string,
    adjustmentQuantity: number,
    reason: string,
    type: 'adjustment' | 'stock_in' | 'damage' | 'audit' | 'return' | 'sample' = 'adjustment'
  ) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Only Administrators are authorized to execute physical inventory stock adjustments.'
      });
      return { success: false, error: 'Unauthorized' };
    }

    const res = await adjustProductStockInFirestore(productId, adjustmentQuantity, reason, currentUser, type);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Stock Adjustment Logged',
        message: `Inventory stock updated to ${res.newStock} units (${adjustmentQuantity > 0 ? '+' : ''}${adjustmentQuantity}). Audit log recorded.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Adjustment Failed',
        message: res.error || 'Failed to adjust stock.'
      });
    }
    return res;
  };

  // -------------------------------------------------------------
  // FIRESTORE ORDER MANAGEMENT ACTIONS
  // -------------------------------------------------------------

  const createOrder = async (orderData: {
    customerId: string;
    customerName?: string;
    shopName: string;
    ownerName: string;
    phone: string;
    address: string;
    area: string;
    district: string;
    salesUserId: string;
    salesUserName: string;
    items: any[];
    subtotal: number;
    totalDiscount?: number;
    discount?: number;
    grandTotal: number;
    paidAmount: number;
    notes?: string;
    paymentMethod?: string;
    orderStatus?: OrderStatus;
  }) => {
    if (!currentUser) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to create a sales order.'
      });
      return { success: false, error: 'User not authenticated' };
    }

    const res = await createOrderInFirestore(orderData, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Wholesale Order Created',
        message: `Order #${res.orderNumber} successfully booked for ${orderData.shopName}. Status: Pending (Stock not yet deducted).`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Order Creation Failed',
        message: res.error || 'Failed to create sales order.'
      });
    }
    return res;
  };

  const confirmOrder = async (orderId: string) => {
    if (!currentUser) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to confirm orders.'
      });
      return { success: false, error: 'User not authenticated' };
    }

    const res = await confirmOrderInFirestore(orderId, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Order Confirmed',
        message: 'Order confirmed successfully. Stock has been deducted and audit trail recorded.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Order Confirmation Failed',
        message: res.error || 'Failed to confirm order.'
      });
    }
    return res;
  };

  const cancelOrder = async (orderId: string, reason?: string) => {
    if (!currentUser) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to cancel orders.'
      });
      return { success: false, error: 'User not authenticated' };
    }

    const res = await cancelOrderInFirestore(orderId, currentUser, reason);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Order Cancelled',
        message: 'Order cancelled. Any deducted stock has been restored to inventory.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: res.error || 'Failed to cancel order.'
      });
    }
    return res;
  };

  const returnOrder = async (orderId: string, returnReason?: string) => {
    if (!currentUser) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to return orders.'
      });
      return { success: false, error: 'User not authenticated' };
    }

    const res = await returnOrderInFirestore(orderId, currentUser, returnReason);
    if (res.success) {
      addToast({
        type: 'warning',
        title: 'Order Returned',
        message: 'Order marked as returned. Stock returned to inventory.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Return Failed',
        message: res.error || 'Failed to mark order returned.'
      });
    }
    return res;
  };

  const updateOrder = async (orderId: string, data: Partial<Order>) => {
    const res = await updateOrderInFirestore(orderId, data);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Order Updated',
        message: 'Order details saved successfully.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: res.error || 'Failed to update order.'
      });
    }
    return res;
  };

  // -------------------------------------------------------------
  // DOWNSTREAM ORDER & LOGISTICS ACTIONS
  // -------------------------------------------------------------

  const addOrder = async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdDate' | 'createdAt'>): Promise<Order | null> => {
    if (!currentUser) return null;
    const res = await createOrder({
      customerId: orderData.customerId,
      shopName: orderData.shopName,
      ownerName: orderData.ownerName,
      phone: orderData.phone,
      address: orderData.address,
      area: orderData.area,
      district: orderData.district,
      salesUserId: orderData.salesSellerId || currentUser.uid,
      salesUserName: orderData.salesSellerName || currentUser.name,
      items: orderData.items,
      subtotal: orderData.subtotal,
      totalDiscount: orderData.discount || orderData.totalDiscount,
      discount: orderData.discount,
      grandTotal: orderData.totalAmount || orderData.grandTotal || orderData.subtotal,
      paidAmount: orderData.paidAmount,
      notes: orderData.notes,
      paymentMethod: orderData.paymentMethod,
      orderStatus: orderData.orderStatus
    });

    if (res.success && res.id) {
      return {
        ...orderData,
        id: res.id,
        orderId: res.id,
        orderNumber: res.orderNumber || 'ORD-NEW',
        createdDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      } as Order;
    }
    return null;
  };

  const assignDeliveryToOrder = async (orderId: string, deliveryStaffId: string) => {
    if (currentUser?.role !== 'admin' && role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can assign delivery staff.' });
      return { success: false, error: 'Unauthorized' };
    }
    const driver = deliveryStaff.find(d => d.id === deliveryStaffId || (d as any).uid === deliveryStaffId || d.email.toLowerCase() === deliveryStaffId.toLowerCase());
    if (!driver) {
      addToast({ type: 'error', title: 'Assignment Failed', message: 'Selected delivery staff not found.' });
      return { success: false, error: 'Delivery staff not found.' };
    }

    const assignedDriverId = driver.uid || driver.id;

    const res = await assignDeliveryStaffInFirestore(orderId, assignedDriverId, driver.name, currentUser);

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Delivery Assigned',
        message: `Delivery assigned to ${driver.name} successfully.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Assignment Failed',
        message: res.error || 'Failed to assign delivery.'
      });
    }
    return res;
  };

  const updateDeliveryStatus = async (
    orderId: string,
    targetDeliveryStatus: 'in_transit' | 'delivered' | 'failed' | 'returned',
    options?: { failureReason?: string; podNotes?: string; receivedBy?: string }
  ) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Unauthorized', message: 'You must be logged in to update delivery status.' });
      return { success: false, error: 'Unauthorized' };
    }

    const res = await updateDeliveryStatusInFirestore(orderId, targetDeliveryStatus, currentUser, options);

    if (res.success) {
      const labels: Record<string, string> = {
        in_transit: 'In Transit',
        delivered: 'Delivered',
        failed: 'Delivery Failed',
        returned: 'Returned'
      };
      addToast({
        type: 'success',
        title: 'Delivery Status Updated',
        message: `Order delivery status changed to ${labels[targetDeliveryStatus] || targetDeliveryStatus}.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Status Update Failed',
        message: res.error || 'Failed to update delivery status.'
      });
    }
    return res;
  };

  const submitProofOfDelivery = async (
    orderId: string,
    receivedBy: string,
    podNotes?: string
  ) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Unauthorized', message: 'You must be logged in to submit Proof of Delivery.' });
      return { success: false, error: 'Unauthorized' };
    }

    const res = await submitProofOfDeliveryInFirestore({ orderId, receivedBy, podNotes }, currentUser);

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Order Delivered',
        message: 'Order delivered successfully with Proof of Delivery.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'POD Submission Failed',
        message: res.error || 'Failed to submit Proof of Delivery.'
      });
    }
    return res;
  };

  const markOrderPacking = async (orderId: string) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Unauthorized', message: 'You must be logged in to update packing status.' });
      return { success: false, error: 'Unauthorized' };
    }

    const res = await markOrderPackingInFirestore(orderId, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Order Status: Packing',
        message: 'Order moved to Packing / Warehouse preparation.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Packing Update Failed',
        message: res.error || 'Failed to update order status to packing.'
      });
    }
    return res;
  };

  const markOrderReadyForDelivery = async (orderId: string) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Unauthorized', message: 'You must be logged in to update delivery readiness.' });
      return { success: false, error: 'Unauthorized' };
    }

    const res = await markOrderReadyForDeliveryInFirestore(orderId, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Order Ready for Delivery',
        message: 'Order packed and marked Ready for Delivery.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Status Update Failed',
        message: res.error || 'Failed to mark order ready for delivery.'
      });
    }
    return res;
  };

  const submitPartialDelivery = async (
    orderId: string,
    itemDeliveries: { productId: string; sku: string; newlyDeliveredQuantity: number }[],
    options?: { receivedBy?: string; podNotes?: string }
  ) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Unauthorized', message: 'You must be logged in to record delivery.' });
      return { success: false, error: 'Unauthorized' };
    }

    const res = await submitPartialDeliveryInFirestore(orderId, itemDeliveries, currentUser, options);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Delivery Progress Recorded',
        message: 'Item delivery quantities and history recorded successfully.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Delivery Record Failed',
        message: res.error || 'Failed to record delivery progress.'
      });
    }
    return res;
  };

  const updateOrderStatus = async (orderId: string, orderStatus: OrderStatus, deliveryStaffId?: string) => {
    if (orderStatus === 'confirmed') {
      await confirmOrder(orderId);
      return;
    }
    if (orderStatus === 'cancelled') {
      await cancelOrder(orderId);
      return;
    }
    if (orderStatus === 'returned') {
      await returnOrder(orderId);
      return;
    }

    let assignedDriver = '';
    let driverId = deliveryStaffId;
    let deliveryStatus = 'unassigned';

    if (deliveryStaffId) {
      const foundDriver = deliveryStaff.find(d => d.id === deliveryStaffId);
      if (foundDriver) {
        assignedDriver = foundDriver.name;
        driverId = foundDriver.id;
        deliveryStatus = 'assigned';
      }
    }

    if (orderStatus === 'dispatched') {
      deliveryStatus = 'in_transit';
    } else if (orderStatus === 'delivered') {
      deliveryStatus = 'delivered';
    }

    await updateOrderInFirestore(orderId, {
      orderStatus,
      deliveryStatus: deliveryStatus as any,
      deliveryStaffId: driverId,
      deliveryStaffName: assignedDriver
    });

    addToast({
      type: 'info',
      title: 'Order Status Updated',
      message: `Order status updated to ${orderStatus.toUpperCase()}`
    });
  };

  const markOrderDelivered = async (
    orderId: string, 
    receivedBy: string, 
    podNotes?: string,
    collectedAmount?: number,
    paymentMethod: PaymentMethod = 'Cash'
  ) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    let newPaid = targetOrder.paidAmount;
    let newDue = targetOrder.dueAmount;
    let paymentStatus = targetOrder.paymentStatus;

    if (collectedAmount && collectedAmount > 0) {
      newPaid += collectedAmount;
      newDue = Math.max(0, targetOrder.totalAmount - newPaid);
      paymentStatus = newDue === 0 ? 'paid' : 'partial';

      recordCollection({
        customerId: targetOrder.customerId,
        orderId: targetOrder.id,
        amount: collectedAmount,
        paymentMethod,
        referenceNo: `POD-COL-${targetOrder.orderNumber}`,
        notes: `Collected upon delivery by ${currentDeliveryUser.name}`
      });
    }

    await updateOrderInFirestore(orderId, {
      orderStatus: 'delivered',
      deliveryStatus: 'delivered',
      receivedBy,
      podNotes: podNotes || 'Goods handed over in sealed cartons with invoice.',
      paidAmount: newPaid,
      dueAmount: newDue,
      paymentStatus
    });

    setDeliveryStaff(prev => prev.map(d => {
      if (d.id === currentDeliveryUser.id) {
        return {
          ...d,
          completedDeliveriesToday: d.completedDeliveriesToday + 1,
          activeDeliveriesToday: Math.max(0, d.activeDeliveriesToday - 1)
        };
      }
      return d;
    }));

    addToast({
      type: 'success',
      title: 'Delivery Completed',
      message: `Delivered to ${receivedBy} for ${targetOrder.shopName}.`
    });
  };

  const markOrderReturned = async (orderId: string, returnReason: string) => {
    await returnOrder(orderId, returnReason);
  };

  const recordCollection = (params: {
    customerId: string;
    orderId?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    referenceNo?: string;
  }) => {
    const targetCust = customers.find(c => c.id === params.customerId);
    const colNumber = `GLW-REC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const nowStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let collectorRole: 'delivery' | 'sales' | 'admin' = role;
    let collectorId = role === 'admin' ? 'admin-01' : role === 'sales' ? currentSalesUser.id : currentDeliveryUser.id;
    let collectorName = role === 'admin' ? 'Glowzaa Central Accounts' : role === 'sales' ? currentSalesUser.name : currentDeliveryUser.name;

    const newRecord: CollectionRecord = {
      id: `col-${Date.now()}`,
      collectionNumber: colNumber,
      orderId: params.orderId,
      customerId: params.customerId,
      shopName: targetCust?.shopName || 'Retail Shop',
      ownerName: targetCust?.ownerName || 'Merchant',
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      collectedByRole: collectorRole,
      collectorId,
      collectorName,
      collectedAt: nowStr,
      referenceNo: params.referenceNo || `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
      reconciledWithAdmin: role === 'admin',
      notes: params.notes
    };

    setCollections(prev => [newRecord, ...prev]);

    setCustomers(prev => prev.map(c => {
      if (c.id === params.customerId) {
        return {
          ...c,
          totalPaid: c.totalPaid + params.amount,
          currentDue: Math.max(0, c.currentDue - params.amount)
        };
      }
      return c;
    }));

    if (params.orderId) {
      setOrders(prev => prev.map(o => {
        if (o.id === params.orderId) {
          const newPaid = o.paidAmount + params.amount;
          const newDue = Math.max(0, o.totalAmount - newPaid);
          return {
            ...o,
            paidAmount: newPaid,
            dueAmount: newDue,
            paymentStatus: newDue === 0 ? 'paid' : 'partial'
          };
        }
        return o;
      }));
    }

    if (collectorRole === 'delivery') {
      setDeliveryStaff(prev => prev.map(d => {
        if (d.id === collectorId) {
          return {
            ...d,
            cashInHand: d.cashInHand + params.amount
          };
        }
        return d;
      }));
    }

    addToast({
      type: 'success',
      title: 'Money Collection Recorded',
      message: `${formatBDT(params.amount)} collected for ${targetCust?.shopName || 'Customer'}.`
    });

    return newRecord;
  };

  const reconcileCollection = (collectionId: string) => {
    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        return { ...c, reconciledWithAdmin: true };
      }
      return c;
    }));

    addToast({
      type: 'success',
      title: 'Receipt Reconciled',
      message: 'Payment verified and banked into Glowzaa master account.'
    });
  };

  const submitCashHandover = async (driverId: string) => {
    if (!currentUser) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be signed in to submit a cash handover.'
      });
      return { success: false, error: 'User unauthenticated' };
    }

    const res = await submitCashHandoverInFirestore(driverId, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Cash Handover Submitted',
        message: `Cash handover request for ${formatBDT(res.amount || 0)} submitted. Awaiting HQ Cashier verification.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Handover Submission Failed',
        message: res.error || 'Failed to submit cash handover.'
      });
    }
    return res;
  };

  const acceptCashHandover = async (handoverId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Only Administrators and HQ Cashiers can accept cash handovers.'
      });
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    const res = await acceptCashHandoverInFirestore(handoverId, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Cash Handover Accepted',
        message: 'Cash handover request verified and reconciled into HQ Vault.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Handover Acceptance Failed',
        message: res.error || 'Failed to accept cash handover.'
      });
    }
    return res;
  };

  const rejectCashHandover = async (handoverId: string, rejectionReason: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Only Administrators and HQ Cashiers can reject cash handovers.'
      });
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    const res = await rejectCashHandoverInFirestore(handoverId, rejectionReason, currentUser);
    if (res.success) {
      addToast({
        type: 'warning',
        title: 'Cash Handover Rejected',
        message: 'Handover request rejected. Collection receipts unlocked and returned to driver pouch.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Handover Rejection Failed',
        message: res.error || 'Failed to reject cash handover.'
      });
    }
    return res;
  };

  const handoverDeliveryCash = (deliveryStaffId: string) => {
    submitCashHandover(deliveryStaffId);
  };

  // -------------------------------------------------------------
  // OPERATING EXPENSE ACTIONS
  // -------------------------------------------------------------

  const addExpense = async (data: {
    title: string;
    category: ExpenseCategory | string;
    amount: number;
    paymentMethod: string;
    vendorName?: string | null;
    expenseDate: string;
    description?: string;
    autoApprove?: boolean;
  }) => {
    if (!currentUser) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be signed in to submit operating expenses.'
      });
      return { success: false, error: 'User unauthenticated' };
    }

    // Determine active persona role and metadata
    let effectiveUser: AuthUser = { ...currentUser };
    if (role === 'sales') {
      effectiveUser = {
        ...currentUser,
        role: 'sales',
        id: currentSalesUser?.id || currentUser.uid || currentUser.id,
        uid: currentUser.uid || currentSalesUser?.id || currentUser.id,
        name: currentSalesUser?.name || currentUser.name || 'Sales Staff'
      };
    } else if (role === 'delivery') {
      effectiveUser = {
        ...currentUser,
        role: 'delivery',
        id: currentDeliveryUser?.id || currentUser.uid || currentUser.id,
        uid: currentUser.uid || currentDeliveryUser?.id || currentUser.id,
        name: currentDeliveryUser?.name || currentUser.name || 'Delivery Staff'
      };
    }

    const res = await addExpenseInFirestore(data, effectiveUser);
    if (res.success) {
      const isAutoApproved = effectiveUser.role === 'admin' && data.autoApprove === true;
      addToast({
        type: 'success',
        title: isAutoApproved ? 'Expense Recorded & Approved' : 'Expense Claim Submitted',
        message: isAutoApproved 
          ? `Expense ${res.expenseNumber || ''} (${formatBDT(data.amount)}) recorded and approved.`
          : `Expense claim ${res.expenseNumber || ''} (${formatBDT(data.amount)}) submitted for Admin approval.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Expense Submission Failed',
        message: res.error || 'Failed to submit expense.'
      });
    }
    return res;
  };

  const approveExpense = async (expenseId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Only Administrators can approve expense claims.'
      });
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    const res = await approveExpenseInFirestore(expenseId, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Expense Approved',
        message: 'Expense claim approved and linked to Profit & Loss statement.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Approval Failed',
        message: res.error || 'Failed to approve expense.'
      });
    }
    return res;
  };

  const rejectExpense = async (expenseId: string, rejectionReason: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Only Administrators can reject expense claims.'
      });
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    const res = await rejectExpenseInFirestore(expenseId, rejectionReason, currentUser);
    if (res.success) {
      addToast({
        type: 'warning',
        title: 'Expense Claim Rejected',
        message: 'Expense claim marked as rejected.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        message: res.error || 'Failed to reject expense.'
      });
    }
    return res;
  };

  const editExpense = async (expenseId: string, updates: Partial<Expense>) => {
    if (!currentUser) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be signed in to edit expense claims.'
      });
      return { success: false, error: 'User unauthenticated' };
    }

    const res = await editExpenseInFirestore(expenseId, updates, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Expense Updated',
        message: 'Expense record updated successfully.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Edit Failed',
        message: res.error || 'Failed to edit expense.'
      });
    }
    return res;
  };

  const deleteExpense = async (expenseId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Only Administrators can delete expense records.'
      });
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    const res = await deleteExpenseInFirestore(expenseId, currentUser);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Expense Removed',
        message: 'Expense record removed.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        message: res.error || 'Failed to delete expense.'
      });
    }
    return res;
  };

  // -------------------------------------------------------------
  // FIRESTORE PAYMENT & CUSTOMER DUE LEDGER ACTIONS
  // -------------------------------------------------------------

  const recordPayment = async (paymentData: {
    customerId: string;
    customerName?: string;
    amount: number;
    paymentMethod: PaymentMethodOption | string;
    paymentType?: PaymentTypeOption | string;
    orderId?: string | null;
    orderNumber?: string | null;
    notes?: string;
    isAdvance?: boolean;
  }) => {
    if (!currentUser) {
      addToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be signed in to record payments.'
      });
      return { success: false, error: 'User unauthenticated' };
    }

    const res = await recordPaymentInFirestore(paymentData, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Payment & Collection Recorded',
        message: `Voucher ${res.paymentNumber || ''} for ${formatBDT(paymentData.amount)} processed. Customer balance updated atomically.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Payment Failed',
        message: res.error || 'Failed to record payment.'
      });
    }
    return res;
  };

  const reversePayment = async (paymentId: string, reversalReason: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      addToast({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Only Administrators are authorized to reverse completed payments.'
      });
      return { success: false, error: 'Unauthorized: Admin role required for payment reversal' };
    }

    const res = await reversePaymentInFirestore(paymentId, reversalReason, currentUser);
    if (res.success) {
      addToast({
        type: 'warning',
        title: 'Payment Reversed',
        message: 'Payment marked reversed. Audit reversal adjustment posted to customer ledger.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Reversal Failed',
        message: res.error || 'Could not reverse payment.'
      });
    }
    return res;
  };

  const getCustomerLedger = (customerId: string) => {
    return customerLedger
      .filter(entry => entry.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getCustomerPayments = (customerId: string) => {
    return payments
      .filter(p => p.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // -------------------------------------------------------------
  // FIRESTORE CUSTOMER ACTIONS
  // -------------------------------------------------------------

  const checkDuplicatePhone = async (phone: string, excludeCustomerId?: string) => {
    return await checkDuplicatePhoneInFirestore(phone, excludeCustomerId);
  };

  const createCustomer = async (
    customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchase' | 'totalPaid' | 'currentDue'>
  ) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Authentication Required', message: 'You must be signed in to add customers.' });
      return { success: false, error: 'User unauthenticated' };
    }

    const res = await createCustomerInFirestore(customerData, currentUser);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Retail Shop Onboarded',
        message: `${customerData.shopName} successfully registered in Firestore.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: res.error || 'Failed to create customer.'
      });
    }
    return res;
  };

  // Backwards compatibility alias for addCustomer
  const addCustomer = async (
    customerData: Omit<Customer, 'id' | 'totalPurchase' | 'totalPaid' | 'currentDue' | 'lastOrderDate' | 'createdAt'>
  ) => {
    return await createCustomer(customerData);
  };

  const updateCustomer = async (customerInput: Customer | ({ id: string } & Partial<Customer>)) => {
    if (!currentUser) {
      addToast({ type: 'error', title: 'Authentication Required', message: 'You must be signed in to update customer records.' });
      return { success: false, error: 'User unauthenticated' };
    }

    const res = await updateCustomerInFirestore(customerInput.id, customerInput, currentUser);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Customer Profile Updated',
        message: `${customerInput.shopName || 'Customer'} profile updated in Firestore.`
      });
      // Also update viewing customer if modal open
      if (viewingCustomer && viewingCustomer.id === customerInput.id) {
        setViewingCustomer({ ...viewingCustomer, ...customerInput } as Customer);
      }
    } else {
      addToast({
        type: 'error',
        title: 'Update Error',
        message: res.error || 'Failed to update customer.'
      });
    }
    return res;
  };

  const toggleCustomerStatus = async (customerId: string, currentStatus: 'active' | 'inactive') => {
    const res = await toggleCustomerStatusInFirestore(customerId, currentStatus);
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Status Updated',
        message: `Customer account is now marked as ${newStatus.toUpperCase()}.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Status Update Failed',
        message: res.error || 'Could not update status.'
      });
    }
    return res;
  };

  const assignSalesSellerToCustomer = async (customerId: string, salesUserId: string, salesUserName: string) => {
    const res = await assignSalesSellerToCustomerInFirestore(customerId, salesUserId, salesUserName);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Sales Officer Assigned',
        message: `Customer reassigned to ${salesUserName}.`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Assignment Failed',
        message: res.error || 'Could not assign sales officer.'
      });
    }
    return res;
  };

  const deleteCustomer = async (customerId: string) => {
    if (currentUser?.role !== 'admin') {
      addToast({ type: 'error', title: 'Access Denied', message: 'Only Administrators can delete customer records.' });
      return { success: false, error: 'Unauthorized role' };
    }

    const res = await deleteCustomerFromFirestore(customerId);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Customer Deleted',
        message: 'Customer record was removed from Firestore.'
      });
      if (viewingCustomer?.id === customerId) {
        setViewingCustomer(null);
      }
    } else {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: res.error || 'Could not delete customer.'
      });
    }
    return res;
  };

  const addPurchase = (purchaseData: Omit<PurchaseBill, 'id' | 'billNumber'>) => {
    const newId = `pur-${Date.now()}`;
    const billNumber = `PUR-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newPurchase: PurchaseBill = {
      ...purchaseData,
      id: newId,
      billNumber
    };

    setPurchases(prev => [newPurchase, ...prev]);

    addToast({
      type: 'success',
      title: 'Purchase Bill Booked',
      message: `${billNumber} (${formatBDT(purchaseData.totalAmount)}) recorded from ${purchaseData.supplierName}.`
    });

    return newPurchase;
  };

  const wipeAllData = async (): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only administrators can execute complete data wipe.' };
    }
    return await wipeAllApplicationDataInFirestore(currentUser);
  };

  const resetDemoData = async (): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only administrators can reset demo data.' };
    }
    return await resetDemoDataInFirestore(currentUser);
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        adminTab,
        setAdminTab,
        salesTab,
        setSalesTab,
        deliveryTab,
        setDeliveryTab,

        wipeAllData,
        resetDemoData,
        
        // Firestore Products, Categories, Inventory, Customers, Orders, Payments, and Ledger
        products,
        categoryDocs,
        categories,
        inventoryTransactions,
        customers,
        orders,
        payments,
        customerLedger,
        deliveryHistory,
        cashHandovers,
        expenses,
        isProductsLoading,
        isCategoriesLoading,
        isCustomersLoading,
        isOrdersLoading,
        isPaymentsLoading,
        isLedgerLoading,
        isExpensesLoading,
        
        // Downstream data
        purchases,
        salesStaff,
        deliveryStaff,
        collections,
        
        currentSalesUser,
        setCurrentSalesUser,
        currentDeliveryUser,
        setCurrentDeliveryUser,
        
        // Product actions
        addProduct,
        updateProduct,
        toggleProductStatus,
        deleteProduct,
        
        // Category actions
        createCategory,
        updateCategory,
        toggleCategoryStatus,
        deleteCategory,
        addCategory,
        
        // Inventory actions
        adjustStock,

        // Customer actions
        createCustomer,
        updateCustomer,
        toggleCustomerStatus,
        assignSalesSellerToCustomer,
        deleteCustomer,
        checkDuplicatePhone,
        
        // Order actions (Firestore)
        createOrder,
        confirmOrder,
        cancelOrder,
        returnOrder,
        updateOrder,
        assignDeliveryToOrder,
        updateDeliveryStatus,
        submitProofOfDelivery,
        markOrderPacking,
        markOrderReadyForDelivery,
        submitPartialDelivery,

        // Real Firestore Payment & Customer Due Ledger actions
        recordPayment,
        reversePayment,
        getCustomerLedger,
        getCustomerPayments,
        submitCashHandover,
        acceptCashHandover,
        rejectCashHandover,

        // Expense actions
        addExpense,
        approveExpense,
        rejectExpense,
        editExpense,
        deleteExpense,

        // Downstream actions
        addOrder,
        updateOrderStatus,
        markOrderDelivered,
        markOrderReturned,
        recordCollection,
        reconcileCollection,
        handoverDeliveryCash,
        addCustomer,
        addPurchase,

        viewingOrder,
        setViewingOrder,
        viewingCustomer,
        setViewingCustomer,
        viewingProduct,
        setViewingProduct,

        toasts,
        addToast,
        removeToast,

        searchQuery,
        setSearchQuery,
        formatBDT
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
