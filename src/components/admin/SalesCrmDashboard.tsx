import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  fetchCrmTasks,
  createCrmTask,
  updateCrmTaskStatus,
  reassignCrmTask,
  snoozeCrmTask,
  fetchCrmSettings,
  saveCrmSettings,
  exportCrmTasksCSV,
  CrmTask,
  CrmSettings,
  DEFAULT_CRM_SETTINGS,
  CrmOutcome,
  CrmStatus
} from '../../services/salesCrmService';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  DollarSign,
  Search,
  Download,
  Settings,
  Plus,
  Phone,
  MessageSquare,
  Building2,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  User
} from 'lucide-react';

export const SalesCrmDashboard: React.FC = () => {
  const { customers, currentUser, staff, setTab } = useApp();

  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CrmSettings>(DEFAULT_CRM_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTaskForComplete, setSelectedTaskForComplete] = useState<CrmTask | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [completeOutcome, setCompleteOutcome] = useState<CrmOutcome>('POSITIVE');
  const [completeNote, setCompleteNote] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  const isSeller = currentUser?.role === 'seller';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [fetchedTasks, fetchedSettings] = await Promise.all([
      fetchCrmTasks(),
      fetchCrmSettings()
    ]);
    setTasks(fetchedTasks);
    setSettings(fetchedSettings);
    setLoading(false);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // If user is seller, restrict to assigned tasks
      if (isSeller && t.assignedTo !== currentUser?.id && t.assignedTo !== currentUser?.uid && t.sellerId !== currentUser?.id) {
        return false;
      }

      const matchQuery = t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.customerCode.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchQuery) return false;

      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
      if (selectedType !== 'all' && t.taskType !== selectedType) return false;

      return true;
    });
  }, [tasks, searchQuery, selectedStatus, selectedPriority, selectedType, isSeller, currentUser]);

  const kpis = useMemo(() => {
    const total = filteredTasks.length;
    const pending = filteredTasks.filter(t => t.status === 'PENDING').length;
    const overdue = filteredTasks.filter(t => t.status === 'OVERDUE').length;
    const completed = filteredTasks.filter(t => t.status === 'COMPLETED').length;
    const totalSales = filteredTasks.reduce((sum, t) => sum + (t.generatedSalesAmount || 0), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, pending, overdue, completed, totalSales, completionRate };
  }, [filteredTasks]);

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForComplete || !currentUser) return;

    await updateCrmTaskStatus(
      selectedTaskForComplete.id,
      'COMPLETED',
      completeOutcome,
      completeNote,
      nextAction,
      nextFollowUpDate || null,
      currentUser
    );

    setShowCompleteModal(false);
    setSelectedTaskForComplete(null);
    setCompleteNote('');
    setNextAction('');
    setNextFollowUpDate('');
    loadData();
  };

  const handleExportCSV = () => {
    exportCrmTasksCSV(filteredTasks);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-[#0F766E]" />
            {isSeller ? "My Sales CRM & Tasks" : "Admin Sales CRM & Seller Accountability"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Actionable B2B follow-up tasks, reorder cycles, churn recovery, and conversion attribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isSeller && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              CRM Settings
            </button>
          )}
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</p>
            <CheckSquare className="w-5 h-5 text-[#0F766E]" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.total}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span>Completion Rate: <strong className="text-emerald-600">{kpis.completionRate}%</strong></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-gradient-to-br from-amber-50/20 to-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Tasks</p>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-2">{kpis.pending}</p>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-1 font-medium">
            <span>Requires seller follow-up</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs bg-gradient-to-br from-red-50/20 to-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Overdue Tasks</p>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900 mt-2">{kpis.overdue}</p>
          <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1 font-medium">
            <span>Urgent attention needed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-gradient-to-br from-emerald-50/20 to-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Attributed Sales</p>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-2">৳{kpis.totalSales.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 mt-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{kpis.completed} Completed Follow-ups</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, task title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="SNOOZED">Snoozed</option>
          </select>

          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="all">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="all">All Task Types</option>
            <option value="REORDER_FOLLOW_UP">Reorder Follow-up</option>
            <option value="CHURN_RECOVERY">Churn Recovery</option>
            <option value="HIGH_VALUE_FOLLOW_UP">High-Value Follow-up</option>
            <option value="CROSS_SELL">Cross-sell</option>
            <option value="UPSELL">Upsell</option>
          </select>
        </div>
      </div>

      {/* Task List / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Priority / Task</th>
                <th className="p-4">Customer & Code</th>
                <th className="p-4">Assigned Seller</th>
                <th className="p-4">Due Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No CRM tasks found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          t.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          t.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          t.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {t.priority}
                        </span>
                        <span className="font-semibold text-slate-900">{t.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{t.reason}</p>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{t.customerName}</div>
                      <div className="text-xs text-slate-500">Code: {t.customerCode} • {t.territory}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 font-medium">{t.assignedToName}</div>
                      <div className="text-xs text-slate-500 capitalize">{t.assignedToRole}</div>
                    </td>
                    <td className="p-4 text-slate-700 text-xs font-medium">
                      {t.dueAt ? t.dueAt.slice(0, 10) : 'N/A'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        t.status === 'SNOOZED' ? 'bg-purple-100 text-purple-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {t.status !== 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setSelectedTaskForComplete(t);
                            setShowCompleteModal(true);
                          }}
                          className="px-3 py-1.5 bg-[#0F766E] text-white rounded-lg text-xs font-medium hover:bg-[#0D625C] transition-colors"
                        >
                          Complete Task
                        </button>
                      )}
                      <button
                        onClick={() => setTab('customers')}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                      >
                        View Customer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Task Modal */}
      {showCompleteModal && selectedTaskForComplete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Complete Follow-up: {selectedTaskForComplete.customerName}
              </h3>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Outcome *</label>
                <select
                  value={completeOutcome}
                  onChange={e => setCompleteOutcome(e.target.value as CrmOutcome)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="POSITIVE">Positive Follow-up</option>
                  <option value="INTERESTED">Customer Interested</option>
                  <option value="ORDER_EXPECTED">Order Expected Soon</option>
                  <option value="ORDER_PLACED">Order Placed</option>
                  <option value="NEEDS_MORE_TIME">Needs More Time</option>
                  <option value="PRICE_ISSUE">Price / Discount Issue</option>
                  <option value="STOCK_ISSUE">Stock / Availability Issue</option>
                  <option value="CREDIT_ISSUE">Credit / Due Issue</option>
                  <option value="NO_RESPONSE">No Response</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Outcome Note / Discussion Summary *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize the discussion with the customer..."
                  value={completeNote}
                  onChange={e => setCompleteNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Next Action</label>
                <input
                  type="text"
                  placeholder="e.g. Follow up with quotation or sample"
                  value={nextAction}
                  onChange={e => setNextAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Next Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={e => setNextFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F766E] text-white rounded-lg text-sm font-medium hover:bg-[#0D625C]"
                >
                  Submit & Complete Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#0F766E]" />
                CRM Automation & Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Default Due Interval (Days)</label>
                <input
                  type="number"
                  defaultValue={settings.defaultDueDays}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Attribution Window (Days)</label>
                <input
                  type="number"
                  defaultValue={settings.attributionWindowDays}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await saveCrmSettings(settings, currentUser!);
                    setShowSettingsModal(false);
                    alert('CRM settings saved successfully.');
                  }}
                  className="px-4 py-2 bg-[#0F766E] text-white rounded-lg text-sm font-medium hover:bg-[#0D625C]"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
