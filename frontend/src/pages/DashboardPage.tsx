import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { DashboardStats, Task, Project } from '../types';
import { Plus, Target, CheckCircle2, Clock, AlertTriangle, ListTodo, Activity } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { URLScannerModal } from '../components/URLScannerModal';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcoming, setUpcoming] = useState<Project[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, tasksRes, projectsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/today-tasks'),
        api.get('/dashboard/upcoming-deadlines'),
      ]);
      setStats(statsRes.data);
      setTodayTasks(tasksRes.data);
      setUpcoming(projectsRes.data);
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

  if (!stats) return <div className="p-8 text-slate-400">Loading dashboard...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header & Primary CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-purple-500" />
            Airdrop Tracker AI
          </h1>
          <p className="text-sm text-slate-400">Automated campaign scanning & task tracking</p>
        </div>
        <button
          onClick={() => setIsScannerOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center transition shadow-lg shadow-purple-900/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Scan Campaign URL
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center text-slate-400 mb-2">
            <Target className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Active Projects</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.active_projects}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center text-emerald-400 mb-2">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Completed Tasks</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.completed_tasks}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center text-purple-400 mb-2">
            <ListTodo className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Pending Tasks</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.pending_tasks}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center text-amber-400 mb-2">
            <Clock className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Due Today</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.tasks_due_today}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-400" />
              Today's Action Items
            </h2>
            <Link to="/tasks" className="text-xs font-medium text-purple-400 hover:text-purple-300">
              View All Tasks &rarr;
            </Link>
          </div>
          
          <div className="space-y-3">
            {todayTasks.length === 0 ? (
              <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-center">
                <p className="text-sm text-slate-400">No tasks due today. All caught up!</p>
              </div>
            ) : (
              todayTasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={handleTaskToggle} />
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-400" />
            Upcoming Deadlines
          </h2>
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1">
            {upcoming.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No upcoming deadlines.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {upcoming.map(project => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="flex flex-col p-4 hover:bg-slate-800/50 transition"
                  >
                    <span className="text-sm font-medium text-slate-200 truncate">{project.name}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-400">{project.platform}</span>
                      <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                        {project.deadline ? new Date(project.deadline).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* URL Scanner Modal */}
      <URLScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onSuccess={loadData} 
      />
    </div>
  );
};
