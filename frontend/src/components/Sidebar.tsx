import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, ListTodo, Calendar as CalendarIcon, Bell, Settings } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: Target, label: 'Projects' },
    { to: '/tasks', icon: ListTodo, label: 'Tasks' },
    { to: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 hidden lg:block sticky top-0 h-screen overflow-y-auto">
      <div className="p-6">
        <h2 className="text-sm font-bold text-slate-100 tracking-widest uppercase mb-6 flex items-center">
          <span className="w-2 h-2 rounded-full bg-purple-500 mr-2 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
          AIRDROP AI
        </h2>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-purple-600/10 text-purple-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <link.icon className="w-5 h-5 mr-3 shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-0 w-full p-6 border-t border-slate-800 bg-slate-900">
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
          <p className="text-xs font-semibold text-slate-300 mb-1">Background Monitor</p>
          <div className="flex items-center space-x-2 text-[10px] text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Active & Syncing</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
