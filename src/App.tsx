import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ToastContainer } from './components/shared/ToastContainer';
import { InvoiceModal } from './components/shared/InvoiceModal';
import { CustomerDetailModal } from './components/shared/CustomerDetailModal';
import { LoginPage } from './components/auth/LoginPage';
import { AccessDenied } from './components/auth/AccessDenied';

// Admin Components
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminProducts } from './components/admin/AdminProducts';
import { AdminCategories } from './components/admin/AdminCategories';
import { AdminInventory } from './components/admin/AdminInventory';
import { AdminCustomers } from './components/admin/AdminCustomers';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminPacking } from './components/admin/AdminPacking';
import { AdminPurchases } from './components/admin/AdminPurchases';
import { AdminStaff } from './components/admin/AdminStaff';
import { AdminPayments } from './components/admin/AdminPayments';
import { AdminCustomerDue } from './components/admin/AdminCustomerDue';
import { AdminCollections } from './components/admin/AdminCollections';
import { AdminReports } from './components/admin/AdminReports';
import { AdminInventoryReports } from './components/admin/AdminInventoryReports';
import { AdminProfitLoss } from './components/admin/AdminProfitLoss';
import { AdminExpenses } from './components/admin/AdminExpenses';
import { AdminSettings } from './components/admin/AdminSettings';

// Sales Components
import { SalesOverview } from './components/sales/SalesOverview';
import { SalesNewOrder } from './components/sales/SalesNewOrder';
import { SalesCustomers } from './components/sales/SalesCustomers';
import { SalesProducts } from './components/sales/SalesProducts';
import { SalesMyOrders } from './components/sales/SalesMyOrders';
import { SalesCustomerDue } from './components/sales/SalesCustomerDue';
import { SalesSummary } from './components/sales/SalesSummary';

// Delivery Components
import { DeliveryOverview } from './components/delivery/DeliveryOverview';
import { DeliveryAssignedOrders } from './components/delivery/DeliveryAssignedOrders';
import { DeliveryToday } from './components/delivery/DeliveryToday';
import { DeliveryDelivered } from './components/delivery/DeliveryDelivered';
import { DeliveryPending } from './components/delivery/DeliveryPending';
import { DeliveryDueCollection } from './components/delivery/DeliveryDueCollection';
import { DeliveryMoneyCollected } from './components/delivery/DeliveryMoneyCollected';
import { DeliveryCollectionHistory } from './components/delivery/DeliveryCollectionHistory';

const DashboardContent: React.FC = () => {
  const { role, adminTab, salesTab, deliveryTab } = useApp();
  const { currentUser } = useAuth();

  // Role-Based Access Control Verification
  const renderContent = () => {
    // Check if non-admin user is attempting to access restricted role portals
    if (currentUser) {
      if (currentUser.role === 'sales' && role !== 'sales') {
        return <AccessDenied attemptedResource={role === 'admin' ? 'Admin Central Headquarters' : 'Fleet Delivery Dispatch'} />;
      }
      if (currentUser.role === 'delivery' && role !== 'delivery') {
        return <AccessDenied attemptedResource={role === 'admin' ? 'Admin Central Headquarters' : 'Field Sales & Ordering'} />;
      }
    }

    // 1. Admin Role Views
    if (role === 'admin') {
      switch (adminTab) {
        case 'dashboard':
          return <AdminOverview />;
        case 'products':
          return <AdminProducts />;
        case 'categories':
          return <AdminCategories />;
        case 'inventory':
          return <AdminInventory />;
        case 'customers':
          return <AdminCustomers />;
        case 'orders':
          return <AdminOrders />;
        case 'packing':
          return <AdminPacking />;
        case 'purchases':
          return <AdminPurchases />;
        case 'expenses':
          return <AdminExpenses />;
        case 'staff_management':
        case 'sales_staff':
        case 'delivery_staff':
          return <AdminStaff />;
        case 'payments':
          return <AdminPayments />;
        case 'customer_due':
          return <AdminCustomerDue />;
        case 'collections':
          return <AdminCollections />;
        case 'sales_reports':
          return <AdminReports />;
        case 'inventory_reports':
          return <AdminInventoryReports />;
        case 'profit_loss':
          return <AdminProfitLoss />;
        case 'settings':
          return <AdminSettings />;
        default:
          return <AdminOverview />;
      }
    }

    // 2. Sales / Marketing Role Views
    if (role === 'sales') {
      switch (salesTab) {
        case 'dashboard':
          return <SalesOverview />;
        case 'create_order':
          return <SalesNewOrder />;
        case 'customers':
          return <SalesCustomers />;
        case 'products':
          return <SalesProducts />;
        case 'my_orders':
        case 'pending_orders':
        case 'sales_history':
          return <SalesMyOrders />;
        case 'expenses':
          return <AdminExpenses />;
        case 'customer_due':
          return <SalesCustomerDue />;
        case 'sales_summary':
          return <SalesSummary />;
        default:
          return <SalesOverview />;
      }
    }

    // 3. Delivery Man Role Views
    if (role === 'delivery') {
      switch (deliveryTab) {
        case 'dashboard':
          return <DeliveryOverview />;
        case 'assigned_orders':
          return <DeliveryAssignedOrders />;
        case 'today_deliveries':
          return <DeliveryToday />;
        case 'delivered_orders':
        case 'returned_orders':
          return <DeliveryDelivered />;
        case 'pending_deliveries':
          return <DeliveryPending />;
        case 'due_collection':
          return <DeliveryDueCollection />;
        case 'money_collected':
          return <DeliveryMoneyCollected />;
        case 'expenses':
          return <AdminExpenses />;
        case 'collection_history':
          return <DeliveryCollectionHistory />;
        default:
          return <DeliveryOverview />;
      }
    }

    return <AdminOverview />;
  };

  return (
    <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto overflow-y-auto pb-20 sm:pb-20 lg:pb-8">
      {renderContent()}
    </main>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Show smooth branded splash while Firebase verifies session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#102A2A] text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] flex items-center justify-center text-white shadow-xl shadow-[#087F7A]/30 animate-pulse">
            <span className="font-extrabold text-xl tracking-wider">GZ</span>
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight text-white">GLOWZAA B2B</div>
            <p className="text-xs text-teal-200/80 mt-1">Verifying secure Firebase credentials...</p>
          </div>
          <div className="w-6 h-6 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#F5F8FA] text-[#102A2A] flex flex-col font-sans antialiased selection:bg-[#087F7A] selection:text-white">
        
        {/* Top Header */}
        <Header 
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Responsive Desktop/Tablet Sidebar */}
          <Sidebar 
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Active View Container */}
          <DashboardContent />
        </div>

        {/* Fixed Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Global Modal & Notification Layers */}
        <InvoiceModal />
        <CustomerDetailModal />
        <ToastContainer />
      </div>
    </AppProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
