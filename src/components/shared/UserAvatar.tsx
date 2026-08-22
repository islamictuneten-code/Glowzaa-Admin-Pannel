import React, { useState } from 'react';
import { getAvatarInitials } from '../../services/storageService';
import { UserRole } from '../../types';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  fallbackInitials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  role?: UserRole | string;
  status?: string;
  showStatusDot?: boolean;
  alt?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl'
};

const ROLE_BG_MAP: Record<string, string> = {
  admin: 'bg-gradient-to-tr from-[#087F7A] to-[#0E5250] text-white',
  sales: 'bg-gradient-to-tr from-[#16A085] to-[#0D6B58] text-white',
  delivery: 'bg-gradient-to-tr from-[#087F7A] to-[#1E3A8A] text-white',
  default: 'bg-gradient-to-tr from-slate-700 to-slate-800 text-white'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = '',
  fallbackInitials,
  size = 'md',
  className = '',
  role = 'default',
  status,
  showStatusDot = false,
  alt
}) => {
  const [imageError, setImageError] = useState(false);

  const initials = fallbackInitials || getAvatarInitials(name);
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const roleBg = ROLE_BG_MAP[role] || ROLE_BG_MAP.default;

  const hasValidPhoto = Boolean(src && src.trim() && !imageError);

  const getStatusColor = () => {
    if (status === 'active' || status === 'on_duty' || status === 'available') {
      return 'bg-emerald-500 ring-white';
    }
    if (status === 'inactive' || status === 'off_duty') {
      return 'bg-slate-400 ring-white';
    }
    return 'bg-teal-500 ring-white';
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {hasValidPhoto ? (
        <img
          src={src!}
          alt={alt || name || 'User Avatar'}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`${sizeClasses} rounded-xl object-cover border border-slate-200/80 shadow-2xs`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-xl ${roleBg} font-bold flex items-center justify-center tracking-tight select-none shadow-2xs border border-white/20`}
        >
          {initials}
        </div>
      )}

      {showStatusDot && status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ${getStatusColor()}`}
        />
      )}
    </div>
  );
};
