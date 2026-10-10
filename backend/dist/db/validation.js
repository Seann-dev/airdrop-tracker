import { z } from 'zod';
import { AIRDROP_STATUSES } from './schema.js';
const taskItemSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1).max(500),
    done: z.boolean(),
});
export const createAirdropSchema = z.object({
    projectName: z.string().min(1, 'Project name is required').max(200),
    network: z.string().max(100).default(''),
    status: z.enum(AIRDROP_STATUSES).default('Watching'),
    deadline: z.string().datetime({ offset: true }).nullable().optional()
        .transform((v) => (v ? new Date(v) : null)),
    officialLink: z.string().max(2000).default('').refine((v) => v === '' || /^https?:\/\//i.test(v), 'Official link must be an http(s) URL'),
    category: z.string().max(100).default(''),
    notes: z.string().max(5000).default(''),
    tasks: z.array(taskItemSchema).max(200).default([]),
});
export const updateAirdropSchema = createAirdropSchema.partial();
export const importAirdropSchema = createAirdropSchema.extend({
    legacyId: z.string().min(1).max(200),
});
export const importBatchSchema = z.object({
    records: z.array(importAirdropSchema).min(1).max(100),
});
