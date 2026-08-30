import React, { useState, useMemo } from 'react';
import { CustomerProfitabilityItem, ExecutiveBISettings, Customer } from '../../../types';
import { formatBDT } from '../../../utils/formatters';
import { exportExecutiveReportCSV } from '../../../services/executiveBIService';
import { useApp } from '../../../context/AppContext';
import { 
  Search, 
  Filter, 
  Download, 
  Users, 
  Clock, 
  AlertCircle, 
  ArrowUpDown, 
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Phone,
  MapPin
} from 'lucide-react';

interface CustomerProfitabilityTabProps {
  items: CustomerProfitabilityItem[];
  settings: ExecutiveBISettings;
}

export const CustomerProfitabilityTab: React.FC<CustomerProfitabilityTabProps> = ({
  items,
  settings
}) => {
  const { setViewingCustomer, setAdminTab, customers } = useApp() || {};
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [inactiveOnly, setInactiveOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'sales' | 'profit' | 'margin' | 'due' | 'dormant'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const inactiveCount = items.filter(c => c.isInactive).length;
  const highDueCount = items.filter(c => c.currentDueBDT > 50000).length;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = 
        item.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone.includes(searchTerm) ||
        item.district.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchSegment = segmentFilter === 'all' || item.segment === segmentFilter;
      const matchInactive = !inactiveOnly || item.isInactive;

      return matchSearch && matchSegment && matchInactive;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === 'sales') {
        valA = a.netSalesBDT;
        valB = b.netSalesBDT;
      } else if (sortBy === 'profit') {
        valA = a.grossProfitBDT || -999999;
        valB = b.grossProfitBDT || -999999;
      } else if (sortBy === 'margin') {
        valA = a.grossMarginPercent || -999;
        valB = b.grossMarginPercent || -999;
      } else if (sortBy === 'due') {
        valA = a.currentDueBDT;
        valB = b.currentDueBDT;
      } else if (sortBy === 'dormant') {
        valA = a.daysSinceLastOrder || 0;
        valB = b.daysSinceLastOrder || 0;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [items, searchTerm, segmentFilter, inactiveOnly, sortBy, sortOrder]);

  const handleExportCSV = () => {
    exportExecutiveReportCSV('customers', { customers: filteredItems });
  };

  const handleDrilldownCustomer = (customerId: string) => {
    const found = customers?.find(c => c.id === customerId);
    if (found && setViewingCustomer) {
      setViewingCustomer(found);
      if (setAdminTab) setAdminTab('customers');
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Informational Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Inactive Customer Radar Card */}
        <div 
          onClick={() => setInactiveOnly(!inactiveOnly)}
          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
            inactiveOnly 
              ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400' 
              : 'bg-amber-50 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Dormant Retailers Radar ({settings.inactiveCustomerDays}d+)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                {inactiveCount} Retailers
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1">
              Wholesale accounts with no order in the last {settings.inactiveCustomerDays} days. Click to filter dormant accounts.
            </p>
          </div>
        </div>

        {/* Total Market Receivables Card */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-xl bg-teal-200 text-teal-900 flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                Customer Profitability Stack
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 font-mono">
                {items.length} Tracked Accounts
              </span>
            </div>
            <p className="text-xs text-teal-800 mt-1">
              Revenue, authoritative gross margin, and credit exposure aggregated by wholesale partner.
            </p>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search shop, owner, phone, or district..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Segment & Inactive Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          <select
            value={segmentFilter}
            onChange={e => setSegmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">All Segments</option>
            <option value="HIGH VALUE">High Value</option>
            <option value="GROWING">Growing</option>
            <option value="STABLE">Stable</option>
            <option value="AT RISK">At Risk</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

        </div>

      </div>

      {/* Customers Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Retail Shop & Owner</th>
                <th className="py-3.5 px-3">Location & Sales Rep</th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'sales') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('sales'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Net Sales</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'profit') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('profit'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Gross Profit</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'margin') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('margin'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Margin %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'due') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('due'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Market Due</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortBy === 'dormant') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('dormant'); setSortOrder('desc'); }
                  }}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Last Order</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No customers found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(cust => (
                  <tr key={cust.customerId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{cust.shopName}</div>
                      <div className="text-[11px] text-slate-500">{cust.ownerName} • {cust.phone}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="text-slate-900 font-semibold">{cust.district}</div>
                      <div className="text-[10px] text-slate-400">{cust.assignedSalesUserName || 'Unassigned'}</div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                      {formatBDT(cust.netSalesBDT)}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-bold ${
                      cust.grossProfitBDT !== null && cust.grossProfitBDT > 0 ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {cust.grossProfitBDT !== null ? formatBDT(cust.grossProfitBDT) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {cust.grossMarginPercent !== null ? (
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                          cust.grossMarginPercent >= 25 ? 'bg-emerald-50 text-emerald-700' :
                          cust.grossMarginPercent >= 15 ? 'bg-teal-50 text-teal-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {cust.grossMarginPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-700">
                      {cust.currentDueBDT > 0 ? formatBDT(cust.currentDueBDT) : '৳0'}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {cust.daysSinceLastOrder !== null ? (
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          cust.daysSinceLastOrder >= settings.inactiveCustomerDays 
                            ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                            : 'text-slate-600'
                        }`}>
                          {cust.daysSinceLastOrder}d ago
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No orders</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDrilldownCustomer(cust.customerId)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                        title="Open Customer 360 Profile & Ledger"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
