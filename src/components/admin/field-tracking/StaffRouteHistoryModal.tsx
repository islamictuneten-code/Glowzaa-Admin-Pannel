import React, { useState, useEffect } from 'react';
import { FieldDutySession, GpsLocationPing, CustomerVisit, AuthUser } from '../../../types';
import { getFieldLocationPingsForSession, getCustomerVisitsForSession } from '../../../services/firestoreService';
import { AdminFieldTrackingMap } from './AdminFieldTrackingMap';
import {
  X,
  Navigation,
  MapPin,
  Clock,
  Battery,
  ShoppingBag,
  Receipt,
  Store,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface StaffRouteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: FieldDutySession | null;
  staffUser?: AuthUser | null;
  formatBDT: (amount: number) => string;
}

export const StaffRouteHistoryModal: React.FC<StaffRouteHistoryModalProps> = ({
  isOpen,
  onClose,
  session,
  staffUser,
  formatBDT
}) => {
  const [pings, setPings] = useState<GpsLocationPing[]>([]);
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'timeline' | 'visits'>('map');

  useEffect(() => {
    if (!isOpen || !session?.sessionId) {
      setPings([]);
      setVisits([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadRouteData = async () => {
      try {
        const [loadedPings, loadedVisits] = await Promise.all([
          getFieldLocationPingsForSession(session.sessionId),
          getCustomerVisitsForSession(session.sessionId)
        ]);

        if (isMounted) {
          setPings(loadedPings);
          setVisits(loadedVisits);
        }
      } catch (err) {
        console.error('Error loading session route history:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRouteData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, session?.sessionId]);

  if (!isOpen || !session) return null;

  const dutyStartTime = session.startedAt
    ? new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';
  const dutyEndTime = session.endedAt
    ? new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : session.status === 'active'
    ? 'In Progress (Active)'
    : 'Ended';

  const dutyDate = session.startedAt
    ? new Date(session.startedAt).toLocaleDateString([], {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Today';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-[#102A2A] text-white px-3.5 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-teal-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Staff Route & Travel Trace
                </h3>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    session.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {session.status === 'active' ? '🟢 ON FIELD' : '⚪ DUTY ENDED'}
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                {session.userName} ({session.userLoginId || 'Sales Staff'}) · {dutyDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Telemetry Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Duty Hours</span>
            <span className="font-extrabold text-[#102A2A] text-sm">
              {dutyStartTime} → {dutyEndTime}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Distance Traversed</span>
            <span className="font-extrabold text-[#087F7A] text-sm">
              {session.totalDistanceKm ? `${session.totalDistanceKm.toFixed(2)} km` : '0.00 km'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">GPS Points Logged</span>
            <span className="font-extrabold text-[#102A2A] text-sm">{pings.length} pings</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Shops Visited</span>
            <span className="font-extrabold text-purple-700 text-sm">
              {session.totalVisitsCompleted || visits.length} shops
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Orders Booked</span>
            <span className="font-extrabold text-blue-700 text-sm">
              {session.totalOrdersBooked || 0} ({formatBDT(session.totalOrdersAmountBDT || 0)})
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Collected</span>
            <span className="font-extrabold text-emerald-700 text-sm">
              {formatBDT(session.totalPaymentsCollectedBDT || 0)}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('map')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'map'
                  ? 'border-[#087F7A] text-[#087F7A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Route Map View
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-[#087F7A] text-[#087F7A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              GPS Breadcrumb Log ({pings.length})
            </button>

            <button
              onClick={() => setActiveTab('visits')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'visits'
                  ? 'border-[#087F7A] text-[#087F7A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Customer Visits ({visits.length})
            </button>
          </div>

          {session.lastLatitude && session.lastLongitude && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${session.lastLatitude},${session.lastLongitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#087F7A] hover:underline flex items-center gap-1 pb-2.5"
            >
              Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[350px]">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#087F7A]" />
              <p className="text-xs font-semibold">Reconstructing GPS route and location logs...</p>
            </div>
          ) : activeTab === 'map' ? (
            <div className="h-[440px] sm:h-[500px] w-full">
              {pings.length === 0 && !session.lastLatitude ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mb-3">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No GPS Points Logged Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    This staff session has not transmitted coordinates or GPS pings yet. Points will plot automatically as staff travels.
                  </p>
                </div>
              ) : (
                <AdminFieldTrackingMap
                  staffList={[]}
                  isRouteMode={true}
                  routePings={pings}
                  routeVisits={visits}
                  routeSession={session}
                />
              )}
            </div>
          ) : activeTab === 'timeline' ? (
            <div className="space-y-3">
              {pings.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No GPS breadcrumb records found.</p>
              ) : (
                <div className="glowzaa-table-container">
                  <table className="glowzaa-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Timestamp</th>
                        <th>Latitude / Longitude</th>
                        <th>Accuracy</th>
                        <th>Speed</th>
                        <th>Battery</th>
                        <th>Connection</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pings.map((ping, idx) => (
                        <tr key={ping.id || idx}>
                          <td className="font-bold text-slate-400">#{idx + 1}</td>
                          <td className="font-semibold text-[#102A2A]">
                            {ping.timestamp
                              ? new Date(ping.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })
                              : 'N/A'}
                          </td>
                          <td className="font-mono text-xs text-slate-700">
                            {ping.latitude.toFixed(6)}, {ping.longitude.toFixed(6)}
                          </td>
                          <td>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                ping.accuracy <= 20
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ping.accuracy <= 50
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              ±{Math.round(ping.accuracy)}m
                            </span>
                          </td>
                          <td className="text-slate-600">
                            {ping.speed !== null && ping.speed !== undefined
                              ? `${(ping.speed * 3.6).toFixed(1)} km/h`
                              : '—'}
                          </td>
                          <td>
                            {ping.batteryLevel !== null && ping.batteryLevel !== undefined ? (
                              <span className="font-semibold text-slate-700">
                                🔋 {ping.batteryLevel}% {ping.isCharging ? '⚡' : ''}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                ping.networkOnline !== false
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {ping.networkOnline !== false ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${ping.latitude},${ping.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[#087F7A] hover:underline"
                            >
                              View Point ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visits.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Store className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold">No shop visits recorded during this session.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visits.map((visit, vIdx) => (
                    <div
                      key={visit.id || vIdx}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-[#087F7A]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold flex items-center justify-center">
                              {vIdx + 1}
                            </span>
                            <h4 className="font-extrabold text-sm text-[#102A2A]">{visit.shopName}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Proprietor: {visit.ownerName || 'N/A'}</p>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            visit.visitOutcome === 'Order Placed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : visit.visitOutcome === 'Payment Collected'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {visit.visitOutcome || (visit.checkOutTime ? 'Visit Completed' : 'In Progress')}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">Check In</span>
                          <span className="font-semibold text-slate-800">
                            {visit.checkInTime
                              ? new Date(visit.checkInTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">Check Out</span>
                          <span className="font-semibold text-slate-800">
                            {visit.checkOutTime
                              ? new Date(visit.checkOutTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Ongoing (Not checked out)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">Duration</span>
                          <span className="font-semibold text-purple-700">
                            {visit.durationMinutes !== null && visit.durationMinutes !== undefined
                              ? `${visit.durationMinutes} mins`
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">GPS Verification</span>
                          <span className="font-semibold text-slate-700">
                            {visit.distanceFromShopMeters !== null && visit.distanceFromShopMeters !== undefined
                              ? `±${Math.round(visit.distanceFromShopMeters)}m from shop`
                              : 'Standard GPS'}
                          </span>
                        </div>
                      </div>

                      {visit.notes && (
                        <p className="text-xs text-slate-600 mt-2 bg-amber-50/60 p-2 rounded-md border border-amber-100 italic">
                          "{visit.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Session ID: <span className="font-mono text-slate-700 font-bold">{session.sessionId}</span>
          </div>
          <button onClick={onClose} className="btn-secondary text-xs">
            Close Route Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
