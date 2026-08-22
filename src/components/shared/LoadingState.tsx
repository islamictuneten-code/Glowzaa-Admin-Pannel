import React from 'react';

export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  variant?: 'spinner' | 'skeleton' | 'card';
  count?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  subMessage = 'Fetching verified records from Firestore',
  variant = 'spinner',
  count = 3
}) => {
  if (variant === 'skeleton') {
    return (
      <div className="w-full space-y-3 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`skel-row-${i}`} className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-200 rounded-md w-1/3"></div>
              <div className="h-4 bg-slate-200 rounded-md w-1/6"></div>
            </div>
            <div className="h-3 bg-slate-100 rounded-md w-2/3"></div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <div className="h-6 bg-slate-200 rounded-lg w-20"></div>
              <div className="h-6 bg-slate-100 rounded-lg w-24"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`skel-card-${i}`} className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 bg-slate-200 rounded w-24"></div>
              <div className="w-8 h-8 rounded-xl bg-slate-100"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded w-32"></div>
            <div className="h-2.5 bg-slate-100 rounded w-40"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="w-10 h-10 border-3 border-violet-100 border-t-[#7C3AED] rounded-full animate-spin mb-3"></div>
      <h3 className="text-sm font-bold text-slate-800">{message}</h3>
      {subMessage && <p className="text-xs text-slate-500 mt-1 max-w-xs">{subMessage}</p>}
    </div>
  );
};
