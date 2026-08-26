import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export interface CommunicationSettings {
  callTimeoutSeconds: number;
  maxGroupSize: number;
  maxReconnectAttempts: number;
  reconnectBackoffBaseMs: number;
  enableGroupCalls: boolean;
  enableBroadcastCalls: boolean;
}

const DEFAULT_SETTINGS: CommunicationSettings = {
  callTimeoutSeconds: 30,
  maxGroupSize: 5,
  maxReconnectAttempts: 4,
  reconnectBackoffBaseMs: 1000,
  enableGroupCalls: true,
  enableBroadcastCalls: true
};

export const AdminCommunicationSettings: React.FC = () => {
  const [settings, setSettings] = useState<CommunicationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'communication');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() as CommunicationSettings });
        }
      } catch (err) {
        console.error('Failed to load communication settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'communication'), settings);
      alert('Communication settings updated successfully.');
    } catch (err) {
      console.error('Failed to save', err);
      alert('Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 max-w-2xl">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Communication Settings</h2>
          <p className="text-sm text-gray-500">Configure global timeouts, retry limits, and active features.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Timeout & Recovery</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Call Timeout (Seconds)</label>
              <p className="text-xs text-gray-500 mb-2">Duration to ring before marking a call as Missed.</p>
              <input 
                type="number" 
                min="10" 
                max="120"
                value={settings.callTimeoutSeconds}
                onChange={e => setSettings({...settings, callTimeoutSeconds: parseInt(e.target.value) || 30})}
                className="w-full max-w-xs px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#087F7A]/20 focus:border-[#087F7A]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Reconnect Attempts</label>
              <p className="text-xs text-gray-500 mb-2">Number of ICE restarts to attempt before failing the call.</p>
              <input 
                type="number" 
                min="1" 
                max="10"
                value={settings.maxReconnectAttempts}
                onChange={e => setSettings({...settings, maxReconnectAttempts: parseInt(e.target.value) || 4})}
                className="w-full max-w-xs px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#087F7A]/20 focus:border-[#087F7A]"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Group Calling Limits</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Maximum Group Size (Mesh WebRTC)</label>
            <p className="text-xs text-gray-500 mb-2">Hard limit on participants to prevent browser overload. An SFU is required for &gt; 5.</p>
            <input 
              type="number" 
              min="2" 
              max="5"
              value={settings.maxGroupSize}
              onChange={e => setSettings({...settings, maxGroupSize: parseInt(e.target.value) || 5})}
              className="w-full max-w-xs px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#087F7A]/20 focus:border-[#087F7A]"
            />
            {settings.maxGroupSize > 5 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg max-w-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Sizes above 5 may severely impact browser performance without SFU infrastructure.</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Feature Toggles</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={settings.enableGroupCalls}
                onChange={e => setSettings({...settings, enableGroupCalls: e.target.checked})}
                className="w-5 h-5 text-[#087F7A] rounded border-gray-300 focus:ring-[#087F7A]"
              />
              <div>
                <p className="font-bold text-gray-900 text-sm">Enable Group Calling</p>
                <p className="text-xs text-gray-500">Allow staff to create multi-party voice calls.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={settings.enableBroadcastCalls}
                onChange={e => setSettings({...settings, enableBroadcastCalls: e.target.checked})}
                className="w-5 h-5 text-[#087F7A] rounded border-gray-300 focus:ring-[#087F7A]"
              />
              <div>
                <p className="font-bold text-gray-900 text-sm">Enable Broadcast Calls</p>
                <p className="text-xs text-gray-500">Allow admins to initiate 1-way broadcast rings.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#087F7A] hover:bg-teal-700 text-white font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
