import React, { useState } from 'react';
import { FieldDutySession, AuthUser } from '../../../types';
import { forceEndFieldDutySession } from '../../../services/firestoreService';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Compass,
  Battery,
  Clock,
  ShoppingBag,
  Receipt,
  Store,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  PowerOff,
  Loader2
} from 'lucide-react';

interface StaffFieldDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: FieldDutySession | null;
  staffUser: AuthUser | null;
  staleStatus: 'live' | 'stale' | 'offline';
  minutesAgo: number;
  formatBDT: (amount: number) => string;
  onOpenRoute: (session: FieldDutySession) => void;
}

export const StaffFieldDetailModal: React.FC<StaffFieldDetailModalProps> = ({
  isOpen,
  onClose,
  session,
  staffUser,
  staleStatus,
  minutesAgo,
  formatBDT,
  onOpenRoute
}) => {
  const { currentUser } = useAuth();
  const { addToast } = useApp();
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isEndingDuty, setIsEndingDuty] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  if (!isOpen || !session) return null;

  const handleCopyCoordinates = () => {
    if (session.lastLatitude && session.lastLongitude) {
      navigator.clipboard.writeText(`${session.lastLatitude}, ${session.lastLongitude}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
      addToast({
        type: 'success',
        title: 'Coordinates Copied',
        message: 'GPS latitude and longitude copied to clipboard.'
      });
    }
  };

  const handleForceEndDuty = async () => {
    if (!currentUser || !session.sessionId) return;
    setIsEndingDuty(true);
    try {
      const res = await forceEndFieldDutySession(currentUser, session.sessionId, 'Admin force-ended field duty session');
      if (res.success) {
        addToast({
          type: 'info',
          title: 'Field Duty Session Ended',
          message: `Admin force-ended active field duty session for ${session.userName}.`
        });
        setShowConfirmEnd(false);
        onClose();
      } else {
        addToast({
          type: 'error',
          title: 'Action Failed',
          message: res.error || 'Failed to force-end session.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'An unexpected error occurred.'
      });
    } finally {
      setIsEndingDuty(false);
    }
  };

  const statusColor =
    staleStatus === 'live'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : staleStatus === 'stale'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  const statusLabel =
    staleStatus === 'live'
      ? '🟢 ON FIELD (LIVE)'
      : staleStatus === 'stale'
      ? '🟠 LOCATION STALE'
      : '🔴 GPS UNAVAILABLE / OFFLINE';

  const startedTimeStr = session.startedAt
    ? new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const lastUpdateStr =
    minutesAgo === 0
      ? 'Just now'
      : minutesAgo < 60
      ? `${minutesAgo} mins ago`
      : `${Math.floor(minutesAgo / 60)}h ${minutesAgo % 60}m ago`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#102A2A] text-white px-3.5 py-3 sm:px-5 sm:py-4 flex items-center justify-between border-b border-teal-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] flex items-center justify-center text-white font-extrabold text-base shadow-md">
              {session.userName ? session.userName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                {session.userName}
              </h3>
              <p className="text-xs text-teal-200/80 mt-0.5">
                Staff ID: <span className="font-mono font-bold text-white">{staffUser?.staffId || session.userLoginId || 'N/A'}</span> · Role: Sales Representative
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Status & Live Telemetry Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${statusColor}`}>
                {statusLabel}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Started at <span className="font-bold text-slate-800">{startedTimeStr}</span>
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last GPS Ping: <b>{lastUpdateStr}</b></span>
            </div>
          </div>

          {/* KPI Performance Grid */}
          <div>
            <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2.5">
              Today's Field Performance
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-bold mb-1">
                  <Store className="w-3.5 h-3.5" />
                  <span>Shop Visits</span>
                </div>
                <div className="text-lg font-extrabold text-purple-900">
                  {session.totalVisitsCompleted || 0}
                </div>
                <div className="text-[10px] text-purple-600 mt-0.5">Shops audited</div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-1.5 text-blue-700 text-xs font-bold mb-1">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Orders Booked</span>
                </div>
                <div className="text-lg font-extrabold text-blue-900">
                  {session.totalOrdersBooked || 0}
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">
                  {formatBDT(session.totalOrdersAmountBDT || 0)}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Collections</span>
                </div>
                <div className="text-lg font-extrabold text-emerald-900">
                  {formatBDT(session.totalPaymentsCollectedBDT || 0)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Cash & Cheques</div>
              </div>

              <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl">
                <div className="flex items-center gap-1.5 text-teal-700 text-xs font-bold mb-1">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Distance</span>
                </div>
                <div className="text-lg font-extrabold text-teal-900">
                  {session.totalDistanceKm ? `${session.totalDistanceKm.toFixed(2)} km` : '0.00 km'}
                </div>
                <div className="text-[10px] text-teal-600 mt-0.5">GPS distance</div>
              </div>
            </div>
          </div>

          {/* GPS Coordinates & Telemetry Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#102A2A] flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#087F7A]" />
                Latest GPS Coordinate Telemetry
              </h4>

              {session.lastLatitude && session.lastLongitude && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCoordinates}
                    className="text-xs font-bold text-slate-600 hover:text-[#087F7A] flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-md border border-slate-200"
                  >
                    {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedCoords ? 'Copied' : 'Copy'}
                  </button>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${session.lastLatitude},${session.lastLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#087F7A] hover:underline flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200"
                  >
                    Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {session.lastLatitude && session.lastLongitude ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">Latitude</span>
                  <span className="font-mono font-bold text-slate-800">{session.lastLatitude.toFixed(6)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">Longitude</span>
                  <span className="font-mono font-bold text-slate-800">{session.lastLongitude.toFixed(6)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">Accuracy Precision</span>
                  <span className="font-bold text-slate-800">
                    {session.gpsAccuracyMeters ? `±${Math.round(session.gpsAccuracyMeters)} meters` : 'N/A'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">Device Battery</span>
                  <span className="font-bold text-slate-800">
                    {session.batteryLevel !== null && session.batteryLevel !== undefined
                      ? `🔋 ${session.batteryLevel}%`
                      : 'Unknown'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 block">Assigned Territory & Area</span>
                  <span className="font-bold text-[#087F7A]">
                    {staffUser?.territory || 'Central'} · {staffUser?.assignedArea || 'Dhaka Metropolitan'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>GPS coordinates have not been received for this session yet.</span>
              </div>
            )}
          </div>

          {/* Assigned Staff Information */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <h4 className="text-xs font-extrabold text-slate-700">Staff Account & Contact Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone: <b>{staffUser?.phone || 'N/A'}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email: <b>{staffUser?.email || 'N/A'}</b></span>
              </div>
              <div>
                Monthly Sales Target: <b>{staffUser?.monthlyTarget ? formatBDT(staffUser.monthlyTarget) : 'N/A'}</b>
              </div>
              <div>
                Commission Rate: <b>{staffUser?.commissionRate ? `${staffUser.commissionRate}%` : '0%'}</b>
              </div>
            </div>
          </div>

          {/* Safety: Admin Force End Duty option */}
          {session.status === 'active' && (
            <div className="border border-rose-200 bg-rose-50/50 p-3.5 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Administrative Duty Override</span>
                </div>
                {!showConfirmEnd && (
                  <button
                    onClick={() => setShowConfirmEnd(true)}
                    className="text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer"
                  >
                    Force End Session
                  </button>
                )}
              </div>

              {showConfirmEnd && (
                <div className="mt-2 pt-2 border-t border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-rose-800 text-xs font-medium">
                    This will end the selected Sales Staff's active field duty session.
                  </p>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setShowConfirmEnd(false)}
                      disabled={isEndingDuty}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleForceEndDuty}
                      disabled={isEndingDuty}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isEndingDuty ? <Loader2 className="w-3 h-3 animate-spin" /> : <PowerOff className="w-3 h-3" />}
                      Confirm End
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenRoute(session);
            }}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
            Inspect Full Route History
          </button>

          <button onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
