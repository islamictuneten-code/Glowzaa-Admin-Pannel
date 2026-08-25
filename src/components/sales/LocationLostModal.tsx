import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocationGate } from '../../context/LocationGateContext';
import { ShieldAlert, MapPin, RefreshCw, LogOut, Radio } from 'lucide-react';

export const LocationLostModal: React.FC = () => {
  const { logout } = useAuth();
  const { isLocationLost, retryLocation, isChecking, errorMessage } = useLocationGate();

  if (!isLocationLost) return null;

  const handleRetry = async () => {
    await retryLocation();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-lg shadow-rose-500/20">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
            Critical System Alert
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            LOCATION LOST
          </h2>
          <p className="text-xs text-rose-200/90 leading-relaxed font-medium">
            Glowzaa-তে আপনার বর্তমান লোকেশন পাওয়া যাচ্ছে না। লোকেশন সার্ভিস চালু না হওয়া পর্যন্ত সেলস অর্ডার ও ভিজিট সুবিধা স্থগিত থাকবে।
          </p>
        </div>

        {/* Details Box */}
        <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-3.5 space-y-1.5 text-xs">
          <p className="text-rose-200 font-semibold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            Possible Reasons:
          </p>
          <ul className="list-disc list-inside text-rose-100/80 space-y-1 pl-1">
            <li>Device GPS / Location service turned off</li>
            <li>Browser location permission revoked or blocked</li>
            <li>Weak satellite signal (underground / inside heavy building)</li>
          </ul>
          {errorMessage && (
            <p className="text-[11px] text-rose-300 font-mono pt-1 border-t border-rose-900/50 mt-1">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleRetry}
            disabled={isChecking}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-[0.99] text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-75"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Re-verifying GPS Signal...</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span>Turn On Location / Retry</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
