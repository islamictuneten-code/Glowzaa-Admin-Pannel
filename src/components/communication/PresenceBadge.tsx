import React from 'react';
import { CommunicationDevice } from '../../types';

interface PresenceBadgeProps {
  devices?: CommunicationDevice[];
  userId: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const getStaffOnlineStatus = (
  userId: string,
  devices: CommunicationDevice[] = []
): { status: 'online' | 'away' | 'offline'; label: string; lastSeen?: string } => {
  const userDevices = devices.filter(d => d.userId === userId && d.isActive);
  if (!userDevices || userDevices.length === 0) {
    return { status: 'offline', label: 'Offline' };
  }

  // Find most recent device activity
  const sorted = [...userDevices].sort(
    (a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime()
  );
  const latest = sorted[0];
  if (!latest || !latest.lastSeenAt) {
    return { status: 'offline', label: 'Offline' };
  }

  const lastSeenMs = new Date(latest.lastSeenAt).getTime();
  const diffMs = Date.now() - lastSeenMs;

  if (diffMs <= 5 * 60 * 1000) {
    return { status: 'online', label: 'Online', lastSeen: latest.lastSeenAt };
  } else if (diffMs <= 20 * 60 * 1000) {
    return { status: 'away', label: 'Away', lastSeen: latest.lastSeenAt };
  } else {
    return { status: 'offline', label: 'Offline', lastSeen: latest.lastSeenAt };
  }
};

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  devices = [],
  userId,
  showText = true,
  size = 'md'
}) => {
  const { status, label } = getStaffOnlineStatus(userId, devices);

  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]';

  return (
    <div className="inline-flex items-center gap-1.5 shrink-0">
      <span className="relative flex items-center justify-center">
        {status === 'online' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`} />
        )}
        <span
          className={`relative inline-flex rounded-full ${dotSize} ${
            status === 'online'
              ? 'bg-emerald-500'
              : status === 'away'
              ? 'bg-amber-500'
              : 'bg-slate-300'
          }`}
        />
      </span>

      {showText && (
        <span
          className={`font-semibold capitalize ${textSize} ${
            status === 'online'
              ? 'text-emerald-700'
              : status === 'away'
              ? 'text-amber-700'
              : 'text-slate-400'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
};
