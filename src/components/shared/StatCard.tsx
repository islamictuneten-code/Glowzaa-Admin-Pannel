import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon | React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'primary' | 'teal' | 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'slate' | 'indigo';
  badge?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'teal',
  badge,
  onClick
}) => {
  const colorMap: Record<string, { iconBg: string; borderHover: string }> = {
    primary: {
      iconBg: 'bg-[#E8F7F5] text-[#087F7A]',
      borderHover: 'hover:border-[#087F7A]'
    },
    teal: {
      iconBg: 'bg-[#E8F7F5] text-[#087F7A]',
      borderHover: 'hover:border-[#087F7A]'
    },
    emerald: {
      iconBg: 'bg-[#DDF7EE] text-[#16A085]',
      borderHover: 'hover:border-[#16A085]'
    },
    blue: {
      iconBg: 'bg-teal-50 text-[#087F7A]',
      borderHover: 'hover:border-teal-300'
    },
    amber: {
      iconBg: 'bg-amber-50 text-[#D97706]',
      borderHover: 'hover:border-amber-300'
    },
    purple: {
      iconBg: 'bg-[#E8F7F5] text-[#087F7A]',
      borderHover: 'hover:border-[#087F7A]'
    },
    rose: {
      iconBg: 'bg-rose-50 text-[#DC2626]',
      borderHover: 'hover:border-rose-300'
    },
    indigo: {
      iconBg: 'bg-teal-50 text-[#075E5B]',
      borderHover: 'hover:border-teal-300'
    },
    slate: {
      iconBg: 'bg-slate-100 text-slate-700',
      borderHover: 'hover:border-slate-300'
    }
  };

  const scheme = colorMap[accentColor] || colorMap.teal;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return <IconComponent className="w-4 h-4" />;
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`bg-white rounded-xl border border-slate-200 p-4 sm:p-4.5 shadow-2xs transition-all duration-150 select-none ${
        onClick ? `cursor-pointer hover:shadow-xs active:scale-[0.98] ${scheme.borderHover}` : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 truncate uppercase tracking-wider">{title}</span>
            {badge && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                {badge}
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 truncate tabular-nums">{value}</div>
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${scheme.iconBg} shrink-0 flex items-center justify-center`}>
            {renderIcon()}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 gap-2">
          <span className="truncate">{subtitle}</span>
          {trend && (
            <span className={`font-semibold shrink-0 flex items-center gap-0.5 ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
