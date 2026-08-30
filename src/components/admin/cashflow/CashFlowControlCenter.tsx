import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Scale,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Download,
  RefreshCw,
  Building,
  Clock,
  Users,
  Receipt,
  Calculator,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  getCurrentLiquidity,
  getActualCashInflows,
  getActualCashOutflows,
  getNetCashFlow,
  getReceivables,
  getReceivableAging,
  getCollectionPriority,
  getUpcomingPayables,
  getCommittedCash,
  getCashForecast,
  getCashHealthScore,
  runCashScenario,
  getCashFlowDataQuality,
  fetchCashFlowSettings,
  saveCashFlowSettings,
  logCashFlowAudit,
  exportCashFlowReportCSV
} from '../../../services/cashFlowService';
import { formatBDT } from '../../../utils/formatters';
import { CashFlowSettings, CashScenarioParams } from '../../../types';

export const CashFlowControlCenter: React.FC = () => {
  const { payments, cashHandovers, customers, orders, expenses } = useApp() || {};
  const { currentUser } = useAuth() || {};

  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'payables' | 'forecast' | 'quality' | 'settings'>('overview');
  const [settings, setSettings] = useState<CashFlowSettings>({
    id: 'global_cash_settings',
    minimumCashReserve: 300000,
    warningThresholdDays: 21,
    updatedAt: new Date().toISOString()
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [reserveInput, setReserveInput] = useState('300000');

  // Scenario Simulator state
  const [scenarioParams, setScenarioParams] = useState<CashScenarioParams>({
    collectionDelayDays: 7,
    collectionBoostPercent: 10,
    supplierPaymentShiftDays: 7,
    expenseChangePercent: 0,
    salesGrowthPercent: 5
  });

  useEffect(() => {
    fetchCashFlowSettings().then(s => {
      setSettings(s);
      setReserveInput(String(s.minimumCashReserve));
    });
    if (currentUser) {
      logCashFlowAudit('CASH_FLOW_DASHBOARD_VIEWED', currentUser, 'Viewed Financial Control Center');
    }
  }, [currentUser]);

  // Compute Core Financial Metrics
  const liquidity = useMemo(() => getCurrentLiquidity(payments, cashHandovers), [payments, cashHandovers]);
  const actualInflow = useMemo(() => getActualCashInflows(payments, cashHandovers), [payments, cashHandovers]);
  const actualOutflow = useMemo(() => getActualCashOutflows(expenses, payments), [expenses, payments]);
  const netCashFlow = useMemo(() => getNetCashFlow(actualInflow, actualOutflow), [actualInflow, actualOutflow]);
  const receivables = useMemo(() => getReceivables(customers), [customers]);
  const arAging = useMemo(() => getReceivableAging(customers), [customers]);
  const collectionPriorities = useMemo(() => getCollectionPriority(customers), [customers]);
  const upcomingPayables = useMemo(() => getUpcomingPayables(expenses), [expenses]);
  const committedCash = useMemo(() => getCommittedCash(expenses), [expenses]);
  
  const monthlyExpensesEst = useMemo(() => {
    const total = expenses.filter(e => e && !e.deleted && e.status === 'approved').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return Math.max(50000, total);
  }, [expenses]);

  const forecasts = useMemo(() => {
    return getCashForecast(liquidity, receivables, committedCash, monthlyExpensesEst);
  }, [liquidity, receivables, committedCash, monthlyExpensesEst]);

  const cashHealth = useMemo(() => {
    return getCashHealthScore(liquidity, receivables, settings.minimumCashReserve);
  }, [liquidity, receivables, settings.minimumCashReserve]);

  const dataQualityIssues = useMemo(() => {
    return getCashFlowDataQuality(payments, expenses);
  }, [payments, expenses]);

  const scenarioResult = useMemo(() => {
    const exp30 = forecasts.find(f => f.periodLabel === '30 Days')?.expectedCollections || 0;
    return runCashScenario(liquidity.totalKnownLiquidity, exp30, committedCash, scenarioParams);
  }, [liquidity, forecasts, committedCash, scenarioParams]);

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    setIsSavingSettings(true);
    const num = Number(reserveInput) || 300000;
    try {
      await saveCashFlowSettings({ minimumCashReserve: num }, currentUser);
      setSettings(prev => ({ ...prev, minimumCashReserve: num }));
      alert('Minimum cash reserve updated successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to update cash reserve.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExport = () => {
    if (currentUser) {
      logCashFlowAudit('CASH_REPORT_EXPORTED', currentUser, 'Exported CSV Cash Flow Report');
    }
    exportCashFlowReportCSV(liquidity, receivables);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F766E] to-[#115E59] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4" /> Glowzaa B2B Financial Control Center & Liquidity Intelligence
          </div>
          <h1 className="text-2xl font-bold">Cash Flow & Treasury Management</h1>
          <p className="text-teal-100 text-sm mt-1">
            Real-time liquidity, AR/AP collections, cash runway, and risk forecasting. Profit ≠ Cash.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition border border-white/20"
          >
            <Download className="w-4 h-4" /> Export Report CSV
          </button>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-right">
            <div className="text-xs text-teal-200">Cash Health Score</div>
            <div className="text-xl font-bold flex items-center gap-2">
              {cashHealth.score}/100
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                cashHealth.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-200' :
                cashHealth.status === 'WATCH' ? 'bg-amber-500/20 text-amber-200' :
                cashHealth.status === 'RISK' ? 'bg-orange-500/20 text-orange-200' : 'bg-red-500/20 text-red-200'
              }`}>
                {cashHealth.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl px-4 py-2 shadow-sm overflow-x-auto gap-2">
        {[
          { id: 'overview', label: 'Liquidity & Overview', icon: Wallet },
          { id: 'collections', label: 'Collections & Receivables', icon: Users, badge: customers.filter(c => (c.currentDue || 0) > 0).length },
          { id: 'payables', label: 'Payables & Expenses', icon: Receipt },
          { id: 'forecast', label: 'Forecast & Scenarios', icon: TrendingUp },
          { id: 'quality', label: 'Data Quality & Recon', icon: Scale, badge: dataQualityIssues.length },
          { id: 'settings', label: 'Settings & Audit', icon: Sliders }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-[#0F766E] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge ? (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold ${isActive ? 'bg-white text-[#0F766E]' : 'bg-slate-200 text-slate-700'}`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-slate-500 text-sm font-medium mb-1">
                <span>Total Known Liquidity</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatBDT(liquidity.totalKnownLiquidity)}</div>
              <div className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confidence: {liquidity.dataConfidence}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-slate-500 text-sm font-medium mb-1">
                <span>Actual Cash Inflow</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatBDT(actualInflow)}</div>
              <div className="text-xs text-slate-500 mt-1">Verified payments & handovers</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-slate-500 text-sm font-medium mb-1">
                <span>Actual Cash Outflow</span>
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatBDT(actualOutflow)}</div>
              <div className="text-xs text-slate-500 mt-1">Approved expenses & disbursements</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-slate-500 text-sm font-medium mb-1">
                <span>Net Cash Flow</span>
                <Scale className="w-4 h-4 text-teal-600" />
              </div>
              <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatBDT(netCashFlow)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Inflow minus Outflow</div>
            </div>
          </div>

          {/* Current Liquidity Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-[#0F766E]" /> Account Liquidity Distribution
              </h2>
              <div className="space-y-4">
                {liquidity.accounts.map(acc => (
                  <div key={acc.accountId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{acc.accountName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="uppercase px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono text-[10px]">{acc.type}</span>
                        {acc.provider ? `Provider: ${acc.provider}` : 'Manual / Internal'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">{formatBDT(acc.balance)}</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Synced Live</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Cash Risk & Threshold</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Configured minimum cash reserve required for operational safety.
                </p>
                <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                  <div className="text-xs text-teal-700 font-semibold uppercase">Minimum Reserve Threshold</div>
                  <div className="text-xl font-bold text-teal-900 mt-1">{formatBDT(settings.minimumCashReserve)}</div>
                  <div className="text-xs text-teal-600 mt-2">
                    {liquidity.totalKnownLiquidity >= settings.minimumCashReserve ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" /> Liquidity exceeds reserve safely.
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-rose-600">
                        <ShieldAlert className="w-4 h-4" /> Warning: Below minimum reserve!
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                Rule: Profit ≠ Cash. Actual liquidity verified from confirmed payments and cash drawers.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COLLECTIONS & RECEIVABLES */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          {/* Receivables summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold">Total Receivables</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatBDT(receivables.totalReceivable)}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold">Current Due</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">{formatBDT(receivables.currentDue)}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold">Overdue Due</div>
              <div className="text-xl font-bold text-rose-600 mt-1">{formatBDT(receivables.overdueDue)}</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold">Customer Advance Balance</div>
              <div className="text-xl font-bold text-teal-700 mt-1">{formatBDT(receivables.advanceBalance)}</div>
            </div>
          </div>

          {/* AR Aging Buckets */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Accounts Receivable Aging Analysis</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {arAging.map(bucket => (
                <div key={bucket.bucket} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs font-semibold text-slate-500">{bucket.bucket}</div>
                  <div className="text-base font-bold text-slate-900 mt-1">{formatBDT(bucket.amount)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{bucket.customerCount} accounts ({bucket.percentage}%)</div>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Priority List */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0F766E]" /> High-Priority Customer Collections
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">District</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Days Overdue</th>
                    <th className="p-3 text-right">Overdue Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {collectionPriorities.slice(0, 10).map(item => (
                    <tr key={item.customerId} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{item.customerName}</td>
                      <td className="p-3 text-slate-600">{item.district}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          item.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          item.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{item.daysOverdue} days</td>
                      <td className="p-3 text-right font-bold text-rose-600">{formatBDT(item.overdueAmount)}</td>
                    </tr>
                  ))}
                  {collectionPriorities.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">No overdue collections pending.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYABLES & EXPENSES */}
      {activeTab === 'payables' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold">Total Committed Payables & Expenses</div>
              <div className="text-2xl font-bold text-rose-600 mt-1">{formatBDT(committedCash)}</div>
              <div className="text-xs text-slate-500 mt-1">Pending operating expenses & obligations</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold">Estimated Monthly Expenses</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{formatBDT(monthlyExpensesEst)}</div>
              <div className="text-xs text-slate-500 mt-1">Based on approved expense records</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming Payables & Obligations</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50">
                    <th className="p-3">Type</th>
                    <th className="p-3">Payee / Category</th>
                    <th className="p-3">Source Ref</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {upcomingPayables.slice(0, 15).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{item.payeeName}</td>
                      <td className="p-3 text-slate-600 text-xs font-mono">{item.sourceRef}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatBDT(item.amount)}</td>
                    </tr>
                  ))}
                  {upcomingPayables.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">No pending payables or commitments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FORECAST & SCENARIOS */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Cash Forecast Timeline */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Multi-Horizon Cash Flow Forecast</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {forecasts.map(f => (
                <div key={f.periodLabel} className={`p-5 rounded-xl border ${f.shortageRisk ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-900">{f.periodLabel} Forecast</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.confidence === 'HIGH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {f.confidence} Confidence
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">{formatBDT(f.projectedClosingCash)}</div>
                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <div>Collections: +{formatBDT(f.expectedCollections)}</div>
                    <div>Payables: -{formatBDT(f.committedPayables)}</div>
                    <div>Expenses: -{formatBDT(f.expectedExpenses)}</div>
                  </div>
                  {f.shortageRisk && (
                    <div className="mt-3 text-xs font-bold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Shortage Risk Detected
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Simulator */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#0F766E]" /> Cash Flow Scenario Simulator
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Simulate collection improvements and expense shifts in real-time. Simulations do not mutate Firestore.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Collection Boost (%) : {scenarioParams.collectionBoostPercent}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={scenarioParams.collectionBoostPercent}
                    onChange={e => setScenarioParams({ ...scenarioParams, collectionBoostPercent: Number(e.target.value) })}
                    className="w-full accent-[#0F766E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Expense Change (%) : {scenarioParams.expenseChangePercent}%
                  </label>
                  <input
                    type="range"
                    min="-20"
                    max="50"
                    value={scenarioParams.expenseChangePercent}
                    onChange={e => setScenarioParams({ ...scenarioParams, expenseChangePercent: Number(e.target.value) })}
                    className="w-full accent-[#0F766E]"
                  />
                </div>
              </div>

              <div className="p-6 bg-teal-50 rounded-xl border border-teal-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-teal-800 uppercase">Simulation Result (30 Days)</div>
                  <div className="text-3xl font-bold text-teal-900 mt-2">{formatBDT(scenarioResult.projectedClosingCash)}</div>
                  <div className={`text-sm font-semibold mt-2 ${scenarioResult.cashDifference >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    Difference vs Base: {formatBDT(scenarioResult.cashDifference)}
                  </div>
                  <p className="text-xs text-teal-700 mt-3">{scenarioResult.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-teal-200 text-[11px] text-teal-800">
                  Status Risk: <strong className="uppercase">{scenarioResult.riskStatus}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DATA QUALITY & RECON */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#0F766E]" /> Financial Data Quality Scanner
            </h2>
            <div className="space-y-3">
              {dataQualityIssues.map(issue => (
                <div key={issue.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${issue.severity === 'critical' ? 'text-red-600' : 'text-amber-500'}`} />
                    <div>
                      <div className="font-semibold text-slate-900">{issue.entityType} ({issue.entityId})</div>
                      <div className="text-xs text-slate-600">{issue.description}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${issue.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {issue.severity}
                  </span>
                </div>
              ))}
              {dataQualityIssues.length === 0 && (
                <div className="p-8 text-center text-emerald-600 font-semibold flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8" /> All financial records pass data integrity checks.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS & AUDIT */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Cash Reserve Configuration</h2>
            <p className="text-sm text-slate-600 mb-4">
              Configure the minimum cash reserve threshold for Glowzaa B2B operations. All changes are audited.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Minimum Cash Reserve (BDT)</label>
                <input
                  type="number"
                  value={reserveInput}
                  onChange={e => setReserveInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="bg-[#0F766E] hover:bg-[#115E59] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition shadow-md"
              >
                {isSavingSettings ? 'Saving...' : 'Save Cash Reserve Setting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
