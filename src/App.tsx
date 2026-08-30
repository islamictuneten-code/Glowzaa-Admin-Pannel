import React, { useState, Component, ErrorInfo } from 'react';
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

import { LocationGateProvider, useLocationGate } from './context/LocationGateContext';
import { LocationGateScreen } from './components/sales/LocationGateScreen';
import { LocationLostModal } from './components/sales/LocationLostModal';
// Admin Components
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminFieldTrackingView } from './components/admin/AdminFieldTrackingView';
import { AdminProducts } from './components/admin/AdminProducts';
import { AdminCategories } from './components/admin/AdminCategories';
import { AdminInventory } from './components/admin/AdminInventory';
import { AdminCustomers } from './components/admin/AdminCustomers';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminPacking } from './components/admin/AdminPacking';
import { AdminPurchases } from './components/admin/AdminPurchases';
import { PurchaseOrdersDashboard } from './components/admin/procurement/PurchaseOrdersDashboard';
import { GoodsReceivingDashboard } from './components/admin/procurement/GoodsReceivingDashboard';
import { SupplierPerformanceDashboard } from './components/admin/procurement/SupplierPerformanceDashboard';
import { SupplierPriceIntelligenceDashboard } from './components/admin/procurement/SupplierPriceIntelligenceDashboard';
import { SmartProcurementDashboard } from './components/admin/procurement/SmartProcurementDashboard';
import { AdminStaff } from './components/admin/AdminStaff';
import { AdminPayments } from './components/admin/AdminPayments';
import { AdminCustomerDue } from './components/admin/AdminCustomerDue';
import { AdminCollections } from './components/admin/AdminCollections';
import { AdminReports } from './components/admin/AdminReports';
import { AdminInventoryReports } from './components/admin/AdminInventoryReports';
import { AdminProfitLoss } from './components/admin/AdminProfitLoss';
import { AdminExpenses } from './components/admin/AdminExpenses';
import { AdminSettings } from './components/admin/AdminSettings';
import { AdminWarehouses } from './components/admin/AdminWarehouses';
import { AdminPayroll } from './components/admin/AdminPayroll';
import { AdminMessagesView } from './components/admin/AdminMessagesView';
import { SalesIntelligenceDashboard } from './components/admin/SalesIntelligenceDashboard';
import { ExecutiveBIDashboard } from './components/admin/bi/ExecutiveBIDashboard';
import { CashFlowControlCenter } from './components/admin/cashflow/CashFlowControlCenter';
import { SalesForecastDashboard } from './components/admin/SalesForecastDashboard';
import { InventoryIntelligenceDashboard } from './components/admin/InventoryIntelligenceDashboard';
import { BusinessAlertsActionCenter } from './components/admin/BusinessAlertsActionCenter';
import { StaffChatInterface } from './components/communication/StaffChatInterface';
import { MySalaryView } from './components/shared/MySalaryView';

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
        case 'executive_bi':
          return <ExecutiveBIDashboard />;
        case 'cash_flow_center':
          return <CashFlowControlCenter />;
        case 'sales_intelligence':
          return <SalesIntelligenceDashboard />;
        case 'messages':
        case 'notifications':
          return <AdminMessagesView />;
        case 'field_tracking':
          return <AdminFieldTrackingView />;
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
        case 'purchase_orders':
          return <PurchaseOrdersDashboard />;
        case 'goods_receipts':
          return <GoodsReceivingDashboard />;
        case 'supplier_performance':
          return <SupplierPerformanceDashboard />;
        case 'price_intelligence':
          return <SupplierPriceIntelligenceDashboard />;
        case 'smart_procurement':
          return <SmartProcurementDashboard currentUser={currentUser!} />;
        case 'expenses':
          return <AdminExpenses />;
        case 'payroll':
          return <AdminPayroll />;
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
        case 'warehouses':
          return <AdminWarehouses />;
        case 'settings':
          return <AdminSettings />;
        case 'business_alerts':
          return <BusinessAlertsActionCenter />;
        case 'sales_forecast':
          return <SalesForecastDashboard />;
        case 'inventory_intelligence':
          return <InventoryIntelligenceDashboard />;
        default:
          return <AdminOverview />;
      }
    }

    // 2. Sales / Marketing Role Views
    if (role === 'sales') {
      switch (salesTab) {
        case 'dashboard':
          return <SalesOverview />;
        case 'sales_intelligence':
          return <SalesIntelligenceDashboard />;
        case 'sales_forecast':
          return <SalesForecastDashboard />;
        case 'business_alerts':
          return <BusinessAlertsActionCenter />;
        case 'messages':
          return <StaffChatInterface />;
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
        case 'my_salary':
          return <MySalaryView />;
        default:
          return <SalesOverview />;
      }
    }

    // 3. Delivery Man Role Views
    if (role === 'delivery') {
      switch (deliveryTab) {
        case 'dashboard':
          return <DeliveryOverview />;
        case 'messages':
          return <StaffChatInterface />;
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
        case 'my_salary':
          return <MySalaryView />;
        default:
          return <DeliveryOverview />;
      }
    }

    return <AdminOverview />;
  };

  return (
    <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto overflow-y-auto overflow-x-hidden pb-20 sm:pb-20 lg:pb-8">
      {renderContent()}
    </main>
  );
};

const MainAppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { readiness } = useLocationGate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
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
        <ErrorBoundary>
          <DashboardContent />
        </ErrorBoundary>
      </div>

      {/* Fixed Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Real-time Location Lost Modal Overlay */}
      {currentUser?.role === 'sales' && <LocationLostModal />}

      {/* Global Modals & Toast Layer */}
      <InvoiceModal />
      <CustomerDetailModal />
      <ToastContainer />
    </div>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

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
      <LocationGateProvider>
        <MainAppContent />
      </LocationGateProvider>
    </AppProvider>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundary {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState;
  setState(state: Partial<ErrorBoundaryState> | ((prevState: ErrorBoundaryState) => Partial<ErrorBoundaryState>)): void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center space-y-4 bg-white rounded-2xl border border-rose-100 shadow-sm m-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl border border-rose-200">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Dashboard View Recovered</h2>
          <p className="text-xs text-slate-600 max-w-md">
            {this.state.error?.message || 'An unexpected state error occurred in this view module.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-[#087F7A] text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-[#06635f] transition-colors cursor-pointer"
          >
            Refresh Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
