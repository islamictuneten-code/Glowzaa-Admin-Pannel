import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { UserAvatar } from '../shared/UserAvatar';
import { NotificationCenter } from '../shared/NotificationCenter';
import { ShieldCheck, TrendingUp, Truck, Search, Bell, Menu, X, PlusCircle, Building2, ChevronDown, Package, Banknote, LogOut, User, Check } from 'lucide-react';
import { FieldDutyToggle } from '../sales/FieldDutyToggle';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { 
    role, 
    setRole, 
    searchQuery, 
    setSearchQuery, 
    currentSalesUser, 
    currentDeliveryUser,
    setSalesTab,
    setDeliveryTab,
    orders,
    products,
    formatBDT,
    addToast
  } = useApp();

  const { currentUser, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing' || o.orderStatus === 'dispatched').length;
  const lowStockCount = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock').length;

  const roleBadgeStyles: Record<UserRole, { bg: string; text: string; border: string; label: string; icon: React.ReactNode }> = {
    admin: {
      bg: 'bg-teal-50',
      text: 'text-[#087F7A]',
      border: 'border-teal-200',
      label: 'Admin HQ',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#087F7A]" />
    },
    sales: {
      bg: 'bg-emerald-50',
      text: 'text-[#16A085]',
      border: 'border-emerald-200',
      label: 'Sales Officer',
      icon: <TrendingUp className="w-3.5 h-3.5 text-[#16A085]" />
    },
    delivery: {
      bg: 'bg-teal-50',
      text: 'text-[#087F7A]',
      border: 'border-teal-200',
      label: 'Delivery Courier',
      icon: <Truck className="w-3.5 h-3.5 text-[#087F7A]" />
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been securely signed out of Firebase session.'
    });
  };

  const handleAdminSwitchView = (newRole: UserRole) => {
    setRole(newRole);
    setShowUserDropdown(false);
    addToast({
      type: 'info',
      title: 'Switched View',
      message: `Active view switched to ${newRole.toUpperCase()} layout.`
    });
  };

  const activeRoleBadge = roleBadgeStyles[role] || roleBadgeStyles.admin;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs h-16">
      <div className="flex items-center justify-between px-3.5 sm:px-6 h-full">
        
        {/* Left: Mobile Menu Toggle & Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5 text-slate-800" /> : <Menu className="w-5 h-5 text-slate-800" />}
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#087F7A] to-[#16A085] flex items-center justify-center text-white shadow-xs shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-extrabold text-[#102A2A] text-xs sm:text-base tracking-tight truncate">GLOWZAA</span>
                <span className="hidden sm:inline-block text-[9px] font-bold px-1 py-0 rounded bg-[#DDF7EE] text-[#087F7A] border border-teal-200 uppercase tracking-wide shrink-0">
                  BRAND
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-medium hidden sm:block">Wholesale Commerce</p>
            </div>
          </div>
        </div>

        {/* Center: Interactive Role Switcher for Admin / Active Portal Status Indicator */}
        <div className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
          {currentUser?.role === 'admin' ? (
            <>
              <button
                onClick={() => handleAdminSwitchView('admin')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-[#087F7A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${role === 'admin' ? 'text-white' : 'text-slate-400'}`} />
                <span>Admin HQ</span>
              </button>

              <button
                onClick={() => handleAdminSwitchView('sales')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  role === 'sales'
                    ? 'bg-[#087F7A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className={`w-3.5 h-3.5 ${role === 'sales' ? 'text-white' : 'text-slate-400'}`} />
                <span>Sales View</span>
              </button>

              <button
                onClick={() => handleAdminSwitchView('delivery')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  role === 'delivery'
                    ? 'bg-[#087F7A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className={`w-3.5 h-3.5 ${role === 'delivery' ? 'text-white' : 'text-slate-400'}`} />
                <span>Delivery View</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-800">
              {activeRoleBadge.icon}
              <span>{activeRoleBadge.label} Session</span>
            </div>
          )}
        </div>

        {/* Right: Search, Notifications & Authenticated User Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Global Search Input */}
          <div className="relative hidden xl:block w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search SKU, retail shop, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-[#F8FAFB] border border-slate-200 rounded-lg text-[#102A2A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#087F7A] transition-all"
            />
          </div>

          {/* Quick Context Action based on active role */}
          {role === 'sales' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSalesTab('create_order')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#087F7A] text-white hover:bg-[#075E5B] shadow-2xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Order</span>
              </button>
            </div>
          )}

          {role === 'delivery' && (
            <button
              onClick={() => setDeliveryTab('due_collection')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#087F7A] text-white hover:bg-[#075E5B] shadow-2xs transition-colors cursor-pointer"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Collect Due</span>
            </button>
          )}

          {/* Real-time Firebase Push Notification Center */}
          <NotificationCenter />
          
          {/* Duty Toggle moved here */}
          {role === 'sales' && <FieldDutyToggle />}

          {/* User Persona Profile Pill / Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <UserAvatar
                src={currentUser?.photoURL}
                name={currentUser?.name || 'Staff User'}
                fallbackInitials={currentUser?.avatar}
                size="sm"
                role={currentUser?.role || role}
              />
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#102A2A] flex items-center gap-1">
                  <span className="truncate max-w-[120px]">{currentUser?.name || 'Staff User'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-bold uppercase px-1 py-0.1 rounded border ${activeRoleBadge.bg} ${activeRoleBadge.text} ${activeRoleBadge.border}`}>
                    {currentUser?.role || role}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                    {currentUser?.department?.split('&')[0].trim() || 'Staff'}
                  </span>
                </div>
              </div>
            </button>

            {showUserDropdown && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {/* User Summary Header */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-2.5">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      src={currentUser?.photoURL}
                      name={currentUser?.name || 'Authenticated User'}
                      fallbackInitials={currentUser?.avatar}
                      size="md"
                      role={currentUser?.role || role}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#102A2A] block truncate">
                          {currentUser?.name || 'Authenticated User'}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${activeRoleBadge.bg} ${activeRoleBadge.text} ${activeRoleBadge.border} shrink-0`}>
                          {currentUser?.role || role}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {currentUser?.email || 'user@glowzaa.com'}
                      </span>
                      {currentUser?.phone && (
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                          {currentUser.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                    <span className="font-medium text-slate-700">Role Title: </span>
                    {currentUser?.title || (currentUser?.role === 'admin' ? 'HQ Administrator' : currentUser?.role === 'sales' ? 'Sales Executive' : 'Delivery Driver')}
                  </div>
                </div>

                {/* Admin Role Perspective Switcher */}
                {currentUser?.role === 'admin' && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Portal Switcher
                    </div>

                    <div className="space-y-1 mb-2.5">
                      <button
                        onClick={() => handleAdminSwitchView('admin')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          role === 'admin' ? 'bg-teal-50 text-[#087F7A] font-bold border border-teal-200' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#087F7A]" />
                          <span>Admin Central HQ</span>
                        </div>
                        {role === 'admin' && <Check className="w-3.5 h-3.5 text-[#087F7A]" />}
                      </button>

                      <button
                        onClick={() => handleAdminSwitchView('sales')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          role === 'sales' ? 'bg-teal-50 text-[#087F7A] font-bold border border-teal-200' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-[#087F7A]" />
                          <span>Sales Portal View</span>
                        </div>
                        {role === 'sales' && <Check className="w-3.5 h-3.5 text-[#087F7A]" />}
                      </button>

                      <button
                        onClick={() => handleAdminSwitchView('delivery')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          role === 'delivery' ? 'bg-teal-50 text-[#087F7A] font-bold border border-teal-200' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-[#087F7A]" />
                          <span>Delivery Portal View</span>
                        </div>
                        {role === 'delivery' && <Check className="w-3.5 h-3.5 text-[#087F7A]" />}
                      </button>
                    </div>
                  </>
                )}

                {/* Real Firebase Logout Button */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sign Out (End Session)</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
