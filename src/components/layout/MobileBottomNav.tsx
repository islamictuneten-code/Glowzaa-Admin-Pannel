import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isOrderAssignedToDeliveryUser } from '../../utils/deliveryUtils';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users,
  Truck, 
  Wallet,
  History
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
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
    currentSalesUser,
    currentDeliveryUser
  } = useApp();

  const { currentUser } = useAuth();

  // Badges & Counters
  const pendingOrdersCount = (orders || []).filter(o => o && (o.orderStatus === 'pending' || o.orderStatus === 'processing')).length;
  const lowStockCount = (products || []).filter(p => p && (p.status === 'low_stock' || p.status === 'out_of_stock')).length;
  
  const salesUserId = currentSalesUser?.id || '';

  const myPendingSalesOrders = (orders || []).filter(
    o => o && salesUserId && o.salesSellerId === salesUserId && (o.orderStatus === 'pending' || o.orderStatus === 'processing')
  ).length;
  const myPendingDeliveries = (orders || []).filter(
    o => o && isOrderAssignedToDeliveryUser(o, currentDeliveryUser, currentUser) && o.deliveryStatus !== 'delivered' && o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled'
  ).length;

  // Role-specific 4-item navigation menu configurations
  const getRoleNavItems = () => {
    if (role === 'admin') {
      return [
        {
          id: 'admin-dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          isActive: adminTab === 'dashboard',
          onClick: () => setAdminTab('dashboard'),
          badge: undefined
        },
        {
          id: 'admin-orders',
          label: 'Orders',
          icon: Receipt,
          isActive: adminTab === 'orders' || adminTab === 'packing',
          onClick: () => setAdminTab('orders'),
          badge: pendingOrdersCount > 0 ? (pendingOrdersCount > 9 ? '9+' : pendingOrdersCount) : undefined,
          badgeColor: 'bg-amber-400 text-slate-950 font-extrabold'
        },
        {
          id: 'admin-customers',
          label: 'Customers',
          icon: Users,
          isActive: adminTab === 'customers' || adminTab === 'customer_due',
          onClick: () => setAdminTab('customers'),
          badge: undefined
        },
        {
          id: 'admin-products',
          label: 'Products',
          icon: Package,
          isActive: adminTab === 'products' || adminTab === 'categories' || adminTab === 'inventory',
          onClick: () => setAdminTab('products'),
          badge: lowStockCount > 0 ? '!' : undefined,
          badgeColor: 'bg-rose-500 text-white font-bold'
        }
      ];
    }

    if (role === 'sales') {
      return [
        {
          id: 'sales-dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          isActive: salesTab === 'dashboard',
          onClick: () => setSalesTab('dashboard'),
          badge: undefined
        },
        {
          id: 'sales-orders',
          label: 'Orders',
          icon: Receipt,
          isActive: salesTab === 'my_orders' || salesTab === 'create_order' || salesTab === 'pending_orders' || salesTab === 'sales_history',
          onClick: () => setSalesTab('my_orders'),
          badge: myPendingSalesOrders > 0 ? (myPendingSalesOrders > 9 ? '9+' : myPendingSalesOrders) : undefined,
          badgeColor: 'bg-amber-400 text-slate-950 font-extrabold'
        },
        {
          id: 'sales-customers',
          label: 'Customers',
          icon: Users,
          isActive: salesTab === 'customers' || salesTab === 'customer_due',
          onClick: () => setSalesTab('customers'),
          badge: undefined
        },
        {
          id: 'sales-products',
          label: 'Products',
          icon: Package,
          isActive: salesTab === 'products',
          onClick: () => setSalesTab('products'),
          badge: undefined
        }
      ];
    }

    // Role === 'delivery'
    return [
      {
        id: 'delivery-dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        isActive: deliveryTab === 'dashboard',
        onClick: () => setDeliveryTab('dashboard'),
        badge: undefined
      },
      {
        id: 'delivery-assigned',
        label: 'Assigned Orders',
        icon: Truck,
        isActive: deliveryTab === 'assigned_orders' || deliveryTab === 'today_deliveries' || deliveryTab === 'pending_deliveries',
        onClick: () => setDeliveryTab('assigned_orders'),
        badge: myPendingDeliveries > 0 ? (myPendingDeliveries > 9 ? '9+' : myPendingDeliveries) : undefined,
        badgeColor: 'bg-amber-400 text-slate-950 font-extrabold'
      },
      {
        id: 'delivery-money',
        label: 'Money Collected',
        icon: Wallet,
        isActive: deliveryTab === 'money_collected' || deliveryTab === 'due_collection',
        onClick: () => setDeliveryTab('money_collected'),
        badge: undefined
      },
      {
        id: 'delivery-history',
        label: 'Delivery History',
        icon: History,
        isActive: deliveryTab === 'collection_history' || deliveryTab === 'delivered_orders' || deliveryTab === 'returned_orders',
        onClick: () => setDeliveryTab('collection_history'),
        badge: undefined
      }
    ];
  };

  const navItems = getRoleNavItems();

  return (
    <nav
      id="glowzaa-mobile-bottom-nav"
      className="fixed bottom-2.5 left-3 right-3 z-50 max-w-lg mx-auto lg:hidden select-none"
      aria-label="Mobile Navigation"
    >
      <div className="bg-[#087F7A]/95 backdrop-blur-md rounded-2xl border border-teal-400/25 shadow-[0_8px_25px_rgba(8,127,122,0.35),0_4px_10px_rgba(0,0,0,0.15)] px-1 py-1">
        <div className="grid grid-cols-4 h-[46px] w-full items-center">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={item.onClick}
                className={`relative flex flex-col items-center justify-center h-full w-full py-0.5 transition-all duration-200 cursor-pointer active:scale-90 ${
                  item.isActive
                    ? 'text-white'
                    : 'text-teal-100/75 hover:text-white'
                }`}
              >
                <div
                  className={`flex items-center justify-center px-2.5 py-0.5 rounded-lg transition-all duration-200 relative ${
                    item.isActive
                      ? 'bg-white/20 text-white shadow-2xs'
                      : 'bg-transparent'
                  }`}
                >
                  {item.id.includes('orders') ? (
                    <span className="w-[18px] h-[18px] flex items-center justify-center text-sm font-bold">৳</span>
                  ) : (
                    <IconComponent className="w-[18px] h-[18px] shrink-0" />
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`absolute -top-1 -right-1 text-[8px] min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center ring-1 ring-[#087F7A] ${
                        item.badgeColor || 'bg-amber-400 text-slate-950 font-extrabold'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 leading-tight whitespace-nowrap overflow-hidden text-ellipsis px-0.5 max-w-full ${
                    item.isActive
                      ? 'font-bold text-white scale-102'
                      : 'font-medium text-teal-100/80'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

