import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  className = '',
  padding = 'md',
  ...props
}) => {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-xs transition-all duration-150 ${className}`}
      {...props}
    >
      {header && (
        <div className="border-b border-slate-100 px-4 sm:px-5 py-3.5 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className={paddingMap[padding]}>
        {children}
      </div>
      {footer && (
        <div className="border-t border-slate-100 px-4 sm:px-5 py-3 bg-slate-50/60 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
};
