import { useEffect, useMemo, useState } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Link } from 'wouter';
import {
  useAirdrops, useSummary, useCreateAirdrop, useUpdateAirdrop,
  useDeleteAirdrop, useImportBatch, useDraft,
} from '../hooks/useAirdrops';
import type { Airdrop, AirdropStatus, TaskItem, Draft, ImportRecord } from '../lib/types';
import { STATUSES } from '../lib/types';

const LEGACY_KEY = 'airdrop-tracker-records-v1';
const MIGRATED_FLAG = 'airdrop-tracker-migrated-v1';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const statusColor: Record<AirdropStatus, string> = {
  Watching: 'bg-slate-700 text-slate-200',
  Active: 'bg-violet-600/20 text-violet-300 border border-violet-500/30',
  Completed: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30',
  Claimed: 'bg-sky-600/20 text-sky-300 border border-sky-500/30',
  'Not eligible': 'bg-red-600/20 text-red-300 border border-red-500/30',
};

interface FormState {
  projectName: string;
  network: string;
  status: AirdropStatus;
  deadline: string;
  officialLink: string;
  category: string;
  notes: string;
  tasks: TaskItem[];
}

const emptyForm: FormState = {
  projectName: '', network: '', status: 'Watching', deadline: '',
  officialLink: '', category: '', notes: '', tasks: [],
};

