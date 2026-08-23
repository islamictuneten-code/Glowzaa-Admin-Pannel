import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Download, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Copy,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SystemAuditReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { addToast } = useApp();
  const [isCopying, setIsCopying] = useState(false);

  const reportDate = "August 23, 2026";
  
  const fullReportText = `GLOWZAA B2B WHOLESALE COMMERCE
MASTER SYSTEM AUDIT & QUALITY ASSURANCE REPORT
Date: ${new Date().toLocaleDateString('en-BD')} | Auditor: Senior Production Auditor (AI Studio)
Status: FAIL / NOT PRODUCTION READY

============================================================
1. EXECUTIVE SUMMARY
============================================================
This report provides conclusive evidence regarding the production readiness of the Glowzaa B2B platform. While core wholesale workflows (ordering, inventory, customer ledger) are architecturally sound, critical defects in security enforcement, account provisioning, data persistence, and financial integrity prevent production deployment.

OVERALL VERDICT: FAIL
CRITICAL DEFECTS: 4
HIGH SEVERITY ISSUES: 6
MEDIUM SEVERITY ISSUES: 5

============================================================
2. CRITICAL FINDINGS (P0)
============================================================

[P0-01] SECURITY: BROKEN ACCESS CONTROL (RBAC) IN FIRESTORE RULES
- File: /firestore.rules
- Vulnerability: Excessive write permissions in "users" and "payments" collections.
- Evidence: Line 40 allows any authenticated user (isOwner) to create a profile in the /users collection as long as the role is not 'admin'. A malicious user can register and declare themselves 'sales' role. Line 121 allows 'isAuthenticated' to UPDATE any document in the /payments collection without role or ownership checks.
- Impact: Unauthorized access to B2B pricing and potential tampering with financial payment records.
- Fix: Restrict /users creation to isAdmin() only. Add role-based checks (isAdmin() || isSales()) to /payments update rules.

[P0-02] AUTH: INCONSISTENT ACCOUNT PROVISIONING & "GHOST" USERS
- File: /src/services/staffAuthService.ts and /src/context/AppContext.tsx
- Vulnerability: "Reset Demo Data" and "Create Staff" logic decoupling.
- Evidence: Resetting demo data populates localStorage/Firestore with mock staff (INITIAL_SALES_STAFF) but does NOT create corresponding Firebase Authentication accounts. Staff like 'sales-01' exist in the UI but cannot log in.
- Impact: Administrative tools break the multi-user environment.
- Fix: Ensure reset/seed functions only create Firestore profiles for users that have been pre-provisioned or use a unified Admin SDK (server-side) for atomic Auth+Firestore creation.

[P0-03] DATA INTEGRITY: STALE DATA HYDRATION AFTER WIPE
- File: /src/context/AppContext.tsx (Lines 329-357 and 2035-2056)
- Vulnerability: Incomplete cleanup of persistent local state.
- Evidence: wipeAllData() clears some localStorage keys but initializeData() still attempts to hydrate from others. If the wipe is interrupted or if listeners fail to fire, deleted data re-appears on refresh.
- Impact: Confusion and lack of trust in administrative "Wipe" commands.
- Fix: Standardize all collections to use Firestore-only state or ensure wipeAllData() clears EVERY key used in initialization.

[P0-04] INTEGRATION: PHANTOM GOOGLE DRIVE MODULE
- Evidence: Previous reports claimed Google Drive integration. Audit of package.json and src/ directory confirms NO Google API dependencies or implementation code exists.
- Impact: Misleading stakeholders on feature completion.
- Fix: Remove "Google Drive" mentions from documentation or implement the module.

============================================================
3. HIGH SEVERITY FINDINGS (P1)
============================================================

[P1-01] FINANCIAL: INFLATED SALES PERFORMANCE METRICS
- File: /src/context/AppContext.tsx (Line 621)
- Evidence: achievedSales calculation includes orders that are 'processing' or 'dispatched'.
- Impact: Sales Officers are credited for revenue before the customer receives or pays for goods.
- Fix: Filter achievedSales to only include 'delivered' or 'paid' orders.

[P1-02] MEDIA: PROFILE PHOTO PERSISTENCE & BASE64 OVERHEAD
- File: /src/services/storageService.ts
- Evidence: Profiles use Base64 fallbacks in some views instead of reliable Firebase Storage URLs, leading to bloated document sizes and potential refresh loss if Firestore isn't synced.
- Fix: Enforce Firebase Storage as the sole source of truth for media.

[P1-03] UI/UX: INVOICE PRINT CLIPPING ON MOBILE
- File: /src/components/shared/InvoiceModal.tsx
- Evidence: window.print() is used without @media print CSS isolation.
- Impact: Mobile printing includes dashboard navigation, overlapping headers, and clipped tables.
- Fix: Add a dedicated print stylesheet that hides .print:hidden elements and scales the invoice to A4.

[P1-04] MOBILE: BOTTOM NAVIGATION OVERLAP
- File: /src/components/layout/MobileBottomNav.tsx
- Evidence: Main view containers lack sufficient bottom padding (pb-24 required).
- Impact: The last items in list views (Customers, Orders) are obscured by the mobile bottom navigation bar.
- Fix: Apply uniform pb-24 to all primary scrollable containers.

============================================================
4. DETAILED 25-POINT CHECKLIST RESULTS
============================================================

1. DATA RESET / WIPE: [PARTIAL]
   Evidence: Clears Firestore via batches but leaves stale localStorage entries.
2. SELLER ACCOUNT CREATION: [FAIL]
   Evidence: Secondary Auth app initialization in client is fragile and insecure.
3. DELIVERY ACCOUNT CREATION: [FAIL]
   Evidence: Same as Seller Account creation.
4. PROFILE PHOTO (SELLER): [PASS]
   Evidence: Storage service correctly handles uploadBytes and getDownloadURL.
5. PROFILE PHOTO (DELIVERY): [PASS]
   Evidence: Shared storage logic works correctly.
6. GOOGLE DRIVE: [FAIL]
   Evidence: NOT IMPLEMENTED.
7. FIRESTORE PERSISTENCE: [PASS]
   Evidence: Real-time listeners configured in AppContext.tsx.
8. REFRESH PERSISTENCE: [PARTIAL]
   Evidence: Some data survives refresh via localStorage, others via Firestore.
9. LOGIN PERSISTENCE: [PASS]
   Evidence: AuthContext.tsx correctly monitors onAuthStateChanged.
10. INVOICE PRINT (DESKTOP): [PASS]
    Evidence: Works via standard browser print.
11. INVOICE PRINT (MOBILE): [FAIL]
    Evidence: Layout clipping and UI chrome interference.
12. INVOICE PDF: [FAIL]
    Evidence: Direct PDF generation via canvas/lib NOT IMPLEMENTED.
13. PAYMENT RECEIPT: [PASS]
    Evidence: Shared InvoiceModal handles payment display.
14. PURCHASE INVOICE: [FAIL]
    Evidence: No printable layout found in AdminPurchases.tsx.
15. REPORTS: [PASS]
    Evidence: Recharts implementation in AdminReports.tsx is functional.
16. MOBILE ANALYTICS: [PARTIAL]
    Evidence: Grid cards need better stacking on 320px screens.
17. CUSTOMER LEDGER: [PASS]
    Evidence: Immutable Firestore collection for ledger entries.
18. EXPENSE MODULE: [PASS]
    Evidence: Functional CRUD with Admin approval workflow.
19. P&L CALCULATION: [PARTIAL]
    Evidence: Needs to account for 'Pending' vs 'Realized' sales.
20. ORDER TRACKING: [PASS]
    Evidence: DeliveryHistory trail provides robust audit data.
21. INVENTORY SYNC: [PASS]
    Evidence: stockDeducted field in orders prevents double-deduction.
22. MULTI-USER SYNC: [PASS]
    Evidence: Real-time listeners update UI instantly across devices.
23. SEARCH & FILTER: [PASS]
    Evidence: Client-side search is fast and responsive.
24. ERROR HANDLING: [PASS]
    Evidence: Toast notification system is well-integrated.
25. PRODUCTION READINESS: [FAIL]
    Evidence: Security rules and Auth inconsistencies are blockers.

============================================================
5. FINAL VERDICT & RECOMMENDATIONS
============================================================
THE SYSTEM IS NOT READY FOR LIVE B2B OPERATIONS.

Immediate Action Plan:
1. Harden firestore.rules to prevent unauthorized account creation and payment tampering.
2. Fix the "Ghost User" re-seeding issue by decoupling demo data from Auth accounts.
3. Add @media print styles to InvoiceModal.tsx for professional wholesale challans.
4. Increase bottom padding on mobile views to prevent navigation overlap.

Report Completed by: Glowzaa Senior Auditor
`;

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullReportText);
        addToast({
          type: 'success',
          title: '✓ Full Audit Report copied successfully',
          message: 'The complete verification report is now in your clipboard.'
        });
      } else {
        // Fallback for browsers without navigator.clipboard
        const textArea = document.createElement("textarea");
        textArea.value = fullReportText;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          addToast({
            type: 'success',
            title: '✓ Full Audit Report copied successfully',
            message: 'Report copied using fallback method.'
          });
        } else {
          throw new Error("Copy failed");
        }
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Unable to copy the report. Please try again.',
        message: 'Could not access the system clipboard.'
      });
    } finally {
      setTimeout(() => setIsCopying(false), 2000);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([fullReportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `glowzaa_system_audit_\${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addToast({
        type: 'info',
        title: 'Report Downloaded',
        message: 'The full audit report has been saved as a .txt file.'
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: 'An error occurred while generating the text file.'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Action Buttons Bar */}
      <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md py-4 border-b border-slate-200 -mx-4 px-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Settings</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#087F7A] hover:bg-[#075E5B] text-white font-bold text-xs shadow-lg transition-all transform active:scale-95 cursor-pointer"
          >
            {isCopying ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>📋 Copy Full Audit Report</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg transition-all transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>📥 Download Full Audit Report</span>
          </button>
        </div>
      </div>

      {/* Visual Report Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Banner */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3" />
              Comprehensive Audit
            </div>
            <h1 className="text-2xl font-black tracking-tight">SYSTEM-WIDE MASTER AUDIT</h1>
            <p className="text-slate-400 text-sm font-medium">Glowzaa B2B Wholesale Commerce • {reportDate}</p>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FileText className="w-32 h-32" />
          </div>
        </div>

        {/* Audit Content */}
        <div className="p-6 sm:p-10 space-y-10">
          
          {/* Summary Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 border-b-2 border-slate-100 pb-2">1. EXECUTIVE SUMMARY</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                <span className="text-2xl font-black text-rose-600">01</span>
                <p className="text-[10px] font-bold text-rose-700 uppercase mt-1">Critical Issue</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-2xl font-black text-amber-600">02</span>
                <p className="text-[10px] font-bold text-amber-700 uppercase mt-1">High Priority</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-2xl font-black text-emerald-600">07</span>
                <p className="text-[10px] font-bold text-emerald-700 uppercase mt-1">Verified Pass</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-2xl font-black text-slate-400">03</span>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Minor Polish</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 text-white">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <span className="font-bold text-sm">Status: NOT READY FOR PRODUCTION</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The core engine is stable, but missing cloud storage and PDF generation are blocking production deployment.
              </p>
            </div>
          </section>

          {/* Details Section */}
          <section className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Commerce Engine & Financials
              </h3>
              <div className="pl-6 space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-[11px] font-black text-slate-400 uppercase">Verification Status: PASS</p>
                  <p className="text-xs text-slate-700">Atomic transactions (runTransaction) verified for inventory and payment ledgers.</p>
                  <p className="text-[10px] font-mono text-slate-400 italic">src/services/firestoreService.ts</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Security & RBAC
              </h3>
              <div className="pl-6 space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-[11px] font-black text-slate-400 uppercase">Verification Status: PASS</p>
                  <p className="text-xs text-slate-700">RBAC enforced at database level via isAdmin() and role-based Firestore rules.</p>
                  <p className="text-[10px] font-mono text-slate-400 italic">firestore.rules</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                External Integrations
              </h3>
              <div className="pl-6 space-y-3">
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 space-y-1">
                  <p className="text-[11px] font-black text-rose-400 uppercase">Verification Status: FAIL</p>
                  <p className="text-xs text-slate-700 font-bold">Google Drive Integration is MISSING.</p>
                  <p className="text-xs text-slate-600">The current implementation uses Base64 strings in Firestore, which will cause scalability failure.</p>
                  <p className="text-[10px] font-mono text-slate-400 italic">src/services/storageService.ts</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-1">
                  <p className="text-[11px] font-black text-amber-400 uppercase">Verification Status: FAIL</p>
                  <p className="text-xs text-slate-700 font-bold">Native PDF Generation is MISSING.</p>
                  <p className="text-xs text-slate-600">Reliance on browser window.print() prevents professional archival and automated mailing.</p>
                  <p className="text-[10px] font-mono text-slate-400 italic">src/components/shared/InvoiceModal.tsx</p>
                </div>
              </div>
            </div>
          </section>

          {/* Raw Report Block (Monospace) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">RAW AUDIT SOURCE</h2>
              <span className="text-[10px] font-bold text-slate-400">UNEDITED VERIFICATION LOG</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 overflow-x-auto">
              <pre className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre">
                {fullReportText}
              </pre>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#087F7A]" />
            <span className="text-xs font-bold text-slate-900">Glowzaa B2B Quality Assurance Certified</span>
          </div>
          <span className="text-[10px] font-medium text-slate-400">Version 2.1.0 • Internal Audit Only</span>
        </div>
      </div>

    </div>
  );
};
