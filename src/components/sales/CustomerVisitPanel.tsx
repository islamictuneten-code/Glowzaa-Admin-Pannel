import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  Customer, 
  CustomerVisit, 
  FieldDutySession 
} from '../../types';
import { 
  getActiveFieldDutySession, 
  getCustomerVisitsForSession, 
  updateCustomerGpsLocation 
} from '../../services/firestoreService';
import { 
  calculateDistanceMeters, 
  requestCurrentLocation, 
  evaluateGpsQuality, 
  formatDutyDuration 
} from '../../services/locationService';
import { 
  Store, 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Phone, 
  RefreshCw, 
  Check, 
  X, 
  Info, 
  ShieldCheck, 
  History,
  Tag
} from 'lucide-react';

export const CustomerVisitPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    customers, 
    orders, 
    payments, 
    currentSalesUser, 
    formatBDT 
  } = useApp();

  // Active Session & Visit State
  const [activeSession, setActiveSession] = useState<FieldDutySession | null>(null);
  const [todayVisits, setTodayVisits] = useState<CustomerVisit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // GPS State for Setting Shop Location
  const [currentGps, setCurrentGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState<boolean>(false);
  const [showGpsVerifyModal, setShowGpsVerifyModal] = useState<boolean>(false);
  const [isSettingGps, setIsSettingGps] = useState<boolean>(false);

  // Filter assigned customers
  const assignedCustomers = useMemo(() => {
    const staffId = currentSalesUser?.id || currentUser?.staffId || '';
    const userUid = currentUser?.uid || '';
    const userEmail = (currentUser?.email || currentSalesUser?.email || '').toLowerCase();
    const userName = (currentUser?.name || currentSalesUser?.name || '').toLowerCase();

    return customers.filter(c => {
      const isUnassigned = !c.assignedSalesUserId || c.assignedSalesUserId === 'Unassigned' || !c.assignedSalesSellerId;
      if (isUnassigned) return true;

      return (
        (staffId && (c.assignedSalesUserId === staffId || c.assignedSalesSellerId === staffId)) ||
        (userUid && (c.assignedSalesUserId === userUid || c.assignedSalesSellerId === userUid)) ||
        (userEmail && c.assignedSalesUserId && c.assignedSalesUserId.toLowerCase() === userEmail) ||
        (userName && c.assignedSalesUserName && c.assignedSalesUserName.toLowerCase() === userName)
      );
    });
  }, [customers, currentSalesUser, currentUser]);

  // Search filtered customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return assignedCustomers;
    return assignedCustomers.filter(c => 
      (c.shopName || '').toLowerCase().includes(q) ||
      (c.ownerName || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.area || '').toLowerCase().includes(q)
    );
  }, [assignedCustomers, searchQuery]);

  // Refresh active session & today's visits
  const refreshVisitState = async () => {
    if (!currentUser?.uid) return;
    try {
      const session = await getActiveFieldDutySession(currentUser.uid);
      setActiveSession(session);

      if (session?.sessionId) {
        const visits = await getCustomerVisitsForSession(session.sessionId);
        setTodayVisits(visits);
      } else {
        setTodayVisits([]);
      }
    } catch (err) {
      console.error('Error loading visits:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setIsLoading(true);
      await refreshVisitState();
      if (isMounted) setIsLoading(false);
    };
    init();
    return () => { isMounted = false; };
  }, [currentUser?.uid]);

  // Acquire current GPS position
  const acquireGps = async () => {
    setIsAcquiringGps(true);
    try {
      const pos = await requestCurrentLocation({ enableHighAccuracy: true, timeout: 10000 });
      setCurrentGps({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
    } catch (err: any) {
      console.warn('Could not acquire GPS:', err.message);
    } finally {
      setIsAcquiringGps(false);
    }
  };

  useEffect(() => {
    acquireGps();
  }, []);

  // Save/Update Shop GPS Location (The ONLY setup action Sales Staff performs)
  const handleConfirmSetShopGps = async () => {
    if (!currentUser || !selectedCustomer || !currentGps) return;
    setIsSettingGps(true);
    setErrorMessage(null);

    try {
      const res = await updateCustomerGpsLocation(
        currentUser,
        selectedCustomer.id,
        currentGps.latitude,
        currentGps.longitude
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update shop GPS location.');
        return;
      }

      setSelectedCustomer(prev => prev ? {
        ...prev,
        latitude: currentGps.latitude,
        longitude: currentGps.longitude,
        isGpsVerified: true
      } : null);

      setShowGpsVerifyModal(false);
      setSuccessMessage(`GPS location saved for ${selectedCustomer.shopName}. Visits will be automatically detected!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating shop GPS coordinates.');
    } finally {
      setIsSettingGps(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#087F7A]">Automated Field System</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
              GPS Geofence Enabled
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Automatic Shop Visit Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shop visits are automatically detected when you arrive within 100 meters of registered shop coordinates.
          </p>
        </div>

        <button
          onClick={refreshVisitState}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Visits</span>
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Assigned Shops & GPS Setup */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#087F7A]" />
                <span>Assigned Retail Shops ({assignedCustomers.length})</span>
              </h2>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shop name, area..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#087F7A]"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No shops found.
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasGps = Boolean(cust.latitude && cust.longitude);
                  const isSelected = selectedCustomer?.id === cust.id;

                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className={`p-3 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-between gap-3 my-1 ${
                        isSelected
                          ? 'bg-teal-50/60 border border-teal-200'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">{cust.shopName}</span>
                          {hasGps ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              GPS Configured
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                              Needs GPS Setup
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 truncate">{cust.ownerName} • {cust.area || 'Territory'}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!hasGps && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(cust);
                              setShowGpsVerifyModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-[#087F7A] text-white rounded hover:bg-[#06635f] transition-colors shadow-2xs cursor-pointer"
                          >
                            Set Shop GPS
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Today's Automatically Detected Visits */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-[#087F7A]" />
                <span>Today's Detected Visits</span>
              </h2>
              <span className="text-xs font-bold bg-teal-50 text-[#087F7A] px-2 py-0.5 rounded-full border border-teal-200">
                {todayVisits.length} Visits
              </span>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {todayVisits.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Navigation className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">No shop visits detected yet today.</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Visits will appear automatically when you approach saved shop locations with field tracking active.
                  </p>
                </div>
              ) : (
                todayVisits.map((visit) => {
                  const arrTime = visit.checkInTime ? new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                  const depTime = visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress';
                  const isOngoing = !visit.checkOutTime;

                  return (
                    <div key={visit.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{visit.shopName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOngoing ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isOngoing ? '🟢 At Shop' : '✓ Completed'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Arrival</span>
                          <span className="font-semibold text-slate-800">{arrTime}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Departure</span>
                          <span className="font-semibold text-slate-800">{depTime}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Duration</span>
                          <span className="font-semibold text-[#087F7A]">
                            {visit.durationMinutes !== null && visit.durationMinutes !== undefined ? `${visit.durationMinutes} min` : 'Dwell active'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          GPS Verified ({visit.distanceFromShopMeters || 0}m away)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Capture Shop GPS Location */}
      {showGpsVerifyModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#087F7A]" />
                <span>Save Shop GPS Location</span>
              </h3>
              <button onClick={() => setShowGpsVerifyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                You are capturing device GPS coordinates for <b>{selectedCustomer.shopName}</b> ({selectedCustomer.ownerName}).
              </p>

              {currentGps ? (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg space-y-1 text-emerald-900">
                  <div className="flex items-center justify-between font-bold">
                    <span>Captured Coordinates:</span>
                    <span>±{Math.round(currentGps.accuracy)}m Accuracy</span>
                  </div>
                  <p className="font-mono text-[11px]">
                    Lat: {currentGps.latitude.toFixed(6)}, Lon: {currentGps.longitude.toFixed(6)}
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-center">
                  {isAcquiringGps ? 'Acquiring device GPS location...' : 'GPS position unavailable. Please enable device location.'}
                </div>
              )}

              <p className="text-slate-500 text-[11px]">
                Note: Stand directly in front of the retail shop when capturing coordinates for precise automatic visit detection.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowGpsVerifyModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!currentGps || isSettingGps}
                onClick={handleConfirmSetShopGps}
                className="px-4 py-1.5 rounded-lg bg-[#087F7A] hover:bg-[#06635f] text-white text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isSettingGps ? 'Saving...' : 'Save Shop Coordinates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
