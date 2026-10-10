import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AirdropCreate, AirdropUpdate, ImportRecord } from '../lib/types';

export function useAirdrops(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: ['airdrops', params],
    queryFn: () => api.list(params),
  });
}

export function useSummary() {
  return useQuery({ queryKey: ['summary'], queryFn: api.summary });
}

export function useCreateAirdrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AirdropCreate) => api.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['airdrops'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useUpdateAirdrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AirdropUpdate }) => api.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['airdrops'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useDeleteAirdrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['airdrops'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useImportBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: ImportRecord[]) => api.importBatch(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['airdrops'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useDraft() {
  return useMutation({ mutationFn: (url: string) => api.draft(url) });
}
