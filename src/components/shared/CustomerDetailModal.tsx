import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from './Modal';
import { 
  Building2, 
  ShoppingBag, 
  DollarSign, 
  BookOpen, 
  RotateCcw, 
  Navigation, 
  FileText, 
  History,
  X,
  CreditCard,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Customer, Order, Payment, CustomerLedgerEntry, PaymentMethodOption, CustomerVisitOutcome, CustomerVisit } from '../../types';
import { Customer360Header } from '../customer360/Customer360Header';
import { Customer360Kpis } from '../customer360/Customer360Kpis';
import { AdminCreditControlModal } from '../customer360/AdminCreditControlModal';
import { OverviewTab } from '../customer360/tabs/OverviewTab';
import { IntelligenceTab } from '../customer360/tabs/IntelligenceTab';
import { OrdersTab } from '../customer360/tabs/OrdersTab';
import { PaymentsTab } from '../customer360/tabs/PaymentsTab';
import { LedgerTab } from '../customer360/tabs/LedgerTab';
import { ReturnsTab } from '../customer360/tabs/ReturnsTab';
import { VisitsTab } from '../customer360/tabs/VisitsTab';
import { NotesTab } from '../customer360/tabs/NotesTab';
import { ActivityTab } from '../customer360/tabs/ActivityTab';
import { 
  getActiveCustomerVisit, 
  createCustomerVisit, 
  updateCustomerVisit, 
  getOrCreateActiveFieldDutySession,
  createLocationPing
} from '../../services/firestoreService';
import { 
  calculateDistanceMeters, 
  requestCurrentLocation, 
  formatDutyDuration,
  verifyShopGeofence,
  SHOP_CHECKIN_RADIUS_METERS
} from '../../services/locationService';

