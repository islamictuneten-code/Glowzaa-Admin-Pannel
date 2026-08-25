import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from './Modal';
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  Banknote, 
  Calendar, 
  Clock, 
  Receipt,
  ShoppingCart,
  Eye,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Mail,
  FileText,
  MessageSquare,
  ExternalLink,
  Store,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Navigation,
  Check,
  X,
  RefreshCw,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { Badge } from './Badge';
import { PaymentMethodOption, CustomerVisit, CustomerVisitOutcome } from '../../types';
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
  getGoogleMapsUrl,
  validateLocationAccuracy,
  SHOP_CHECKIN_RADIUS_METERS
} from '../../services/locationService';

export const CustomerDetailModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    viewingCustomer, 
    setViewingCustomer, 
    orders, 
    payments,
    customerLedger,
    recordPayment,
    updateCustomer,
    formatBDT, 
    setViewingOrder, 
    role, 
    setSalesTab 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'orders' | 'payments'>('overview');
  
  // Quick Collect State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethodOption>('bkash');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectRef, setCollectRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shop Visit State for Sales Role
  const [activeVisit, setActiveVisit] = useState<CustomerVisit | null>(null);
  const [visitDurationText, setVisitDurationText] = useState<string>('00h 00m');
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [checkOutOutcome, setCheckOutOutcome] = useState<CustomerVisitOutcome>('order_booked');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [checkOutOrderId, setCheckOutOrderId] = useState('');
  const [checkOutPaymentId, setCheckOutPaymentId] = useState('');
  const [visitToast, setVisitToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Shop GPS update state
  const [isUpdatingShopGps, setIsUpdatingShopGps] = useState(false);

  // Fetch active visit on mount or when customer changes
  useEffect(() => {
    let isMounted = true;
    if (!currentUser?.uid) return;

    getActiveCustomerVisit(currentUser.uid)
      .then(visit => {
        if (isMounted) setActiveVisit(visit);
      })
      .catch(err => console.warn('Could not check active visit:', err));

    return () => { isMounted = false; };
  }, [currentUser?.uid, viewingCustomer?.id]);

  // Live timer for active visit
  useEffect(() => {
    if (!activeVisit?.checkInTime || activeVisit.checkOutTime) {
      setVisitDurationText('00h 00m');
      return;
    }
    const updateTimer = () => {
      setVisitDurationText(formatDutyDuration(activeVisit.checkInTime));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeVisit?.checkInTime, activeVisit?.checkOutTime]);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setVisitToast({ type, message });
    setTimeout(() => setVisitToast(null), 5000);
  };

  const handleSetShopGpsFromCurrentLocation = async () => {
    if (!viewingCustomer) return;
    setIsUpdatingShopGps(true);
    try {
      let lat: number | null = null;
      let lon: number | null = null;
      let acc: number | null = null;

      try {
        const pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 8000 });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        acc = pos.coords.accuracy;
      } catch {
        const pos = await requestCurrentLocation({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        acc = pos.coords.accuracy;
      }

      if (lat === null || lon === null) {
        throw new Error('Unable to obtain device latitude and longitude.');
      }

      const updatePayload = {
        latitude: lat,
        longitude: lon,
        locationAccuracyMeters: acc,
        isGpsVerified: true,
        locationCapturedAt: new Date().toISOString(),
        locationCapturedByUserId: currentUser?.uid || 'user'
      };

      await updateCustomer(viewingCustomer.id, updatePayload);
      setViewingCustomer({
        ...viewingCustomer,
        ...updatePayload
      });
      showToast('success', `Shop GPS location saved successfully (${acc ? `±${Math.round(acc)}m` : 'verified'}).`);
    } catch (err: any) {
      console.error('Error saving shop GPS:', err);
      showToast('error', err.message || 'Failed to capture device GPS location.');
    } finally {
      setIsUpdatingShopGps(false);
    }
  };

  const handleShopCheckIn = async () => {
    if (!currentUser || !viewingCustomer) return;
    setIsCheckInLoading(true);
    try {
      // 1. Acquire current location
      let pos: GeolocationPosition | null = null;
      let gpsErrorMsg = '';
      try {
        pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 12000 });
      } catch (gpsErr: any) {
        console.warn('GPS acquire error during check-in:', gpsErr);
        gpsErrorMsg = gpsErr.message || 'Unable to retrieve device GPS.';
      }

      const lat = pos?.coords.latitude ?? null;
      const lon = pos?.coords.longitude ?? null;
      const acc = pos?.coords.accuracy ?? null;

      // 2. Perform Geofence verification
      let isGpsVerified = false;
      let verificationStatus: 'verified' | 'rejected' | 'unverified' = 'unverified';
      let rejectionReason: string | null = null;
      let distanceFromShop: number | null = null;

      if (lat !== null && lon !== null && acc !== null) {
        const geofenceResult = verifyShopGeofence({
          sellerLat: lat,
          sellerLon: lon,
          sellerAccuracy: acc,
          shopLat: viewingCustomer.latitude,
          shopLon: viewingCustomer.longitude,
          radiusMeters: SHOP_CHECKIN_RADIUS_METERS
        });

        distanceFromShop = geofenceResult.distanceMeters;

        if (geofenceResult.isMissingShopGps) {
          isGpsVerified = false;
          verificationStatus = 'unverified';
          rejectionReason = 'Shop has no registered GPS coordinates. Visit recorded as unverified.';
        } else if (geofenceResult.isPoorAccuracy) {
          isGpsVerified = false;
          verificationStatus = 'rejected';
          rejectionReason = `Poor GPS accuracy (±${Math.round(acc)}m > 80m max limit).`;
        } else if (geofenceResult.isTooFar) {
          isGpsVerified = false;
          verificationStatus = 'rejected';
          rejectionReason = `Outside shop geo-fence (${distanceFromShop}m from shop > 100m radius).`;
        } else if (geofenceResult.isVerified) {
          isGpsVerified = true;
          verificationStatus = 'verified';
          rejectionReason = null;
        }
      } else {
        isGpsVerified = false;
        verificationStatus = 'unverified';
        rejectionReason = gpsErrorMsg || 'Device GPS was unavailable at check-in.';
      }

      // 3. Ensure active session exists
      const sessionRes = await getOrCreateActiveFieldDutySession(currentUser, {
        latitude: lat,
        longitude: lon,
        accuracy: acc
      });

      if (!sessionRes.success || !sessionRes.session) {
        showToast('error', sessionRes.error || 'Failed to initialize session for shop visit.');
        return;
      }

      // 4. Create customer visit in Firestore
      const res = await createCustomerVisit(currentUser, {
        sessionId: sessionRes.session.sessionId,
        customerId: viewingCustomer.id,
        shopName: viewingCustomer.shopName,
        ownerName: viewingCustomer.ownerName,
        checkInLatitude: lat,
        checkInLongitude: lon,
        checkInAccuracyMeters: acc,
        distanceFromShopMeters: distanceFromShop,
        isGpsVerified,
        verificationStatus,
        rejectionReason,
        notes: ''
      });

      if (!res.success || !res.visit) {
        showToast('error', res.error || 'Failed to check in to shop.');
        return;
      }

      // 5. Create location ping if GPS was acquired
      if (lat !== null && lon !== null && acc !== null) {
        await createLocationPing(currentUser, {
          sessionId: sessionRes.session.sessionId,
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
        }).catch(() => {});
      }

      setActiveVisit(res.visit);

      if (verificationStatus === 'verified') {
        showToast('success', `✓ Verified Check-in at ${viewingCustomer.shopName} (${distanceFromShop}m away).`);
      } else if (verificationStatus === 'rejected') {
        showToast('warning', `⚠️ Check-in recorded with Geo-fence Alert: ${rejectionReason}`);
      } else {
        showToast('warning', `Check-in recorded (Unverified: ${rejectionReason || 'No shop GPS'}).`);
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      showToast('error', err.message || 'Error checking in to shop.');
    } finally {
      setIsCheckInLoading(false);
    }
  };

  const handleShopCheckOut = async () => {
    if (!currentUser || !activeVisit) return;
    setIsSubmitting(true);
    try {
      let outPos: GeolocationPosition | null = null;
      try {
        outPos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 8000 });
      } catch (e) {}

      const outLat = outPos?.coords.latitude ?? null;
      const outLon = outPos?.coords.longitude ?? null;
      const nowIso = new Date().toISOString();

      let durationMins = 1;
      if (activeVisit.checkInTime) {
        const diffMs = new Date(nowIso).getTime() - new Date(activeVisit.checkInTime).getTime();
        durationMins = Math.max(1, Math.round(diffMs / 60000));
      }

      const res = await updateCustomerVisit(currentUser, activeVisit.id, {
        checkOutLatitude: outLat,
        checkOutLongitude: outLon,
        checkOutTime: nowIso,
        durationMinutes: durationMins,
        visitOutcome: checkOutOutcome,
        notes: checkOutNotes.trim() || null,
        orderId: checkOutOrderId.trim() || null,
        paymentId: checkOutPaymentId.trim() || null
      });

      if (!res.success) {
        showToast('error', res.error || 'Failed to complete checkout.');
        return;
      }

      setActiveVisit(null);
      setIsCheckOutModalOpen(false);
      setCheckOutNotes('');
      setCheckOutOrderId('');
      setCheckOutPaymentId('');
      showToast('success', `Check-out completed for ${activeVisit.shopName} (${durationMins}m).`);
    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast('error', err.message || 'Error checking out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOrders = useMemo(() => {
    if (!viewingCustomer) return [];
    return orders
      .filter(o => o.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.createdDate || b.createdAt || 0).getTime() - new Date(a.createdDate || a.createdAt || 0).getTime());
  }, [orders, viewingCustomer]);

  const customerPayments = useMemo(() => {
    if (!viewingCustomer) return [];
    return payments
      .filter(p => p.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, viewingCustomer]);

  const customerLedgerEntries = useMemo(() => {
    if (!viewingCustomer) return [];
    return customerLedger
      .filter(l => l.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [customerLedger, viewingCustomer]);

  if (!viewingCustomer) return null;

  const cleanPhone = viewingCustomer.phone.replace(/[^0-9]/g, '');
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('880') ? cleanPhone : '880' + cleanPhone.replace(/^0+/, '')}` : null;
  const isLimitExceeded = (viewingCustomer.currentDue || 0) > (viewingCustomer.creditLimit || 100000);

  const handleQuickCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Math.round(Number(collectAmount));
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const isAdvance = numAmount > viewingCustomer.currentDue;
      const res = await recordPayment({
        customerId: viewingCustomer.id,
        customerName: viewingCustomer.shopName,
        amount: numAmount,
        paymentMethod: collectMethod,
        paymentType: isAdvance ? 'advance_payment' : 'due_collection',
        notes: collectNotes.trim() || undefined,
        isAdvance
      });

      if (res.success) {
        setIsCollectModalOpen(false);
        setCollectAmount('');
        setCollectNotes('');
        setCollectRef('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLedgerTypeBadge = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">INVOICE DEBIT</span>;
      case 'PAYMENT':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">PAYMENT CREDIT</span>;
      case 'RETURN':
        return <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200">RETURN CREDIT</span>;
      case 'ADJUSTMENT':
        return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">ADJUSTMENT</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">{type}</span>;
    }
  };

  return (
    <Modal
      isOpen={!!viewingCustomer}
      onClose={() => setViewingCustomer(null)}
      title={viewingCustomer.shopName}
      subtitle={`Proprietor: ${viewingCustomer.ownerName} • ID: ${viewingCustomer.customerId || viewingCustomer.id.slice(0, 8)}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs text-slate-800">
        
        {/* Top Financial Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">Total Purchases</span>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{formatBDT(viewingCustomer.totalPurchase || 0)}</div>
            <span className="text-[10px] text-slate-500">{customerOrders.length} B2B orders</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">Total Collections</span>
            <div className="text-sm sm:text-base font-bold text-emerald-600 mt-0.5">{formatBDT(viewingCustomer.totalPaid || 0)}</div>
            <span className="text-[10px] text-emerald-600">{customerPayments.length} payments</span>
          </div>

          <div className="bg-red-50/50 p-3 rounded-lg border border-red-200">
            <span className="text-[10px] font-bold uppercase text-red-500 block tracking-wider">Current Due</span>
            <div className="text-sm sm:text-base font-extrabold text-red-700 mt-0.5">{formatBDT(viewingCustomer.currentDue || 0)}</div>
            <span className="text-[10px] text-red-600 font-medium">Terms: Net {viewingCustomer.paymentTermDays || 15}d</span>
          </div>

          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200">
            <span className="text-[10px] font-semibold uppercase text-blue-500 block tracking-wider">Advance Credit Held</span>
            <div className="text-sm sm:text-base font-bold text-blue-700 mt-0.5">{formatBDT(viewingCustomer.advanceBalance || 0)}</div>
            <span className="text-[10px] text-blue-600">Pre-paid balance</span>
          </div>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Account Overview
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Ledger Statement ({customerLedgerEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Orders ({customerOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Payment Vouchers ({customerPayments.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5 pb-1 flex-wrap">
            {role === 'sales' && (
              <>
                {activeVisit && activeVisit.customerId === viewingCustomer.id ? (
                  <button
                    onClick={() => setIsCheckOutModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Check Out Visit ({visitDurationText})</span>
                  </button>
                ) : (
                  <button
                    onClick={handleShopCheckIn}
                    disabled={isCheckInLoading || Boolean(activeVisit)}
                    className="px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    title={activeVisit ? `Currently checked in at ${activeVisit.shopName}` : 'Check in to this retail shop for field visit'}
                  >
                    {isCheckInLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5" />
                    )}
                    <span>{isCheckInLoading ? 'Checking In...' : 'Check In (Visit Shop)'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setViewingCustomer(null);
                    setSalesTab('create_order');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Book Order</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                setCollectAmount(viewingCustomer.currentDue > 0 ? String(viewingCustomer.currentDue) : '');
                setIsCollectModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Collect Payment</span>
            </button>
          </div>
        </div>

        {/* Visit Toast Notification */}
        {visitToast && (
          <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between border ${
            visitToast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <div className="flex items-center gap-1.5">
              {visitToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{visitToast.message}</span>
            </div>
            <button onClick={() => setVisitToast(null)} className="p-0.5 hover:opacity-75 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Visit Banner if Checked In to this Shop */}
        {activeVisit && activeVisit.customerId === viewingCustomer.id && (
          <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-950 text-xs">Active Shop Visit In Progress</span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                      activeVisit.verificationStatus === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeVisit.verificationStatus === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {activeVisit.verificationStatus === 'verified' ? '✓ GPS Verified' : activeVisit.verificationStatus === 'rejected' ? '⚠️ Geo-fence Mismatch' : 'Unverified'}
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-800 block mt-0.5">
                    Checked in at {activeVisit.checkInTime ? new Date(activeVisit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'} • Duration: <strong className="font-mono text-teal-950">{visitDurationText}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCheckOutModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#0F766E] hover:bg-[#115E59] text-white font-bold text-xs rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finish & Check Out</span>
              </button>
            </div>

            {/* Visit Verification Sub-details */}
            <div className="pt-2 border-t border-teal-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-teal-900">
              <div className="flex items-center gap-3">
                {activeVisit.distanceFromShopMeters !== null && activeVisit.distanceFromShopMeters !== undefined && (
                  <span>
                    Distance from Shop: <strong className="font-mono font-bold">{activeVisit.distanceFromShopMeters}m</strong>
                  </span>
                )}
                {activeVisit.checkInAccuracyMeters && (
                  <span>
                    GPS Accuracy: <strong className="font-mono">±{Math.round(activeVisit.checkInAccuracyMeters)}m</strong>
                  </span>
                )}
              </div>

              {activeVisit.checkInLatitude && activeVisit.checkInLongitude && (
                <a
                  href={getGoogleMapsUrl(activeVisit.checkInLatitude, activeVisit.checkInLongitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:text-teal-950 underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View Check-in GPS on Map</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-3.5">
            {/* Shop Location & Contact Info */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Shop Location & Address
                </span>
                <p className="font-semibold text-slate-900 text-xs">{viewingCustomer.address}</p>
                <p className="text-slate-600 text-xs mt-0.5">
                  Area / Market: <span className="font-medium text-slate-800">{viewingCustomer.area || 'N/A'}</span>
                </p>
                <p className="text-slate-600 text-xs">
                  District & City: <span className="font-medium text-slate-800">{viewingCustomer.city || viewingCustomer.district}, {viewingCustomer.district}</span>
                </p>
                {viewingCustomer.tradeLicenseNo && (
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Trade Lic / BIN: {viewingCustomer.tradeLicenseNo}
                  </p>
                )}
              </div>

              <div className="sm:border-l sm:border-slate-100 sm:pl-3.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Contact & Sales Officer
                </span>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`tel:${viewingCustomer.phone}`} className="font-bold text-slate-900 hover:text-[#0F766E] underline font-mono">
                      {viewingCustomer.phone}
                    </a>
                  </div>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold inline-flex items-center gap-1 border border-emerald-200 cursor-pointer"
                    >
                      <MessageSquare className="w-2.5 h-2.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                {viewingCustomer.alternatePhone && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-300" />
                    <span className="font-mono text-[11px]">Alt: {viewingCustomer.alternatePhone}</span>
                  </div>
                )}

                {viewingCustomer.email && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px]">{viewingCustomer.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-slate-600 pt-1 border-t border-slate-100">
                  <User className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Assigned Seller: <strong className="text-slate-900">{viewingCustomer.assignedSalesUserName || viewingCustomer.assignedSalesSellerName || 'Unassigned'}</strong></span>
                </div>
              </div>
            </div>

            {/* Shop GPS Geo-fence Coordinates Card (Phase 3) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">Shop GPS Location & Geo-fence</span>
                      {viewingCustomer.latitude && viewingCustomer.longitude ? (
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> GPS Registered
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Not Configured
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">100m auto-verification radius applied to sales staff check-ins</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {viewingCustomer.latitude && viewingCustomer.longitude && (
                    <a
                      href={getGoogleMapsUrl(viewingCustomer.latitude, viewingCustomer.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-semibold text-xs inline-flex items-center gap-1 border border-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open in Maps</span>
                    </a>
                  )}

                  <button
                    onClick={handleSetShopGpsFromCurrentLocation}
                    disabled={isUpdatingShopGps}
                    className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs transition-colors"
                  >
                    {isUpdatingShopGps ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Acquiring GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{viewingCustomer.latitude ? 'Update Location' : 'Capture Current Location'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {viewingCustomer.latitude && viewingCustomer.longitude ? (
                <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-teal-950">
                      {viewingCustomer.latitude.toFixed(6)}, {viewingCustomer.longitude.toFixed(6)}
                    </span>
                    {viewingCustomer.locationAccuracyMeters && (
                      <span className="text-[10px] text-slate-500">
                        Accuracy: ±{Math.round(viewingCustomer.locationAccuracyMeters)}m
                      </span>
                    )}
                  </div>
                  {viewingCustomer.locationCapturedAt && (
                    <span className="text-[10px] text-slate-400">
                      Captured on {new Date(viewingCustomer.locationCapturedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                  ⚠️ No GPS coordinates recorded for this shop yet. Staff visits will be flagged as unverified until coordinates are captured.
                </p>
              )}
            </div>

            {/* Credit Ceiling & Terms */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Credit Limit & Terms</span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  Limit: {formatBDT(viewingCustomer.creditLimit || 0)} • Terms: Net {viewingCustomer.paymentTermDays || 15} Days
                </div>
              </div>
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isLimitExceeded ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isLimitExceeded ? '⚠️ Credit Ceiling Exceeded' : '✓ Good Credit Standing'}
                </span>
              </div>
            </div>

            {/* Merchant Notes */}
            {viewingCustomer.notes && (
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-amber-900">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-700 mb-0.5">Internal Notes</span>
                <p className="text-xs text-amber-900">{viewingCustomer.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Customer Ledger Statement */}
        {activeTab === 'ledger' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs">
                Real-time double-entry transaction record. Running balance updates after each order, payment, return, or adjustment.
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description & Ref #</th>
                    <th className="py-2.5 px-3 text-right">Debit (+Due)</th>
                    <th className="py-2.5 px-3 text-right">Credit (-Due)</th>
                    <th className="py-2.5 px-3 text-right">Running Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerLedgerEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {entry.createdAt ? entry.createdAt.replace('T', ' ').slice(0, 16) : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3">
                        {getLedgerTypeBadge(entry.type)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        <span className="font-medium block">{entry.description}</span>
                        {entry.referenceNumber && (
                          <span className="text-[10px] font-mono text-slate-400">Ref: {entry.referenceNumber}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-600">
                        {entry.debit > 0 ? formatBDT(entry.debit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                        {entry.credit > 0 ? formatBDT(entry.credit) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        {formatBDT(entry.runningBalance !== undefined ? entry.runningBalance : (entry.balanceAfterTransaction || 0))}
                      </td>
                    </tr>
                  ))}

                  {customerLedgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No ledger transactions recorded yet for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Orders History */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Order #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Items</th>
                    <th className="py-2 px-3 text-right">Total Amount</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-center">Payment</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{order.createdDate ? order.createdDate.split(' ')[0] : 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{order.items?.length || 0} items</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatBDT(order.totalAmount || order.grandTotal || 0)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge status={order.orderStatus} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(order.paymentStatus || 'unpaid').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setViewingCustomer(null);
                            setViewingOrder(order);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                          title="View Order Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customerOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No orders recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Payment Vouchers */}
        {activeTab === 'payments' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Voucher #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Method & Trx Ref</th>
                    <th className="py-2 px-3">Collector</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerPayments.map(pmt => (
                    <tr key={pmt.id} className={`hover:bg-slate-50 ${pmt.isReversed ? 'bg-slate-50/50 text-slate-400' : ''}`}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{pmt.paymentNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{pmt.createdAt ? pmt.createdAt.slice(0, 10) : 'N/A'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                          {pmt.paymentMethod}
                        </span>
                        {pmt.referenceNumber && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{pmt.referenceNumber}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{pmt.receivedByName || 'Central Accounts'}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                        <span className={pmt.isReversed ? 'line-through text-slate-400' : ''}>
                          {formatBDT(pmt.amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {pmt.isReversed ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                            REVERSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            VERIFIED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {customerPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No payment vouchers recorded for this customer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Badge status={viewingCustomer.status} size="md" />
            <span className="text-[11px] text-slate-500">
              Payment Terms: Net {viewingCustomer.paymentTermDays || 15} Days
            </span>
          </div>

          <button
            type="button"
            onClick={() => setViewingCustomer(null)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-2xs cursor-pointer"
          >
            Close Profile
          </button>
        </div>

      </div>

      {/* Embedded Quick Collect Modal */}
      {isCollectModalOpen && (
        <Modal
          isOpen={isCollectModalOpen}
          onClose={() => !isSubmitting && setIsCollectModalOpen(false)}
          title={`Collect Payment: ${viewingCustomer.shopName}`}
          subtitle={`Current Due: ${formatBDT(viewingCustomer.currentDue)}`}
          maxWidth="md"
        >
          <form onSubmit={handleQuickCollect} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Collection Amount (৳) *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={collectAmount}
                onChange={e => setCollectAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-base text-emerald-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
              <select
                value={collectMethod}
                onChange={e => setCollectMethod(e.target.value as PaymentMethodOption)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer"
              >
                <option value="cash">Cash on Hand</option>
                <option value="bkash">bKash Merchant</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
                <option value="bank_transfer">Bank Wire</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Transaction Ref / TrxID</label>
              <input
                type="text"
                placeholder="e.g. 8K239103"
                value={collectRef}
                onChange={e => setCollectRef(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Notes</label>
              <input
                type="text"
                placeholder="e.g. Cleared pending invoice balance"
                value={collectNotes}
                onChange={e => setCollectNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCollectModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Post Payment to Ledger</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Embedded Visit Check-Out Outcome Modal */}
      {isCheckOutModalOpen && activeVisit && (
        <Modal
          isOpen={isCheckOutModalOpen}
          onClose={() => !isSubmitting && setIsCheckOutModalOpen(false)}
          title={`Complete Field Visit: ${activeVisit.shopName}`}
          subtitle={`Session Duration: ${visitDurationText} • Checked In at ${activeVisit.checkInTime ? new Date(activeVisit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1.5">
                Select Visit Outcome <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'order_booked' as CustomerVisitOutcome, label: 'Order Booked', icon: ShoppingBag, color: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
                  { id: 'payment_collected' as CustomerVisitOutcome, label: 'Payment Collected', icon: DollarSign, color: 'text-blue-700 border-blue-300 bg-blue-50' },
                  { id: 'no_sale' as CustomerVisitOutcome, label: 'No Sale', icon: X, color: 'text-slate-700 border-slate-300 bg-slate-50' },
                  { id: 'follow_up' as CustomerVisitOutcome, label: 'Follow Up', icon: Clock, color: 'text-amber-700 border-amber-300 bg-amber-50' },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = checkOutOutcome === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCheckOutOutcome(item.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected 
                          ? `${item.color} ring-2 ring-[#0F766E] shadow-2xs font-bold` 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Visit Notes / Feedback</label>
              <textarea
                rows={2}
                value={checkOutNotes}
                onChange={e => setCheckOutNotes(e.target.value)}
                placeholder="e.g. Discussed new bridal palette range, promised sample shipment next week."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 resize-none text-xs"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCheckOutModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleShopCheckOut}
                className="px-5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirm & Complete Check-Out</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
