import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Megaphone, 
  Truck, 
  ShoppingBag, 
  DollarSign, 
  MapPin, 
  Bell, 
  Eye, 
  Copy, 
  Users, 
  Briefcase, 
  X,
  Sparkles
} from 'lucide-react';
import { CommunicationNotification } from '../../types';
import { deleteCommunicationNotification } from '../../services/notificationService';

interface AdminNotificationHistoryProps {
  notifications: CommunicationNotification[];
  onSelectTemplate?: (notif: CommunicationNotification) => void;
}

export const AdminNotificationHistory: React.FC<AdminNotificationHistoryProps> = ({
  notifications,
  onSelectTemplate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedNotif, setSelectedNotif] = useState<CommunicationNotification | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = notifications.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.recipientUserName && item.recipientUserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.senderName && item.senderName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesType = filterType === 'all' || item.type === filterType;

    return matchesSearch && matchesPriority && matchesType;
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCommunicationNotification(id);
      if (selectedNotif?.id === id) setSelectedNotif(null);
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'delivery':
        return <Truck className="w-4 h-4 text-teal-600" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
      case 'field':
        return <MapPin className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#087F7A]" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4 text-left">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#102A2A]">Notification Dispatch History</h3>
          <p className="text-xs text-slate-500">Live audit log of staff push alerts and broadcast directives</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notifications..."
              className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none w-48 sm:w-56"
            />
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs p-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs p-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="announcement">Announcement</option>
            <option value="order">Order</option>
            <option value="delivery">Delivery</option>
            <option value="payment">Payment</option>
            <option value="field">Field</option>
            <option value="urgent">Urgent</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Table / List View */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold text-slate-600">No notifications found</p>
          <p className="text-[11px] text-slate-400">Try adjusting your search criteria or compose a new push message.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Notification</th>
                <th className="p-3">Target Audience</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Dispatched At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-start gap-2.5 max-w-sm sm:max-w-md">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {getCategoryIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#102A2A] truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.body}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                      {item.recipientUserId === 'all' ? <Users className="w-3 h-3 text-[#087F7A]" /> : <Briefcase className="w-3 h-3 text-slate-500" />}
                      <span>{item.recipientUserName || item.recipientRole}</span>
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                      item.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      item.priority === 'important' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {item.priority}
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap text-slate-500 text-[11px]">
                    {new Date(item.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  <td className="p-3 whitespace-nowrap text-right space-x-1">
                    <button
                      onClick={() => setSelectedNotif(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#087F7A] hover:bg-teal-50 transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onSelectTemplate && (
                      <button
                        onClick={() => onSelectTemplate(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#087F7A] hover:bg-teal-50 transition-colors cursor-pointer"
                        title="Duplicate as Template"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Dialog Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#087F7A] flex items-center justify-center">
                  {getCategoryIcon(selectedNotif.type)}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notification Details</h4>
                  <p className="text-xs font-bold text-[#102A2A]">ID: {selectedNotif.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Title</span>
                <p className="font-bold text-[#102A2A] text-sm mt-0.5">{selectedNotif.title}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Message Body</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 mt-0.5">
                  {selectedNotif.body}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recipient</span>
                  <p className="font-semibold text-slate-800">{selectedNotif.recipientUserName || selectedNotif.recipientRole}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Priority</span>
                  <p className="font-semibold uppercase text-slate-800">{selectedNotif.priority}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sender</span>
                  <p className="font-semibold text-slate-800">{selectedNotif.senderName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Created Timestamp</span>
                  <p className="font-semibold text-slate-800">{new Date(selectedNotif.createdAt).toLocaleString('en-GB')}</p>
                </div>
              </div>

              {selectedNotif.actionType !== 'none' && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Action Route</span>
                  <p className="font-semibold text-[#087F7A] mt-0.5">
                    {selectedNotif.actionType.toUpperCase()} {selectedNotif.relatedId ? `(ID: ${selectedNotif.relatedId})` : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
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