export const CustomerDetailModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    viewingCustomer, 
    setViewingCustomer, 
    orders, 
    payments,
    visits = [],
    customerLedger,
    recordPayment,
    formatBDT, 
    setViewingOrder, 
    role, 
    setSalesTab,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'payments' | 'ledger' | 'returns' | 'visits' | 'notes' | 'activity'
  >('overview');

  const [isAdminCreditModalOpen, setIsAdminCreditModalOpen] = useState(false);

  // Quick Collect State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethodOption>('bkash');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectRef, setCollectRef] = useState('');
  const [isSubmittingCollect, setIsSubmittingCollect] = useState(false);

  // Shop Visit State for Sales Role
  const [activeVisit, setActiveVisit] = useState<CustomerVisit | null>(null);
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [checkOutOutcome, setCheckOutOutcome] = useState<CustomerVisitOutcome>('order_booked');
  const [checkOutNotes, setCheckOutNotes] = useState('');

  // Synchronize active visit for the sales officer
  useEffect(() => {
    let isMounted = true;
    if (!currentUser || currentUser.role !== 'sales') {
      setActiveVisit(null);
      return;
    }

    const checkVisit = async () => {
      try {
        const visit = await getActiveCustomerVisit(currentUser.uid);
        if (isMounted) {
          setActiveVisit(visit);
        }
      } catch (err) {
        console.warn('Could not fetch active visit:', err);
      }
    };

    checkVisit();
  }, [currentUser, viewingCustomer?.id]);

  // Orders, payments, and ledger filtered specifically for this customer
  const customerOrders = useMemo(() => {
    if (!viewingCustomer) return [];
    return orders.filter(o => o.customerId === viewingCustomer.id);
  }, [orders, viewingCustomer]);

  const customerPayments = useMemo(() => {
    if (!viewingCustomer) return [];
    return payments.filter(p => p.customerId === viewingCustomer.id);
  }, [payments, viewingCustomer]);

  const customerLedgerEntries = useMemo(() => {
    if (!viewingCustomer) return [];
    return customerLedger.filter(l => l.customerId === viewingCustomer.id);
  }, [customerLedger, viewingCustomer]);

  if (!viewingCustomer) return null;

  // Handle Quick Payment Collection submit
  const handleQuickCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(collectAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      addToast({ type: 'warning', title: 'Invalid Amount', message: 'Please enter a valid payment amount.' });
      return;
    }

    setIsSubmittingCollect(true);
    try {
      const isAdvance = numAmount > (viewingCustomer.currentDue || 0);
      const res = await recordPayment({
        customerId: viewingCustomer.id,
        customerName: viewingCustomer.shopName,
        shopName: viewingCustomer.shopName,
        ownerName: viewingCustomer.ownerName,
        phone: viewingCustomer.phone,
        amount: numAmount,
        paymentMethod: collectMethod,
        type: isAdvance ? 'advance' : 'settlement',
        reference: collectRef.trim(),
        notes: collectNotes.trim(),
        paymentDate: new Date().toISOString().split('T')[0]
      });

      if (res.success) {
        setIsCollectModalOpen(false);
        setCollectAmount('');
        setCollectNotes('');
        setCollectRef('');
        addToast({
          type: 'success',
          title: 'Payment Recorded',
          message: `Collected ৳${numAmount.toLocaleString()} via ${collectMethod}. Ledger updated.`
        });
      }
    } finally {
      setIsSubmittingCollect(false);
    }
  };

  // Handle GPS Check-In for on-duty field sales representative
  const handleCheckIn = async () => {
    if (!currentUser || currentUser.role !== 'sales') return;
    setIsCheckInLoading(true);

    try {
      const sessionRes = await getOrCreateActiveFieldDutySession(currentUser);
      if (!sessionRes.success || !sessionRes.session) {
        addToast({
          type: 'error',
          title: 'Duty Required',
          message: sessionRes.error || 'Please start your Field Duty shift before checking in at client shops.'
        });
        return;
      }
      const activeSession = sessionRes.session;

      const geo = await requestCurrentLocation();
      let distanceFromShop: number | null = null;
      let isVerified = false;

      if (viewingCustomer.latitude && viewingCustomer.longitude) {
        distanceFromShop = calculateDistanceMeters(
          geo.coords.latitude,
          geo.coords.longitude,
          viewingCustomer.latitude,
          viewingCustomer.longitude
        );
        isVerified = distanceFromShop <= SHOP_CHECKIN_RADIUS_METERS;
      }

      const res = await createCustomerVisit(currentUser, {
        sessionId: activeSession.id,
        customerId: viewingCustomer.id,
        shopName: viewingCustomer.shopName,
        ownerName: viewingCustomer.ownerName,
        checkInLatitude: geo.coords.latitude,
        checkInLongitude: geo.coords.longitude,
        checkInAccuracyMeters: geo.coords.accuracy,
        distanceFromShopMeters: distanceFromShop,
        isGpsVerified: isVerified
      });

      if (res.success && res.visit) {
        setActiveVisit(res.visit);
        addToast({
          type: 'success',
          title: 'Shop Check-In Successful',
          message: `Checked in at ${viewingCustomer.shopName} (${isVerified ? 'GPS Verified' : 'Standard'}).`
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Check-In Failed',
        message: err.message || 'Could not obtain device GPS coordinates.'
      });
    } finally {
      setIsCheckInLoading(false);
    }
  };

  // Handle Store Check-Out
  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit || !currentUser) return;

    try {
      const geo = await requestCurrentLocation().catch(() => null);
      const res = await updateCustomerVisit(currentUser, activeVisit.id, {
        checkOutLatitude: geo?.coords?.latitude || null,
        checkOutLongitude: geo?.coords?.longitude || null,
        checkOutAccuracyMeters: geo?.coords?.accuracy || null,
        visitOutcome: checkOutOutcome,
        notes: checkOutNotes.trim()
      });

      if (res.success) {
        setActiveVisit(null);
        setIsCheckOutModalOpen(false);
        setCheckOutNotes('');
        addToast({
          type: 'info',
          title: 'Store Visit Completed',
          message: `Visit closed with outcome: ${checkOutOutcome.replace('_', ' ').toUpperCase()}`
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Check-Out Error', message: err.message || 'Failed to complete visit.' });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs">
        <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Top Bar with Close Button */}
          <div className="bg-slate-900 text-white px-5 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
                Glowzaa Customer 360° Workspace
              </span>
            </div>
            <button
              onClick={() => setViewingCustomer(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto">
            {/* Header Identity & Quick Actions */}
            <Customer360Header
              customer={viewingCustomer}
              onOpenCreditModal={() => setIsAdminCreditModalOpen(true)}
              onOpenNewOrder={() => {
                setViewingCustomer(null);
                setSalesTab('new_order');
              }}
              onOpenCollectPayment={() => {
                setCollectAmount(viewingCustomer.currentDue > 0 ? String(viewingCustomer.currentDue) : '');
                setIsCollectModalOpen(true);
              }}
              onOpenAddNote={() => setActiveTab('notes')}
              activeVisitId={activeVisit?.id}
              onCheckIn={handleCheckIn}
              onCheckOut={() => setIsCheckOutModalOpen(true)}
              isCheckingIn={isCheckInLoading}
            />

            {/* Financial & Smart Credit Control KPI Banner */}
            <Customer360Kpis
              customer={viewingCustomer}
              orders={customerOrders}
              payments={customerPayments}
            />

            {/* Tab Navigation */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 sticky top-0 z-10">
              <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2">
                {[
                  { id: 'overview', label: 'Overview', icon: Building2 },
                  { id: 'intelligence', label: 'AI Intelligence', icon: Sparkles },
                  { id: 'orders', label: `Orders (${customerOrders.length})`, icon: ShoppingBag },
                  { id: 'payments', label: `Payments (${customerPayments.length})`, icon: DollarSign },
                  { id: 'ledger', label: `Ledger (${customerLedgerEntries.length})`, icon: BookOpen },
                  { id: 'returns', label: 'Returns', icon: RotateCcw },
                  { id: 'visits', label: 'Field Visits', icon: Navigation },
                  { id: 'notes', label: 'Internal Notes', icon: FileText },
                  { id: 'activity', label: 'Timeline & Audits', icon: History }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-[#0F766E] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-4 sm:p-6 bg-slate-50/40 min-h-[400px]">
              {activeTab === 'overview' && (
                <OverviewTab
                  customer={viewingCustomer}
                  orders={customerOrders}
                  payments={customerPayments}
                  onSelectTab={(tab) => setActiveTab(tab as any)}
                  onViewOrder={(order) => setViewingOrder(order)}
                />
              )}

              {activeTab === 'intelligence' && (
                <IntelligenceTab
                  customer={viewingCustomer}
                  orders={customerOrders}
                  payments={customerPayments}
                  visits={visits}
                />
              )}

              {activeTab === 'orders' && (
                <OrdersTab
                  orders={customerOrders}
                  onViewOrder={(order) => setViewingOrder(order)}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentsTab
                  payments={customerPayments}
                />
              )}

              {activeTab === 'ledger' && (
                <LedgerTab
                  customer={viewingCustomer}
                  ledgerEntries={customerLedgerEntries}
                />
              )}

              {activeTab === 'returns' && (
                <ReturnsTab
                  customer={viewingCustomer}
                  orders={customerOrders}
                  ledgerEntries={customerLedgerEntries}
                  onViewOrder={(order) => setViewingOrder(order)}
                />
              )}

              {activeTab === 'visits' && (
                <VisitsTab
                  customer={viewingCustomer}
                  onCheckIn={handleCheckIn}
                  onCheckOut={() => setIsCheckOutModalOpen(true)}
                  activeVisitId={activeVisit?.id}
                  isCheckingIn={isCheckInLoading}
                />
              )}

              {activeTab === 'notes' && (
                <NotesTab
                  customer={viewingCustomer}
                />
              )}

              {activeTab === 'activity' && (
                <ActivityTab
                  customer={viewingCustomer}
                  orders={customerOrders}
                  payments={customerPayments}
                  ledgerEntries={customerLedgerEntries}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Credit Control Modal */}
      {isAdminCreditModalOpen && (
        <AdminCreditControlModal
          isOpen={isAdminCreditModalOpen}
          onClose={() => setIsAdminCreditModalOpen(false)}
          customer={viewingCustomer}
        />
      )}

      {/* Quick Collect Payment Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
                <p className="text-xs text-slate-500">{viewingCustomer.shopName}</p>
              </div>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCollectSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500 font-medium">Current Outstanding Due</span>
                <span className="font-extrabold text-rose-600 text-sm">{formatBDT(viewingCustomer.currentDue || 0)}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Payment Amount (৳ BDT) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  placeholder="e.g. 25000"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Payment Method *</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                >
                  <option value="cash">Cash on Delivery / Spot Cash</option>
                  <option value="bkash">bKash Merchant / Personal</option>
                  <option value="nagad">Nagad Wallet</option>
                  <option value="bank">Bank Transfer / EFT</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Transaction Ref / Cheque #</label>
                <input
                  type="text"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  placeholder="e.g. TRX93847291 / Cheque 40921"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Collection Notes</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Cleared invoice ORD-2026-1081"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCollect || !collectAmount}
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-lg shadow-sm"
                >
                  {isSubmittingCollect ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Store Visit Modal */}
      {isCheckOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Complete Store Visit</h3>
              <button
                onClick={() => setIsCheckOutModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckOutSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Visit Outcome *</label>
                <select
                  value={checkOutOutcome}
                  onChange={(e) => setCheckOutOutcome(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-[#0F766E] outline-hidden"
                >
                  <option value="order_booked">Order Booked</option>
                  <option value="payment_collected">Payment Collected</option>
                  <option value="follow_up">Follow Up Required</option>
                  <option value="no_sale">No Sale / Stock Sufficient</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Visit Notes</label>
                <textarea
                  rows={3}
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  placeholder="Record customer feedback, competitor products noticed, or next visit commitment..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#0F766E] outline-hidden resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckOutModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm"
                >
                  End Store Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
