import React, { useState } from 'react';
import { X, Search, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { ScanPreviewResponse, ExtractedTaskPreview } from '../types';

interface URLScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const URLScannerModal: React.FC<URLScannerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<ScanPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields in preview
  const [name, setName] = useState('');
  const [category, setCategory] = useState('DeFi');
  const [status, setStatus] = useState('Active');
  const [priority, setPriority] = useState('Medium');
  const [tasks, setTasks] = useState<ExtractedTaskPreview[]>([]);

  if (!isOpen) return null;

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setError(null);
    setIsScanning(true);
    setPreview(null);

    try {
      const res = await api.post('/scanner/scan', { url });
      const data: ScanPreviewResponse = res.data;
      setPreview(data);
      setName(data.project_name);
      setCategory(data.category || 'DeFi');
      setTasks(data.tasks);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Failed to scan campaign URL. Verify URL and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setIsSaving(true);
    try {
      await api.post('/scanner/confirm', {
        url: preview.url,
        platform: preview.platform,
        name: name,
        description: preview.description,
        official_website: preview.official_website,
        blockchain: preview.blockchain,
        category: category,
        priority: priority,
        status: status,
        deadline: preview.deadline,
        reward_info: preview.reward_info,
        eligibility_reqs: preview.eligibility_reqs,
        tasks: tasks,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Failed to save project.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Universal Campaign Scanner</h2>
              <p className="text-xs text-slate-400">Scan Galxe, Layer3, Zealy, TaskOn, or any Web3 campaign page</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* URL Input Form */}
          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Campaign URL / Quest Link
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://app.galxe.com/quest/... or https://layer3.xyz/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isScanning}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  required
                />
                <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isScanning || !url}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-lg shadow-purple-900/20"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Scanning & Extracting Tasks...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Scan Campaign</span>
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-xl flex items-start space-x-3 text-rose-200 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted Preview Card */}
          {preview && (
            <div className="space-y-5 border-t border-slate-800 pt-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Extraction Complete</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Source:</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {preview.source_attribution}
                  </span>
                </div>
              </div>

              {/* Editable Name & Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="DeFi">DeFi</option>
                    <option value="L2 / Infra">L2 / Infra</option>
                    <option value="Testnet">Testnet</option>
                    <option value="NFT / Gaming">NFT / Gaming</option>
                    <option value="Social">Social</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Watchlist">Watchlist</option>
                    <option value="Researching">Researching</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Rewards & Deadline */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Detected Rewards:</span>
                  <span className="text-purple-300 font-medium">{preview.reward_info || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deadline Status:</span>
                  <span className="text-amber-300 font-medium">{preview.deadline_status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Confidence Score:</span>
                  <span className="text-emerald-400 font-medium">{(preview.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Tasks List Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Extracted Items ({tasks.length})
                  </h4>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {tasks.filter(t => (t.actionability || 'Actionable') === 'Actionable').length} Actionable
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      {tasks.filter(t => t.actionability === 'Review Required').length} Review
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      {tasks.filter(t => t.actionability === 'Informational').length} Info
                    </span>
                  </div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tasks.map((t, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${
                          t.actionability === 'Informational' ? 'text-blue-400' :
                          t.actionability === 'Review Required' ? 'text-amber-400' : 'text-purple-400'
                        }`} />
                        <span className="text-sm text-slate-200">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {t.category || 'Task'}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          t.actionability === 'Informational' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                          t.actionability === 'Review Required' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                          'bg-purple-950 text-purple-300 border-purple-800'
                        }`}>
                          {t.actionability || 'Actionable'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {preview && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded-xl text-sm flex items-center space-x-2 transition disabled:opacity-50 shadow-lg shadow-emerald-900/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save to Tracker</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
