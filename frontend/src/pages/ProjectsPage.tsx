import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Project } from '../types';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { Search, Plus, ExternalLink, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { URLScannerModal } from '../components/URLScannerModal';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loadProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/projects?${params.toString()}`);
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [search, statusFilter]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tracked Campaigns</h1>
          <p className="text-sm text-slate-400">Manage your Web3 airdrops, testnets & quest programs</p>
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
      <div className="flex flex-col md:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Watchlist">Watchlist</option>
          <option value="Researching">Researching</option>
          <option value="Snapshot">Snapshot</option>
          <option value="Claim Open">Claim Open</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <div
            key={p.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base leading-tight mb-1">{p.name}</h3>
                  <span className="text-xs text-slate-400">{p.platform || 'Web3 Campaign'}</span>
                </div>
                <StatusBadge status={p.status} />
              </div>

              {p.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <PriorityBadge priority={p.priority} />
                {p.blockchain && (
                  <span className="text-[11px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">
                    {p.blockchain}
                  </span>
                )}
                {p.category && (
                  <span className="text-[11px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">
                    {p.category}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
              {p.campaign_url ? (
                <a
                  href={p.campaign_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-400 hover:text-purple-400 flex items-center"
                >
                  <span>Link</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              ) : (
                <span />
              )}

              <Link
                to={`/projects/${p.id}`}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center"
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <URLScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={loadProjects}
      />
    </div>
  );
};
