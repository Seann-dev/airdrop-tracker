import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Task, Project } from '../types';
import { TaskItem } from '../components/TaskItem';
import { Plus, X, Trash2, Pencil, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['Social', 'Community', 'Testnet', 'On-chain', 'Swap', 'Bridge', 'Staking', 'Governance', 'Referral', 'Daily check-in', 'Weekly activity', 'Quest', 'Claim', 'Other'];
const RECURRENCE = ['None', 'Daily', 'Weekly', 'Monthly'];

interface TaskForm {
  title: string;
  description: string;
  category: string;
  project_id: string;
  deadline: string;
  recurrence: string;
  reward_info: string;
}

const emptyForm: TaskForm = { title: '', description: '', category: 'Other', project_id: '', deadline: '', recurrence: 'None', reward_info: '' };

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'pending') params.append('completed', 'false');
      if (filter === 'completed') params.append('completed', 'true');
      params.append('limit', '200');
      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects?limit=100');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadTasks(); }, [filter]);
  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleTaskToggle = async (taskId: number, currentCompleted: boolean) => {
    try {
      if (currentCompleted) {
        await api.post(`/tasks/${taskId}/reopen`);
      } else {
        await api.post(`/tasks/${taskId}/complete`);
      }
      setToast(currentCompleted ? 'Task reopened' : 'Task completed!');
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || '',
      category: task.category || 'Other',
      project_id: String(task.project_id),
      deadline: task.deadline ? task.deadline.slice(0, 16) : '',
      recurrence: task.recurrence || 'None',
      reward_info: task.reward_info || '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!editing && !form.project_id) {
      setFormError('Please select a campaign.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description || undefined,
        category: form.category,
        recurrence: form.recurrence,
        reward_info: form.reward_info || undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      };
      if (editing) {
        await api.patch(`/tasks/${editing.id}`, payload);
        setToast('Task updated');
      } else {
        payload.project_id = parseInt(form.project_id);
        await api.post('/tasks', payload);
        setToast('Task created');
      }
      setShowForm(false);
      loadTasks();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/tasks/${deleteId}`);
      setDeleteId(null);
      setToast('Task deleted');
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const isOverdue = (t: Task) => {
    if (t.is_completed || !t.deadline) return false;
    return new Date(t.deadline) < new Date();
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  // Sort: overdue first, then by deadline
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aOver = isOverdue(a) ? 0 : 1;
    const bOver = isOverdue(b) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">All Tasks</h1>
          <p className="text-xs md:text-sm text-slate-400">Track and complete daily check-ins, quests, and on-chain activities</p>
        </div>
        <button onClick={openCreate}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center transition">
          <Plus className="w-4 h-4 mr-2" /> New Task
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
          {(['pending', 'completed', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${filter === f ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="text" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 w-full md:w-48"
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            </div>
          ))
        ) : sortedTasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
            <p className="text-sm text-slate-400 mb-4">No tasks found matching criteria.</p>
            <button onClick={openCreate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
              Create Task
            </button>
          </div>
        ) : (
          sortedTasks.map((t) => (
            <div key={t.id} className="relative">
              {isOverdue(t) && (
                <div className="flex items-center gap-1 text-[11px] text-red-400 mb-1 px-1">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </div>
              )}
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TaskItem task={t} onToggle={handleTaskToggle} />
                </div>
                <div className="flex flex-col gap-1 pt-3">
                  <button onClick={() => openEdit(t)} className="text-slate-500 hover:text-purple-400 p-1.5 transition" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(t.id)} className="text-slate-500 hover:text-red-400 p-1.5 transition" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">{editing ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {formError && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-200">{formError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Daily check-in on Galxe" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="Task details..." />
              </div>
              {!editing && (
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Campaign *</label>
                  <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                    <option value="">Select campaign...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Recurrence</label>
                  <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                    {RECURRENCE.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Deadline (optional)</label>
                <input type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Reward Info (optional)</label>
                <input value={form.reward_info} onChange={e => setForm({ ...form, reward_info: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g. 100 points" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-white mb-2">Delete Task?</h3>
            <p className="text-sm text-slate-400 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};
