import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Project } from '../types';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { Search, Plus, ExternalLink, ArrowRight, Trash2, X, Calendar, List, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { URLScannerModal } from '../components/URLScannerModal';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [blockchainFilter, setBlockchainFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'name'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '100');

      const res = await api.get(`/projects?${params.toString()}`);
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadProjects, 300);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${deleteId}`);
      setDeleteId(null);
      loadProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // Client-side filters for category/blockchain (backend only filters status+search)
  const filtered = projects.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (blockchainFilter && p.blockchain !== blockchainFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];
  const blockchains = [...new Set(projects.map(p => p.blockchain).filter(Boolean))];

  const ProjectCard = ({ p }: { p: Project }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="font-bold text-white text-base leading-tight mb-1 truncate">{p.name}</h3>
            <span className="text-xs text-slate-400">{p.platform || 'Web3 Campaign'}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <StatusBadge status={p.status} />
            <button
              onClick={(e) => { e.preventDefault(); setDeleteId(p.id); }}
              className="text-slate-600 hover:text-red-400 p-1 transition"
              title="Delete campaign"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {p.description && (
          <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <PriorityBadge priority={p.priority} />
          {p.blockchain && (
            <span className="text-[11px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">{p.blockchain}</span>
          )}
          {p.category && (
            <span className="text-[11px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">{p.category}</span>
          )}
        </div>
        {p.deadline && (
          <p className="text-[11px] text-amber-400 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(p.deadline).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between">
        {p.campaign_url ? (
          <a href={p.campaign_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            className="text-xs text-slate-400 hover:text-purple-400 flex items-center">
            <span>Link</span><ExternalLink className="w-3 h-3 ml-1" />
          </a>
        ) : <span />}
        <Link to={`/projects/${p.id}`} className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center">
          <span>View Details</span><ArrowRight className="w-3 h-3 ml-1" />
        </Link>
      </div>
    </div>
  );

  const ProjectRow = ({ p }: { p: Project }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-slate-700 transition">
      <div className="flex-1 min-w-0">
        <Link to={`/projects/${p.id}`} className="font-medium text-white text-sm truncate block hover:text-purple-300">{p.name}</Link>
        <p className="text-[11px] text-slate-500 truncate">{p.platform || 'Web3 Campaign'}{p.blockchain ? ` · ${p.blockchain}` : ''}</p>
      </div>
      <StatusBadge status={p.status} />
      {p.deadline && (
        <span className="text-[11px] text-amber-400 hidden md:flex items-center shrink-0">
          <Calendar className="w-3 h-3 mr-1" />{new Date(p.deadline).toLocaleDateString()}
        </span>
      )}
      <button onClick={() => setDeleteId(p.id)} className="text-slate-600 hover:text-red-400 p-1 transition shrink-0" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Tracked Campaigns</h1>
          <p className="text-xs md:text-sm text-slate-400">Manage your Web3 airdrops, testnets & quest programs</p>
        </div>
        <button
          onClick={() => setIsScannerOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add / Scan Project</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl border transition ${viewMode === 'grid' ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-700 text-slate-400'}`} title="Grid view">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl border transition ${viewMode === 'list' ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-700 text-slate-400'}`} title="List view">
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Watchlist">Watchlist</option>
            <option value="Researching">Researching</option>
            <option value="Snapshot">Snapshot</option>
            <option value="Claim Open">Claim Open</option>
            <option value="Completed">Completed</option>
            <option value="Abandoned">Abandoned</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c!}>{c}</option>)}
          </select>
          <select value={blockchainFilter} onChange={(e) => setBlockchainFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
            <option value="">All Networks</option>
            {blockchains.map(b => <option key={b} value={b!}>{b}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
            <option value="newest">Newest</option>
            <option value="deadline">Deadline</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-5 bg-slate-800 rounded w-3/4"></div>
              <div className="h-3 bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-12 bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl text-center">
          <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1 font-medium">No campaigns found</p>
          <p className="text-xs text-slate-500 mb-4">
            {search || statusFilter ? 'Try adjusting your filters.' : 'Add your first campaign to start tracking.'}
          </p>
          <button onClick={() => setIsScannerOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
            Scan Campaign URL
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map(p => <ProjectCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(p => <ProjectRow key={p.id} p={p} />)}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Delete Campaign?</h3>
              <button onClick={() => setDeleteId(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-400 mb-6">This will permanently delete the campaign and all its tasks. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <URLScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={loadProjects}
      />
    </div>
  );
};
