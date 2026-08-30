import React from 'react';
import { 
  Building2, 
  Phone, 
  MapPin, 
  UserCheck, 
  Shield, 
  PlusCircle, 
  DollarSign, 
  FileText, 
  ExternalLink,
  Navigation,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { Customer } from '../../types';
import { getCustomerApplicableBadges } from '../../utils/creditEngine';
import { useAuth } from '../../context/AuthContext';
import { getGoogleMapsUrl } from '../../services/locationService';

interface Customer360HeaderProps {
  customer: Customer;
  onOpenCreditModal: () => void;
  onOpenNewOrder: () => void;
  onOpenCollectPayment: () => void;
  onOpenAddNote: () => void;
  activeVisitId?: string | null;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  isCheckingIn?: boolean;
}

export const Customer360Header: React.FC<Customer360HeaderProps> = ({
  customer,
  onOpenCreditModal,
  onOpenNewOrder,
  onOpenCollectPayment,
  onOpenAddNote,
  activeVisitId,
  onCheckIn,
  onCheckOut,
  isCheckingIn
}) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isSales = currentUser?.role === 'sales';

  const applicableBadges = getCustomerApplicableBadges(customer);
  const cleanPhone = (customer.phone || '').replace(/[^0-9+]/g, '');

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Left Side: Avatar, Name, Badges & Meta */}
        <div className="flex items-start space-x-3.5 sm:space-x-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0F766E] to-teal-800 text-white font-bold text-lg sm:text-xl flex items-center justify-center shadow-md shrink-0 border border-teal-900/20">
            {customer.shopName?.charAt(0)?.toUpperCase() || 'C'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {customer.shopName}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {customer.customerId || customer.id.slice(0, 8)}
              </span>

              {/* Status Badges */}
              {applicableBadges.map((badge, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${badge.className}`}
                >
                  {badge.label}
                </span>
              ))}

              {customer.creditCheckMode && customer.creditCheckMode !== 'NONE' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Mode: {customer.creditCheckMode}
                </span>
              )}
            </div>

            {/* Subtitle / Owner & Location */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                Proprietor: <strong className="text-slate-900 font-bold">{customer.ownerName}</strong>
              </span>

              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.address}, {customer.area || customer.district}</span>
              </span>

              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center space-x-1 text-[#0F766E] hover:underline font-mono font-medium"
              >
                <Phone className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>{customer.phone}</span>
              </a>

              {customer.assignedSalesUserName && (
                <span className="flex items-center space-x-1 text-slate-700">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Officer: <strong className="text-slate-900 font-medium">{customer.assignedSalesUserName}</strong></span>
                </span>
              )}

              {customer.tradeLicenseNo && (
                <span className="text-[11px] text-slate-500 font-mono">
                  Lic: {customer.tradeLicenseNo}
                </span>
              )}
            </div>

            {/* GPS Verified Badge */}
            {customer.latitude && customer.longitude && (
              <div className="mt-2 flex items-center space-x-3 text-[11px]">
                <a
                  href={getGoogleMapsUrl(customer.latitude, customer.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-[#0F766E] hover:text-teal-800 font-semibold"
                >
                  <Navigation className="w-3 h-3 text-[#0F766E]" />
                  <span>GPS Location Verified ({customer.latitude.toFixed(4)}, {customer.longitude.toFixed(4)})</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
          {/* Check-In / Check-Out for Sales Staff on Duty */}
          {isSales && (
            <>
              {activeVisitId ? (
                <button
                  type="button"
                  onClick={onCheckOut}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>End Visit</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCheckIn}
                  disabled={isCheckingIn}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isCheckingIn ? 'Checking in...' : 'Shop Check-In'}</span>
                </button>
              )}
            </>
          )}

          {/* New Order Button */}
          {(isAdmin || isSales) && (
            <button
              type="button"
              onClick={onOpenNewOrder}
              disabled={customer.creditHold && !isAdmin}
              title={customer.creditHold && !isAdmin ? 'Customer is on Credit Hold' : 'Create new B2B sales order'}
              className="px-3.5 py-1.5 bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Order</span>
            </button>
          )}

          {/* Quick Payment Collection */}
          <button
            type="button"
            onClick={onOpenCollectPayment}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>

          {/* Add Internal Note */}
          <button
            type="button"
            onClick={onOpenAddNote}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Note</span>
          </button>

          {/* Admin Smart Credit Control */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenCreditModal}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-teal-300" />
              <span>Credit Settings</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
