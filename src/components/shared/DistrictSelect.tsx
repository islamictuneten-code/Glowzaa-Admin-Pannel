import React from 'react';
import { BANGLADESH_DIVISIONS_AND_DISTRICTS, ALL_64_BD_DISTRICTS } from '../../data/bangladeshDistricts';

interface DistrictSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  className?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
}

export const DistrictSelect: React.FC<DistrictSelectProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  includeAllOption = false,
  allOptionLabel = 'All Districts (64)',
  ...props
}) => {
  // Check if current value exists in the official 64 districts
  const isCustomOrLegacy = value && value !== 'all' && !ALL_64_BD_DISTRICTS.includes(value);

  return (
    <select
      value={value}
      onChange={onChange}
      required={required}
      className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-[#7C3AED] text-xs transition-colors ${className}`}
      {...props}
    >
      {includeAllOption && (
        <option value="all">{allOptionLabel}</option>
      )}

      {/* Preserve legacy / custom district if present in existing customer record */}
      {isCustomOrLegacy && (
        <option value={value} className="text-amber-700 bg-amber-50 font-medium">
          {value} (Legacy / Custom)
        </option>
      )}

      {BANGLADESH_DIVISIONS_AND_DISTRICTS.map((group) => (
        <optgroup key={group.division} label={group.division} className="font-semibold text-slate-800 bg-slate-100/90 py-1">
          {group.districts.map((district) => (
            <option key={district} value={district} className="font-normal text-slate-900 bg-white py-1">
              {district}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};
