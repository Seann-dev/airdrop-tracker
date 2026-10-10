import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { NotificationItem } from '../types';
import { Bell, Check, Sparkles, Clock, AlertCircle } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <Bell className="w-6 h-6 mr-2 text-purple-400" />
          Notifications & Alerts
        </h1>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No notifications yet. You're all caught up!</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border flex items-start justify-between transition ${
                n.is_read
                  ? 'bg-slate-900/40 border-slate-800/40 opacity-60'
                  : 'bg-slate-900 border-purple-900/50 shadow-sm'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {n.type === 'new_task' && <Sparkles className="w-4 h-4 text-purple-400" />}
                  {n.type === 'due_today' && <Clock className="w-4 h-4 text-amber-400" />}
                  {n.type === 'claim_open' && <AlertCircle className="w-4 h-4 text-pink-400" />}
                  {!['new_task', 'due_today', 'claim_open'].includes(n.type) && (
                    <Bell className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{n.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-slate-500 mt-2 block">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
