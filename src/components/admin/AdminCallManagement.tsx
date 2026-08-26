import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CallQueueEntry, AuthUser, VoiceCall, GroupCall } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { PhoneCall, Check, X, Clock, AlertTriangle, Users, Calendar, Filter, Search, Radio, History } from 'lucide-react';

export const AdminCallManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [queue, setQueue] = useState<CallQueueEntry[]>([]);
  const [activeCalls, setActiveCalls] = useState<number>(0);
  const [totalCalls, setTotalCalls] = useState<number>(0);
  const [missedCalls, setMissedCalls] = useState<number>(0);
  const [historyTab, setHistoryTab] = useState<'all' | '1to1' | 'group'>('all');
  const [historyItems, setHistoryItems] = useState<(VoiceCall | GroupCall)[]>([]);

  const [reconnectingCalls, setReconnectingCalls] = useState<number>(0);
  const [avgDuration, setAvgDuration] = useState<string>('0m 0s');
  
  useEffect(() => {
    if (!currentUser) return;

    // Listen to queue
    const qQueue = query(
      collection(db, 'communication_call_queue'),
      where('status', '==', 'queued'),
      orderBy('queuedAt', 'asc')
    );
    
    const unsubQueue = onSnapshot(qQueue, (snapshot) => {
      const qData: CallQueueEntry[] = [];
      snapshot.forEach(doc => qData.push(doc.data() as CallQueueEntry));
      setQueue(qData);
    });

    const fetchStatsAndHistory = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const qCalls = query(
        collection(db, 'communication_calls'),
        where('createdAt', '>=', today.toISOString()),
        orderBy('createdAt', 'desc')
      );
      
      const qGroupCalls = query(
        collection(db, 'communication_group_calls'),
        where('createdAt', '>=', today.toISOString()),
        orderBy('createdAt', 'desc')
      );
      
      const [snapCalls, snapGroup] = await Promise.all([
        getDocs(qCalls),
        getDocs(qGroupCalls)
      ]);
      
      let active = 0;
      let missed = 0;
      let reconnecting = 0;
      let totalDuration = 0;
      let callsWithDuration = 0;
      let items: (VoiceCall | GroupCall)[] = [];
      
      snapCalls.forEach(doc => {
        const data = doc.data() as VoiceCall;
        items.push(data);
        if (data.status === 'calling' || data.status === 'ringing' || data.status === 'connecting' || data.status === 'connected') {
          active++;
        }
        if (data.status === 'failed') {
          reconnecting++; // We'll map failed states or use it here
        }
        if (data.status === 'missed' || data.status === 'failed') {
          missed++;
        }
        if (data.durationSeconds) {
          totalDuration += data.durationSeconds;
          callsWithDuration++;
        }
      });
      
      snapGroup.forEach(doc => {
        const data = doc.data() as GroupCall;
        items.push(data);
        if (data.status === 'initializing' || data.status === 'active') {
          active++;
        }
        if (data.durationSeconds) {
          totalDuration += data.durationSeconds;
          callsWithDuration++;
        }
      });
      
      // Sort items by date desc
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setActiveCalls(active);
      setTotalCalls(snapCalls.size + snapGroup.size);
      setMissedCalls(missed);
      setReconnectingCalls(reconnecting);
      setHistoryItems(items);
      
      if (callsWithDuration > 0) {
        const avg = Math.floor(totalDuration / callsWithDuration);
        setAvgDuration(`${Math.floor(avg / 60)}m ${avg % 60}s`);
      }
    };

    fetchStatsAndHistory();

    return () => {
      unsubQueue();
    };
  }, [currentUser]);

  const handleDequeue = async (entryId: string, action: 'cancel' | 'call') => {
    try {
      await updateDoc(doc(db, 'communication_call_queue', entryId), {
        status: action === 'cancel' ? 'cancelled' : 'calling',
        calledAt: action === 'call' ? new Date().toISOString() : undefined
      });
      
      if (action === 'call') {
        alert('Item dequeued. You can now initiate the call from the staff directory.');
      }
    } catch (err) {
      console.warn('Failed to update queue', err);
    }
  };

  const filteredHistory = historyItems.filter(item => {
    if (historyTab === 'all') return true;
    if (historyTab === '1to1') return !('type' in item) || item.type === 'voice'; // Some old data might not have type, or type='voice'
    if (historyTab === 'group') return 'type' in item && (item.type === 'group' || item.type === 'broadcast');
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <PhoneCall className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Calls</p>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{activeCalls}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Calls</p>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{totalCalls}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Failed/Missed</p>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-gray-900">{missedCalls}</h3>
            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md">{reconnectingCalls} Failed</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Avg Duration</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900">{avgDuration}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active & Queued Calls */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex flex-col min-h-[250px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h2 className="text-xl font-bold text-gray-900">Active Sessions</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {historyItems.filter(item => 
                (item as VoiceCall).status === 'connecting' || 
                (item as VoiceCall).status === 'connected' || 
                (item as GroupCall).status === 'initializing' || 
                (item as GroupCall).status === 'active'
              ).length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No active calls at the moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.filter(item => 
                    (item as VoiceCall).status === 'connecting' || 
                    (item as VoiceCall).status === 'connected' || 
                    (item as GroupCall).status === 'initializing' || 
                    (item as GroupCall).status === 'active'
                  ).map(item => {
                    const isGroup = 'participants' in item;
                    const name = isGroup ? `${(item as GroupCall).initiatorName} (Group)` : `${(item as VoiceCall).callerName} → ${(item as VoiceCall).receiverName}`;
                    return (
                      <div key={item.id} className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                          <span className="font-bold text-sm text-gray-900 truncate max-w-[150px]">{name}</span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 capitalize">{item.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col flex-1 min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Call Queue</h2>
              </div>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {queue.length}
              </span>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500 flex-1 flex flex-col items-center justify-center">
                <Clock className="w-8 h-8 text-gray-300 mb-2" />
                <p>Queue is empty.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                {queue.map(entry => (
                  <div key={entry.id} className="flex flex-col p-4 border border-gray-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{entry.targetName}</p>
                      <p className="text-xs text-gray-500 uppercase">{entry.targetRole}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Queued by {entry.callerName} at {new Date(entry.queuedAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                      <button 
                        onClick={() => handleDequeue(entry.id, 'cancel')}
                        className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex-1 flex justify-center"
                        title="Remove from queue"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDequeue(entry.id, 'call')}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors flex-[3]"
                      >
                        <PhoneCall className="w-4 h-4" />
                        Call Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Advanced Call History */}
        <div className="xl:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full min-h-[400px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-[#087F7A]" />
              Call History (Today)
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setHistoryTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${historyTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                All
              </button>
              <button 
                onClick={() => setHistoryTab('1to1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${historyTab === '1to1' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                1-to-1
              </button>
              <button 
                onClick={() => setHistoryTab('group')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${historyTab === 'group' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Groups & Broadcasts
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                <History className="w-12 h-12 text-gray-200 mb-3" />
                <p>No call history found for today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(item => {
                  const isGroup = 'participants' in item;
                  
                  if (isGroup) {
                    const g = item as GroupCall;
                    const durationStr = g.durationSeconds ? `${Math.floor(g.durationSeconds / 60)}m ${g.durationSeconds % 60}s` : '-';
                    return (
                      <div key={g.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${g.type === 'broadcast' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {g.type === 'broadcast' ? <Radio className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 text-sm">
                                {g.initiatorName}
                              </p>
                              <span className="text-xs bg-gray-100 px-2 rounded-full text-gray-600 uppercase">
                                {g.type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{g.participantIds.length} Participants • {new Date(g.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full capitalize ${g.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {g.status}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">Duration: {durationStr}</p>
                        </div>
                      </div>
                    );
                  } else {
                    const v = item as VoiceCall;
                    const durationStr = v.durationSeconds ? `${Math.floor(v.durationSeconds / 60)}m ${v.durationSeconds % 60}s` : '-';
                    return (
                      <div key={v.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${v.status === 'missed' ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-600'}`}>
                            <PhoneCall className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {v.callerName} → {v.receiverName}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(v.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full capitalize ${v.status === 'missed' ? 'bg-red-100 text-red-700' : v.status === 'ended' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                            {v.status}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">Duration: {durationStr}</p>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