export function UserPortal() {
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [sort, setSort] = useState('updated');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Airdrop | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Airdrop | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [migration, setMigration] = useState<{ pending: number; done: boolean; error?: string } | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = { sort };
    if (statusFilter) p.status = statusFilter;
    if (networkFilter) p.network = networkFilter;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [sort, statusFilter, networkFilter, search]);

  const { data: records, isLoading, isError, refetch } = useAirdrops(params);
  const { data: summary } = useSummary();
  const createMut = useCreateAirdrop();
  const updateMut = useUpdateAirdrop();
  const deleteMut = useDeleteAirdrop();
  const importMut = useImportBatch();
  const draftMut = useDraft();

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ---- Legacy localStorage migration (first login only) ----
  useEffect(() => {
    if (!user || localStorage.getItem(MIGRATED_FLAG)) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(LEGACY_KEY);
    } catch { /* private mode */ }
    if (!raw) {
      localStorage.setItem(MIGRATED_FLAG, '1');
      return;
    }
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('bad shape');
    } catch {
      setMigration({ pending: 0, done: false, error: 'Could not read old browser data.' });
      return;
    }
    const batch: ImportRecord[] = parsed.slice(0, 100).map((r: any, i: number) => ({
      legacyId: String(r.id ?? `legacy-${i}`),
      projectName: String(r.projectName ?? r.name ?? 'Untitled'),
      network: String(r.network ?? ''),
      status: (STATUSES as string[]).includes(r.status) ? r.status : 'Watching',
      deadline: r.deadline ?? null,
      officialLink: String(r.officialLink ?? r.link ?? ''),
      category: String(r.category ?? ''),
      notes: String(r.notes ?? ''),
      tasks: Array.isArray(r.tasks)
        ? r.tasks.map((t: any, j: number) => ({
            id: String(t.id ?? `t-${j}`),
            title: String(t.title ?? ''),
            done: !!t.done,
          }))
        : [],
    }));
    setMigration({ pending: batch.length, done: false });
    importMut.mutate(batch, {
      onSuccess: (res) => {
        // Only clear browser data after the whole import succeeded
        try {
          localStorage.removeItem(LEGACY_KEY);
          localStorage.setItem(MIGRATED_FLAG, '1');
        } catch { /* ignore */ }
        setMigration({ pending: 0, done: true });
        setToast(`Migrated ${res.imported} records${res.skipped ? ` (${res.skipped} already present)` : ''}`);
        refetch();
      },
      onError: () => {
        // Keep browser data so the user can retry
        setMigration({ pending: batch.length, done: false, error: 'Import failed — your browser data was kept. Try again.' });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const retryMigration = () => {
    localStorage.removeItem(MIGRATED_FLAG);
    setMigration(null);
    // re-run by toggling a key — simplest: reload
    window.location.reload();
  };

  // ---- Form handling ----
  const openCreate = (prefill?: Partial<FormState>) => {
    setEditing(null);
    setForm({ ...emptyForm, ...prefill });
    setFormError(null);
    setShowForm(true);
  };
  const openEdit = (r: Airdrop) => {
    setEditing(r);
    setForm({
      projectName: r.projectName,
      network: r.network,
      status: r.status,
      deadline: r.deadline ? r.deadline.slice(0, 16) : '',
      officialLink: r.officialLink,
      category: r.category,
      notes: r.notes,
      tasks: r.tasks.map((t) => ({ ...t })),
    });
    setFormError(null);
    setShowForm(true);
  };

  const saveForm = () => {
    if (!form.projectName.trim()) {
      setFormError('Project name is required.');
      return;
    }
    const payload = {
      projectName: form.projectName.trim(),
      network: form.network.trim(),
      status: form.status,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      officialLink: form.officialLink.trim(),
      category: form.category.trim(),
      notes: form.notes,
      tasks: form.tasks.filter((t) => t.title.trim()).map((t) => ({ ...t, title: t.title.trim() })),
    };
    const done = () => {
      setShowForm(false);
      setDraft(null);
      setToast(editing ? 'Record updated' : 'Record added');
    };
    const fail = (e: any) => setFormError(e.message || 'Save failed');
    if (editing) updateMut.mutate({ id: editing.id, data: payload }, { onSuccess: done, onError: fail });
    else createMut.mutate(payload, { onSuccess: done, onError: fail });
  };

  const toggleTask = (id: string) => {
    setForm((f) => ({
      ...f,
      tasks: f.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  };
  const addTaskRow = () => setForm((f) => ({ ...f, tasks: [...f.tasks, { id: uid(), title: '', done: false }] }));
  const updateTaskTitle = (id: string, title: string) =>
    setForm((f) => ({ ...f, tasks: f.tasks.map((t) => (t.id === id ? { ...t, title } : t)) }));
  const removeTaskRow = (id: string) =>
    setForm((f) => ({ ...f, tasks: f.tasks.filter((t) => t.id !== id) }));

  // ---- Draft import ----
  const fetchDraft = () => {
    setDraft(null);
    draftMut.mutate(importUrl, {
      onSuccess: (d) => setDraft(d),
    });
  };
  const useDraftAsForm = () => {
    if (!draft) return;
    openCreate({
      projectName: draft.projectName,
      officialLink: draft.officialLink,
      deadline: draft.deadline ? draft.deadline.slice(0, 16) : '',
      tasks: draft.tasks,
      notes: draft.description ? `Imported notes: ${draft.description}\n\n` : '',
    });
    setShowImporter(false);
  };

  const networks = useMemo(() => {
    const s = new Set((records || []).map((r) => r.network).filter(Boolean));
    return [...s].sort();
  }, [records]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        setToast('Record deleted');
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold tracking-tight">Airdrop Tracker</Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">{user?.primaryEmailAddress?.emailAddress}</span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Migration banner */}
        {migration && !migration.done && (
          <div className="bg-violet-950/40 border border-violet-800 rounded-2xl p-4 text-sm">
            {migration.error ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <p className="text-violet-200">{migration.error}</p>
                <button onClick={retryMigration} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium shrink-0">
                  Retry import
                </button>
              </div>
            ) : (
              <p className="text-violet-200">
                {importMut.isPending
                  ? `Migrating ${migration.pending} records from this browser…`
                  : `Found ${migration.pending} records in this browser.`}
              </p>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Total', summary?.total ?? '—'],
            ['Active', summary?.active ?? '—'],
            ['Completed', summary?.completed ?? '—'],
            ['Due ≤ 14 days', summary?.upcomingDeadlines ?? '—'],
          ].map(([label, v]) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{label}</p>
              <p className="text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project, notes, category…"
            aria-label="Search records"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={networkFilter} onChange={(e) => setNetworkFilter(e.target.value)} aria-label="Filter by network"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500">
            <option value="">All networks</option>
            {networks.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort records"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500">
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="deadline">Deadline</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={() => openCreate()}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium">
            + Add record
          </button>
          <button onClick={() => { setShowImporter(true); setDraft(null); setImportUrl(''); }}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm">
            Import from URL
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
                <div className="h-5 bg-slate-800 rounded w-2/3" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-950/40 border border-red-800 rounded-2xl p-8 text-center">
            <p className="text-red-200 mb-4">Failed to load records.</p>
            <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-sm">Retry</button>
          </div>
        ) : !records || records.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl p-12 text-center">
            <p className="font-medium mb-1">No records yet</p>
            <p className="text-sm text-slate-500 mb-6">Add your first airdrop opportunity to start tracking.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => openCreate()} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium">Add record</button>
              <button onClick={() => { setShowImporter(true); }} className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm">Import from URL</button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {records.map((r) => (
              <article key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold truncate">{r.projectName}</h3>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${statusColor[r.status]}`}>{r.status}</span>
                </div>
                <div className="text-xs text-slate-500 space-x-2 mb-3">
                  {r.network && <span>{r.network}</span>}
                  {r.category && <span>· {r.category}</span>}
                  {r.deadline && <span>· due {new Date(r.deadline).toLocaleDateString()}</span>}
                </div>
                {r.notes && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{r.notes}</p>}
                <div className="text-xs text-slate-500 mb-4">
                  {r.tasks.filter((t) => t.done).length}/{r.tasks.length} tasks done
                </div>
                <div className="mt-auto flex gap-2 pt-3 border-t border-slate-800">
                  {r.officialLink && (
                    <a href={r.officialLink} target="_blank" rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500">
                      Official link ↗
                    </a>
                  )}
                  <button onClick={() => openEdit(r)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500">Edit</button>
                  <button onClick={() => setDeleteTarget(r)} className="text-xs px-3 py-1.5 rounded-lg border border-red-900 text-red-300 hover:bg-red-950">Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label={editing ? 'Edit record' : 'Add record'}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-auto my-8">
            <h3 className="font-bold text-lg mb-4">{editing ? 'Edit record' : 'Add record'}</h3>
            {formError && <p className="text-xs text-red-300 bg-red-950/50 border border-red-800 rounded-xl p-3 mb-4">{formError}</p>}
            <div className="space-y-4">
              <div>
                <label htmlFor="f-name" className="text-xs font-medium text-slate-400 block mb-1">Project name *</label>
                <input id="f-name" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="f-network" className="text-xs font-medium text-slate-400 block mb-1">Network</label>
                  <input id="f-network" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}
                    placeholder="e.g. Ethereum" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label htmlFor="f-status" className="text-xs font-medium text-slate-400 block mb-1">Status</label>
                  <select id="f-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AirdropStatus })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="f-deadline" className="text-xs font-medium text-slate-400 block mb-1">Deadline</label>
                  <input id="f-deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label htmlFor="f-category" className="text-xs font-medium text-slate-400 block mb-1">Category</label>
                  <input id="f-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. DeFi" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
                </div>
              </div>
              <div>
                <label htmlFor="f-link" className="text-xs font-medium text-slate-400 block mb-1">Official link</label>
                <input id="f-link" value={form.officialLink} onChange={(e) => setForm({ ...form, officialLink: e.target.value })}
                  placeholder="https://" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label htmlFor="f-notes" className="text-xs font-medium text-slate-400 block mb-1">Notes</label>
                <textarea id="f-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Checklist</span>
                  <button onClick={addTaskRow} className="text-xs text-violet-300 hover:text-violet-200">+ Add task</button>
                </div>
                <div className="space-y-2">
                  {form.tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} aria-label={`Mark "${t.title || 'task'}" done`}
                        className="w-4 h-4 accent-violet-600" />
                      <input value={t.title} onChange={(e) => updateTaskTitle(t.id, e.target.value)} placeholder="Task title"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-violet-500" />
                      <button onClick={() => removeTaskRow(t.id)} aria-label="Remove task" className="text-slate-600 hover:text-red-400 text-lg leading-none">×</button>
                    </div>
                  ))}
                  {form.tasks.length === 0 && <p className="text-xs text-slate-600">No tasks yet.</p>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm">Cancel</button>
              <button onClick={saveForm} disabled={createMut.isPending || updateMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium">
                {createMut.isPending || updateMut.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold mb-2">Delete “{deleteTarget.projectName}”?</h3>
            <p className="text-sm text-slate-400 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm">Cancel</button>
              <button onClick={confirmDelete} disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-medium">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL importer */}
      {showImporter && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Import from URL">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full mx-auto my-8">
            <h3 className="font-bold text-lg mb-1">Import from project URL</h3>
            <p className="text-xs text-slate-500 mb-4">
              We fetch the page and draft a record for your review. Only clearly stated info is extracted —
              verify everything before saving. This does not endorse the project.
            </p>
            <div className="flex gap-2 mb-4">
              <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://project.example"
                aria-label="Project URL"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
              <button onClick={fetchDraft} disabled={draftMut.isPending || !importUrl.trim()}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium shrink-0">
                {draftMut.isPending ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
            {draftMut.isError && (
              <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-4 text-sm mb-4">
                <p className="text-amber-200 font-medium mb-1">Could not extract from this URL</p>
                <p className="text-amber-200/70 text-xs mb-3">
                  {(draftMut.error as Error)?.message}. You can enter the details manually instead.
                </p>
                <button onClick={() => { setShowImporter(false); openCreate({ officialLink: importUrl }); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-amber-700 text-amber-200">
                  Enter manually
                </button>
              </div>
            )}
            {draft && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm space-y-2 mb-4">
                <p><span className="text-slate-500">Name:</span> <span className="font-medium">{draft.projectName}</span></p>
                {draft.description && <p><span className="text-slate-500">About:</span> {draft.description.slice(0, 200)}</p>}
                <p><span className="text-slate-500">Deadline:</span> {draft.deadline ? new Date(draft.deadline).toLocaleDateString() : <em className="text-amber-300">not found — verify manually</em>}</p>
                <p><span className="text-slate-500">Tasks found:</span> {draft.tasks.length}{!draft.foundTasks && <em className="text-amber-300"> — none clearly stated</em>}</p>
                {draft.tasks.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-slate-400 max-h-32 overflow-y-auto">
                    {draft.tasks.map((t) => <li key={t.id}>{t.title}</li>)}
                  </ul>
                )}
                <p className="text-[11px] text-slate-600">{draft.sourceAttribution}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowImporter(false); setDraft(null); }} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm">Close</button>
              {draft && (
                <button onClick={useDraftAsForm} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium">
                  Review & edit draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
