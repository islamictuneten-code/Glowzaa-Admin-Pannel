import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  ChevronDown, 
  Check, 
  Clock, 
  Filter, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  DateRangePreset, 
  DateRangeState, 
  PRESET_OPTIONS, 
  getPresetDateRange, 
  DEFAULT_DATE_RANGE 
} from '../../lib/dateUtils';

interface DateRangeFilterProps {
  value: DateRangeState;
  onChange: (range: DateRangeState) => void;
  className?: string;
  compact?: boolean;
  totalCount?: number;
  filteredCount?: number;
  label?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  className = '',
  compact = false,
  totalCount,
  filteredCount,
  label = 'Filter by Date'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate || '');
  const [customEnd, setCustomEnd] = useState(value.endDate || '');

  const isFiltered = value.preset !== 'all' || Boolean(value.startDate || value.endDate);

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      onChange({
        preset: 'custom',
        startDate: customStart,
        endDate: customEnd
      });
      return;
    }

    const { startDate, endDate } = getPresetDateRange(preset);
    setCustomStart(startDate);
    setCustomEnd(endDate);
    onChange({
      preset,
      startDate,
      endDate
    });
    setIsOpen(false);
  };

  const handleCustomApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onChange({
      preset: 'custom',
      startDate: customStart,
      endDate: customEnd
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setCustomStart('');
    setCustomEnd('');
    onChange(DEFAULT_DATE_RANGE);
    setIsOpen(false);
  };

  const currentPresetInfo = PRESET_OPTIONS.find(p => p.id === value.preset) || PRESET_OPTIONS[0];

  // Helper label text
  const getFilterSummaryText = () => {
    if (value.preset === 'all' || (!value.startDate && !value.endDate)) {
      return 'All Dates (সব তারিখ)';
    }
    if (value.preset === 'today') return 'Today (আজকের ডেটা)';
    if (value.preset === 'yesterday') return 'Yesterday (গতকাল)';
    if (value.preset === 'last_7_days') return 'Last 7 Days (গত ৭ দিন)';
    if (value.preset === 'last_30_days') return 'Last 30 Days (গত ৩০ দিন)';
    if (value.preset === 'this_month') return 'This Month (চলতি মাস)';
    if (value.preset === 'last_month') return 'Last Month (গত মাস)';
    
    if (value.startDate && value.endDate) {
      if (value.startDate === value.endDate) return value.startDate;
      return `${value.startDate} → ${value.endDate}`;
    }
    if (value.startDate) return `From ${value.startDate}`;
    if (value.endDate) return `Until ${value.endDate}`;
    return 'Custom Range';
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
            isFiltered
              ? 'bg-teal-50/90 text-[#087F7A] border-teal-300 ring-2 ring-teal-500/15'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
          title="Filter data by specific date or date range"
        >
          <CalendarIcon className={`w-3.5 h-3.5 ${isFiltered ? 'text-[#087F7A]' : 'text-slate-400'}`} />
          
          <span className="truncate max-w-[160px] sm:max-w-[200px]">
            {getFilterSummaryText()}
          </span>

          <ChevronDown className={`w-3.5 h-3.5 transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Clear Filter Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
            title="Reset Date Filter (তারিখ ফিল্টার মুছুন)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Count indicator if provided */}
        {typeof filteredCount === 'number' && typeof totalCount === 'number' && isFiltered && (
          <span className="text-[11px] font-medium text-teal-800 bg-teal-50/80 border border-teal-200/80 px-2 py-1 rounded-lg">
            {filteredCount} of {totalCount} records
          </span>
        )}
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 text-left">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Filter className="w-3.5 h-3.5 text-[#087F7A]" />
                <span>তারিখ অনুযায়ী ফিল্টার করুন</span>
              </div>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>রিসেট করুন</span>
                </button>
              )}
            </div>

            {/* Quick Presets Grid */}
            <div className="py-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                কুইক অপশন (Quick Presets)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_OPTIONS.map((opt) => {
                  const isSelected = value.preset === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePresetSelect(opt.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#087F7A] text-white font-bold shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-[#087F7A]'
                      }`}
                    >
                      <div className="truncate">
                        <span>{opt.label}</span>
                        <span className={`block text-[10px] truncate ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                          {opt.bengaliLabel}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Range Form */}
            <form onSubmit={handleCustomApply} className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                কাস্টম তারিখ নির্বাচন (Select Date Range)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    শুরুর তারিখ (Start)
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#087F7A] focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    শেষ তারিখ (End)
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#087F7A] focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  বন্ধ করুন
                </button>
                <button
                  type="submit"
                  disabled={!customStart && !customEnd}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#087F7A] hover:bg-[#075E5B] rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  ফিল্টার প্রয়োগ করুন (Apply)
                </button>
              </div>
            </form>

          </div>
        </>
      )}
    </div>
  );
};
