export type DateRangePreset = 
  | 'all' 
  | 'today' 
  | 'yesterday' 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'this_month' 
  | 'last_month' 
  | 'custom';

export interface DateRangeState {
  preset: DateRangePreset;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
}

export const DEFAULT_DATE_RANGE: DateRangeState = {
  preset: 'all',
  startDate: '',
  endDate: ''
};

export const PRESET_OPTIONS: { id: DateRangePreset; label: string; bengaliLabel: string }[] = [
  { id: 'all', label: 'All Time', bengaliLabel: 'সব সময়' },
  { id: 'today', label: 'Today', bengaliLabel: 'আজকে' },
  { id: 'yesterday', label: 'Yesterday', bengaliLabel: 'গতকাল' },
  { id: 'last_7_days', label: 'Last 7 Days', bengaliLabel: 'গত ৭ দিন' },
  { id: 'last_30_days', label: 'Last 30 Days', bengaliLabel: 'গত ৩০ দিন' },
  { id: 'this_month', label: 'This Month', bengaliLabel: 'চলতি মাস' },
  { id: 'last_month', label: 'Last Month', bengaliLabel: 'গত মাস' },
  { id: 'custom', label: 'Custom Range', bengaliLabel: 'কাস্টম তারিখ' }
];

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 */
export function formatDateToYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate start and end dates (YYYY-MM-DD) for a given preset
 */
export function getPresetDateRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = formatDateToYYYYMMDD(now);

  if (preset === 'all') {
    return { startDate: '', endDate: '' };
  }

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }

  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yStr = formatDateToYYYYMMDD(y);
    return { startDate: yStr, endDate: yStr };
  }

  if (preset === 'last_7_days') {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    return { startDate: formatDateToYYYYMMDD(past7), endDate: todayStr };
  }

  if (preset === 'last_30_days') {
    const past30 = new Date(now);
    past30.setDate(past30.getDate() - 29);
    return { startDate: formatDateToYYYYMMDD(past30), endDate: todayStr };
  }

  if (preset === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: formatDateToYYYYMMDD(startOfMonth),
      endDate: formatDateToYYYYMMDD(endOfMonth)
    };
  }

  if (preset === 'last_month') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: formatDateToYYYYMMDD(startOfLastMonth),
      endDate: formatDateToYYYYMMDD(endOfLastMonth)
    };
  }

  return { startDate: '', endDate: '' };
}

/**
 * Extract clean YYYY-MM-DD from any date field
 */
export function extractDateString(dateVal: string | number | Date | undefined | null): string | null {
  if (!dateVal) return null;

  if (dateVal instanceof Date) {
    return formatDateToYYYYMMDD(dateVal);
  }

  if (typeof dateVal === 'number') {
    return formatDateToYYYYMMDD(new Date(dateVal));
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  if (str.toLowerCase() === 'today') {
    return formatDateToYYYYMMDD(new Date());
  }

  if (str.toLowerCase() === 'yesterday') {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return formatDateToYYYYMMDD(y);
  }

  // If match YYYY-MM-DD format directly
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  // Attempt standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatDateToYYYYMMDD(parsed);
  }

  return null;
}

/**
 * Checks if a given date value falls within the specified DateRangeState
 */
export function isWithinDateRange(
  dateVal: string | number | Date | undefined | null,
  range: DateRangeState
): boolean {
  if (!range || range.preset === 'all' || (!range.startDate && !range.endDate)) {
    return true;
  }

  const targetDateStr = extractDateString(dateVal);
  if (!targetDateStr) {
    return false;
  }

  if (range.startDate && targetDateStr < range.startDate) {
    return false;
  }

  if (range.endDate && targetDateStr > range.endDate) {
    return false;
  }

  return true;
}
