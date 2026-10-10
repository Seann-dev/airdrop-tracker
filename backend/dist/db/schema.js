import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
export const airdrops = pgTable('airdrops', {
    id: uuid('id').defaultRandom().primaryKey(),
    // Clerk user ID — never trust client-supplied owner IDs
    ownerId: text('owner_id').notNull(),
    // Idempotency key for legacy import: "<ownerId>:<legacyId>"
    legacyId: text('legacy_id'),
    projectName: text('project_name').notNull(),
    network: text('network').notNull().default(''),
    status: text('status').notNull().default('Watching'),
    deadline: timestamp('deadline', { withTimezone: true }),
    officialLink: text('official_link').notNull().default(''),
    category: text('category').notNull().default(''),
    notes: text('notes').notNull().default(''),
    tasks: jsonb('tasks').$type().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const AIRDROP_STATUSES = ['Watching', 'Active', 'Completed', 'Claimed', 'Not eligible'];
