import React from 'react';
import { DataQualityIssue } from '../../../types';
import { 
  Database, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Info,
  ExternalLink
} from 'lucide-react';

interface DataQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: DataQualityIssue[];
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  isOpen,
  onClose,
  issues
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Data Quality & Audit Center</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {issues.length} Audit Findings
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Scan for missing product purchase costs, unlinked sales assignments, and incomplete retailer records.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
          {issues.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">100% Data Integrity Verified</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All products have valid purchase costs, all finalized orders have assigned sales reps, and all customer profiles have valid phone numbers.
              </p>
            </div>
          ) : (
            issues.map(issue => (
              <div 
                key={issue.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      issue.severity === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      issue.severity === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {issue.severity}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{issue.title}</h3>
                  </div>

                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {issue.affectedCount} items
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {issue.description}
                </p>

                {/* Items preview */}
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 space-y-1.5">
                  {issue.affectedItems.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-white rounded-lg border border-slate-200/60">
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        {item.identifier && (
                          <span className="text-[10px] font-mono text-slate-400 ml-2">[{item.identifier}]</span>
                        )}
                      </div>
                      <span className="text-[11px] text-rose-600 font-medium shrink-0">
                        {item.issueDetails}
                      </span>
                    </div>
                  ))}
                  {issue.affectedItems.length > 10 && (
                    <div className="text-center text-[10px] text-slate-400 py-1">
                      + {issue.affectedItems.length - 10} more records
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/60 text-xs text-indigo-950 font-medium">
                  <span className="font-bold text-indigo-900 block mb-0.5">Resolution Guide:</span>
                  {issue.resolutionGuide}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Close Audit Center
          </button>
        </div>

      </div>
    </div>
  );
};
