import React, { useState } from 'react';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Volume2, 
  ShieldCheck, 
  Smartphone,
  X
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface NotificationPermissionCardProps {
  onDismiss?: () => void;
  compact?: boolean;
}

export const NotificationPermissionCard: React.FC<NotificationPermissionCardProps> = ({ 
  onDismiss, 
  compact = false 
}) => {
  const { 
    permissionStatus, 
    requestPermission, 
    testChimeAndAlert, 
    isDeviceRegistered 
  } = useNotification();

  const [isLoading, setIsLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      await requestPermission();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setTestSent(true);
    await testChimeAndAlert('normal');
    setTimeout(() => setTestSent(false), 3000);
  };

  if (permissionStatus === 'granted') {
    if (compact) {
      return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/80 border border-teal-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#087F7A] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#102A2A]">Notifications Enabled</p>
              <p className="text-[10px] text-slate-500">Device registered for push alerts</p>
            </div>
          </div>
          <button
            onClick={handleTest}
            disabled={testSent}
            className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-teal-100 text-[#087F7A] border border-teal-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Volume2 className="w-3 h-3" />
            <span>{testSent ? 'Chime Played!' : 'Test Sound'}</span>
          </button>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50/90 to-emerald-50/90 border border-teal-200 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#087F7A] text-white flex items-center justify-center shadow-xs shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#102A2A]">Push Notifications Active</h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#087F7A] bg-white px-2 py-0.5 rounded-full border border-teal-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                This device receives sound chimes and background alerts for new wholesale orders, delivery dispatches, and field announcements.
              </p>
            </div>
          </div>
          <button
            onClick={handleTest}
            disabled={testSent}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-teal-50 text-[#087F7A] border border-teal-300 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{testSent ? 'Alert Played ✓' : 'Test Chime & Push'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">Notifications are blocked in browser</h4>
              <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                To receive critical delivery dispatches and priority field alerts, click the lock icon in your browser address bar and enable <strong>Notifications</strong> for Glowzaa.
              </p>
            </div>
          </div>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="p-1 rounded-lg text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default state: prompt user explicitly
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white to-teal-50/50 border border-teal-200/90 shadow-sm text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] text-white flex items-center justify-center shadow-xs shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#102A2A]">Enable Push Notifications</h4>
              <span className="text-[9px] font-bold uppercase tracking-wide bg-teal-100 text-[#087F7A] px-1.5 py-0.2 rounded border border-teal-200">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed max-w-xl">
              Stay updated with real-time wholesale orders, delivery status changes, payment collections, and official HQ announcements.
            </p>
            
            <div className="flex flex-wrap items-center gap-2.5 mt-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#087F7A] hover:bg-[#075E5B] text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Activating...' : 'Enable Notifications'}</span>
              </button>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Not Now
                </button>
              )}
            </div>
          </div>
        </div>

        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
