import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  calculateCustomerIntelligence,
  fetchCustomerIntelligenceSettings,
  saveCustomerIntelligenceSettings,
  logCustomerIntelligenceAudit,
  exportCustomerIntelligenceCSV,
  CustomerIntelligenceProfile,
  CustomerIntelligenceKPIs,
  CustomerIntelligenceSettings,
  DEFAULT_CUSTOMER_INTELLIGENCE_SETTINGS
} from '../../services/customerIntelligenceService';
import {
  Users,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  Award,
  DollarSign,
  Search,
  Download,
  Settings,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  Building2
} from 'lucide-react';

export const CustomerIntelligenceDashboard: React.FC = () => {
  const { customers, orders, products, currentUser } = useApp();

  const [settings, setSettings] = useState<CustomerIntelligenceSettings>(DEFAULT_CUSTOMER_INTELLIGENCE_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');

  useEffect(() => {
    fetchCustomerIntelligenceSettings().then(s => {
      setSettings(s);
      setLoadingSettings(false);
    });
  }, []);

  const { profiles, kpis } = useMemo(() => {
    return calculateCustomerIntelligence(customers, orders, products, settings);
  }, [customers, orders, products, settings]);

  useEffect(() => {
    if (currentUser && profiles.length > 0) {
      logCustomerIntelligenceAudit('CUSTOMER_INTELLIGENCE_VIEWED', currentUser, undefined, 'Admin viewed Customer Intelligence Dashboard');
    }
  }, [currentUser]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const matchQuery = p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.territory.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.phone.includes(searchQuery);
      if (!matchQuery) return false;

      if (selectedSegment !== 'all' && p.rfmSegment !== selectedSegment) return false;
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
      if (selectedRisk !== 'all' && p.churnRisk !== selectedRisk) return false;

      return true;
    });
  }, [profiles, searchQuery, selectedSegment, selectedStatus, selectedRisk]);

  const handleExportCSV = () => {
    exportCustomerIntelligenceCSV(filteredProfiles);
    if (currentUser) {
      logCustomerIntelligenceAudit('CUSTOMER_INTELLIGENCE_EXPORTED', currentUser, undefined, `Exported ${filteredProfiles.length} customer records to CSV`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const activeWindowDays = Number((form.elements.namedItem('activeWindowDays') as HTMLInputElement)?.value) || 30;
    const dormantDays = Number((form.elements.namedItem('dormantDays') as HTMLInputElement)?.value) || 60;
    const churnWarningDays = Number((form.elements.namedItem('churnWarningDays') as HTMLInputElement)?.value) || 45;
    const highValueThreshold = Number((form.elements.namedItem('highValueThreshold') as HTMLInputElement)?.value) || 500000;

    const updated: CustomerIntelligenceSettings = {
      ...settings,
      activeWindowDays,
      dormantDays,
      churnWarningDays,
      highValueThreshold
    };

    await saveCustomerIntelligenceSettings(updated, currentUser!);
    setSettings(updated);
    setShowSettingsModal(false);
    alert('Customer Intelligence settings updated successfully.');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-[#0F766E]" />
            Customer & Sales Growth Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Predictive RFM segmentation, churn risk detection, reorder cycles, and lifetime value analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-2"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Configure Thresholds
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-lg text-sm font-medium hover:bg-[#0D625C] transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
            <Users className="w-5 h-5 text-[#0F766E]" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.totalCustomers}</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1 font-medium">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{kpis.activeCustomers} Active & {kpis.newCustomers} New</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Sales</p>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">৳{kpis.totalNetSales.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span>Outstanding Dues: <strong className="text-red-600">৳{kpis.totalOutstandingDue.toLocaleString()}</strong></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs bg-gradient-to-br from-red-50/20 to-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Churn Risk / At-Risk</p>
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900 mt-2">{kpis.churnRiskCustomers + kpis.atRiskCustomers}</p>
          <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{kpis.dormantCustomers} Dormant accounts requiring follow-up</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Customer Health</p>
            <Award className="w-5 h-5 text-[#0F766E]" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.averageHealthScore}/100</p>
          <div className="flex items-center gap-1.5 text-xs text-[#0F766E] mt-1 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{kpis.highValueCustomers} High-Value VIP Accounts</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code, territory..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedSegment}
            onChange={e => setSelectedSegment(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="all">All RFM Segments</option>
            <option value="CHAMPION">Champion</option>
            <option value="LOYAL">Loyal</option>
            <option value="HIGH_VALUE_AT_RISK">High-Value At-Risk</option>
            <option value="NEW_CUSTOMER">New Customer</option>
            <option value="HIBERNATING">Hibernating</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="GROWING">Growing</option>
            <option value="AT_RISK">At Risk</option>
            <option value="CHURN_RISK">Churn Risk</option>
            <option value="DORMANT">Dormant</option>
            <option value="NEW">New</option>
          </select>

          <select
            value={selectedRisk}
            onChange={e => setSelectedRisk(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="all">All Churn Risks</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="CRITICAL">Critical Risk</option>
          </select>
        </div>
      </div>

      {/* Customer Intelligence Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Customer & Code</th>
                <th className="p-4">Territory / Seller</th>
                <th className="p-4">Status / Segment</th>
                <th className="p-4 text-right">Net Sales (৳)</th>
                <th className="p-4 text-center">Orders</th>
                <th className="p-4 text-center">Health</th>
                <th className="p-4 text-center">Churn Risk</th>
                <th className="p-4 text-right">Current Due (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No customer intelligence records match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map(p => (
                  <tr key={p.customerId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{p.customerName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Code: {p.customerCode}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{p.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 font-medium">{p.territory}</div>
                      <div className="text-xs text-slate-500">{p.sellerName}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${
                          p.status === 'GROWING' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'ACTIVE' ? 'bg-teal-100 text-teal-800' :
                          p.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                          p.status === 'AT_RISK' ? 'bg-amber-100 text-amber-800' :
                          p.status === 'CHURN_RISK' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {p.status}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">{p.rfmSegment}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-900">
                      ৳{p.netSales.toLocaleString()}
                    </td>
                    <td className="p-4 text-center text-slate-700">
                      {p.completedOrderCount}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                        p.healthScore >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        p.healthScore >= 50 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {p.healthScore}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.churnRisk === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                        p.churnRisk === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        p.churnRisk === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {p.churnRisk}
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold text-red-600">
                      ৳{p.currentDue.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#0F766E]" />
                Customer Intelligence Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Active Window (Days)</label>
                <input
                  type="number"
                  name="activeWindowDays"
                  defaultValue={settings.activeWindowDays}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dormant Threshold (Days)</label>
                <input
                  type="number"
                  name="dormantDays"
                  defaultValue={settings.dormantDays}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Churn Warning Threshold (Days)</label>
                <input
                  type="number"
                  name="churnWarningDays"
                  defaultValue={settings.churnWarningDays}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">High-Value VIP Threshold (৳)</label>
                <input
                  type="number"
                  name="highValueThreshold"
                  defaultValue={settings.highValueThreshold}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F766E] text-white rounded-lg text-sm font-medium hover:bg-[#0D625C]"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
