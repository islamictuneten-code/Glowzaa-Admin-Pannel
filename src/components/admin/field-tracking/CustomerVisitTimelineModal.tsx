import React, { useState, useEffect } from 'react';
import { CustomerVisit } from '../../../types';
import { getCustomerVisitsForDateRange } from '../../../services/firestoreService';
import {
  X,
  Store,
  Clock,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  Receipt,
  User,
  ExternalLink,
  Loader2,
  Compass
} from 'lucide-react';

interface CustomerVisitTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserId?: string;
  selectedDate?: string;
  formatBDT: (amount: number) => string;
}

export const CustomerVisitTimelineModal: React.FC<CustomerVisitTimelineModalProps> = ({
  isOpen,
  onClose,
  selectedUserId,
  selectedDate,
  formatBDT
}) => {
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    // Default to start and end of selected date or today
    const targetDate = selectedDate ? new Date(selectedDate) : new Date();
    const startIso = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0).toISOString();
    const endIso = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59).toISOString();

    const loadVisits = async () => {
      try {
        const data = await getCustomerVisitsForDateRange(startIso, endIso, selectedUserId);
        if (isMounted) {
          setVisits(data);
        }
      } catch (err) {
        console.error('Error loading customer visits:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadVisits();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedUserId, selectedDate]);

  if (!isOpen) return null;

  const filteredVisits = visits.filter((v) => {
    const matchesSearch =
      searchTerm === '' ||
      v.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOutcome =
      outcomeFilter === 'all' ||
      v.visitOutcome === outcomeFilter ||
      (v.visitOutcome || '').toLowerCase().replace(/_/g, ' ') === outcomeFilter.toLowerCase().replace(/_/g, ' ');

    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#102A2A] text-white px-3.5 py-3 sm:px-5 sm:py-4 flex items-center justify-between border-b border-teal-900/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                Customer Shop Visit Timeline & Audit
              </h3>
              <p className="text-xs text-teal-200/80 mt-0.5">
                Verified check-in and check-out logs for field sales compliance
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

        {/* Filter bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shop, owner, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glowzaa-input pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="glowzaa-input text-xs w-full sm:w-48"
            >
              <option value="all">All Outcomes</option>
              <option value="Order Placed">Order Placed</option>
              <option value="Payment Collected">Payment Collected</option>
              <option value="Meeting Held">Meeting Held</option>
              <option value="Follow-up Required">Follow-up Required</option>
              <option value="Shop Closed">Shop Closed</option>
              <option value="Owner Not Available">Owner Not Available</option>
            </select>

            <span className="text-xs font-bold text-slate-500 shrink-0">
              {filteredVisits.length} visits
            </span>
          </div>
        </div>

        {/* Timeline list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-[#087F7A]" />
              <p className="text-xs font-semibold">Loading customer visit logs...</p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Store className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No Customer Visits Found</h4>
              <p className="text-xs text-slate-400 mt-1">No shop visits match the selected filters or date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVisits.map((visit, idx) => {
                const checkInStr = visit.checkInTime
                  ? new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'N/A';
                const checkOutStr = visit.checkOutTime
                  ? new Date(visit.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'In Progress';

                return (
                  <div
                    key={visit.id || idx}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-[#087F7A]/40 transition-all flex flex-col sm:flex-row gap-4 justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        #{idx + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-sm text-[#102A2A]">{visit.shopName}</h4>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              visit.visitOutcome === 'Order Placed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : visit.visitOutcome === 'Payment Collected'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {visit.visitOutcome || (visit.checkOutTime ? 'Completed' : 'Active Shop Visit')}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              visit.verificationStatus === 'verified' || visit.isGpsVerified
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : visit.verificationStatus === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {visit.verificationStatus === 'verified' || visit.isGpsVerified
                              ? '✓ GPS Verified'
                              : visit.verificationStatus === 'rejected'
                              ? '⚠️ Geo-fence Mismatch'
                              : 'Unverified Visit'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Owner: <b>{visit.ownerName || 'N/A'}</b></span>
                          <span>Staff: <b className="text-[#087F7A]">{visit.userName || 'Sales Staff'}</b></span>
                        </div>

                        {visit.rejectionReason && (
                          <p className="text-[11px] text-rose-700 bg-rose-50/80 p-1.5 rounded-md border border-rose-100 font-medium">
                            Alert: {visit.rejectionReason}
                          </p>
                        )}

                        {visit.notes && (
                          <p className="text-xs text-slate-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100 italic mt-1">
                            "{visit.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 gap-1.5 shrink-0 text-xs">
                      <div className="text-slate-700 font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{checkInStr} → {checkOutStr}</span>
                      </div>

                      <div className="text-purple-700 font-semibold">
                        {visit.durationMinutes !== null && visit.durationMinutes !== undefined
                          ? `⏱️ ${visit.durationMinutes} mins`
                          : 'Ongoing Visit'}
                      </div>

                      {visit.distanceFromShopMeters !== null && visit.distanceFromShopMeters !== undefined && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Compass className="w-3 h-3 text-[#087F7A]" />
                          <span>±{Math.round(visit.distanceFromShopMeters)}m from shop</span>
                        </div>
                      )}

                      {visit.checkInLatitude && visit.checkInLongitude && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${visit.checkInLatitude},${visit.checkInLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-[#087F7A] hover:underline flex items-center gap-0.5"
                        >
                          Check-in GPS <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Total Visits: {visits.length} recorded
          </span>
          <button onClick={onClose} className="btn-secondary text-xs">
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
