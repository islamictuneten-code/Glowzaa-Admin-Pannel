import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AdminTab, DeliveryTab, SalesTab } from '../../types';
import { UserAvatar } from '../shared/UserAvatar';
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
  XCircle,
  Banknote,
  History,
  ShoppingBag,
  Calculator,
  LogOut,
  ShieldCheck,
  Building2,
  MapPin,
  BellRing
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
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

  // Badges calculation
  const pendingExpensesCount = (expenses || []).filter(e => e && !e.deleted && e.status === 'pending').length;
  const pendingOrdersCount = (orders || []).filter(o => o && (o.orderStatus === 'pending' || o.orderStatus === 'processing')).length;
  const packingOrdersCount = (orders || []).filter(o => o && (o.orderStatus === 'confirmed' || o.orderStatus === 'packing')).length;
  const lowStockCount = (products || []).filter(p => p && (p.status === 'low_stock' || p.status === 'out_of_stock')).length;
  const overdueCustomersCount = (customers || []).filter(c => c && (c.currentDue || 0) > 0).length;
  
  const salesUserId = currentSalesUser?.id || '';
  const deliveryUserId = currentDeliveryUser?.id || '';
  const deliveryUserUid = (currentDeliveryUser as any)?.uid || '';

  const myPendingSalesOrders = (orders || []).filter(o => o && salesUserId && o.salesSellerId === salesUserId && (o.orderStatus === 'pending' || o.orderStatus === 'processing')).length;
  const myPendingDeliveries = (orders || []).filter(o => o && (deliveryUserId || deliveryUserUid) && (o.deliveryStaffId === deliveryUserId || o.deliveryStaffId === deliveryUserUid) && (o.orderStatus === 'dispatched' || o.orderStatus === 'processing')).length;
  const myCompletedToday = (orders || []).filter(o => o && (deliveryUserId || deliveryUserUid) && (o.deliveryStaffId === deliveryUserId || o.deliveryStaffId === deliveryUserUid) && o.orderStatus === 'delivered').length;
  const myReturnedCount = (orders || []).filter(o => o && (deliveryUserId || deliveryUserUid) && (o.deliveryStaffId === deliveryUserId || o.deliveryStaffId === deliveryUserUid) && o.orderStatus === 'returned').length;

  const adminNavItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'notifications', label: 'Push Notifications', icon: <BellRing className="w-4 h-4 text-rose-600" /> },
    { id: 'field_tracking', label: 'Field Sales Tracking', icon: <MapPin className="w-4 h-4 text-[#087F7A]" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <Layers className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Boxes className="w-4 h-4" />, badge: lowStockCount > 0 ? `${lowStockCount} alert` : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" />, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'packing', label: 'Packing / Warehouse', icon: <Boxes className="w-4 h-4" />, badge: packingOrdersCount > 0 ? packingOrdersCount : undefined, badgeColor: 'bg-teal-100 text-teal-800' },
    { id: 'purchases', label: 'Purchase / Stock In', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'expenses', label: 'Operating Expenses', icon: <Banknote className="w-4 h-4" />, badge: pendingExpensesCount > 0 ? pendingExpensesCount : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'payroll', label: 'Staff HR & Payroll', icon: <Calculator className="w-4 h-4 text-[#087F7A]" /> },
    { id: 'staff_management', label: 'Staff / User Accounts', icon: <ShieldCheck className="w-4 h-4 text-[#087F7A]" /> },
    { id: 'sales_staff', label: 'Sales Staff', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'delivery_staff', label: 'Delivery Staff', icon: <Truck className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'customer_due', label: 'Customer Due', icon: <AlertCircle className="w-4 h-4" />, badge: overdueCustomersCount > 0 ? overdueCustomersCount : undefined, badgeColor: 'bg-red-100 text-red-800' },
    { id: 'collections', label: 'Collections', icon: <Receipt className="w-4 h-4" /> },
    { id: 'sales_reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'inventory_reports', label: 'Inventory Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'profit_loss', label: 'Profit & Loss', icon: <Calculator className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'warehouses', label: 'Warehouse Management', icon: <Building2 className="w-4 h-4" /> },
  ];

  const salesNavItems: { id: SalesTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
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

  const handleTabClick = (id: string) => {
    if (role === 'admin') setAdminTab(id as AdminTab);
    else if (role === 'sales') setSalesTab(id as SalesTab);
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

  const currentItems = role === 'admin' 
    ? adminNavItems 
    : role === 'sales' 
      ? salesNavItems 
      : deliveryNavItems;

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
          
          {/* Active Role Label */}
          <div>
            <div className="px-2.5 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>
                {role === 'admin' ? 'Admin Portal' : role === 'sales' ? 'Sales Portal' : 'Delivery Portal'}
              </span>
              <span className={`w-2 h-2 rounded-full ${
                role === 'admin' ? 'bg-[#087F7A]' : role === 'sales' ? 'bg-[#16A085]' : 'bg-[#22A06B]'
              }`}></span>
            </div>

            <nav className="space-y-1">
              {currentItems.map((item) => {
                const isActive = activeTabId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
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
          </div>

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
