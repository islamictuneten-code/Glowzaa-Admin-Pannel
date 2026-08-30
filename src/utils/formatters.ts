/**
 * Utility currency and string formatters for Glowzaa B2B Commerce
 */

export const formatBDT = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num) || num === null || num === undefined) return '৳0';
  return '৳' + Math.round(num).toLocaleString('en-IN');
};

export const formatBDTWithDecimals = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num) || num === null || num === undefined) return '৳0.00';
  return '৳' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
  } catch {
    return dateStr;
  }
};
