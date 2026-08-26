import React, { useEffect, useState } from 'react';
import { VoiceCall, AuthUser } from '../../types';
import { getCallHistory } from '../../services/voiceCallSignalingService';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneForwarded } from 'lucide-react';

interface CallHistoryProps {
  currentUser: AuthUser;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ currentUser }) => {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'missed'>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getCallHistory(currentUser.uid);
        setCalls(history);
      } catch (err) {
        console.error('Failed to fetch call history', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [currentUser.uid]);

  const filteredCalls = calls.filter(call => {
    if (filter === 'missed') {
      return call.status === 'missed' && call.receiverId === currentUser.uid;
    }
    return true;
  });

  const getCallIcon = (call: VoiceCall) => {
    const isIncoming = call.receiverId === currentUser.uid;
    
    if (call.status === 'missed') return <PhoneMissed className="w-4 h-4 text-red-500" />;
    if (call.status === 'rejected') return <PhoneOff className="w-4 h-4 text-red-500" />;
    
    if (isIncoming) return <PhoneIncoming className="w-4 h-4 text-emerald-500" />;
    return <PhoneOutgoing className="w-4 h-4 text-gray-500" />;
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading history...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
        <h3 className="font-semibold text-gray-800">Call History</h3>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('missed')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === 'missed' ? 'bg-white shadow-sm text-red-600 font-medium' : 'text-gray-500'}`}
          >
            Missed
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCalls.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No calls found
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCalls.map(call => {
              const isIncoming = call.receiverId === currentUser.uid;
              const otherName = isIncoming ? call.callerName : call.receiverName;
              const otherRole = isIncoming ? call.callerRole : call.receiverRole;
              
              return (
                <div key={call.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {otherName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={`font-medium ${call.status === 'missed' && isIncoming ? 'text-red-600' : 'text-gray-800'}`}>
                        {otherName}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-0.5 space-x-1">
                        {getCallIcon(call)}
                        <span>{isIncoming ? 'Incoming' : 'Outgoing'}</span>
                        <span>•</span>
                        <span className="capitalize">{otherRole}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(call.createdAt))}
                    </div>
                    {call.durationSeconds ? (
                      <div className="text-xs font-medium text-gray-600 bg-gray-100 inline-block px-2 py-0.5 rounded">
                        {formatDuration(call.durationSeconds)}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple PhoneOff icon for the file
const PhoneOff = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
    <line x1="22" y1="2" x2="2" y2="22" />
  </svg>
);
