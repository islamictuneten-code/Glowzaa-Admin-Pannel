import React from 'react';
import { OrderStatus, PaymentStatus } from '../../types';

interface BadgeProps {
  status: OrderStatus | PaymentStatus | 'in_stock' | 'low_stock' | 'out_of_stock' | 'active' | 'inactive' | 'overdue_hold' | 'on_duty' | 'available' | 'off_duty' | 'urgent' | 'high' | 'normal' | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md', showDot = true }) => {
  const getStyle = () => {
    switch (status) {
      // Order: Delivered, Completed | Payment: Paid | Product: In Stock, Active -> Green / Emerald (#16A34A / #10B981)
      case 'delivered':
      case 'completed':
      case 'paid':
      case 'in_stock':
      case 'active':
      case 'on_duty':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-600',
          label: status.replace('_', ' ')
        };

      // Order: Confirmed -> Teal / Blue (#0F766E)
      case 'confirmed':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-600',
          label: 'Confirmed'
        };

      // Order: Ready for Delivery -> Teal
      case 'ready_for_delivery':
      case 'Ready for Delivery':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-600',
          label: 'Ready for Delivery'
        };

      // Order: Packing -> Blue
      case 'packing':
      case 'Packing':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-600',
          label: 'Packing'
        };

      // Order: Assigned, In Transit -> Indigo / Blue
      case 'assigned':
      case 'in_transit':
      case 'dispatched':
      case 'normal':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-600',
          label: status === 'in_transit' ? 'In Transit' : status.replace('_', ' ')
        };

      // Order: Pending, Partially Delivered | Payment: Partial | Stock: Low Stock -> Amber (#D97706)
      case 'pending':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-600',
          label: 'Pending'
        };
      case 'partially_delivered':
      case 'Partially Delivered':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-600',
          label: 'Partially Delivered'
        };
      case 'partial':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-600',
          label: 'Partial'
        };
      case 'low_stock':
      case 'processing':
      case 'high':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: status.replace('_', ' ')
        };

      // Order: Returned -> Orange/Amber
      case 'returned':
        return {
          bg: 'bg-orange-50 text-orange-800 border-orange-200',
          dot: 'bg-orange-600',
          label: 'Returned'
        };

      // Order: Cancelled, Failed | Payment: Unpaid | Stock: Out of stock -> Red (#DC2626)
      case 'unpaid':
      case 'due':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-600',
          label: status === 'due' ? 'Overdue' : 'Unpaid'
        };
      case 'failed':
      case 'cancelled':
      case 'out_of_stock':
      case 'overdue_hold':
      case 'off_duty':
      case 'urgent':
        return {
          bg: 'bg-red-50 text-red-800 border-red-200',
          dot: 'bg-red-600',
          label: status === 'overdue_hold' ? 'Credit Hold' : status.replace('_', ' ')
        };

      case 'unassigned':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          label: status
        };
    }
  };

  const style = getStyle();
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px] font-bold' 
    : size === 'lg' 
      ? 'px-2.5 py-1 text-xs font-extrabold' 
      : 'px-2 py-0.5 text-xs font-bold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${style.bg} ${sizeClasses} capitalize whitespace-nowrap tracking-tight`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />}
      <span>{style.label}</span>
    </span>
  );
};
