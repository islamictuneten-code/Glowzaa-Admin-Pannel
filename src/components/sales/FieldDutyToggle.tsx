import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import * as Switch from '@radix-ui/react-switch';
import { useLocationGate } from '../../context/LocationGateContext';

interface FieldDutyToggleProps {
  showLabel?: boolean;
}

export const FieldDutyToggle: React.FC<FieldDutyToggleProps> = ({ showLabel = true }) => {
  const { currentUser } = useAuth();
  const { role } = useApp();
  const { 
    activeSession, 
    startDuty, 
    stopDuty, 
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

  if (currentUser?.role !== 'sales' && role !== 'sales') return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
      {showLabel && <span className="text-xs font-bold text-slate-700">Duty</span>}
      <Switch.Root
        checked={isOn}
        disabled={isToggling}
        onCheckedChange={handleToggle}
        className="w-9 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-emerald-600 transition-colors cursor-pointer"
      >
        <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-100 translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
      </Switch.Root>
      <span className={`text-xs font-extrabold ${isOn ? 'text-emerald-600' : 'text-slate-400'}`}>
        {isOn ? 'ON' : 'OFF'}
      </span>
    </div>
  );
};

