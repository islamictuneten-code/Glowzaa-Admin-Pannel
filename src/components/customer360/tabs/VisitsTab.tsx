import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Navigation,
  ExternalLink,
  PlusCircle
} from 'lucide-react';
import { Customer, CustomerVisit } from '../../../types';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { getGoogleMapsUrl } from '../../../services/locationService';

interface VisitsTabProps {
  customer: Customer;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  activeVisitId?: string | null;
  isCheckingIn?: boolean;
}

export const VisitsTab: React.FC<VisitsTabProps> = ({
  customer,
  onCheckIn,
  onCheckOut,
  activeVisitId,
  isCheckingIn
}) => {
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!customer?.id) {
      setVisits([]);
      setIsLoading(false);
      return;
    }

    const visitsRef = collection(db, 'customer_visits');
    const q = query(
      visitsRef,
      where('customerId', '==', customer.id),
      orderBy('checkInTime', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: CustomerVisit[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as CustomerVisit);
        });
        setVisits(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Visits indexed query notice, attempting unindexed query:', err);
        const fallbackQ = query(
          visitsRef,
          where('customerId', '==', customer.id),
          limit(50)
        );
        return onSnapshot(
          fallbackQ,
          (snap) => {
            const list: CustomerVisit[] = [];
            snap.forEach((d) => {
              list.push({ id: d.id, ...d.data() } as CustomerVisit);
            });
            list.sort((a, b) => (b.checkInTime || '').localeCompare(a.checkInTime || ''));
            setVisits(list);
            setIsLoading(false);
          }
        );
      }
    );

    return () => unsub();
  }, [customer?.id]);

  const outcomeLabels: Record<string, { label: string; className: string }> = {
    order_booked: { label: 'Order Booked', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    payment_collected: { label: 'Payment Collected', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    no_sale: { label: 'No Sale', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    follow_up: { label: 'Follow Up Required', className: 'bg-amber-50 text-amber-800 border-amber-200' }
  };

  return (
    <div className="space-y-4">
      {/* Visits Header Action */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <Navigation className="w-4 h-4 text-[#0F766E]" />
            <span>Field Sales Route & Physical Store Visits</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time GPS-verified sales force attendance and physical verification records.
          </p>
        </div>

        {onCheckIn && onCheckOut && (
          <div className="shrink-0">
            {activeVisitId ? (
              <button
                type="button"
                onClick={onCheckOut}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete Store Visit</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCheckIn}
                disabled={isCheckingIn}
                className="px-3.5 py-1.5 bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isCheckingIn ? 'Locating GPS...' : 'Start Check-In Here'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Visits Timeline / List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Loading visit history...
          </div>
        ) : visits.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No field sales visits recorded for this shop yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visits.map((v) => {
              const outcome = v.visitOutcome ? outcomeLabels[v.visitOutcome] : null;
              return (
                <div key={v.id} className="p-4 hover:bg-slate-50 transition-colors text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{v.userName || 'Sales Officer'}</span>
                      {outcome && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${outcome.className}`}>
                          {outcome.label}
                        </span>
                      )}
                      {v.isGpsVerified && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          GPS Verified
                        </span>
                      )}
                    </div>

                    <div className="text-slate-500 text-[11px] flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(v.checkInTime).toLocaleString()}</span>
                      </span>
                      {v.durationMinutes && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{Math.round(v.durationMinutes)} min</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {v.notes && (
                    <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-[11px]">
                      {v.notes}
                    </p>
                  )}

                  {v.checkInLatitude && v.checkInLongitude && (
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>Checked in at coordinates ({v.checkInLatitude.toFixed(4)}, {v.checkInLongitude.toFixed(4)})</span>
                      {v.distanceFromShopMeters !== undefined && v.distanceFromShopMeters !== null && (
                        <span>• Distance: {Math.round(v.distanceFromShopMeters)}m from registered shop pin</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
