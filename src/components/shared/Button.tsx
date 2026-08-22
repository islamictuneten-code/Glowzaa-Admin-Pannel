import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'teal' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 min-h-[32px] gap-1.5',
    md: 'text-xs sm:text-sm px-3.5 py-2 min-h-[38px] gap-2',
    lg: 'text-sm sm:text-base px-4.5 py-2.5 min-h-[44px] gap-2.5',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[#087F7A] hover:bg-[#075E5B] text-white shadow-xs active:scale-[0.99]',
    teal: 'bg-[#087F7A] hover:bg-[#075E5B] text-white shadow-xs active:scale-[0.99]',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs active:scale-[0.99]',
    outline: 'bg-white hover:bg-[#E8F7F5] text-[#087F7A] border border-[#087F7A] active:scale-[0.99]',
    danger: 'bg-[#DC2626] hover:bg-red-700 text-white shadow-xs active:scale-[0.99]',
    success: 'bg-[#16A085] hover:bg-[#138A72] text-white shadow-xs active:scale-[0.99]',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
