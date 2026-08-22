import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingUp,
  Truck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
  Sparkles,
  KeyRound,
  Check,
  Zap,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface QuickAccount {
  id: string;
  role: 'admin' | 'sales' | 'delivery';
  label: string;
  sublabel: string;
  loginId: string;
  defaultPass: string;
  icon: React.ElementType;
}

const QUICK_ACCOUNTS: QuickAccount[] = [
  {
    id: 'admin',
    role: 'admin',
    label: 'Admin HQ',
    sublabel: 'Central Operations',
    loginId: 'admin@glowzaa.com',
    defaultPass: '123456',
    icon: ShieldCheck
  },
  {
    id: 'sales',
    role: 'sales',
    label: 'Field Sales',
    sublabel: 'Orders & Dues',
    loginId: 'seller01',
    defaultPass: '123456',
    icon: TrendingUp
  },
  {
    id: 'delivery',
    role: 'delivery',
    label: 'Delivery Fleet',
    sublabel: 'Dispatch & COD',
    loginId: 'delivery01',
    defaultPass: '123456',
    icon: Truck
  }
];

export const LoginPage: React.FC = () => {
  const { login, resetPassword, authError, clearError, isLoading } = useAuth();

  // Login form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [activeQuickRole, setActiveQuickRole] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Load saved username on mount if previously remembered
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('glowzaa_remembered_username');
      if (savedUser) {
        setEmail(savedUser);
      }
    } catch {}
  }, []);

  // Detect Caps Lock on password key events
  const handlePasswordKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  // Quick fill demo/staff credentials
  const handleSelectQuickRole = (acc: QuickAccount) => {
    setEmail(acc.loginId);
    setPassword(acc.defaultPass);
    setActiveQuickRole(acc.id);
    setLocalError(null);
    clearError();
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail && !password) {
      setLocalError('Please enter your Login ID/Email and password.');
      return;
    }
    if (!trimmedEmail) {
      setLocalError('Login ID or Email is required.');
      return;
    }
    if (!password) {
      setLocalError('Password is required.');
      return;
    }

    // Save remembered username
    try {
      if (rememberMe) {
        localStorage.setItem('glowzaa_remembered_username', trimmedEmail);
      } else {
        localStorage.removeItem('glowzaa_remembered_username');
      }
    } catch {}

    const res = await login(trimmedEmail, password, rememberMe);
    if (!res.success && res.error) {
      setLocalError(res.error);
    }
  };

  // Handle Password Reset
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setIsResetting(true);
    setResetError(null);
    setResetMessage(null);

    const res = await resetPassword(resetEmail.trim());
    setIsResetting(false);
    if (res.success && res.message) {
      setResetMessage(res.message);
    } else if (res.error) {
      setResetError(res.error);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#081818] text-slate-100 flex flex-col justify-between selection:bg-[#087F7A] selection:text-white relative overflow-x-hidden font-sans">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-[-10%] left-1/4 w-[500px] h-[500px] bg-[#087F7A]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-1/4 w-[600px] h-[600px] bg-[#16A085]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="w-full border-b border-teal-900/40 bg-[#0B1E1E]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#087F7A] to-[#16A085] flex items-center justify-center text-white shadow-md shadow-[#087F7A]/25">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight">GLOWZAA</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                Brand
              </span>
            </div>
            <p className="text-[10px] text-teal-300/70 font-medium hidden sm:block">Wholesale Distribution Management ERP</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-teal-300/80 bg-teal-950/70 border border-teal-800/50 px-3 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-[11px] sm:text-xs text-teal-200">Shailkupa Head Office • Live</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center">
          
          {/* Left / Showcase Column (Desktop Only for Clean Focus) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 text-left pr-4">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/90 border border-teal-700/60 text-teal-300 text-xs font-semibold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Enterprise B2B Distribution Platform</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Wholesale Operations, Simplified & Scalable.
              </h1>
              
              <p className="text-sm text-teal-100/75 leading-relaxed">
                Empower your wholesale cosmetic distribution with real-time inventory tracking, multi-channel field sales booking, customer due recovery, and delivery fleet dispatching.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 gap-3 pt-1">
              
              <div className="p-3.5 rounded-2xl bg-[#0F2828]/80 border border-teal-800/40 backdrop-blur-xs flex items-center gap-3.5 transition-all hover:bg-[#0F2828] hover:border-teal-700/60">
                <div className="w-10 h-10 rounded-xl bg-teal-950 text-teal-300 border border-teal-800/60 flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Central Operations & HQ</span>
                  </div>
                  <p className="text-[11px] text-teal-200/70 truncate">Master catalog, purchase bills, staff access control & live P&L</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0F2828]/80 border border-teal-800/40 backdrop-blur-xs flex items-center gap-3.5 transition-all hover:bg-[#0F2828] hover:border-teal-700/60">
                <div className="w-10 h-10 rounded-xl bg-teal-950 text-teal-300 border border-teal-800/60 flex items-center justify-center shrink-0 shadow-xs">
                  <TrendingUp className="w-5 h-5 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Field Sales Executive Workspace</span>
                  </div>
                  <p className="text-[11px] text-teal-200/70 truncate">Shop visits, on-the-spot order booking & customer ledger dues</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0F2828]/80 border border-teal-800/40 backdrop-blur-xs flex items-center gap-3.5 transition-all hover:bg-[#0F2828] hover:border-teal-700/60">
                <div className="w-10 h-10 rounded-xl bg-teal-950 text-emerald-300 border border-teal-800/60 flex items-center justify-center shrink-0 shadow-xs">
                  <Truck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Delivery Logistics & COD Tracking</span>
                  </div>
                  <p className="text-[11px] text-teal-200/70 truncate">Shipment dispatches, route runs, proof of delivery & cash tally</p>
                </div>
              </div>

            </div>

            {/* System Trust Badges */}
            <div className="flex items-center gap-5 pt-2 text-[11px] text-teal-300/70">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Real-time Firebase Firestore</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Role-Based Access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit SSL Encrypted</span>
              </div>
            </div>

          </div>

          {/* Right Column: Modern Authentication Card */}
          <div className="w-full lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 relative">
              
              {/* Card Top Brand Header */}
              <div className="text-left mb-5">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200/70 text-[#087F7A] text-[11px] font-bold tracking-wide uppercase">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Portal Sign In</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">v2.4.0</span>
                </div>
                
                <h2 className="text-2xl font-black text-[#102A2A] tracking-tight mt-2.5">
                  Welcome to Glowzaa
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your assigned username or email to access your workspace.
                </p>
              </div>

              {/* Quick Role Fill / Demo Selector */}
              <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#087F7A]" />
                    Quick Role Sign-In:
                  </span>
                  <span className="text-[10px] text-slate-400">1-tap autofill</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {QUICK_ACCOUNTS.map((acc) => {
                    const Icon = acc.icon;
                    const isSelected = activeQuickRole === acc.id || email === acc.loginId;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleSelectQuickRole(acc)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                          isSelected
                            ? 'bg-[#087F7A] text-white border-[#087F7A] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-[#087F7A]'}`} />
                        <span className="text-[11px] font-bold leading-tight truncate w-full">{acc.label}</span>
                        <span className={`text-[9px] font-mono leading-tight mt-0.5 truncate w-full ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                          {acc.loginId.includes('@') ? 'admin' : acc.loginId}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error Alert */}
              {displayError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-left">
                    <span className="font-bold block text-rose-800">Authentication Issue</span>
                    <span className="text-rose-700">{displayError}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setLocalError(null); clearError(); }}
                    className="text-rose-400 hover:text-rose-700 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* SIGN IN FORM */}
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-left" noValidate>
                
                {/* Username / Email Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Username / Login ID or Email <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setActiveQuickRole(null);
                        if (localError) setLocalError(null);
                      }}
                      placeholder="seller01, delivery01 or admin@glowzaa.com"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8FAFB] border border-slate-200 rounded-xl text-[#102A2A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#087F7A] focus:ring-2 focus:ring-[#087F7A]/15 transition-all font-medium"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Example: <strong className="text-slate-600">seller01</strong>, <strong className="text-slate-600">delivery01</strong></span>
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Password <span className="text-rose-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-xs font-semibold text-[#087F7A] hover:text-[#075E5B] hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (localError) setLocalError(null);
                      }}
                      onKeyUp={handlePasswordKeyUp}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 text-sm bg-[#F8FAFB] border border-slate-200 rounded-xl text-[#102A2A] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#087F7A] focus:ring-2 focus:ring-[#087F7A]/15 transition-all font-medium"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Caps Lock Warning */}
                  {capsLockActive && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 mt-1 font-semibold flex items-center gap-1">
                      <span>⚠️ Caps Lock is ON</span>
                    </p>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#087F7A] focus:ring-[#087F7A] border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 font-medium">Keep me signed in on this device</span>
                  </label>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#087F7A] hover:bg-[#075E5B] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-[#087F7A]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying Session...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to System</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>

              {/* Security Footnote */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
                <ShieldCheck className="w-4 h-4 text-[#087F7A] shrink-0" />
                <span>Protected by Firebase Enterprise Auth & Security Rules</span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3.5 px-4 text-center text-xs text-teal-200/50 border-t border-teal-900/40 bg-[#0B1E1E]/60 z-20 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto">
        <span>© 2026 Glowzaa Bangladesh Ltd. Wholesale & Distribution Suite.</span>
        <span className="text-[11px] text-teal-300/40 mt-1 sm:mt-0">Shailkupa Head Office • Bangladesh</span>
      </footer>

      {/* Password Reset Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#087F7A] flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span>Reset Password</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setResetMessage(null);
                  setResetError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {resetMessage ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Reset Email Sent Successfully</span>
                  </div>
                  <p className="leading-relaxed">{resetMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter your registered email address or staff Login ID. We will send a secure password reset link to your email.
                  </p>

                  {resetError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Email Address or Username
                    </label>
                    <input
                      type="text"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@glowzaa.com or seller01"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-[#087F7A] font-medium"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#087F7A] hover:bg-[#075E5B] rounded-lg shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      {isResetting && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                      <span>Send Reset Link</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setResetMessage(null);
                  setResetError(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
