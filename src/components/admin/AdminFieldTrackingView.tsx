import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { FieldDutySession, AuthUser } from '../../types';
import { subscribeToAllFieldDutySessions } from '../../services/firestoreService';
import { fetchStaffUsers } from '../../services/staffAuthService';
import { evaluateGpsFreshness, evaluateTrackingStatus } from '../../services/locationService';
import { AdminFieldTrackingMap } from './field-tracking/AdminFieldTrackingMap';
import { StaffFieldDetailModal } from './field-tracking/StaffFieldDetailModal';
import { StaffRouteHistoryModal } from './field-tracking/StaffRouteHistoryModal';
import { CustomerVisitTimelineModal } from './field-tracking/CustomerVisitTimelineModal';
import { DailyFieldSalesReport } from './field-tracking/DailyFieldSalesReport';
import {
  MapPin,
  Compass,
  Navigation,
  Clock,
  Battery,
  Store,
  ShoppingBag,
  Receipt,
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Activity,
  AlertTriangle,
  Radio,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Table as TableIcon,
  LayoutGrid,
  Map as MapIcon
} from 'lucide-react';

export const AdminFieldTrackingView: React.FC = () => {
  const { formatBDT, addToast } = useApp();
  const { currentUser } = useAuth();

  // Firestore Real-Time State
  const [sessions, setSessions] = useState<FieldDutySession[]>([]);
  const [salesStaffList, setSalesStaffList] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_field' | 'live' | 'delayed' | 'stale' | 'off_duty'>('all');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'cards' | 'table'>('split');

  // Selection & Modal States
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [inspectSession, setInspectSession] = useState<FieldDutySession | null>(null);
  const [inspectUser, setInspectUser] = useState<AuthUser | null>(null);
  const [routeSession, setRouteSession] = useState<FieldDutySession | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // 1. Fetch all registered sales staff accounts
  useEffect(() => {
    let isMounted = true;
    const loadStaff = async () => {
      try {
        const staff = await fetchStaffUsers();
        if (isMounted) {
          const salesUsers = staff.filter((u) => u.role === 'sales');
          setSalesStaffList(salesUsers);
        }
      } catch (err) {
        console.error('Error fetching sales staff:', err);
      }
    };
    loadStaff();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-Time onSnapshot listener on /field_duty_sessions
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToAllFieldDutySessions(
      (loadedSessions) => {
        setSessions(loadedSessions);
        setLastSyncTime(new Date());
        setIsLoading(false);
        setIsRefreshing(false);
      },
      (err) => {
        console.error('Real-time listener error:', err);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Manual refresh trigger
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const staff = await fetchStaffUsers();
      setSalesStaffList(staff.filter((u) => u.role === 'sales'));
      setLastSyncTime(new Date());
      addToast({
        type: 'info',
        title: 'Telemetry Refreshed',
        message: 'Synchronized field duty data with Firestore.'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Merge registered sales staff with their latest field duty session
  const staffFieldItems = useMemo(() => {
    // Map latest session for each userId
    const latestSessionByUser = new Map<string, FieldDutySession>();

    // Prioritize active sessions, then latest startedAt
    sessions.forEach((s) => {
      const existing = latestSessionByUser.get(s.userId);
      if (!existing) {
        latestSessionByUser.set(s.userId, s);
      } else if (s.status === 'active' && existing.status !== 'active') {
        latestSessionByUser.set(s.userId, s);
      } else if (new Date(s.startedAt).getTime() > new Date(existing.startedAt).getTime()) {
        latestSessionByUser.set(s.userId, s);
      }
    });

    // Merge with registered sales staff
    const items = salesStaffList.map((user) => {
      const session = latestSessionByUser.get(user.uid) || null;
      const trackingEval = evaluateTrackingStatus(session);
      const gpsEval = evaluateGpsFreshness(session?.lastLocationUpdateAt);

      return {
        user,
        session,
        isOnField: trackingEval.isOnField,
        dutyLabel: trackingEval.label,
        dutyBadgeBg: trackingEval.badgeBg,
        gpsFreshness: gpsEval.freshness,
        minutesAgo: gpsEval.minutesAgo,
        gpsLabel: gpsEval.label,
        gpsBadgeBg: gpsEval.badgeBg,
        gpsDotColor: gpsEval.dotColor
      };
    });

    // Also include any sessions for sales staff not in salesStaffList (edge case safety)
    sessions.forEach((s) => {
      const alreadyIncluded = items.some((item) => item.user.uid === s.userId);
      if (!alreadyIncluded) {
        const dummyUser: AuthUser = {
          uid: s.userId,
          name: s.userName || 'Sales Staff',
          loginId: s.userLoginId || 'sales',
          email: '',
          phone: '',
          role: 'sales',
          status: 'active',
          createdAt: s.startedAt
        };
        const trackingEval = evaluateTrackingStatus(s);
        const gpsEval = evaluateGpsFreshness(s.lastLocationUpdateAt);
        items.push({
          user: dummyUser,
          session: s,
          isOnField: trackingEval.isOnField,
          dutyLabel: trackingEval.label,
          dutyBadgeBg: trackingEval.badgeBg,
          gpsFreshness: gpsEval.freshness,
          minutesAgo: gpsEval.minutesAgo,
          gpsLabel: gpsEval.label,
          gpsBadgeBg: gpsEval.badgeBg,
          gpsDotColor: gpsEval.dotColor
        });
      }
    });

    return items;
  }, [salesStaffList, sessions]);

  // Territories list
  const territories = useMemo(() => {
    const list = new Set<string>();
    salesStaffList.forEach((u) => {
      if (u.territory) list.add(u.territory);
    });
    return Array.from(list);
  }, [salesStaffList]);

  // Filter items
  const filteredStaffItems = useMemo(() => {
    return staffFieldItems.filter((item) => {
      // 1. Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = item.user.name?.toLowerCase().includes(term);
        const matchesLogin = item.user.loginId?.toLowerCase().includes(term);
        const matchesStaffId = item.user.staffId?.toLowerCase().includes(term);
        const matchesPhone = item.user.phone?.includes(term);
        const matchesTerritory = item.user.territory?.toLowerCase().includes(term);
        const matchesArea = item.user.assignedArea?.toLowerCase().includes(term);

        if (!matchesName && !matchesLogin && !matchesStaffId && !matchesPhone && !matchesTerritory && !matchesArea) {
          return false;
        }
      }

      // 2. Status filter (Decoupled Phase 4 State Filter)
      if (statusFilter === 'on_field') {
        if (!item.isOnField) return false;
      } else if (statusFilter === 'live') {
        if (!item.isOnField || item.gpsFreshness !== 'live') return false;
      } else if (statusFilter === 'delayed') {
        if (!item.isOnField || item.gpsFreshness !== 'delayed') return false;
      } else if (statusFilter === 'stale') {
        if (!item.isOnField || item.gpsFreshness !== 'stale') return false;
      } else if (statusFilter === 'off_duty') {
        if (item.isOnField) return false;
      }

      // 3. Territory filter
      if (territoryFilter !== 'all') {
        if (item.user.territory !== territoryFilter) return false;
      }

      return true;
    });
  }, [staffFieldItems, searchTerm, statusFilter, territoryFilter]);

  // Active Map Markers Data
  const mapStaffList = useMemo(() => {
    return filteredStaffItems
      .filter(
        (item) =>
          item.session &&
          item.session.status === 'active' &&
          typeof item.session.lastLatitude === 'number' &&
          typeof item.session.lastLongitude === 'number'
      )
      .map((item) => ({
        session: item.session!,
        staleStatus: item.gpsFreshness,
        minutesAgo: item.minutesAgo
      }));
  }, [filteredStaffItems]);

  // Summary Metrics calculations
  const summaryMetrics = useMemo(() => {
    const activeSessions = sessions.filter((s) => s.status === 'active');
    
    // Live GPS: <= 5 minutes
    const liveGpsCount = activeSessions.filter((s) => {
      const evalResult = evaluateGpsFreshness(s.lastLocationUpdateAt);
      return evalResult.freshness === 'live';
    }).length;

    // Delayed GPS: 5 - 10 minutes
    const delayedGpsCount = activeSessions.filter((s) => {
      const evalResult = evaluateGpsFreshness(s.lastLocationUpdateAt);
      return evalResult.freshness === 'delayed';
    }).length;

    // Stale GPS: > 10 minutes
    const staleGpsCount = activeSessions.filter((s) => {
      const evalResult = evaluateGpsFreshness(s.lastLocationUpdateAt);
      return evalResult.freshness === 'stale';
    }).length;

    const totalVisits = activeSessions.reduce((sum, s) => sum + (s.totalVisitsCompleted || 0), 0);
    const totalOrders = activeSessions.reduce((sum, s) => sum + (s.totalOrdersBooked || 0), 0);
    const totalOrdersValue = activeSessions.reduce((sum, s) => sum + (s.totalOrdersAmountBDT || 0), 0);
    const totalCollections = activeSessions.reduce((sum, s) => sum + (s.totalPaymentsCollectedBDT || 0), 0);
    const totalDistance = activeSessions.reduce((sum, s) => sum + (s.totalDistanceKm || 0), 0);

    return {
      activeStaffCount: activeSessions.length,
      totalSalesStaff: salesStaffList.length || staffFieldItems.length,
      liveGpsCount,
      delayedGpsCount,
      staleGpsCount,
      totalVisits,
      totalOrders,
      totalOrdersValue,
      totalCollections,
      totalDistance
    };
  }, [sessions, salesStaffList, staffFieldItems]);

  const handleOpenDetail = (session: FieldDutySession | null, user: AuthUser) => {
    if (session) {
      setInspectSession(session);
      setInspectUser(user);
    } else {
      // Create a dummy off-duty session record for viewing staff stats
      const offDutySession: FieldDutySession = {
        id: `off-duty-${user.uid}`,
        sessionId: `off-duty-${user.uid}`,
        userId: user.uid,
        userName: user.name,
        userLoginId: user.loginId || '',
        status: 'ended',
        startedAt: '',
        endedAt: null,
        startLatitude: null,
        startLongitude: null,
        lastLatitude: null,
        lastLongitude: null,
        lastLocationUpdateAt: null,
        batteryLevel: null,
        gpsAccuracyMeters: null,
        totalVisitsCompleted: 0,
        totalOrdersBooked: 0,
        totalOrdersAmountBDT: 0,
        totalPaymentsCollectedBDT: 0,
        totalDistanceKm: 0,
        createdAt: '',
        updatedAt: ''
      };
      setInspectSession(offDutySession);
      setInspectUser(user);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Real-Time Sync Indicator */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] flex items-center justify-center text-white shadow-md shadow-[#087F7A]/20">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="page-title">Field Sales Tracking</h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time GPS geolocation monitor, shop visit auditing & staff route tracking
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsDailyReportOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Open Daily Field Sales Report"
          >
            <Calendar className="w-4 h-4 text-teal-200" />
            <span>Daily Field Report</span>
          </button>

          <button
            onClick={() => setIsTimelineOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Store className="w-4 h-4 text-purple-600" />
            <span>Visit Timeline</span>
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="btn-outline text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* 8 Metric KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            On Field Active
          </span>
          <div className="text-xl font-extrabold text-[#087F7A] mt-0.5">
            {summaryMetrics.activeStaffCount}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Duty
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Total Staff
          </span>
          <div className="text-xl font-extrabold text-[#102A2A] mt-0.5">
            {summaryMetrics.totalSalesStaff}
          </div>
          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
            Sales Team
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Live GPS
          </span>
          <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
            {summaryMetrics.liveGpsCount}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            0–3m fresh
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Delayed/Stale
          </span>
          <div className="text-xl font-extrabold text-amber-600 mt-0.5">
            {summaryMetrics.delayedGpsCount + summaryMetrics.staleGpsCount}
          </div>
          <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
            3–15m ping
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Today Visits
          </span>
          <div className="text-xl font-extrabold text-purple-700 mt-0.5">
            {summaryMetrics.totalVisits}
          </div>
          <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
            Shops Checked
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Field Orders
          </span>
          <div className="text-xl font-extrabold text-blue-700 mt-0.5">
            {summaryMetrics.totalOrders}
          </div>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            Booked Today
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Field Sales
          </span>
          <div className="text-base font-extrabold text-[#102A2A] mt-1 truncate" title={formatBDT(summaryMetrics.totalOrdersValue)}>
            {formatBDT(summaryMetrics.totalOrdersValue)}
          </div>
          <span className="text-[10px] text-slate-400 font-semibold block">
            Order Value
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Distance
          </span>
          <div className="text-xl font-extrabold text-teal-700 mt-0.5">
            {summaryMetrics.totalDistance.toFixed(1)} <span className="text-xs font-normal">km</span>
          </div>
          <span className="text-[10px] text-teal-600 font-semibold mt-0.5 block">
            GPS Traversed
          </span>
        </div>
      </div>

      {/* Diagnostics Panel */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-3 shadow-md text-xs font-mono space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-teal-400 font-bold">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Telemetry & Live GPS Diagnostic Panel</span>
          </div>
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="text-slate-400 hover:text-white underline cursor-pointer"
          >
            {showDebugPanel ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-slate-400 block text-[10px]">On Field (Active):</span>
            <span className="text-emerald-400 font-bold">{summaryMetrics.activeStaffCount}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Live GPS (&le; 5m):</span>
            <span className="text-emerald-400 font-bold">{summaryMetrics.liveGpsCount}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Delayed / Stale GPS:</span>
            <span className="text-amber-400 font-bold">{summaryMetrics.delayedGpsCount + summaryMetrics.staleGpsCount}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Last Firestore Sync:</span>
            <span className="text-slate-200">{lastSyncTime.toLocaleTimeString()}</span>
          </div>
        </div>
        {showDebugPanel && (
          <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] max-h-48 overflow-y-auto">
            {staffFieldItems.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between bg-slate-800/60 p-1.5 rounded border border-slate-700/50">
                <span className="text-teal-300 font-bold">{item.user.name} ({item.user.loginId || item.user.staffId || 'Sales'})</span>
                <span className="text-slate-300">Duty: <b className={item.isOnField ? 'text-emerald-400' : 'text-slate-400'}>{item.dutyLabel}</b></span>
                <span className="text-slate-300">GPS Status: <b className={item.gpsFreshness === 'live' ? 'text-emerald-400' : item.gpsFreshness === 'delayed' ? 'text-amber-400' : 'text-orange-400'}>{item.gpsLabel} ({item.minutesAgo < 900 ? `${item.minutesAgo}m ago` : 'no ping'})</b></span>
                <span className="text-slate-400 font-mono text-[10px]">Lat/Lon: {item.session?.lastLatitude ? `${item.session.lastLatitude.toFixed(4)}, ${item.session.lastLongitude?.toFixed(4)}` : 'None'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter and View Mode Switcher Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, ID, phone, territory, area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glowzaa-input pl-9 text-xs"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="glowzaa-input text-xs w-auto"
          >
            <option value="all">All Sales Staff ({staffFieldItems.length})</option>
            <option value="on_field">🟢 On Field Active ({summaryMetrics.activeStaffCount})</option>
            <option value="live">🛰️ Live GPS (0–3m) ({summaryMetrics.liveGpsCount})</option>
            <option value="delayed">🟡 Delayed GPS (3–7m) ({summaryMetrics.delayedGpsCount})</option>
            <option value="stale">🟠 Stale GPS (7–15m) ({summaryMetrics.staleGpsCount})</option>
            <option value="off_duty">⚪ Off Duty / Ended</option>
          </select>

          {/* Territory Filter */}
          {territories.length > 0 && (
            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="glowzaa-input text-xs w-auto"
            >
              <option value="all">All Territories</option>
              {territories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto lg:ml-0">
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'split' ? 'bg-white text-[#087F7A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Split Map & Staff Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-[#087F7A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Full Map View"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-[#087F7A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Cards Grid"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#087F7A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Data Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Area */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Map Column */}
          <div className="lg:col-span-7 h-[420px] sm:h-[480px] lg:h-[620px] sticky top-4">
            <AdminFieldTrackingMap
              staffList={mapStaffList}
              selectedStaffId={selectedStaffId}
              onSelectStaff={(staffId) => {
                setSelectedStaffId(staffId);
                const item = staffFieldItems.find((s) => s.user.uid === staffId);
                if (item) handleOpenDetail(item.session, item.user);
              }}
              onOpenRoute={(session) => setRouteSession(session)}
            />
          </div>

          {/* Cards Column */}
          <div className="lg:col-span-5 space-y-3 max-h-[620px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500">
                Staff List ({filteredStaffItems.length})
              </span>
              <span className="text-[11px] text-[#087F7A] font-extrabold">
                {mapStaffList.length} Active on Map
              </span>
            </div>

            {filteredStaffItems.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold">No Sales Staff found matching filters.</p>
              </div>
            ) : (
              filteredStaffItems.map((item) => {
                const isSelected = selectedStaffId === item.user.uid;

                return (
                  <div
                    key={item.user.uid}
                    onClick={() => setSelectedStaffId(item.user.uid)}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#087F7A] shadow-md ring-2 ring-[#087F7A]/10'
                        : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                          {item.user.name ? item.user.name.slice(0, 2).toUpperCase() : 'ST'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#102A2A] leading-snug">
                            {item.user.name}
                          </h4>
                          <span className="text-xs text-slate-500 font-semibold">
                            {item.user.staffId || item.user.loginId || 'Staff'} · {item.user.territory || 'Territory'}
                          </span>
                        </div>
                      </div>

                      {/* State Separated Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {/* 1. Primary Duty Badge */}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${item.dutyBadgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isOnField ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {item.dutyLabel}
                        </span>

                        {/* 2. Secondary GPS Freshness Badge */}
                        {item.isOnField && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${item.gpsBadgeBg}`}>
                            <span className={`w-1 h-1 rounded-full ${item.gpsDotColor}`} />
                            {item.gpsLabel} {item.minutesAgo < 900 && item.minutesAgo > 0 ? `(${item.minutesAgo}m)` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Mini Grid */}
                    {item.session ? (
                      <div className="mt-3 grid grid-cols-4 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Visits</span>
                          <span className="font-extrabold text-purple-700">
                            {item.session.totalVisitsCompleted || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Orders</span>
                          <span className="font-extrabold text-blue-700">
                            {item.session.totalOrdersBooked || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Collection</span>
                          <span className="font-extrabold text-emerald-700 text-[11px] truncate block">
                            ৳{Math.round(item.session.totalPaymentsCollectedBDT || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Distance</span>
                          <span className="font-extrabold text-teal-700">
                            {item.session.totalDistanceKm ? `${item.session.totalDistanceKm.toFixed(1)}km` : '0km'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5 text-[11px] text-slate-400 italic">
                        Staff member is currently off duty.
                      </div>
                    )}

                    {/* Footer Row */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-500 font-medium">
                        {item.session?.lastLocationUpdateAt ? (
                          <span>
                            GPS: <b>{item.minutesAgo === 0 ? 'Just now' : `${item.minutesAgo}m ago`}</b>
                            {item.session.gpsAccuracyMeters ? (
                              <span className="ml-1 text-slate-400">(±{Math.round(item.session.gpsAccuracyMeters)}m)</span>
                            ) : null}
                            {item.session.batteryLevel !== null && item.session.batteryLevel !== undefined ? (
                              <span className="ml-1.5 font-bold">🔋{item.session.batteryLevel}%</span>
                            ) : null}
                          </span>
                        ) : (
                          <span>GPS location unavailable</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {item.session && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRouteSession(item.session);
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-[#087F7A] hover:bg-[#E8F7F5] rounded-md transition-colors cursor-pointer"
                          >
                            Trace Route
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(item.session, item.user);
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          Inspect →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {viewMode === 'map' && (
        <div className="h-[650px] w-full">
          <AdminFieldTrackingMap
            staffList={mapStaffList}
            selectedStaffId={selectedStaffId}
            onSelectStaff={(staffId) => {
              setSelectedStaffId(staffId);
              const item = staffFieldItems.find((s) => s.user.uid === staffId);
              if (item) handleOpenDetail(item.session, item.user);
            }}
            onOpenRoute={(session) => setRouteSession(session)}
          />
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaffItems.map((item) => {
            return (
              <div
                key={item.user.uid}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#087F7A]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                        {item.user.name ? item.user.name.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[#102A2A]">{item.user.name}</h4>
                        <p className="text-xs text-slate-500 font-semibold">
                          {item.user.staffId || item.user.loginId} · {item.user.territory || 'Territory'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${item.dutyBadgeBg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isOnField ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {item.dutyLabel}
                      </span>
                      {item.isOnField && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${item.gpsBadgeBg}`}>
                          <span className={`w-1 h-1 rounded-full ${item.gpsDotColor}`} />
                          {item.gpsLabel} {item.minutesAgo < 900 && item.minutesAgo > 0 ? `(${item.minutesAgo}m)` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.session ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Duty Started</span>
                        <span className="font-bold text-slate-800">
                          {item.session.startedAt
                            ? new Date(item.session.startedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Last GPS Ping</span>
                        <span className="font-bold text-slate-800">
                          {item.minutesAgo === 0 ? 'Just now' : `${item.minutesAgo}m ago`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Shop Visits</span>
                        <span className="font-bold text-purple-700">
                          {item.session.totalVisitsCompleted || 0} shops
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Orders Booked</span>
                        <span className="font-bold text-blue-700">
                          {item.session.totalOrdersBooked || 0} ({formatBDT(item.session.totalOrdersAmountBDT || 0)})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic">
                      Staff member is currently off duty.
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {item.session && (
                    <button
                      onClick={() => setRouteSession(item.session)}
                      className="btn-outline text-xs flex-1 flex items-center justify-center gap-1"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Route
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenDetail(item.session, item.user)}
                    className="btn-primary text-xs flex-1 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="glowzaa-table-container">
          <table className="glowzaa-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Duty Status</th>
                <th>GPS Freshness</th>
                <th>Duty Started</th>
                <th>Last GPS Update</th>
                <th>Accuracy</th>
                <th>Battery</th>
                <th>Visits</th>
                <th>Orders</th>
                <th>Collection</th>
                <th>Distance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaffItems.map((item) => {
                return (
                  <tr key={item.user.uid}>
                    <td>
                      <div className="font-extrabold text-[#102A2A]">{item.user.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.user.staffId || item.user.loginId} · {item.user.territory || 'Central'}
                      </div>
                    </td>
                    <td>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${item.dutyBadgeBg}`}>
                        {item.dutyLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${item.gpsBadgeBg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.gpsDotColor}`} />
                        {item.gpsLabel}
                      </span>
                    </td>
                    <td className="text-slate-700">
                      {item.session?.startedAt
                        ? new Date(item.session.startedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—'}
                    </td>
                    <td>
                      {item.session?.lastLocationUpdateAt ? (
                        <span className="font-bold text-slate-800">
                          {item.minutesAgo === 0 ? 'Just now' : `${item.minutesAgo}m ago`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Unavailable</span>
                      )}
                    </td>
                    <td>
                      {item.session?.gpsAccuracyMeters ? (
                        <span className="text-[11px] font-bold text-slate-700">
                          ±{Math.round(item.session.gpsAccuracyMeters)}m
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {item.session?.batteryLevel !== null && item.session?.batteryLevel !== undefined ? (
                        <span className="text-xs font-semibold">🔋 {item.session.batteryLevel}%</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="font-bold text-purple-700">{item.session?.totalVisitsCompleted || 0}</td>
                    <td className="font-bold text-blue-700">{item.session?.totalOrdersBooked || 0}</td>
                    <td className="font-bold text-emerald-700 font-mono">
                      {formatBDT(item.session?.totalPaymentsCollectedBDT || 0)}
                    </td>
                    <td className="text-teal-700 font-semibold">
                      {item.session?.totalDistanceKm ? `${item.session.totalDistanceKm.toFixed(1)} km` : '0 km'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {item.session && (
                          <button
                            onClick={() => setRouteSession(item.session)}
                            className="px-2 py-1 text-xs font-bold text-[#087F7A] hover:bg-[#E8F7F5] rounded cursor-pointer"
                          >
                            Route
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDetail(item.session, item.user)}
                          className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Field Detail Modal */}
      <StaffFieldDetailModal
        isOpen={!!inspectSession}
        onClose={() => {
          setInspectSession(null);
          setInspectUser(null);
        }}
        session={inspectSession}
        staffUser={inspectUser}
        staleStatus={evaluateGpsFreshness(inspectSession?.lastLocationUpdateAt).freshness as any}
        minutesAgo={evaluateGpsFreshness(inspectSession?.lastLocationUpdateAt).minutesAgo}
        formatBDT={formatBDT}
        onOpenRoute={(session) => {
          setInspectSession(null);
          setRouteSession(session);
        }}
      />

      {/* Staff Route History Modal */}
      <StaffRouteHistoryModal
        isOpen={!!routeSession}
        onClose={() => setRouteSession(null)}
        session={routeSession}
        staffUser={salesStaffList.find((u) => u.uid === routeSession?.userId) || null}
        formatBDT={formatBDT}
      />

      {/* Customer Visit Timeline Modal */}
      <CustomerVisitTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        selectedDate={customDate}
        formatBDT={formatBDT}
      />

      {/* Daily Field Sales Report Modal */}
      <DailyFieldSalesReport
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
        formatBDT={formatBDT}
        onOpenRouteModal={(sess) => {
          setIsDailyReportOpen(false);
          setRouteSession(sess);
        }}
        onOpenVisitModal={() => {
          setIsDailyReportOpen(false);
          setIsTimelineOpen(true);
        }}
      />
    </div>
  );
};
