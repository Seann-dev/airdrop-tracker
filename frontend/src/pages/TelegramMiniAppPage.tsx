import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Project, Task, DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TaskItem } from '../components/TaskItem';
import { URLScannerModal } from '../components/URLScannerModal';
import { Plus, LayoutDashboard, Target, ListTodo, Sparkles } from 'lucide-react';

export const TelegramMiniAppPage: React.FC = () => {
  const [tab, setTab] = useState<'dash' | 'projects' | 'tasks'>('dash');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, tasksRes, projsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/tasks?completed=false'),
        api.get('/projects'),
      ]);
      setStats(statsRes.data);
      setTasks(tasksRes.data);
      setProjects(projsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTaskToggle = async (taskId: number, currentCompleted: boolean) => {
    try {
      if (currentCompleted) {
        await api.post(`/tasks/${taskId}/reopen`);
      } else {
        await api.post(`/tasks/${taskId}/complete`);
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20">
      {/* Mini App Mobile Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h1 className="text-base font-bold text-white tracking-wide">Airdrop Tracker</h1>
        </div>
        <button
          onClick={() => setIsScannerOpen(true)}
          className="bg-purple-600 active:bg-purple-700 text-white p-2 rounded-xl text-xs font-semibold flex items-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>Scan</span>
        </button>
      </div>

      {/* Main Content Body */}
      <div className="p-4 flex-1 space-y-4">
        {tab === 'dash' && (
          <div className="space-y-4">
            {/* Quick Metrics */}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">Active Projects</span>
                  <span className="text-2xl font-bold text-white">{stats.active_projects}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                  <span className="text-[11px] text-purple-400 uppercase font-bold block">Pending Tasks</span>
                  <span className="text-2xl font-bold text-purple-300">{stats.pending_tasks}</span>
                </div>
              </div>
            )}

            {/* Quick Scan CTA */}
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-800/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Paste Campaign URL</h3>
                <p className="text-xs text-purple-300">Extract Galxe, Layer3 or any quest</p>
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow"
              >
                Scan Now
              </button>
            </div>

            {/* Today's Tasks */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Action Items ({tasks.length})
              </h3>
              {tasks.length === 0 ? (
                <div className="bg-slate-900/60 p-6 rounded-xl text-center text-xs text-slate-500">
                  No pending tasks!
                </div>
              ) : (
                tasks.slice(0, 10).map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={handleTaskToggle} />
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'projects' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tracked Projects ({projects.length})
            </h3>
            {projects.map((p) => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">{p.name}</h4>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{p.platform || 'Web3'}</span>
                  <span className="text-amber-400">{p.deadline ? new Date(p.deadline).toLocaleDateString() : 'No deadline'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tasks' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              All Tasks ({tasks.length})
            </h3>
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} onToggle={handleTaskToggle} />
            ))}
          </div>
        )}
      </div>

      {/* Mini App Bottom Bar Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 py-2 px-6 flex items-center justify-around z-30">
        <button
          onClick={() => setTab('dash')}
          className={`flex flex-col items-center space-y-1 ${tab === 'dash' ? 'text-purple-400' : 'text-slate-500'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button
          onClick={() => setTab('projects')}
          className={`flex flex-col items-center space-y-1 ${tab === 'projects' ? 'text-purple-400' : 'text-slate-500'}`}
        >
          <Target className="w-5 h-5" />
          <span className="text-[10px] font-medium">Projects</span>
        </button>
        <button
          onClick={() => setTab('tasks')}
          className={`flex flex-col items-center space-y-1 ${tab === 'tasks' ? 'text-purple-400' : 'text-slate-500'}`}
        >
          <ListTodo className="w-5 h-5" />
          <span className="text-[10px] font-medium">Tasks</span>
        </button>
      </div>

      <URLScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
