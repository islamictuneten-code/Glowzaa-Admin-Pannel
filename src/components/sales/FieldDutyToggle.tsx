import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as Switch from '@radix-ui/react-switch';
import { useLocationGate } from '../../context/LocationGateContext';
import { ShieldAlert } from 'lucide-react';

export const FieldDutyToggle: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    activeSession, 
    startDuty, 
    stopDuty, 
    coords, 
    gpsStatus, 
    permissionState 
  } = useLocationGate();

  const isOn = Boolean(activeSession && activeSession.status === 'active');
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      if (checked) {
        const success = await startDuty();
        if (!success && permissionState === 'denied') {
          alert('Location permission is blocked. Please allow location access in your browser settings.');
        }
      } else {
        await stopDuty();
      }
    } finally {
      setIsToggling(false);
    }
  };

  if (currentUser?.role !== 'sales') return null;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <Switch.Root
            checked={isOn}
            disabled={isToggling}
            onCheckedChange={handleToggle}
            className="w-8 h-4 bg-slate-300 rounded-full relative data-[state=checked]:bg-teal-600 transition-colors cursor-pointer"
          >
            <Switch.Thumb className="block w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-100 translate-x-0.5 data-[state=checked]:translate-x-[17px]" />
          </Switch.Root>
          <span className="text-[11px] font-bold text-[#102A2A] tracking-tight">
            FIELD DUTY <span className={isOn ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}>{isOn ? 'ON' : 'OFF'}</span>
          </span>
        </div>

        {/* Compact GPS status indicator */}
        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-medium text-slate-500">
          {permissionState === 'denied' ? (
            <span className="text-rose-600 flex items-center gap-0.5 font-bold">
              <ShieldAlert className="w-2.5 h-2.5" /> Permission Blocked
            </span>
          ) : isOn ? (
            <>
              <span className={`w-1.5 h-1.5 rounded-full ${
                gpsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                gpsStatus === 'weak' ? 'bg-amber-500' :
                'bg-blue-500 animate-pulse'
              }`} />
              <span className="truncate max-w-[130px]">
                {gpsStatus === 'connected' && coords ? `GPS • ±${Math.round(coords.accuracy)}m` :
                 gpsStatus === 'weak' ? `GPS Weak • ±${Math.round(coords?.accuracy || 0)}m` :
                 gpsStatus === 'offline' ? 'GPS • Offline' :
                 'GPS • Searching...'}
              </span>
            </>
          ) : (
            <span className="text-slate-400">GPS Standby</span>
          )}
        </div>
      </div>
    </div>
  );
};
