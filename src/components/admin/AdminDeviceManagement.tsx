import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  Power, 
  Search, 
  Filter, 
  RefreshCw, 
  Users, 
  Briefcase, 
  Truck,
  Sparkles
} from 'lucide-react';
import { CommunicationDevice } from '../../types';
import { 
  subscribeCommunicationDevices, 
  setDeviceActiveStatus 
} from '../../services/notificationService';

export const AdminDeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<CommunicationDevice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeCommunicationDevices((list) => {
      setDevices(list);
    });
    return () => unsub();
  }, []);

  const handleToggleStatus = async (dev: CommunicationDevice) => {
    setIsTogglingId(dev.id);
    try {
      await setDeviceActiveStatus(dev.id, !dev.isActive);
    } finally {
      setIsTogglingId(null);
    }
  };

  const filtered = devices.filter((d) => {
    const matchesSearch = 
      d.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.deviceLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.browser.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.platform.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || d.role === roleFilter;
    const matchesPlatform = platformFilter === 'all' || d.platform === platformFilter;

    return matchesSearch && matchesRole && matchesPlatform;
  });

  const getPlatformIcon = (platform: string) => {
    if (platform === 'Android' || platform === 'iOS') {
      return <Smartphone className="w-4 h-4 text-teal-600" />;
    }
    return <Laptop className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4 text-left">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#102A2A]">Registered Staff Devices</h3>
            <span className="text-[10px] font-bold bg-teal-50 text-[#087F7A] border border-teal-200 px-2 py-0.5 rounded-full">
              {devices.filter(d => d.isActive).length} Active Tokens
            </span>
          </div>
          <p className="text-xs text-slate-500">Live registry of staff Android and workstation devices subscribed for FCM push</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user or device..."
              className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none w-44 sm:w-52"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs p-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
          >
            <option value="all">All Staff Roles</option>
            <option value="sales">Sales Team</option>
            <option value="delivery">Delivery Fleet</option>
            <option value="admin">Admin HQ</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs p-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="Android">Android</option>
            <option value="Windows">Windows</option>
            <option value="macOS">macOS</option>
            <option value="iOS">iOS</option>
          </select>
        </div>
      </div>

      {/* Devices Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold text-slate-600">No registered devices found</p>
          <p className="text-[11px] text-slate-400">When staff log in and allow push notifications, their device tokens will register here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Staff Member</th>
                <th className="p-3">Device & Platform</th>
                <th className="p-3">Push Permission</th>
                <th className="p-3">Last Seen</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Toggle Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((dev) => (
                <tr key={dev.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 whitespace-nowrap">
                    <div>
                      <p className="font-bold text-[#102A2A]">{dev.userName}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border ${
                        dev.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        dev.role === 'delivery' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-teal-50 text-[#087F7A] border-teal-200'
                      }`}>
                        {dev.role}
                      </span>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {getPlatformIcon(dev.platform)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate max-w-xs">{dev.deviceLabel}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{dev.browser}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      dev.permissionStatus === 'granted'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {dev.permissionStatus === 'granted' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Granted</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          <span>{dev.permissionStatus}</span>
                        </>
                      )}
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap text-slate-500 text-[11px]">
                    {new Date(dev.lastSeenAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      dev.isActive 
                        ? 'bg-teal-50 text-[#087F7A] border border-teal-200' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dev.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{dev.isActive ? 'ACTIVE' : 'DISABLED'}</span>
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleToggleStatus(dev)}
                      disabled={isTogglingId === dev.id}
                      className={`p-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        dev.isActive
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-teal-50 text-[#087F7A] border-teal-200 hover:bg-teal-100'
                      }`}
                      title={dev.isActive ? 'Deactivate Device Push' : 'Reactivate Device Push'}
                    >
                      <Power className="w-3.5 h-3.5 inline mr-1" />
                      <span>{dev.isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
