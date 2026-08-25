import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as Switch from '@radix-ui/react-switch';
import { useLocationGate } from '../../context/LocationGateContext';
import { GpsManager, GpsUpdate } from '../../services/locationService';

export const FieldDutyToggle: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeSession, createFieldDutySession, endFieldDutySession } = useLocationGate();
  
  const [isOn, setIsOn] = useState(!!activeSession);
  const [gpsUpdate, setGpsUpdate] = useState<GpsUpdate | null>(null);
  const gpsManager = useRef<GpsManager | null>(null);

  useEffect(() => {
    gpsManager.current = new GpsManager(setGpsUpdate);
    return () => gpsManager.current?.stop();
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Logic for turning ON
      if (confirm('Start Field Duty? Your location will be shared with Glowzaa HQ.')) {
        setIsOn(true);
        gpsManager.current?.start(true);
        // We need to wait for a valid position before creating the session as per prompt requirements.
        // For now, simple approach: start GPS, then create session.
      }
    } else {
      // Logic for turning OFF
      if (confirm('End Field Duty?')) {
        gpsManager.current?.stop();
        endFieldDutySession();
        setIsOn(false);
      }
    }
  };

  // If GPS becomes connected and session is not active, create session
  useEffect(() => {
    if (isOn && gpsUpdate?.state === 'connected' && !activeSession) {
        createFieldDutySession(gpsUpdate.coords.latitude, gpsUpdate.coords.longitude);
    }
  }, [isOn, gpsUpdate, activeSession, createFieldDutySession]);

  if (currentUser?.role !== 'sales') return null;

  return (
    <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-200">
      <Switch.Root
        checked={isOn}
        onCheckedChange={handleToggle}
        className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-teal-600 transition-colors"
      >
        <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-100 translate-x-0.5 data-[state=checked]:translate-x-[21px]" />
      </Switch.Root>
      <div className="flex flex-col">
        <p className="text-[10px] font-bold text-slate-700 leading-tight">DUTY</p>
        <p className={`text-[9px] font-medium leading-tight ${isOn ? 'text-emerald-600' : 'text-slate-500'}`}>
          {isOn ? 'ACTIVE' : 'OFF'}
        </p>
      </div>
    </div>
  );
};
