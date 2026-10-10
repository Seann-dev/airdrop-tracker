import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Project, Task, FarmingCost } from '../types';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { TaskItem } from '../components/TaskItem';
import { RefreshCw, Trash2, Plus, ExternalLink, DollarSign } from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costs, setCosts] = useState<FarmingCost[]>([]);
  const [isRechecking, setIsRechecking] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Other');

  // New cost form state
  const [costAmount, setCostAmount] = useState('');
  const [costType, setCostType] = useState('gas');

  const loadData = async () => {
    try {
      const [projRes, tasksRes, costsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project_id=${id}`),
        api.get('/costs'),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
      setCosts(costsRes.data.filter((c: FarmingCost) => c.project_id === Number(id)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
      await api.post('/tasks', {
        project_id: Number(id),
        title: newTaskTitle,
        category: newTaskCategory,
      });
      setNewTaskTitle('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costAmount) return;
    try {
      await api.post('/costs', {
        project_id: Number(id),
        type: costType,
        amount_usd: parseFloat(costAmount),
      });
      setCostAmount('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      await api.post(`/monitor/recheck/${id}`);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRechecking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      console.error(err);
    }
  };

  if (!project) return <div className="p-8 text-slate-400">Loading campaign details...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            <StatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          <p className="text-sm text-slate-400">{project.description || 'No description provided.'}</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRecheck}
            disabled={isRechecking}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRechecking ? 'animate-spin' : ''}`} />
            <span>Recheck Campaign</span>
          </button>
          <button
            onClick={handleDelete}
            className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center border border-rose-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl text-xs">
        <div>
          <span className="text-slate-500 block mb-1">Platform</span>
          <span className="text-slate-200 font-medium">{project.platform || 'Unknown'}</span>
        </div>
        <div>
          <span className="text-slate-500 block mb-1">Blockchain</span>
          <span className="text-slate-200 font-medium">{project.blockchain || 'Multi-chain'}</span>
        </div>
        <div>
          <span className="text-slate-500 block mb-1">Deadline</span>
          <span className="text-amber-400 font-medium">
            {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Unknown'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block mb-1">Campaign Link</span>
          {project.campaign_url ? (
            <a
              href={project.campaign_url}
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:underline flex items-center"
            >
              <span>Visit Page</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          ) : (
            <span className="text-slate-500">None</span>
          )}
        </div>
      </div>

      {/* Tasks & Project Breakdown Section */}
      <div className="space-y-6">
        {/* Actionable Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Actionable Tasks</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                {tasks.filter(t => (t.actionability || 'Actionable') === 'Actionable').length}
              </span>
            </h2>
          </div>

          {/* Add Task Form */}
          <form onSubmit={handleAddTask} className="flex gap-3">
            <input
              type="text"
              placeholder="Add new custom task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <select
              value={newTaskCategory}
              onChange={(e) => setNewTaskCategory(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="Social">Social</option>
              <option value="On-chain">On-chain</option>
              <option value="Testnet">Testnet</option>
              <option value="Daily check-in">Daily check-in</option>
              <option value="Other">Other</option>
            </select>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Add</span>
            </button>
          </form>

          <div className="space-y-3">
            {tasks.filter(t => (t.actionability || 'Actionable') === 'Actionable').length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No actionable tasks defined yet.</p>
            ) : (
              tasks
                .filter(t => (t.actionability || 'Actionable') === 'Actionable')
                .map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={handleTaskToggle} />
                ))
            )}
          </div>
        </div>

        {/* Review Required Section */}
        {tasks.filter(t => t.actionability === 'Review Required').length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <span>Review Required / Potential Tasks</span>
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                {tasks.filter(t => t.actionability === 'Review Required').length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              These items were detected but require verification before appearing in active daily checklists.
            </p>
            <div className="space-y-2">
              {tasks
                .filter(t => t.actionability === 'Review Required')
                .map((task) => (
                  <div key={task.id} className="p-3 bg-slate-900/60 border border-amber-900/30 rounded-xl flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-200">{task.title}</h4>
                      {task.evidence_snippet && (
                        <p className="text-xs text-slate-500 mt-1 italic">Snippet: "{task.evidence_snippet}"</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{task.category}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">Review Needed</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Informational / Program Notes Section */}
        {tasks.filter(t => t.actionability === 'Informational').length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
              <span>Project Information & Program Notes</span>
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                {tasks.filter(t => t.actionability === 'Informational').length}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tasks
                .filter(t => t.actionability === 'Informational')
                .map((task) => (
                  <div key={task.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs space-y-1">
                    <p className="text-slate-300 font-medium">{task.title}</p>
                    <span className="inline-block text-[10px] text-blue-400 font-mono">Informational / Role</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Farming Costs Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center">
          <DollarSign className="w-5 h-5 mr-1 text-emerald-400" />
          Recorded Farming Costs
        </h2>

        <form onSubmit={handleAddCost} className="flex gap-3">
          <input
            type="number"
            step="0.01"
            placeholder="Cost in USD (e.g. 5.50)"
            value={costAmount}
            onChange={(e) => setCostAmount(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
          <select
            value={costType}
            onChange={(e) => setCostType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="gas">Gas Fee</option>
            <option value="bridge">Bridge Fee</option>
            <option value="tx_fee">Tx Fee</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            Log Cost
          </button>
        </form>

        <div className="space-y-2">
          {costs.map((c) => (
            <div key={c.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium uppercase">{c.type}</span>
              <span className="text-emerald-400 font-bold">${c.amount_usd?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
