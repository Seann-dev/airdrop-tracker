import type { Airdrop, AirdropCreate, AirdropUpdate, ImportRecord, ImportResult, Summary, Draft } from './types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  // Same-origin: Clerk session cookie is sent automatically. No bearer tokens.
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'same-origin',
  });
  if (res.status === 401) throw new Error('Signed out — please sign in again.');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  list: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return req<Airdrop[]>(`/airdrops${q ? `?${q}` : ''}`);
  },
  summary: () => req<Summary>('/airdrops/summary'),
  create: (data: AirdropCreate) =>
    req<Airdrop>('/airdrops', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: AirdropUpdate) =>
    req<Airdrop>(`/airdrops/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) =>
    req<{ deleted: boolean }>(`/airdrops/${id}`, { method: 'DELETE' }),
  importBatch: (records: ImportRecord[]) =>
    req<ImportResult>('/airdrops/import', { method: 'POST', body: JSON.stringify({ records }) }),
  draft: (url: string) =>
    req<Draft>('/airdrops/draft', { method: 'POST', body: JSON.stringify({ url }) }),
};
