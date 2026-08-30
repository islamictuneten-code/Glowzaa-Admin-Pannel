import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Eye, 
  Check, 
  X, 
  Sliders, 
  TrendingUp, 
  UserCheck, 
  MapPin, 
  Package, 
  DollarSign,
  Info,
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { BusinessAlert } from '../../types';
import { generateAdvancedBusinessAlerts, getStoredAlertSettings, getStoredAlertStatuses, saveStoredAlertStatuses } from '../../utils/businessAlertEngine';

export const BusinessAlertsActionCenter: React.FC = () => {
  const { 
    customers, 
    orders, 
    payments, 
    products, 
    staffUsers, 
    visits, 
    fieldDutySessions,
    setViewingCustomer 
  } = useApp();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('30days');
  const [alertStatuses, setAlertStatuses] = useState<Record<string, 'unread' | 'read' | 'dismissed' | 'actioned'>>(() => getStoredAlertStatuses());
  const [selectedAlertForDrawer, setSelectedAlertForDrawer] = useState<BusinessAlert | null>(null);

  const isSalesStaff = currentUser?.role === 'sales';

  // Generate alerts using real app state & settings
  const alerts = useMemo(() => {
    const settings = getStoredAlertSettings();
    const rawAlerts = generateAdvancedBusinessAlerts(
      customers,
      orders,
      payments,
      staffUsers,
      visits,
      fieldDutySessions,
      products,
      settings,
      currentUser
    );

    // Apply local status overrides
    return rawAlerts.map(a => ({
      ...a,
      status: alertStatuses[a.id] || a.status || 'unread'
    }));
  }, [customers, orders, payments, staffUsers, visits, fieldDutySessions, products, alertStatuses, currentUser]);

  // KPI calculations
  const kpis = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let positive = 0;
    let unreadCount = 0;

    alerts.forEach(a => {
      if (a.severity === 'critical') critical++;
      else if (a.severity === 'high' || a.severity === 'warning') high++;
      else if (a.severity === 'medium' || a.severity === 'low') medium++;
      else if (a.severity === 'positive' || a.severity === 'opportunity') positive++;

      if (a.status === 'unread') unreadCount++;
    });

    return { critical, high, medium, positive, unreadCount, total: alerts.length };
  }, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      // Severity filter
      if (selectedSeverity !== 'all') {
        if (selectedSeverity === 'critical' && a.severity !== 'critical') return false;
        if (selectedSeverity === 'high' && a.severity !== 'high' && a.severity !== 'warning') return false;
        if (selectedSeverity === 'medium' && a.severity !== 'medium' && a.severity !== 'low') return false;
        if (selectedSeverity === 'positive' && a.severity !== 'positive' && a.severity !== 'opportunity') return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && a.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && a.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchDesc = a.description.toLowerCase().includes(q);
        const matchEntity = a.entityName?.toLowerCase().includes(q) || false;
        const matchSeller = a.relatedUserName?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchDesc && !matchEntity && !matchSeller) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort priority: critical (3), high (2), medium (1), positive (0), then newest
      const weight: Record<string, number> = { critical: 3, high: 2, warning: 2, medium: 1, low: 1, positive: 0, opportunity: 0 };
      const wA = weight[a.severity] || 0;
      const wB = weight[b.severity] || 0;
      if (wA !== wB) return wB - wA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts, selectedSeverity, selectedCategory, selectedStatus, searchQuery]);

  const handleUpdateStatus = (alertId: string, newStatus: 'unread' | 'read' | 'dismissed' | 'actioned') => {
    const updated = { ...alertStatuses, [alertId]: newStatus };
    setAlertStatuses(updated);
    saveStoredAlertStatuses(updated);
    if (selectedAlertForDrawer && selectedAlertForDrawer.id === alertId) {
      setSelectedAlertForDrawer({ ...selectedAlertForDrawer, status: newStatus });
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">🔴 Critical</span>;
      case 'high':
      case 'warning':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">🟠 High Priority</span>;
      case 'medium':
      case 'low':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">🔵 Medium</span>;
      case 'positive':
      case 'opportunity':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 Positive</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">⚪ Info</span>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'credit': return <DollarSign className="w-4 h-4 text-rose-600" />;
      case 'sales': return <TrendingUp className="w-4 h-4 text-teal-600" />;
      case 'customer': return <UserCheck className="w-4 h-4 text-indigo-600" />;
      case 'field': return <MapPin className="w-4 h-4 text-amber-600" />;
      case 'product': return <Package className="w-4 h-4 text-purple-600" />;
      default: return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Business Alerts & Action Center</h1>
          </div>
          <p className="text-sm text-gray-500">
            Important customer, sales, credit and field activity requiring attention.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-400 block">Active Intelligence</span>
            <span className="text-sm font-semibold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
              {kpis.total} Total Alerts ({kpis.unreadCount} Unread)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setSelectedSeverity('critical')}
          className={`bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition hover:border-red-300 ${selectedSeverity === 'critical' ? 'ring-2 ring-red-500 border-red-300' : 'border-gray-100'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-red-600 uppercase tracking-wider">Critical Priority</span>
            <span className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.critical}</div>
          <p className="text-xs text-gray-500 mt-1">Requires immediate intervention</p>
        </div>

        <div 
          onClick={() => setSelectedSeverity('high')}
          className={`bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition hover:border-amber-300 ${selectedSeverity === 'high' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-gray-100'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">High Priority</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.high}</div>
          <p className="text-xs text-gray-500 mt-1">Watch list & declining trends</p>
        </div>

        <div 
          onClick={() => setSelectedSeverity('medium')}
          className={`bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition hover:border-blue-300 ${selectedSeverity === 'medium' ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-100'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Medium / Inactive</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.medium}</div>
          <p className="text-xs text-gray-500 mt-1">Follow-up recommended</p>
        </div>

        <div 
          onClick={() => setSelectedSeverity('positive')}
          className={`bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition hover:border-emerald-300 ${selectedSeverity === 'positive' ? 'ring-2 ring-emerald-500 border-emerald-300' : 'border-gray-100'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Positive Insights</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.positive}</div>
          <p className="text-xs text-gray-500 mt-1">Growth & target achievements</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by customer name, seller, or alert title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-teal-600"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium</option>
              <option value="positive">Positive</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-teal-600"
            >
              <option value="all">All Categories</option>
              <option value="credit">Credit</option>
              <option value="customer">Customer</option>
              <option value="sales">Sales</option>
              <option value="field">Field</option>
              <option value="product">Product</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-teal-600"
            >
              <option value="all">All Statuses</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="actioned">Actioned</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Feed / Cards */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Everything looks healthy</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              No business alerts require your attention right now. All credit limits, sales targets, and field metrics are within normal parameters.
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border transition hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                alert.status === 'unread' ? 'border-l-4 border-l-teal-600 bg-teal-50/20' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 shrink-0 mt-1">
                  {getCategoryIcon(alert.category)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(alert.severity)}
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {alert.category}
                    </span>
                    {alert.status === 'unread' && (
                      <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 hover:text-teal-700 cursor-pointer" onClick={() => setSelectedAlertForDrawer(alert)}>
                    {alert.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="flex items-center gap-4 pt-2 text-xs text-gray-500 flex-wrap">
                    {alert.entityName && (
                      <span className="font-medium text-gray-800 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                        Entity: {alert.entityName}
                      </span>
                    )}
                    {alert.relatedUserName && (
                      <span className="text-gray-600">
                        Assigned Seller: <strong className="text-gray-800">{alert.relatedUserName}</strong>
                      </span>
                    )}
                    {alert.metric && (
                      <span className="text-teal-700 font-semibold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                        {alert.metric}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                <button
                  onClick={() => setSelectedAlertForDrawer(alert)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Details
                </button>

                {alert.actionType === 'view_customer_360' && alert.entityId && (
                  <button
                    onClick={() => {
                      const cust = customers.find(c => c.id === alert.entityId);
                      if (cust) setViewingCustomer(cust);
                    }}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1"
                  >
                    View 360° <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {alert.status === 'unread' ? (
                  <button
                    onClick={() => handleUpdateStatus(alert.id, 'read')}
                    className="p-2 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-gray-50"
                    title="Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(alert.id, 'unread')}
                    className="p-2 text-teal-600 rounded-lg bg-teal-50"
                    title="Mark as Unread"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleUpdateStatus(alert.id, 'dismissed')}
                  className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-50"
                  title="Dismiss Alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Detail Drawer */}
      {selectedAlertForDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(selectedAlertForDrawer.severity)}
                  <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                    {selectedAlertForDrawer.category} Alert
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedAlertForDrawer(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedAlertForDrawer.title}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedAlertForDrawer.description}
                </p>
              </div>

              {/* Metric Breakdown Box */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Deterministic Metrics</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-400 block mb-1">Previous / Limit</span>
                    <span className="text-sm font-bold text-gray-800">{selectedAlertForDrawer.previousValue || 'N/A'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-400 block mb-1">Current Value</span>
                    <span className="text-sm font-bold text-teal-700">{selectedAlertForDrawer.currentValue || 'N/A'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <span className="text-xs text-gray-400 block mb-1">Variance / Change</span>
                    <span className="text-sm font-bold text-gray-800">{selectedAlertForDrawer.changePercent || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Entity Context */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Entity & Assignment</h4>
                <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-teal-700 font-semibold block">{selectedAlertForDrawer.entityType.toUpperCase()}</span>
                    <span className="text-base font-bold text-gray-900">{selectedAlertForDrawer.entityName || 'General System'}</span>
                  </div>
                  {selectedAlertForDrawer.relatedUserName && (
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Assigned Seller</span>
                      <span className="text-sm font-semibold text-gray-800">{selectedAlertForDrawer.relatedUserName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Management */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Action Status</h4>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedAlertForDrawer.id, 'unread')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${selectedAlertForDrawer.status === 'unread' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAlertForDrawer.id, 'read')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${selectedAlertForDrawer.status === 'read' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Read
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAlertForDrawer.id, 'actioned')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${selectedAlertForDrawer.status === 'actioned' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Actioned
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAlertForDrawer.id, 'dismissed')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${selectedAlertForDrawer.status === 'dismissed' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Dismissed
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-6 border-t flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedAlertForDrawer(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
              >
                Close Drawer
              </button>

              {selectedAlertForDrawer.actionType === 'view_customer_360' && selectedAlertForDrawer.entityId && (
                <button
                  onClick={() => {
                    const cust = customers.find(c => c.id === selectedAlertForDrawer.entityId);
                    if (cust) {
                      setViewingCustomer(cust);
                      setSelectedAlertForDrawer(null);
                    }
                  }}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition shadow-sm flex items-center gap-2"
                >
                  View Customer 360° <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
