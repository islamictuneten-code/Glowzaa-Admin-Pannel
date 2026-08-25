import React, { useState, useEffect, useMemo } from 'react';
import { FieldDutySession, CustomerVisit, AuthUser } from '../../../types';
import { getCustomerVisitsForDateRange } from '../../../services/firestoreService';
import { fetchStaffUsers } from '../../../services/staffAuthService';
import {
  Calendar,
  Store,
  ShoppingBag,
  Receipt,
  Users,
  Compass,
  ArrowRight,
  TrendingUp,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  X
} from 'lucide-react';

interface DailyFieldSalesReportProps {
  isOpen: boolean;
  onClose: () => void;
  formatBDT: (amount: number) => string;
  onOpenRouteModal?: (session: FieldDutySession) => void;
  onOpenVisitModal?: (userId?: string, date?: string) => void;
}

export const DailyFieldSalesReport: React.FC<DailyFieldSalesReportProps> = ({
  isOpen,
  onClose,
  formatBDT,
  onOpenRouteModal,
  onOpenVisitModal
}) => {
  // Date State (Defaults to Today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'custom'>('today');

  // Filter State
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data State
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [salesStaff, setSalesStaff] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shops' | 'matrix'>('shops');

  // Set date preset helper
  const handleDatePreset = (preset: 'today' | 'yesterday') => {
    setDatePreset(preset);
    const d = new Date();
    if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Load staff on mount
  useEffect(() => {
    let isMounted = true;
    const loadStaff = async () => {
      try {
        const staff = await fetchStaffUsers();
        if (isMounted) {
          setSalesStaff(staff.filter((s) => s.role === 'sales'));
        }
      } catch (err) {
        console.error('Error loading sales staff:', err);
      }
    };
    loadStaff();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch visits for selected date range
  const loadDailyData = async () => {
    setIsLoading(true);
    try {
      const parts = selectedDate.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const start = new Date(year, month, day, 0, 0, 0, 0);
      const end = new Date(year, month, day, 23, 59, 59, 999);

      const data = await getCustomerVisitsForDateRange(start.toISOString(), end.toISOString());
      setVisits(data);
    } catch (err) {
      console.error('Error fetching daily field report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDailyData();
    }
  }, [isOpen, selectedDate]);

  // Unique territories from staff
  const availableTerritories = useMemo(() => {
    const set = new Set<string>();
    salesStaff.forEach((s) => {
      if (s.territory) set.add(s.territory);
    });
    return Array.from(set).sort();
  }, [salesStaff]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (staffFilter !== 'all' && v.userId !== staffFilter) return false;

      if (territoryFilter !== 'all') {
        const staffUser = salesStaff.find((s) => s.uid === v.userId || s.staffId === v.userId);
        if (staffUser?.territory !== territoryFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesShop = (v.shopName || '').toLowerCase().includes(q);
        const matchesOwner = (v.ownerName || '').toLowerCase().includes(q);
        const matchesStaff = (v.userName || '').toLowerCase().includes(q);
        const matchesNotes = (v.notes || '').toLowerCase().includes(q);
        if (!matchesShop && !matchesOwner && !matchesStaff && !matchesNotes) return false;
      }

      return true;
    });
  }, [visits, staffFilter, territoryFilter, searchQuery, salesStaff]);

  // Aggregated Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalVisits = filteredVisits.length;
    const completedVisits = filteredVisits.filter((v) => Boolean(v.checkOutTime)).length;
    const inProgressVisits = filteredVisits.filter((v) => !v.checkOutTime).length;

    // Unique shops visited
    const uniqueShops = new Set(filteredVisits.map((v) => v.customerId)).size;

    // Unique active field reps
    const uniqueReps = new Set(filteredVisits.map((v) => v.userId)).size;

    // Outcome counts
    let orderBookedCount = 0;
    let paymentCollectedCount = 0;
    let noSaleCount = 0;
    let followUpCount = 0;

    filteredVisits.forEach((v) => {
      if (v.visitOutcome === 'order_booked') orderBookedCount++;
      else if (v.visitOutcome === 'payment_collected') paymentCollectedCount++;
      else if (v.visitOutcome === 'no_sale') noSaleCount++;
      else if (v.visitOutcome === 'follow_up') followUpCount++;
    });

    // Proximity compliance (within 200m)
    let compliantCount = 0;
    let totalWithDistance = 0;
    filteredVisits.forEach((v) => {
      if (typeof v.distanceFromShopMeters === 'number') {
        totalWithDistance++;
        if (v.distanceFromShopMeters <= 200) compliantCount++;
      }
    });

    const proximityCompliancePct =
      totalWithDistance > 0 ? Math.round((compliantCount / totalWithDistance) * 100) : 100;

    return {
      totalVisits,
      completedVisits,
      inProgressVisits,
      uniqueShops,
      uniqueReps,
      orderBookedCount,
      paymentCollectedCount,
      noSaleCount,
      followUpCount,
      proximityCompliancePct
    };
  }, [filteredVisits]);

  // Per-Staff Summary Breakdown
  const staffSummaries = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      userName: string;
      staffId: string;
      territory: string;
      assignedArea: string;
      visits: CustomerVisit[];
      completedCount: number;
      ordersBookedCount: number;
      paymentsCollectedCount: number;
      noSaleCount: number;
      followUpCount: number;
      firstCheckIn: string | null;
      lastCheckOut: string | null;
    }>();

    // Initialize with all sales staff matching territory
    salesStaff.forEach((staff) => {
      if (territoryFilter !== 'all' && staff.territory !== territoryFilter) return;
      if (staffFilter !== 'all' && staff.uid !== staffFilter) return;

      map.set(staff.uid, {
        userId: staff.uid,
        userName: staff.name,
        staffId: staff.staffId || staff.loginId || 'SALES',
        territory: staff.territory || 'Unassigned',
        assignedArea: staff.assignedArea || 'Dhaka Field',
        visits: [],
        completedCount: 0,
        ordersBookedCount: 0,
        paymentsCollectedCount: 0,
        noSaleCount: 0,
        followUpCount: 0,
        firstCheckIn: null,
        lastCheckOut: null
      });
    });

    // Populate with filtered visits
    filteredVisits.forEach((visit) => {
      let entry = map.get(visit.userId);
      if (!entry) {
        entry = {
          userId: visit.userId,
          userName: visit.userName || 'Sales Staff',
          staffId: 'SALES',
          territory: 'Territory',
          assignedArea: 'Field',
          visits: [],
          completedCount: 0,
          ordersBookedCount: 0,
          paymentsCollectedCount: 0,
          noSaleCount: 0,
          followUpCount: 0,
          firstCheckIn: null,
          lastCheckOut: null
        };
        map.set(visit.userId, entry);
      }

      entry.visits.push(visit);

      if (visit.checkOutTime) {
        entry.completedCount++;
      }

      if (visit.visitOutcome === 'order_booked') entry.ordersBookedCount++;
      if (visit.visitOutcome === 'payment_collected') entry.paymentsCollectedCount++;
      if (visit.visitOutcome === 'no_sale') entry.noSaleCount++;
      if (visit.visitOutcome === 'follow_up') entry.followUpCount++;

      if (visit.checkInTime) {
        if (!entry.firstCheckIn || visit.checkInTime < entry.firstCheckIn) {
          entry.firstCheckIn = visit.checkInTime;
        }
      }

      if (visit.checkOutTime) {
        if (!entry.lastCheckOut || visit.checkOutTime > entry.lastCheckOut) {
          entry.lastCheckOut = visit.checkOutTime;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.visits.length - a.visits.length);
  }, [salesStaff, filteredVisits, territoryFilter, staffFilter]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredVisits.length === 0) return;

    const headers = [
      'Visit ID',
      'Sales Representative',
      'Customer Shop',
      'Owner Name',
      'Check In Time',
      'Check Out Time',
      'Duration (Mins)',
      'Outcome',
      'Distance From Shop (m)',
      'Order ID',
      'Payment ID',
      'Notes'
    ];

    const rows = filteredVisits.map((v) => [
      v.id,
      `"${v.userName || 'Sales Staff'}"`,
      `"${v.shopName || ''}"`,
      `"${v.ownerName || ''}"`,
      v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString() : '',
      v.checkOutTime ? new Date(v.checkOutTime).toLocaleTimeString() : 'In Progress',
      v.durationMinutes ?? '',
      v.visitOutcome ? v.visitOutcome.replace('_', ' ').toUpperCase() : 'PENDING',
      v.distanceFromShopMeters ?? 'N/A',
      v.orderId || '',
      v.paymentId || '',
      `"${(v.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `glowzaa_field_sales_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:rounded-2xl border-0 sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 print:max-h-none print:h-auto print:shadow-none print:border-none">
        
        {/* Top Header */}
        <div className="bg-[#102A2A] text-white px-3.5 py-3 sm:px-5 sm:py-4 flex items-center justify-between border-b border-teal-900/40 shrink-0 print:bg-white print:text-slate-900 print:border-b print:border-slate-300">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0 print:hidden">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <h2 className="text-sm sm:text-lg font-bold tracking-tight text-white print:text-slate-900 truncate">
                  Daily Field Sales Audit & Visit Report
                </h2>
                <span className="text-[9px] sm:text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 print:border-slate-300 print:text-slate-700">
                  HQ Commercial
                </span>
              </div>
              <p className="hidden sm:block text-xs text-teal-200/80 mt-0.5 print:text-slate-500 truncate">
                Consolidated field shift telemetry, shop coverage density, check-in GPS proximity, and revenue outcomes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 print:hidden">
            <button
              onClick={handleExportCsv}
              disabled={filteredVisits.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Print Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Filter & Control Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-2.5 sm:p-4 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between shrink-0 print:hidden">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 w-full md:w-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs shrink-0">
              <button
                onClick={() => handleDatePreset('today')}
                className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  datePreset === 'today'
                    ? 'bg-[#0F766E] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleDatePreset('yesterday')}
                className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  datePreset === 'yesterday'
                    ? 'bg-[#0F766E] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yesterday
              </button>
            </div>

            <div className="relative flex-1 sm:w-40 min-w-[120px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="glowzaa-input pl-7 text-xs py-1 h-8 bg-white border-slate-200"
              />
            </div>

            <button
              onClick={loadDailyData}
              disabled={isLoading}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer disabled:opacity-50 h-8 w-8 flex items-center justify-center"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Territory and Staff Dropdowns */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="glowzaa-input text-xs w-full sm:w-auto py-1 px-2 h-8 bg-white border-slate-200"
            >
              <option value="all">All Territories</option>
              {availableTerritories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="glowzaa-input text-xs w-full sm:w-auto py-1 px-2 h-8 bg-white border-slate-200 truncate"
            >
              <option value="all">All Staff ({salesStaff.length})</option>
              {salesStaff.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.name} ({s.territory || 'Field'})
                </option>
              ))}
            </select>

            <div className="col-span-2 sm:col-span-1 relative w-full sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search report..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glowzaa-input pl-7 text-xs py-1 h-8 bg-white border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* Summary KPI Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            
            {/* Active Reps */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 tracking-wider truncate">
                  Active Field Reps
                </span>
                <Users className="w-4 h-4 text-[#0F766E] shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 sm:mt-1">
                {summaryMetrics.uniqueReps} <span className="text-xs font-normal text-slate-500">/ {salesStaff.length}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-700 font-semibold block mt-0.5 truncate">
                Staff logged visits
              </span>
            </div>

            {/* Unique Shops Covered - Clickable */}
            <button
              onClick={() => setActiveTab('shops')}
              className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'shops'
                  ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-purple-50/50 hover:border-purple-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-purple-700 tracking-wider truncate flex items-center gap-1">
                  Shops Covered
                  <span className="text-[8px] bg-purple-200 text-purple-900 px-1 rounded">View List</span>
                </span>
                <Store className="w-4 h-4 text-purple-600 shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-purple-900 mt-0.5 sm:mt-1">
                {summaryMetrics.uniqueShops}
              </div>
              <span className="text-[9px] sm:text-[10px] text-purple-700 font-semibold block mt-0.5 truncate underline decoration-purple-300">
                Click to view shop list ↗
              </span>
            </button>

            {/* Total Visits Completed - Clickable */}
            <button
              onClick={() => setActiveTab('shops')}
              className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'shops'
                  ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-teal-50/50 hover:border-teal-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-teal-700 tracking-wider truncate">
                  Visits Completed
                </span>
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-teal-800 mt-0.5 sm:mt-1">
                {summaryMetrics.completedVisits}
              </div>
              <span className="text-[9px] sm:text-[10px] text-teal-700 font-semibold block mt-0.5 truncate underline decoration-teal-300">
                {summaryMetrics.inProgressVisits > 0 ? `${summaryMetrics.inProgressVisits} active` : 'All completed (View)'}
              </span>
            </button>

            {/* Orders Booked Outcome */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 tracking-wider truncate">
                  Orders Booked
                </span>
                <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-emerald-700 mt-0.5 sm:mt-1">
                {summaryMetrics.orderBookedCount}
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold block mt-0.5 truncate">
                Shop purchase orders
              </span>
            </div>

            {/* Collections Outcome */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 tracking-wider truncate">
                  Collections
                </span>
                <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-blue-700 mt-0.5 sm:mt-1">
                {summaryMetrics.paymentCollectedCount}
              </div>
              <span className="text-[9px] sm:text-[10px] text-blue-600 font-semibold block mt-0.5 truncate">
                Credit receipts cleared
              </span>
            </div>

            {/* GPS Proximity Compliance */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 tracking-wider truncate">
                  GPS Proximity
                </span>
                <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              </div>
              <div className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 sm:mt-1">
                {summaryMetrics.proximityCompliancePct}%
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
                Physical shop presence
              </span>
            </div>

          </div>

          {/* Outcome Distribution Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
              <span>Visit Outcome Distribution</span>
              <span className="text-slate-400 font-normal">{filteredVisits.length} Total Visits Recorded</span>
            </h3>

            {filteredVisits.length > 0 ? (
              <div className="space-y-3">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  {summaryMetrics.orderBookedCount > 0 && (
                    <div
                      style={{ width: `${(summaryMetrics.orderBookedCount / filteredVisits.length) * 100}%` }}
                      className="bg-emerald-500 transition-all"
                      title={`Order Booked: ${summaryMetrics.orderBookedCount}`}
                    />
                  )}
                  {summaryMetrics.paymentCollectedCount > 0 && (
                    <div
                      style={{ width: `${(summaryMetrics.paymentCollectedCount / filteredVisits.length) * 100}%` }}
                      className="bg-blue-500 transition-all"
                      title={`Payment Collected: ${summaryMetrics.paymentCollectedCount}`}
                    />
                  )}
                  {summaryMetrics.followUpCount > 0 && (
                    <div
                      style={{ width: `${(summaryMetrics.followUpCount / filteredVisits.length) * 100}%` }}
                      className="bg-purple-500 transition-all"
                      title={`Follow Up: ${summaryMetrics.followUpCount}`}
                    />
                  )}
                  {summaryMetrics.noSaleCount > 0 && (
                    <div
                      style={{ width: `${(summaryMetrics.noSaleCount / filteredVisits.length) * 100}%` }}
                      className="bg-slate-400 transition-all"
                      title={`No Sale: ${summaryMetrics.noSaleCount}`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">Order Booked:</span>
                    <span className="font-bold text-slate-900">{summaryMetrics.orderBookedCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="font-semibold text-slate-700">Payment Collected:</span>
                    <span className="font-bold text-slate-900">{summaryMetrics.paymentCollectedCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="font-semibold text-slate-700">Follow Up:</span>
                    <span className="font-bold text-slate-900">{summaryMetrics.followUpCount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="font-semibold text-slate-700">No Sale / Closed:</span>
                    <span className="font-bold text-slate-900">{summaryMetrics.noSaleCount}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No shop visit data recorded for this date.</p>
            )}
          </div>

          {/* View Tab Selector Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab('shops')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'shops'
                  ? 'border-[#087F7A] text-[#087F7A] bg-teal-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Store className="w-4 h-4 text-purple-600" />
              <span>Visited Shops Breakdown (কভারকৃত দোকানের তালিকা)</span>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {summaryMetrics.uniqueShops} Shops
              </span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'matrix'
                  ? 'border-[#087F7A] text-[#087F7A] bg-teal-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>Staff Performance Matrix (অফিসার মেট্রিক্স)</span>
              <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {staffSummaries.length} Reps
              </span>
            </button>
          </div>

          {/* TAB 1: Visited Shops List */}
          {activeTab === 'shops' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-600" />
                    List of Visited Retail Shops ({selectedDate})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Verified field visit logs, officer check-in details, outcomes, and shop GPS verification
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {filteredVisits.length} Visit Events
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Shop & Owner Name</th>
                      <th className="py-3 px-4">Sales Officer</th>
                      <th className="py-3 px-4">Check-In / Out</th>
                      <th className="py-3 px-4 text-center">Visit Outcome</th>
                      <th className="py-3 px-4">GPS & Proximity</th>
                      <th className="py-3 px-4">Officer Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {filteredVisits.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Store className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-600">No Shop Visits Found for {selectedDate}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try selecting a different date or clearing filter selections above.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredVisits.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          {/* Shop & Owner Name */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm">{v.shopName || 'Shop Account'}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>Proprietor: {v.ownerName || 'N/A'}</span>
                              {v.customerId && (
                                <span className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                                  #{v.customerId.slice(-6)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Sales Representative */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{v.userName || 'Sales Staff'}</div>
                            <div className="text-[10px] text-teal-700 font-semibold">Field Representative</div>
                          </td>

                          {/* Check-In / Out */}
                          <td className="py-3 px-4 text-[11px] text-slate-700">
                            <div className="flex items-center gap-1 font-semibold text-slate-900">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              </span>
                              {v.checkOutTime && (
                                <>
                                  <span className="text-slate-400">–</span>
                                  <span>{new Date(v.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {v.durationMinutes ? `Duration: ${v.durationMinutes} mins` : (v.checkOutTime ? 'Completed' : 'In Progress')}
                            </div>
                          </td>

                          {/* Visit Outcome */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold capitalize ${
                              v.visitOutcome === 'order_booked' || v.visitOutcome === 'Order Placed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : v.visitOutcome === 'payment_collected' || v.visitOutcome === 'Payment Collected'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : v.visitOutcome === 'follow_up' || v.visitOutcome === 'Follow-up Required'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {v.visitOutcome ? v.visitOutcome.replace(/_/g, ' ') : 'Active Visit'}
                            </span>
                          </td>

                          {/* GPS & Proximity */}
                          <td className="py-3 px-4 text-[11px]">
                            {typeof v.distanceFromShopMeters === 'number' ? (
                              <div className="flex items-center gap-1.5">
                                <MapPin className={`w-3.5 h-3.5 ${v.distanceFromShopMeters <= 200 ? 'text-emerald-600' : 'text-amber-600'}`} />
                                <span className="font-bold text-slate-800">
                                  {v.distanceFromShopMeters} meters
                                </span>
                                {v.distanceFromShopMeters <= 200 ? (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.5 rounded font-bold">
                                    Verified
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded font-bold">
                                    Remote
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No GPS distance</span>
                            )}
                          </td>

                          {/* Officer Remarks / Notes */}
                          <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">
                            {v.notes ? (
                              <div className="bg-slate-50 border border-slate-100 p-1.5 rounded text-slate-700 italic">
                                "{v.notes}"
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No notes recorded</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Sales Representative Performance Breakdown Table */}
          {activeTab === 'matrix' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Sales Staff Field Activity Matrix
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Daily shop visit coverage, conversion rate, and check-in timeline per sales officer
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {staffSummaries.length} Representatives
                </span>
              </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Sales Officer</th>
                    <th className="py-3 px-4">Territory / Area</th>
                    <th className="py-3 px-4 text-center">Total Visits</th>
                    <th className="py-3 px-4 text-center">Orders Booked</th>
                    <th className="py-3 px-4 text-center">Collections</th>
                    <th className="py-3 px-4 text-center">Follow-ups / No Sale</th>
                    <th className="py-3 px-4">First & Last Shop</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {staffSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No sales staff field activity found matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    staffSummaries.map((staff) => {
                      const isExpanded = expandedStaffId === staff.userId;
                      return (
                        <React.Fragment key={staff.userId}>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{staff.userName}</div>
                              <div className="text-[10px] text-slate-400">{staff.staffId}</div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                                {staff.territory}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                                {staff.assignedArea}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-bold text-slate-900">
                                {staff.visits.length}
                              </span>
                              {staff.completedCount < staff.visits.length && (
                                <span className="text-[10px] text-amber-600 block">
                                  ({staff.visits.length - staff.completedCount} in-progress)
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                staff.ordersBookedCount > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'text-slate-400'
                              }`}>
                                {staff.ordersBookedCount}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                staff.paymentsCollectedCount > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'text-slate-400'
                              }`}>
                                {staff.paymentsCollectedCount}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center text-slate-600">
                              <span className="text-xs">
                                {staff.followUpCount} / {staff.noSaleCount}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-[11px] text-slate-600">
                              {staff.firstCheckIn ? (
                                <div>
                                  <span className="text-slate-900 font-semibold">
                                    {new Date(staff.firstCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {staff.lastCheckOut && (
                                    <span className="text-slate-400">
                                      {' '}–{' '}
                                      <span className="text-slate-900 font-semibold">
                                        {new Date(staff.lastCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No check-in</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {staff.visits.length > 0 && (
                                  <button
                                    onClick={() => setExpandedStaffId(isExpanded ? null : staff.userId)}
                                    className="p-1 text-slate-500 hover:text-slate-900 rounded bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                                    title="Expand Shop Visits"
                                  >
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </button>
                                )}

                                {onOpenVisitModal && (
                                  <button
                                    onClick={() => onOpenVisitModal(staff.userId, selectedDate)}
                                    className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="View Shop Visits Timeline"
                                  >
                                    <Store className="w-3 h-3" />
                                    <span>Timeline</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Shop Visit Rows */}
                          {isExpanded && staff.visits.length > 0 && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={8} className="p-3 pl-8">
                                <div className="space-y-2">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Shops Visited Today ({staff.visits.length}):
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {staff.visits.map((v) => (
                                      <div
                                        key={v.id}
                                        className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs text-xs space-y-1"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-slate-900 truncate max-w-[160px]">
                                            {v.shopName}
                                          </span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            v.visitOutcome === 'order_booked'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : v.visitOutcome === 'payment_collected'
                                              ? 'bg-blue-100 text-blue-800'
                                              : v.visitOutcome === 'follow_up'
                                              ? 'bg-purple-100 text-purple-800'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}>
                                            {v.visitOutcome ? v.visitOutcome.replace('_', ' ') : 'In Progress'}
                                          </span>
                                        </div>

                                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                          <span>Owner: {v.ownerName || 'N/A'}</span>
                                          <span>
                                            {v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            {v.durationMinutes ? ` (${v.durationMinutes}m)` : ''}
                                          </span>
                                        </div>

                                        {v.distanceFromShopMeters !== null && (
                                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-teal-600" />
                                            <span>Proximity: {v.distanceFromShopMeters}m from shop GPS</span>
                                          </div>
                                        )}

                                        {v.notes && (
                                          <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded italic">
                                            "{v.notes}"
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

        </div>

      </div>
    </div>
  );
};
