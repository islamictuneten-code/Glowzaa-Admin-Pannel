import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocationGate } from '../../context/LocationGateContext';
import { 
  MapPin, 
  ShieldAlert, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Radio,
  Compass,
  Smartphone,
  Info
} from 'lucide-react';

export const LocationGateScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { 
    readiness, 
    permissionState, 
    coords, 
    errorMessage, 
    isChecking, 
    retryLocation 
  } = useLocationGate();

  const handleRetry = async () => {
    await retryLocation();
  };

  const handleLogout = async () => {
    await logout();
  };

  const hasGeoSupport = typeof window !== 'undefined' && 'geolocation' in navigator;
  const isPermissionGranted = permissionState === 'granted';
  const isGpsAcquired = Boolean(coords && coords.latitude && coords.longitude);
  const isAccuracyGood = Boolean(coords?.accuracy && coords.accuracy <= 100);

  return (
    <div className="min-h-screen bg-[#102A2A] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans antialiased selection:bg-[#087F7A]">
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto text-center pt-6 sm:pt-10 space-y-3">
        <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-[#087F7A] to-[#16A085] rounded-2xl shadow-xl shadow-[#087F7A]/30 mb-2">
          <MapPin className="w-8 h-8 text-white animate-bounce" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-teal-900/60 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide uppercase">
          GLOWZAA B2B WHOLESALE • FIELD SALES GATE
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Location Access Required
        </h1>
        <p className="text-sm text-teal-100/80 leading-relaxed font-medium">
          Glowzaa Sales App ব্যবহার করার জন্য আপনার ফোনের Location/GPS চালু থাকতে হবে এবং Glowzaa-কে Location permission দিতে হবে।
        </p>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto bg-slate-900/80 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 sm:p-6 space-y-5 my-6 shadow-2xl">
        {/* User Identity Banner */}
        <div className="bg-teal-950/70 border border-teal-800/50 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#087F7A] flex items-center justify-center font-bold text-white text-xs">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <p className="font-bold text-white">{currentUser?.name || 'Sales Officer'}</p>
              <p className="text-teal-300 text-[11px] font-mono">{currentUser?.loginId || currentUser?.email}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase">
            Sales Staff
          </span>
        </div>

        {/* Live System Diagnostics */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-teal-200/80 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#087F7A]" />
            Location Gate Readiness Check
          </h2>

          <div className="space-y-2 text-xs">
            {/* 1. Geolocation Support */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-200 font-medium">Browser Geolocation Support</span>
              {hasGeoSupport ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Ready
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-400 font-bold">
                  <XCircle className="w-4 h-4" /> Unsupported
                </span>
              )}
            </div>

            {/* 2. Permission Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-200 font-medium">Location Permission</span>
              {isPermissionGranted ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Granted
                </span>
              ) : permissionState === 'denied' ? (
                <span className="flex items-center gap-1 text-rose-400 font-bold">
                  <XCircle className="w-4 h-4" /> Denied
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <AlertTriangle className="w-4 h-4" /> Permission Needed
                </span>
              )}
            </div>

            {/* 3. GPS Signal Acquisition */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-200 font-medium">Device GPS Signal</span>
              {isGpsAcquired ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Signal Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Radio className="w-4 h-4 animate-pulse" /> Searching Signal
                </span>
              )}
            </div>

            {/* 4. GPS Accuracy Check */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-200 font-medium">GPS Precision (≤ 100m)</span>
              {isAccuracyGood ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> ±{Math.round(coords?.accuracy || 0)}m (Valid)
                </span>
              ) : coords?.accuracy ? (
                <span className="flex items-center gap-1 text-rose-400 font-bold">
                  <XCircle className="w-4 h-4" /> ±{Math.round(coords.accuracy)}m (Weak)
                </span>
              ) : (
                <span className="text-slate-400 font-medium">Pending...</span>
              )}
            </div>
          </div>
        </div>

        {/* Error / Instruction Message Box */}
        {errorMessage && (
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Location Access Alert</span>
            </div>
            <p className="text-rose-100/90 leading-relaxed font-medium">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Instructions Guide */}
        <div className="bg-teal-950/40 border border-teal-700/30 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-teal-300 font-bold">
            <Info className="w-4 h-4 text-[#087F7A] shrink-0" />
            <span>কিভাবে Location Permission চালাবেন?</span>
          </div>
          <ol className="list-decimal list-inside text-teal-100/80 space-y-1.5 pl-1 leading-relaxed">
            <li>আপনার ফোনের **GPS / Location** অপশনটি চালু করুন।</li>
            <li>ব্রাউজারের এড্রেস বারে থাকা 🔒 **Lock** বা **Site Settings** আইকনে ট্যাপ করুন।</li>
            <li>Location Option-এ গিয়ে **Allow** নির্বাচন করুন।</li>
            <li>নিচের **Enable Location / Retry Access** বাটনে ক্লিক করুন।</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleRetry}
            disabled={isChecking}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#087F7A] to-[#16A085] hover:from-[#066561] hover:to-[#128770] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-[#087F7A]/30 flex items-center justify-center gap-2 transition-all disabled:opacity-75"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Verifying GPS Signal...</span>
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                <span>Enable Location / Retry Access</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out from Account</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center pb-4 text-[11px] text-teal-300/60 font-medium">
        GLOWZAA B2B Wholesale Commerce • Mandatory Location Security Policy
      </div>
    </div>
  );
};
