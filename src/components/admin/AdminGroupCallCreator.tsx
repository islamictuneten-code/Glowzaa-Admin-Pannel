import React, { useState } from 'react';
import { Users, PhoneCall, Radio, Check, X, Search, UserCheck } from 'lucide-react';
import { AuthUser } from '../../types';
import { createGroupCall } from '../../services/groupVoiceCallSignalingService';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

interface AdminGroupCallCreatorProps {
  staffUsers: AuthUser[];
}

export const AdminGroupCallCreator: React.FC<AdminGroupCallCreatorProps> = ({ staffUsers }) => {
  const { currentUser } = useAuth();
  const { addToast } = useApp();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'sales' | 'delivery'>('all');
  const [isStarting, setIsStarting] = useState(false);

  const filteredStaff = staffUsers.filter(user => {
    if (user.uid === currentUser?.uid) return false; // Don't call self
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (search && !user.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleUser = (uid: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(uid)) {
      newSet.delete(uid);
    } else {
      newSet.add(uid);
    }
    setSelectedIds(newSet);
  };

  const selectAllFiltered = () => {
    const newSet = new Set(selectedIds);
    filteredStaff.forEach(u => newSet.add(u.uid));
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleStartCall = async (type: 'group' | 'broadcast') => {
    if (!currentUser) return;
    if (selectedIds.size === 0) {
      addToast({ title: 'No participants', message: 'Please select at least one participant.', type: 'warning' });
      return;
    }

    if (type === 'group' && selectedIds.size > 4) {
      addToast({ 
        title: 'Mesh Limit Reached', 
        message: 'Mesh WebRTC architecture is limited to 5 total participants (You + 4 others). For larger groups, an SFU (Selective Forwarding Unit) media server is required in production.', 
        type: 'error',
        duration: 8000
      });
      return;
    }

    setIsStarting(true);
    try {
      const selectedParticipants = staffUsers.filter(u => selectedIds.has(u.uid));
      await createGroupCall(currentUser, selectedParticipants, type);
      addToast({ title: 'Success', message: `${type === 'broadcast' ? 'Broadcast' : 'Group call'} initiated.`, type: 'success' });
      clearSelection();
    } catch (err: any) {
      addToast({ title: 'Error', message: err.message || 'Failed to start call', type: 'error' });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Group Voice Calling
          </h2>
          <p className="text-sm text-gray-500 mt-1">Select staff members to initiate a group call or broadcast.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search staff by name..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setFilterRole('all')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterRole === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilterRole('sales')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterRole === 'sales' ? 'bg-white text-[#087F7A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sales
          </button>
          <button 
            onClick={() => setFilterRole('delivery')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterRole === 'delivery' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Delivery
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 mb-4 border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} Selected
          </span>
          {selectedIds.size > 0 && (
            <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-red-500">
              Clear
            </button>
          )}
        </div>
        <button 
          onClick={selectAllFiltered}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          <Check className="w-4 h-4" /> Select All Filtered
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar min-h-[200px]">
        {filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
            <Users className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">No staff members found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredStaff.map(user => {
              const isSelected = selectedIds.has(user.uid);
              return (
                <div 
                  key={user.uid}
                  onClick={() => toggleUser(user.uid)}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20' 
                      : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="relative mr-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto pt-4 border-t border-gray-100">
        <button
          onClick={() => handleStartCall('group')}
          disabled={selectedIds.size === 0 || isStarting}
          className="flex items-center justify-center gap-2 bg-[#0F766E] hover:bg-teal-700 text-white py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
        >
          <Users className="w-5 h-5" />
          Start Group Call
        </button>
        <button
          onClick={() => handleStartCall('broadcast')}
          disabled={selectedIds.size === 0 || isStarting}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
        >
          <Radio className="w-5 h-5" />
          Broadcast to Team
        </button>
      </div>
      <div className="text-center mt-3">
        <p className="text-[11px] text-gray-400">
          Group calls support 2-way audio for up to 5 users. Broadcasts send a 1-way join request to all selected users.
        </p>
      </div>
    </div>
  );
};
