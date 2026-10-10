import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { DashboardStats, Task, Project } from '../types';
import { Plus, Target, CheckCircle2, Clock, AlertTriangle, ListTodo, Activity, ArrowRight, ExternalLink, Calendar } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { URLScannerModal } from '../components/URLScannerModal';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';

const StatSkeleton = () => (
  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl animate-pulse">
    <div className="h-4 bg-slate-800 rounded w-2/3 mb-3"></div>
    <div className="h-8 bg-slate-800 rounded w-1/3"></div>
  </div>
);

const CardSkeleton = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
    <div className="h-5 bg-slate-800 rounded w-3/4"></div>
    <div className="h-3 bg-slate-800 rounded w-1/2"></div>
    <div className="h-3 bg-slate-800 rounded w-2/3"></div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcoming, setUpcoming] = useState<Project[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tasksRes, projectsRes, recentRes, completedRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/today-tasks'),
        api.get('/dashboard/upcoming-deadlines'),
        api.get('/projects?limit=6'),
        api.get('/tasks?completed=true&limit=5'),
      ]);
      setStats(statsRes.data);
      setTodayTasks(tasksRes.data);
      setUpcoming(projectsRes.data);
      setRecentProjects(recentRes.data);
      setRecentCompleted(completedRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-red-950/50 border border-red-800 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-200 font-medium">{error}</p>
          <button onClick={loadData} className="mt-4 bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
      {/* Header & Primary CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 flex items-center">
            <Activity className="w-5 h-5 md:w-6 md:h-6 mr-2 text-purple-500" />
            Airdrop Tracker AI
          </h1>
          <p className="text-xs md:text-sm text-slate-400">Automated campaign scanning & task tracking</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/projects"
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center transition"
          >
            <Target className="w-4 h-4 mr-2" />
            Campaigns
          </Link>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 md:px-5 py-2.5 rounded-xl text-sm font-medium flex items-center transition shadow-lg shadow-purple-900/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Scan URL
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {loading ? (
          <><StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
        ) : stats && (
          <>
            <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-2xl">
              <div className="flex items-center text-slate-400 mb-2">
                <Target className="w-4 h-4 mr-1.5" />
                <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wide">Active</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.active_projects}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-2xl">
              <div className="flex items-center text-emerald-400 mb-2">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wide">Done</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.completed_tasks}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-2xl">
              <div className="flex items-center text-purple-400 mb-2">
                <ListTodo className="w-4 h-4 mr-1.5" />
                <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wide">Pending</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.pending_tasks}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 md:p-5 rounded-2xl">
              <div className="flex items-center text-amber-400 mb-2">
                <Clock className="w-4 h-4 mr-1.5" />
                <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wide">Due Today</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.tasks_due_today}</p>
              {stats.overdue_tasks > 0 && (
                <p className="text-[11px] text-red-400 mt-1">{stats.overdue_tasks} overdue</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Recent Campaigns */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-bold text-white flex items-center">
            <Target className="w-5 h-5 mr-2 text-purple-400" />
            Recent Campaigns
          </h2>
          <Link to="/projects" className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center">
            View All <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="p-8 bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl text-center">
            <Target className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-4">No campaigns yet. Add your first one to start tracking.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setIsScannerOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
                Scan Campaign URL
              </button>
              <Link to="/projects" className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                Add Manually
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.slice(0, 6).map(p => (
              <Link key={p.id} to={`/projects/${p.id}`}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-purple-500/50 transition group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white text-sm truncate pr-2 group-hover:text-purple-300">{p.name}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-slate-500 mb-3">{p.platform || 'Web3 Campaign'}</p>
                <div className="flex items-center justify-between text-xs">
                  {p.deadline ? (
                    <span className="flex items-center text-amber-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(p.deadline).toLocaleDateString()}
                    </span>
                  ) : <span />}
                  {p.campaign_url && (
                    <span className="text-slate-500 flex items-center">
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold text-white flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-400" />
              Today's Action Items
            </h2>
            <Link to="/tasks" className="text-xs font-medium text-purple-400 hover:text-purple-300">
              View All Tasks &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <><CardSkeleton /><CardSkeleton /></>
            ) : todayTasks.length === 0 ? (
              <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-center">
                <p className="text-sm text-slate-400">No tasks due today. All caught up!</p>
              </div>
            ) : (
              todayTasks.map(task => (
                <TaskItem key={task.id} task={task} onToggle={handleTaskToggle} />
              ))
            )}
          </div>

          {/* Recently Completed */}
          {recentCompleted.length > 0 && (
            <div className="pt-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Recently Completed</h3>
              <div className="space-y-2">
                {recentCompleted.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center text-xs text-slate-500 bg-slate-900/50 rounded-xl px-4 py-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-4">
          <h2 className="text-base md:text-lg font-bold text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-amber-400" />
            Upcoming Deadlines
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1">
            {loading ? (
              <div className="p-4 space-y-3">
                <div className="h-12 bg-slate-800 rounded-xl animate-pulse"></div>
                <div className="h-12 bg-slate-800 rounded-xl animate-pulse"></div>
              </div>
            ) : upcoming.length === 0 ? (
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
