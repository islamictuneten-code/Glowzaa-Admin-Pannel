import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AdminTab, DeliveryTab, SalesTab } from '../../types';
import { UserAvatar } from '../shared/UserAvatar';
import { subscribeToCommunicationConversations } from '../../services/communicationService';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Layers,
  Boxes,
  Truck,
  UserCheck,
  CreditCard,
  AlertCircle,
  Receipt,
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Settings,
  PlusCircle,
  Clock,
  CheckCircle2,
  CheckSquare,
  XCircle,
  Banknote,
  History,
  ShoppingBag,
  Calculator,
  LogOut,
  ShieldCheck,
  Building2,
  MapPin,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  Award,
  Wallet,
  Search,
  ChevronRight,
  ChevronDown,
  Plus
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface AdminSubItem {
  id: string; // Unique leaf ID for active state
  tabId: AdminTab; // Underlying route/tab
  label: string;
}

interface AdminCategoryGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: AdminSubItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { 
    role, 
    adminTab, 
    setAdminTab, 
    salesTab, 
    setSalesTab, 
    deliveryTab, 
    setDeliveryTab,
    orders,
    products,
    customers,
    currentSalesUser,
    currentDeliveryUser,
    expenses,
    formatBDT,
    addToast
  } = useApp();

  const { currentUser, logout } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    dashboard: true,
    sales_orders: true,
    customers_crm: true
  });
  
  // Independent active leaf menu item state (ensures ONLY ONE leaf is active at a time)
  const [activeMenuItem, setActiveMenuItem] = useState<string>('business_overview');

  const currentUserId = currentUser?.uid || (currentUser as any)?.id || '';

  // Subscribe to real-time conversation unread counts for navigation badges
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeToCommunicationConversations(currentUserId, role || 'staff', (convs) => {
      const count = convs.reduce((sum, c) => sum + (c.unreadCounts?.[currentUserId] || 0), 0);
      setUnreadMessagesCount(count);
    });
    return () => unsub();
  }, [currentUserId, role]);

  // Admin Categorized Navigation Groups with UNIQUE IDs for each submenu item
  const adminCategories: AdminCategoryGroup[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'executive_dashboard', tabId: 'executive_bi', label: 'Executive Dashboard' },
        { id: 'business_overview', tabId: 'dashboard', label: 'Business Overview' },
        { id: 'smart_business_alerts', tabId: 'business_alerts', label: 'Smart Business Alerts' },
        { id: 'action_center', tabId: 'business_alerts', label: 'Action Center' }
      ]
    },
    {
      id: 'sales_orders',
      title: 'Sales & Orders',
      icon: <ShoppingCart className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'orders_list', tabId: 'orders', label: 'Orders' },
        { id: 'orders_new', tabId: 'orders', label: 'New Order' },
        { id: 'orders_pos', tabId: 'orders', label: 'POS' },
        { id: 'orders_quotations', tabId: 'orders', label: 'Quotations' },
        { id: 'orders_invoices', tabId: 'orders', label: 'Sales Invoices' },
        { id: 'orders_returns', tabId: 'orders', label: 'Returns & Refunds' },
        { id: 'sales_analytics', tabId: 'sales_intelligence', label: 'Sales Analytics' },
        { id: 'sales_forecasting', tabId: 'sales_forecast', label: 'Sales Forecasting' },
        { id: 'reorder_intelligence', tabId: 'customer_intelligence', label: 'Reorder Intelligence' }
      ]
    },
    {
      id: 'products',
      title: 'Products',
      icon: <Package className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'products_all', tabId: 'products', label: 'All Products' },
        { id: 'products_add', tabId: 'products', label: 'Add New Product' },
        { id: 'products_variants', tabId: 'products', label: 'Product Variants' },
        { id: 'categories_list', tabId: 'categories', label: 'Categories' },
        { id: 'products_brands', tabId: 'products', label: 'Brands' },
        { id: 'barcode_management', tabId: 'products', label: 'Barcode Management' },
        { id: 'barcode_label_printing', tabId: 'products', label: 'Barcode Label Printing' },
        { id: 'product_pricing', tabId: 'price_intelligence', label: 'Product Pricing' },
        { id: 'product_images', tabId: 'products', label: 'Product Images' },
        { id: 'product_import_export', tabId: 'products', label: 'Product Import / Export' }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: <Boxes className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'inventory_overview', tabId: 'inventory', label: 'Inventory Overview' },
        { id: 'stock_in', tabId: 'purchases', label: 'Stock In' },
        { id: 'stock_out', tabId: 'inventory', label: 'Stock Out' },
        { id: 'stock_transactions', tabId: 'inventory', label: 'Stock Transactions' },
        { id: 'stock_adjustments', tabId: 'inventory', label: 'Stock Adjustments' },
        { id: 'warehouse_management', tabId: 'warehouses', label: 'Warehouse Management' },
        { id: 'warehouse_locations', tabId: 'warehouses', label: 'Warehouse Locations' },
        { id: 'low_stock', tabId: 'inventory', label: 'Low Stock' },
        { id: 'reorder_management', tabId: 'inventory', label: 'Reorder Management' },
        { id: 'inventory_intelligence', tabId: 'inventory_intelligence', label: 'Inventory Intelligence' },
        { id: 'inventory_reports', tabId: 'inventory_reports', label: 'Inventory Reports' }
      ]
    },
    {
      id: 'customers_crm',
      title: 'Customers & CRM',
      icon: <Users className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'customers_all', tabId: 'customers', label: 'All Customers' },
        { id: 'customer_360', tabId: 'customers', label: 'Customer 360°' },
        { id: 'customer_due', tabId: 'customer_due', label: 'Customer Due' },
        { id: 'credit_control', tabId: 'customers', label: 'Credit Control' },
        { id: 'customer_intelligence', tabId: 'customer_intelligence', label: 'Customer Intelligence' },
        { id: 'customer_purchase_history', tabId: 'customers', label: 'Customer Purchase History' },
        { id: 'customer_ledger', tabId: 'customers', label: 'Customer Ledger' },
        { id: 'sales_pipeline', tabId: 'sales_crm', label: 'Sales Pipeline' },
        { id: 'crm_tasks', tabId: 'sales_crm', label: 'CRM Tasks' }
      ]
    },
    {
      id: 'procurement',
      title: 'Procurement',
      icon: <ShoppingBag className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'suppliers', tabId: 'purchases', label: 'Suppliers' },
        { id: 'purchase_orders', tabId: 'purchase_orders', label: 'Purchase Orders' },
        { id: 'purchase_stock_in', tabId: 'purchases', label: 'Purchase / Stock In' },
        { id: 'goods_received', tabId: 'goods_receipts', label: 'Goods Received' },
        { id: 'supplier_payments', tabId: 'payments', label: 'Supplier Payments' },
        { id: 'supplier_performance', tabId: 'supplier_performance', label: 'Supplier Performance' },
        { id: 'procurement_analytics', tabId: 'smart_procurement', label: 'Procurement Analytics' }
      ]
    },
    {
      id: 'finance_accounts',
      title: 'Finance & Accounts',
      icon: <Wallet className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'cash_flow', tabId: 'cash_flow_center', label: 'Cash Flow' },
        { id: 'payments', tabId: 'payments', label: 'Payments' },
        { id: 'collections', tabId: 'collections', label: 'Collections' },
        { id: 'finance_customer_due', tabId: 'customer_due', label: 'Customer Due' },
        { id: 'expenses', tabId: 'expenses', label: 'Expenses' },
        { id: 'bank_accounts', tabId: 'cash_flow_center', label: 'Bank Accounts' },
        { id: 'cash_handover', tabId: 'collections', label: 'Cash Handover' },
        { id: 'delivery_cash_reconciliation', tabId: 'collections', label: 'Delivery Cash Reconciliation' },
        { id: 'profit_loss', tabId: 'profit_loss', label: 'Profit & Loss' },
        { id: 'financial_reports', tabId: 'sales_reports', label: 'Financial Reports' }
      ]
    },
    {
      id: 'reports_analytics',
      title: 'Reports & Analytics',
      icon: <BarChart3 className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'sales_reports', tabId: 'sales_reports', label: 'Sales Reports' },
        { id: 'purchase_reports', tabId: 'sales_reports', label: 'Purchase Reports' },
        { id: 'report_inventory_reports', tabId: 'inventory_reports', label: 'Inventory Reports' },
        { id: 'customer_reports', tabId: 'customer_intelligence', label: 'Customer Reports' },
        { id: 'staff_performance', tabId: 'sales_staff', label: 'Staff Performance' },
        { id: 'delivery_reports', tabId: 'delivery_staff', label: 'Delivery Reports' },
        { id: 'field_sales_reports', tabId: 'field_tracking', label: 'Field Sales Reports' },
        { id: 'report_financial_reports', tabId: 'profit_loss', label: 'Financial Reports' },
        { id: 'business_intelligence', tabId: 'executive_bi', label: 'Business Intelligence' },
        { id: 'ai_insights', tabId: 'sales_intelligence', label: 'AI Insights' },
        { id: 'export_center', tabId: 'sales_reports', label: 'Export Center' }
      ]
    },
    {
      id: 'communication',
      title: 'Communication',
      icon: <MessageSquare className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'staff_messages', tabId: 'messages', label: 'Staff Messages' },
        { id: 'message_inbox', tabId: 'messages', label: 'Message Inbox' },
        { id: 'sent_messages', tabId: 'messages', label: 'Sent Messages' },
        { id: 'message_templates', tabId: 'messages', label: 'Message Templates' }
      ]
    },
    {
      id: 'field_operations',
      title: 'Field Operations',
      icon: <MapPin className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'field_sales_tracking', tabId: 'field_tracking', label: 'Field Sales Tracking' },
        { id: 'live_seller_map', tabId: 'field_tracking', label: 'Live Seller Map' },
        { id: 'seller_locations', tabId: 'field_tracking', label: 'Seller Locations' },
        { id: 'shop_visits', tabId: 'field_tracking', label: 'Shop Visits' },
        { id: 'route_history', tabId: 'field_tracking', label: 'Route History' },
        { id: 'gps_activity', tabId: 'field_tracking', label: 'GPS Activity' },
        { id: 'field_duty_monitoring', tabId: 'field_tracking', label: 'Field Duty Monitoring' },
        { id: 'field_performance', tabId: 'field_tracking', label: 'Field Performance' }
      ]
    },
    {
      id: 'settings_config',
      title: 'Settings & Configuration',
      icon: <Settings className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'company_settings', tabId: 'settings', label: 'Company Settings' },
        { id: 'business_profile', tabId: 'settings', label: 'Business Profile' },
        { id: 'pricing_discounts', tabId: 'settings', label: 'Pricing & Discounts' },
        { id: 'tax_vat', tabId: 'settings', label: 'Tax / VAT' },
        { id: 'units_measurement', tabId: 'settings', label: 'Units & Measurement' },
        { id: 'order_settings', tabId: 'settings', label: 'Order Settings' },
        { id: 'inventory_settings', tabId: 'settings', label: 'Inventory Settings' },
        { id: 'pos_settings', tabId: 'settings', label: 'POS Settings' },
        { id: 'barcode_settings', tabId: 'settings', label: 'Barcode Settings' },
        { id: 'communication_settings', tabId: 'settings', label: 'Communication Settings' },
        { id: 'theme_appearance', tabId: 'settings', label: 'Theme & Appearance' }
      ]
    },
    {
      id: 'system_management',
      title: 'System Management',
      icon: <ShieldCheck className="w-4 h-4 text-[#0F766E]" />,
      items: [
        { id: 'staff_user_accounts', tabId: 'staff_management', label: 'Staff / User Accounts' },
        { id: 'roles_permissions', tabId: 'staff_management', label: 'Roles & Permissions' },
        { id: 'staff_hr_payroll', tabId: 'payroll', label: 'Staff HR & Payroll' },
        { id: 'sales_staff', tabId: 'sales_staff', label: 'Sales Staff' },
        { id: 'delivery_staff', tabId: 'delivery_staff', label: 'Delivery Staff' },
        { id: 'audit_logs', tabId: 'settings', label: 'Audit Logs' },
        { id: 'security', tabId: 'settings', label: 'Security' },
        { id: 'sessions_devices', tabId: 'settings', label: 'Sessions / Devices' },
        { id: 'data_management', tabId: 'settings', label: 'Data Management' },
        { id: 'backup_restore', tabId: 'settings', label: 'Backup / Restore' },
        { id: 'demo_data', tabId: 'settings', label: 'Demo Data' },
        { id: 'system_diagnostics', tabId: 'settings', label: 'System Diagnostics' }
      ]
    }
  ];

  // Sync activeMenuItem with adminTab changes
  useEffect(() => {
    if (role === 'admin' && adminTab) {
      const allItems = adminCategories.flatMap(c => c.items);
      const currentActiveItem = allItems.find(i => i.id === activeMenuItem);
      if (!currentActiveItem || currentActiveItem.tabId !== adminTab) {
        const firstMatch = allItems.find(i => i.tabId === adminTab);
        if (firstMatch) {
          setActiveMenuItem(firstMatch.id);
        }
      }
    }
  }, [adminTab, role]);

  // Badges calculation
  const pendingExpensesCount = (expenses || []).filter(e => e && !e.deleted && e.status === 'pending').length;
  const pendingOrdersCount = (orders || []).filter(o => o && (o.orderStatus === 'pending' || o.orderStatus === 'processing')).length;
  const lowStockCount = (products || []).filter(p => p && (p.status === 'low_stock' || p.status === 'out_of_stock')).length;
  const overdueCustomersCount = (customers || []).filter(c => c && (c.currentDue || 0) > 0).length;
  
  const salesUserId = currentSalesUser?.id || '';
  const deliveryUserId = currentDeliveryUser?.id || '';
  const deliveryUserUid = (currentDeliveryUser as any)?.uid || '';

  const myPendingSalesOrders = (orders || []).filter(o => o && salesUserId && o.salesSellerId === salesUserId && (o.orderStatus === 'pending' || o.orderStatus === 'processing')).length;
  const myPendingDeliveries = (orders || []).filter(o => o && (deliveryUserId || deliveryUserUid) && (o.deliveryStaffId === deliveryUserId || o.deliveryStaffId === deliveryUserUid) && (o.orderStatus === 'dispatched' || o.orderStatus === 'processing')).length;
  const myCompletedToday = (orders || []).filter(o => o && (deliveryUserId || deliveryUserUid) && (o.deliveryStaffId === deliveryUserId || o.deliveryStaffId === deliveryUserUid) && o.orderStatus === 'delivered').length;
  const myReturnedCount = (orders || []).filter(o => o && (deliveryUserId || deliveryUserUid) && (o.deliveryStaffId === deliveryUserId || o.deliveryStaffId === deliveryUserUid) && o.orderStatus === 'returned').length;

  const salesNavItems: { id: SalesTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'sales_intelligence', label: 'Sales Intelligence', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { id: 'sales_forecast', label: 'Sales Forecast', icon: <TrendingUp className="w-4 h-4 text-emerald-600" /> },
    { id: 'sales_crm', label: 'Sales CRM & Tasks', icon: <CheckSquare className="w-4 h-4 text-[#0F766E]" /> },
    { id: 'business_alerts', label: 'Business Alerts', icon: <ShieldAlert className="w-4 h-4 text-rose-500" /> },
    { 
      id: 'messages', 
      label: 'HQ Direct Chat', 
      icon: <MessageSquare className="w-4 h-4 text-[#087F7A]" />, 
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined, 
      badgeColor: 'bg-[#087F7A] text-white animate-pulse' 
    },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'products', label: 'Product Catalog', icon: <Package className="w-4 h-4" /> },
    { id: 'create_order', label: 'Create New Order', icon: <PlusCircle className="w-4 h-4 text-[#087F7A]" /> },
    { id: 'my_orders', label: 'My Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'pending_orders', label: 'Pending Orders', icon: <Clock className="w-4 h-4" />, badge: myPendingSalesOrders > 0 ? myPendingSalesOrders : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'expenses', label: 'Expense Claims', icon: <Banknote className="w-4 h-4" /> },
    { id: 'customer_due', label: 'Customer Due', icon: <AlertCircle className="w-4 h-4" />, badge: overdueCustomersCount > 0 ? overdueCustomersCount : undefined, badgeColor: 'bg-red-100 text-red-800' },
    { id: 'sales_history', label: 'Sales History', icon: <History className="w-4 h-4" /> },
    { id: 'sales_summary', label: 'Sales Summary', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'my_salary', label: 'My Salary & Slips', icon: <Calculator className="w-4 h-4 text-[#087F7A]" /> },
  ];

  const deliveryNavItems: { id: DeliveryTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { 
      id: 'messages', 
      label: 'HQ Direct Chat', 
      icon: <MessageSquare className="w-4 h-4 text-[#087F7A]" />, 
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined, 
      badgeColor: 'bg-[#087F7A] text-white animate-pulse' 
    },
    { id: 'assigned_orders', label: 'Assigned Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'today_deliveries', label: "Today's Deliveries", icon: <Truck className="w-4 h-4" />, badge: myPendingDeliveries > 0 ? myPendingDeliveries : undefined, badgeColor: 'bg-teal-100 text-teal-800' },
    { id: 'pending_deliveries', label: 'Pending Deliveries', icon: <Clock className="w-4 h-4" /> },
    { id: 'delivered_orders', label: 'Delivered Orders', icon: <CheckCircle2 className="w-4 h-4" />, badge: myCompletedToday > 0 ? myCompletedToday : undefined, badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'returned_orders', label: 'Returned Orders', icon: <XCircle className="w-4 h-4" />, badge: myReturnedCount > 0 ? myReturnedCount : undefined, badgeColor: 'bg-orange-100 text-orange-800' },
    { id: 'due_collection', label: 'Due Collection', icon: <Banknote className="w-4 h-4" /> },
    { id: 'money_collected', label: 'Money Collected', icon: <Receipt className="w-4 h-4" />, badge: formatBDT(currentDeliveryUser?.cashInHand || 0), badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'collection_history', label: 'Collection History', icon: <History className="w-4 h-4" /> },
    { id: 'my_salary', label: 'My Salary & Slips', icon: <Calculator className="w-4 h-4 text-[#087F7A]" /> },
  ];

  const handleAdminSubItemClick = (sub: AdminSubItem) => {
    setActiveMenuItem(sub.id);
    setAdminTab(sub.tabId);
    onCloseMobile();
  };

  const handleSalesOrDeliveryTabClick = (id: string) => {
    if (role === 'sales') setSalesTab(id as SalesTab);
    else if (role === 'delivery') setDeliveryTab(id as DeliveryTab);
    onCloseMobile();
  };

  const handleLogoutClick = () => {
    logout();
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'Logged out of Glowzaa B2B System.'
    });
    onCloseMobile();
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Filter categories and sub-items based on menuSearchQuery
  const filteredAdminCategories = adminCategories.map(cat => {
    if (!menuSearchQuery.trim()) return cat;
    const query = menuSearchQuery.toLowerCase();
    const matchCat = cat.title.toLowerCase().includes(query);
    const matchingItems = cat.items.filter(item => item.label.toLowerCase().includes(query) || matchCat);
    return {
      ...cat,
      items: matchCat ? cat.items : matchingItems
    };
  }).filter(cat => cat.items.length > 0 || cat.title.toLowerCase().includes(menuSearchQuery.toLowerCase()));

  const activeTabId = role === 'admin' 
    ? adminTab 
    : role === 'sales' 
      ? salesTab 
      : deliveryTab;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-15 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out
        lg:static lg:top-0 lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4">
          
          {/* Active Role Label & Search Menu */}
          <div className="space-y-3">
            <div className="px-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>
                {role === 'admin' ? 'Admin Navigation 2.0' : role === 'sales' ? 'Sales Portal' : 'Delivery Portal'}
              </span>
              <span className={`w-2 h-2 rounded-full ${
                role === 'admin' ? 'bg-[#087F7A]' : role === 'sales' ? 'bg-[#16A085]' : 'bg-[#22A06B]'
              }`}></span>
            </div>

            {role === 'admin' && (
              <div className="relative px-0.5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={menuSearchQuery}
                  onChange={e => setMenuSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#087F7A]"
                />
              </div>
            )}
          </div>

          {/* Quick Actions (Admin Only) */}
          {role === 'admin' && !menuSearchQuery && (
            <div className="px-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 mb-1.5">
                Quick Actions
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-0.5">
                <button
                  onClick={() => handleAdminSubItemClick({ id: 'orders_new', tabId: 'orders', label: 'New Order' })}
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-teal-50 text-[#087F7A] rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> New Order
                </button>
                <button
                  onClick={() => handleAdminSubItemClick({ id: 'products_add', tabId: 'products', label: 'Add New Product' })}
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Product
                </button>
              </div>
            </div>
          )}

          {/* Nav items rendering */}
          {role === 'admin' ? (
            <nav className="space-y-1.5">
              {filteredAdminCategories.map((cat) => {
                const isExpanded = menuSearchQuery.trim() ? true : !!expandedCategories[cat.id];
                // Parent is highlighted ONLY if one of its children contains the unique activeMenuItem
                const hasActiveChild = cat.items.some(item => item.id === activeMenuItem);

                return (
                  <div key={cat.id} className="space-y-0.5">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                        hasActiveChild ? 'bg-teal-50/80 text-[#087F7A]' : 'text-slate-700 hover:bg-slate-50 hover:text-[#087F7A]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-slate-500 group-hover:text-[#087F7A]">
                          {cat.icon}
                        </span>
                        <span className="truncate">{cat.title}</span>
                      </div>
                      <span className="text-slate-400">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="pl-6 space-y-0.5 my-1 border-l-2 border-teal-100 ml-4">
                        {cat.items.map((sub, idx) => {
                          // Strict single leaf active state check
                          const isSubActive = activeMenuItem === sub.id;
                          return (
                            <button
                              key={`${sub.id}-${idx}`}
                              onClick={() => handleAdminSubItemClick(sub)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-[#087F7A] text-white font-bold shadow-xs'
                                  : 'text-slate-600 hover:bg-teal-50/60 hover:text-[#087F7A] font-medium'
                              }`}
                            >
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          ) : (
            <nav className="space-y-1">
              {(role === 'sales' ? salesNavItems : deliveryNavItems).map((item) => {
                const isActive = activeTabId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSalesOrDeliveryTabClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-[#087F7A] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-teal-50/70 hover:text-[#087F7A]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#087F7A]'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md shrink-0 ${
                        isActive ? 'bg-[#075E5B] text-teal-100' : (item.badgeColor || 'bg-slate-100 text-slate-800')
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Quick Context Summary Box */}
          <div className="px-0.5 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Session Context
              </span>
              
              {role === 'admin' && (
                <div>
                  <div className="font-semibold text-[#102A2A]">Glowzaa Central HQ</div>
                  <p className="text-[11px] text-slate-500">{products.length} SKUs • {customers.length} retail shops</p>
                </div>
              )}

              {role === 'sales' && currentSalesUser && (
                <div>
                  <div className="font-semibold text-[#102A2A]">{currentUser?.name || currentSalesUser?.name || 'Sales Officer'}</div>
                  <div className="flex justify-between text-[11px] text-slate-600 mt-1">
                    <span>Target:</span>
                    <span className="font-medium">{formatBDT(currentSalesUser?.monthlyTarget || 0)}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className="bg-[#087F7A] h-full rounded-full" 
                      style={{ width: `${Math.min(100, (((currentSalesUser?.achievedSales || 0) / (currentSalesUser?.monthlyTarget || 1)) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#087F7A] font-semibold mt-1 block">
                    {Math.round(((currentSalesUser?.achievedSales || 0) / (currentSalesUser?.monthlyTarget || 1)) * 100)}% Achieved ({formatBDT(currentSalesUser?.achievedSales || 0)})
                  </span>
                </div>
              )}

              {role === 'delivery' && currentDeliveryUser && (
                <div>
                  <div className="font-semibold text-[#102A2A]">{currentUser?.name || currentDeliveryUser?.name || 'Delivery Courier'}</div>
                  <p className="text-[11px] text-slate-500">{currentDeliveryUser?.vehicleNumber || 'Dhaka-Metro-D-01'} ({currentDeliveryUser?.vehicleType || 'Delivery Van'})</p>
                  <div className="mt-2 pt-1.5 border-t border-slate-200 flex justify-between items-center text-[11px]">
                    <span className="text-slate-600">Cash in Hand:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {formatBDT(currentDeliveryUser?.cashInHand || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                src={currentUser?.photoURL}
                name={currentUser?.name || 'Operator'}
                fallbackInitials={currentUser?.avatar || (role === 'admin' ? 'HQ' : role === 'sales' ? 'MH' : 'RT')}
                size="sm"
                role={currentUser?.role || role}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#102A2A] truncate">
                  {currentUser?.name || 'Operator'}
                </div>
                <div className="text-[10px] text-slate-400 truncate capitalize">
                  {currentUser?.role || role} Role
                </div>
              </div>
            </div>

            <button
              onClick={handleLogoutClick}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[10px] font-medium text-slate-400 text-center">
            Glowzaa B2B • Theme 2 Teal & Emerald
          </div>
        </div>
      </aside>
    </>
  );
};
