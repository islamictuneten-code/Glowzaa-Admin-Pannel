import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Switch } from '@radix-ui/react-switch';
import { useLocationGate } from '../../context/LocationGateContext';

export const FieldDutyToggle: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeSession } = useLocationGate();
  
  const isOn = !!activeSession;

  if (currentUser?.role !== 'sales') return null;

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
      <div>
        <p className="text-sm font-semibold text-slate-800">Field Duty</p>
        {isOn ? (
          <p className="text-xs text-emerald-600 font-medium">Active Session</p>
        ) : (
          <p className="text-xs text-slate-500">Field Duty is inactive</p>
        )}
      </div>
      <Switch.Root
        checked={isOn}
        className="w-12 h-6 bg-slate-200 rounded-full relative data-[state=checked]:bg-teal-600 transition-colors"
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-100 translate-x-0.5 data-[state=checked]:translate-x-[26px]" />
      </Switch.Root>
    </div>
  );
};
