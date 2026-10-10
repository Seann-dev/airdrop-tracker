import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Task } from '../types';
import { TaskItem } from '../components/TaskItem';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const loadTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'pending') params.append('completed', 'false');
      if (filter === 'completed') params.append('completed', 'true');

      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const handleTaskToggle = async (taskId: number, currentCompleted: boolean) => {
    try {
      if (currentCompleted) {
        await api.post(`/tasks/${taskId}/reopen`);
      } else {
        await api.post(`/tasks/${taskId}/complete`);
      }
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">All Tasks</h1>
        <p className="text-sm text-slate-400">Track and complete daily check-ins, quests, and on-chain activities</p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'pending' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'completed' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 w-full md:w-48"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="">All Categories</option>
            <option value="Daily check-in">Daily check-in</option>
            <option value="On-chain">On-chain</option>
            <option value="Social">Social</option>
            <option value="Testnet">Testnet</option>
            <option value="Quest">Quest</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-400">No tasks found matching criteria.</p>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <TaskItem key={t.id} task={t} onToggle={handleTaskToggle} />
          ))
        )}
      </div>
    </div>
  );
};
