import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Globe, Bot, Shield, CheckCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [reminders, setReminders] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Settings className="w-6 h-6 mr-2 text-purple-400" />
          Settings & Configuration
        </h1>
        <p className="text-sm text-slate-400">Manage timezones, Telegram bot integration, and notifications</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Account */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Account Profile</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">Username</span>
              <span className="text-slate-200 font-mono">{user?.username}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Telegram Linked</span>
              <span className="text-slate-200">{user?.telegram_id ? `@${user.telegram_username || user.telegram_id}` : 'Not linked'}</span>
            </div>
          </div>
        </div>

        {/* Timezone & Localization */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Localization</span>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Display Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="Asia/Jakarta">Asia/Jakarta (UTC+07:00 - Default)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+08:00)</option>
              <option value="America/New_York">America/New_York (UTC-04:00)</option>
              <option value="Europe/London">Europe/London (UTC+01:00)</option>
            </select>
          </div>
        </div>

        {/* Telegram Integration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>Telegram Bot & Mini App Integration</span>
          </div>
          <p className="text-xs text-slate-400">
            Open the Telegram Mini App or chat with the bot to manage campaigns on mobile.
            Available commands: <code className="text-purple-400">/today</code>, <code className="text-purple-400">/pending</code>, <code className="text-purple-400">/deadlines</code>, <code className="text-purple-400">/projects</code>.
          </p>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="reminders"
              checked={reminders}
              onChange={(e) => setReminders(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
            />
            <label htmlFor="reminders" className="text-xs text-slate-300">
              Enable task reminder alerts and daily summaries
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition"
          >
            Save Preferences
          </button>
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Settings saved successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
