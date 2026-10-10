import React from 'react';
import type { ProjectStatus, Priority } from '../types';

export const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const colors: Record<ProjectStatus, string> = {
    Researching: 'bg-slate-800 text-slate-300 border-slate-700',
    Watchlist: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    Active: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    Paused: 'bg-amber-950 text-amber-300 border-amber-800',
    Snapshot: 'bg-purple-950 text-purple-300 border-purple-800',
    'Claim Open': 'bg-pink-950 text-pink-300 border-pink-700 animate-pulse',
    Completed: 'bg-blue-950 text-blue-300 border-blue-800',
    Abandoned: 'bg-rose-950 text-rose-400 border-rose-800',
  };

  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${colors[status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
      {status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const colors: Record<Priority, string> = {
    Low: 'text-slate-400 bg-slate-900 border-slate-800',
    Medium: 'text-blue-400 bg-blue-950 border-blue-800',
    High: 'text-amber-400 bg-amber-950 border-amber-800',
    Urgent: 'text-rose-400 bg-rose-950 border-rose-800 font-bold',
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${colors[priority]}`}>
      {priority}
    </span>
  );
};
