import React from 'react';
import { ExecutiveActionItem } from '../../../types';
import { formatBDT } from '../../../utils/formatters';
import { 
  Zap, 
  X, 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  Tag, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface ExecutiveActionCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: ExecutiveActionItem[];
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveActionCenterModal: React.FC<ExecutiveActionCenterModalProps> = ({
  isOpen,
  onClose,
  actions,
  onNavigateTab
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-teal-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Executive Action Center</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30">
                  {actions.length} Recommended Actions
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Prioritized management interventions to protect gross margin, recover lagging targets, and re-engage dormant retailers.
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

        {/* Action Items List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
          {actions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">All Operations Optimized</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No immediate margin risks, severe target lags, or dormant wholesale accounts detected under current threshold policies.
              </p>
            </div>
          ) : (
            actions.map(action => (
              <div 
                key={action.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 transition-all hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      action.severity === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      action.severity === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>
                      {action.category.replace('_', ' ')}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{action.title}</h3>
                  </div>

                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {action.affectedCount} affected
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                    <span className="font-semibold text-slate-900 block mb-0.5">Problem & Evidence:</span>
                    {action.problem} {action.evidence && <span className="text-slate-500 italic block mt-1">({action.evidence})</span>}
                  </div>

                  <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/70 text-teal-950 font-medium">
                    <span className="font-bold text-teal-900 block mb-0.5">Recommended Management Action:</span>
                    {action.recommendedAction}
                  </div>
                </div>

                {/* Affected records preview */}
                {action.affectedRecords && action.affectedRecords.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Key Impacted Records
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {action.affectedRecords.slice(0, 4).map(rec => (
                        <div key={rec.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="truncate pr-2">
                            <span className="font-semibold text-slate-800 block truncate">{rec.label}</span>
                            {rec.secondaryLabel && (
                              <span className="text-[10px] text-slate-500 block truncate">{rec.secondaryLabel}</span>
                            )}
                          </div>
                          {rec.metricValue && (
                            <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0">
                              {rec.metricValue}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateTab(action.drilldownTab);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 transition-colors"
                  >
                    <span>Inspect in {action.drilldownTab.toUpperCase()}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
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
            Close Action Center
          </button>
        </div>

      </div>
    </div>
  );
};
