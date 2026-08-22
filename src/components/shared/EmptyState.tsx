import React from 'react';
import { PackageOpen, Users, ShoppingCart, Truck, Receipt, Search, AlertCircle } from 'lucide-react';

export type EmptyStateType = 'orders' | 'customers' | 'products' | 'deliveries' | 'payments' | 'search' | 'generic';

export interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  description,
  actionText,
  onAction,
  icon
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'orders':
        return <ShoppingCart className="w-8 h-8 text-violet-500" />;
      case 'customers':
        return <Users className="w-8 h-8 text-pink-500" />;
      case 'products':
        return <PackageOpen className="w-8 h-8 text-amber-500" />;
      case 'deliveries':
        return <Truck className="w-8 h-8 text-emerald-500" />;
      case 'payments':
        return <Receipt className="w-8 h-8 text-blue-500" />;
      case 'search':
        return <Search className="w-8 h-8 text-slate-400" />;
      default:
        return <AlertCircle className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-3.5 shadow-xs">
        {icon || getDefaultIcon()}
      </div>
      <h3 className="text-sm sm:text-base font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
