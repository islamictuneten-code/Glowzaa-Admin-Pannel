import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  ShoppingBag, 
  DollarSign, 
  ShieldAlert, 
  ShieldCheck, 
  RotateCcw, 
  UserPlus, 
  Navigation,
  FileText,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Customer, Order, Payment, CustomerLedgerEntry } from '../../../types';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { formatBDT } from '../../../utils/formatters';

interface ActivityTabProps {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
  ledgerEntries: CustomerLedgerEntry[];
}

interface TimelineItem {
  id: string;
  type: 'order' | 'payment' | 'credit_audit' | 'return' | 'created' | 'ledger' | 'visit';
  title: string;
  description: string;
  timestamp: string;
  actorName?: string;
  badge?: { label: string; className: string };
  amount?: number;
  amountType?: 'positive' | 'negative' | 'neutral';
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  customer,
  orders,
  payments,
  ledgerEntries
}) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudits, setIsLoadingAudits] = useState(true);

  // Fetch audit logs for this customer
  useEffect(() => {
    if (!customer?.id) {
      setAuditLogs([]);
      setIsLoadingAudits(false);
      return;
    }

    const auditRef = collection(db, 'audit_logs');
    const q = query(auditRef, where('targetUserId', '==', customer.id), limit(50));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        setAuditLogs(list);
        setIsLoadingAudits(false);
      },
      (err) => {
        console.warn('Audit logs query notice:', err);
        setIsLoadingAudits(false);
      }
    );

    return () => unsub();
  }, [customer?.id]);

  // Aggregate and sort timeline
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // 1. Account Created
    if (customer.createdAt) {
      items.push({
        id: `created-${customer.id}`,
        type: 'created',
        title: 'Customer Account Created',
        description: `Account initialized for "${customer.shopName}" by ${customer.assignedSalesUserName || 'Admin'}. Initial Credit Limit: ৳${(customer.creditLimit || 0).toLocaleString()}`,
        timestamp: customer.createdAt,
        actorName: customer.assignedSalesUserName || 'Admin',
        badge: { label: 'ACCOUNT CREATED', className: 'bg-teal-50 text-[#0F766E] border-teal-200' }
      });
    }

    // 2. Orders
    orders.forEach((o) => {
      const isReturned = o.orderStatus === 'returned';
      items.push({
        id: `order-${o.id}`,
        type: isReturned ? 'return' : 'order',
        title: isReturned ? `Order Returned: ${o.orderNumber || o.id.slice(0, 8)}` : `Order Placed: ${o.orderNumber || o.id.slice(0, 8)}`,
        description: `Items: ${o.items?.length || 0} product lines. Status: ${o.orderStatus?.toUpperCase()}. Payment: ${o.paymentStatus?.toUpperCase()}`,
        timestamp: o.createdAt || (o.createdDate ? `${o.createdDate}T12:00:00.000Z` : ''),
        actorName: o.salesUserName || 'Sales Staff',
        amount: o.grandTotal || o.totalAmount || 0,
        amountType: isReturned ? 'positive' : 'negative',
        badge: { 
          label: isReturned ? 'RETURN' : `ORDER (${o.orderStatus?.toUpperCase()})`,
          className: isReturned ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
        }
      });
    });

    // 3. Payments
    payments.forEach((p) => {
      items.push({
        id: `payment-${p.id}`,
        type: 'payment',
        title: p.isReversed ? `Payment Reversed: ${p.paymentNumber || p.id.slice(0, 8)}` : `Payment Received: ${p.paymentNumber || p.id.slice(0, 8)}`,
        description: `Method: ${p.paymentMethod}. Collected by: ${p.collectedByUserName || 'Staff'}. Ref: ${p.reference || p.notes || 'None'}`,
        timestamp: p.createdAt || (p.date ? `${p.date}T12:00:00.000Z` : ''),
        actorName: p.collectedByUserName || 'Staff User',
        amount: p.amount || 0,
        amountType: p.isReversed ? 'negative' : 'positive',
        badge: {
          label: p.isReversed ? 'REVERSED' : 'PAYMENT',
          className: p.isReversed ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }
      });
    });

    // 4. Audit logs (Credit limit changes, hold, overrides)
    auditLogs.forEach((a) => {
      let badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
      if (a.action === 'CREDIT_HOLD_ENABLED') badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300';
      if (a.action === 'CREDIT_LIMIT_CHANGED') badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      if (a.action === 'CREDIT_OVERRIDE') badgeStyle = 'bg-orange-50 text-orange-800 border-orange-200';

      items.push({
        id: `audit-${a.id}`,
        type: 'credit_audit',
        title: a.action ? a.action.replace(/_/g, ' ') : 'Credit Policy Update',
        description: a.details || a.reason || 'Credit control evaluation updated.',
        timestamp: a.timestamp || a.createdAt || '',
        actorName: a.performedByUserName || 'Admin',
        badge: { label: a.action || 'AUDIT', className: badgeStyle }
      });
    });

    // Sort descending by timestamp
    return items.filter(i => !!i.timestamp).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [customer, orders, payments, auditLogs]);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
            <History className="w-4 h-4 text-[#0F766E]" />
            <span>Chronological Account Activity Stream</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Audit-tracked timeline of orders, payments, credit adjustments, and management events.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-600">
          Total Events: <strong>{timelineItems.length}</strong>
        </span>
      </div>

      {/* Timeline Stream */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        {timelineItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No activity events recorded for this account.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineItems.map((item) => (
              <div key={item.id} className="relative group text-xs">
                {/* Node icon / dot */}
                <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                  item.type === 'order' ? 'bg-blue-600 text-white' :
                  item.type === 'payment' ? 'bg-emerald-600 text-white' :
                  item.type === 'credit_audit' ? 'bg-amber-600 text-white' :
                  item.type === 'return' ? 'bg-purple-600 text-white' :
                  'bg-teal-700 text-white'
                }`}>
                  {item.type === 'order' && <ShoppingBag className="w-2.5 h-2.5" />}
                  {item.type === 'payment' && <DollarSign className="w-2.5 h-2.5" />}
                  {item.type === 'credit_audit' && <ShieldAlert className="w-2.5 h-2.5" />}
                  {item.type === 'return' && <RotateCcw className="w-2.5 h-2.5" />}
                  {item.type === 'created' && <UserPlus className="w-2.5 h-2.5" />}
                </div>

                {/* Content Box */}
                <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl p-3.5 transition-colors space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badge.className}`}>
                          {item.badge.label}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-400 text-[11px] flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-slate-700 text-xs leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                    <span>
                      Actor: <strong className="text-slate-800 font-semibold">{item.actorName || 'System'}</strong>
                    </span>

                    {item.amount !== undefined && (
                      <span className={`font-extrabold font-mono text-xs ${
                        item.amountType === 'positive' ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {item.amountType === 'positive' ? '+' : ''}{formatBDT(item.amount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
