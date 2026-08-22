import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, ArrowLeft, Lock, ShieldCheck, Home } from 'lucide-react';

interface AccessDeniedProps {
  attemptedResource?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ attemptedResource = 'Restricted Section' }) => {
  const { currentUser } = useAuth();
  const { role, setAdminTab, setSalesTab, setDeliveryTab } = useApp();

  const handleReturnHome = () => {
    if (role === 'admin') setAdminTab('dashboard');
    else if (role === 'sales') setSalesTab('dashboard');
    else if (role === 'delivery') setDeliveryTab('dashboard');
  };

  const roleLabel = role === 'admin' 
    ? 'Admin HQ' 
    : role === 'sales' 
      ? 'Sales / Marketing Seller' 
      : 'Delivery Man';

  return (
    <div className="min-h-[500px] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200/80 shadow-lg p-6 sm:p-8 text-center space-y-5 animate-in fade-in zoom-in-95">
        
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            HTTP 403 Forbidden
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have administrative clearance to access <strong>"{attemptedResource}"</strong>. Your active session is authorized strictly under the <strong>{roleLabel}</strong> role profile.
          </p>
        </div>

        {currentUser && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Authenticated User:</span>
              <span className="font-semibold text-slate-800">{currentUser.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Active Role:</span>
              <span className="font-bold text-rose-700 uppercase text-[11px]">{currentUser.role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Clearance Scope:</span>
              <span className="text-slate-700">
                {role === 'sales' ? 'Field Orders & Retail Catalog' : role === 'delivery' ? 'Fleet Deliveries & Due Collection' : 'Central Admin HQ'}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={handleReturnHome}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to My Dashboard</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Contact Glowzaa System Administration if you believe this is an error.
        </p>

      </div>
    </div>
  );
};
