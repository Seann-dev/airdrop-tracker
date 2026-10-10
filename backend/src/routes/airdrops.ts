import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { airdrops } from '../db/schema.js';
import { createAirdropSchema, updateAirdropSchema, importBatchSchema } from '../db/validation.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function toOut(row: typeof airdrops.$inferSelect) {
  return {
    id: row.id,
    projectName: row.projectName,
    network: row.network,
    status: row.status,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    officialLink: row.officialLink,
    category: row.category,
    notes: row.notes,
    tasks: row.tasks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /api/airdrops — list current user's records
router.get('/', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const { status, network, search, sort = 'updated' } = req.query;

  const conditions = [eq(airdrops.ownerId, userId)];
  if (typeof status === 'string' && status) conditions.push(eq(airdrops.status, status));
  if (typeof network === 'string' && network) conditions.push(eq(airdrops.network, network));

  let query = db.select().from(airdrops).where(and(...conditions));
  // search across project name / notes / category
  if (typeof search === 'string' && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    query = db.select().from(airdrops).where(
      and(
        ...conditions,
        sql`lower(${airdrops.projectName}) LIKE ${q} OR lower(${airdrops.notes}) LIKE ${q} OR lower(${airdrops.category}) LIKE ${q}`
      )
    );
  }

  const orderBy =
    sort === 'deadline'
      ? sql`${airdrops.deadline} ASC NULLS LAST`
      : sort === 'created'
        ? desc(airdrops.createdAt)
        : desc(airdrops.updatedAt);

  const rows = await query.orderBy(orderBy).limit(500);
  res.json(rows.map(toOut));
});

// GET /api/airdrops/summary — totals scoped to current user
router.get('/summary', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const rows = await db
    .select({ status: airdrops.status, count: sql<number>`count(*)` })
    .from(airdrops)
    .where(eq(airdrops.ownerId, userId))
    .groupBy(airdrops.status);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byStatus[r.status] = Number(r.count);
    total += Number(r.count);
  }

  const upcoming = await db
    .select({ count: sql<number>`count(*)` })
    .from(airdrops)
    .where(
      and(
        eq(airdrops.ownerId, userId),
        sql`${airdrops.deadline} IS NOT NULL AND ${airdrops.deadline} >= NOW() AND ${airdrops.deadline} <= NOW() + INTERVAL '14 days'`
      )
    );
  const upcomingDeadlines = Number(upcoming[0]?.count ?? 0);

  res.json({
    total,
    active: (byStatus['Active'] ?? 0) + (byStatus['Watching'] ?? 0),
    completed: (byStatus['Completed'] ?? 0) + (byStatus['Claimed'] ?? 0),
    upcomingDeadlines,
    byStatus,
  });
});

// POST /api/airdrops — create
router.post('/', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const parsed = createAirdropSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .insert(airdrops)
    .values({
      ownerId: userId,
      projectName: d.projectName,
      network: d.network,
      status: d.status,
      deadline: d.deadline ?? null,
      officialLink: d.officialLink,
      category: d.category,
      notes: d.notes,
      tasks: d.tasks,
    })
    .returning();
  res.status(201).json(toOut(row));
});

// POST /api/airdrops/import — idempotent legacy import
router.post('/import', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const parsed = importBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  let imported = 0;
  let skipped = 0;
  for (const rec of parsed.data.records) {
    const legacyKey = `${userId}:${rec.legacyId}`;
    const existing = await db
      .select({ id: airdrops.id })
      .from(airdrops)
      .where(and(eq(airdrops.ownerId, userId), eq(airdrops.legacyId, legacyKey)))
      .limit(1);
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(airdrops).values({
      ownerId: userId,
      legacyId: legacyKey,
      projectName: rec.projectName,
      network: rec.network,
      status: rec.status,
      deadline: rec.deadline ?? null,
      officialLink: rec.officialLink,
      category: rec.category,
      notes: rec.notes,
      tasks: rec.tasks,
    });
    imported++;
  }
  res.json({ imported, skipped });
});

// PATCH /api/airdrops/:id — edit own record
router.patch('/:id', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const parsed = updateAirdropSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const patch: Partial<typeof airdrops.$inferInsert> = { updatedAt: new Date() };
  if (d.projectName !== undefined) patch.projectName = d.projectName;
  if (d.network !== undefined) patch.network = d.network;
  if (d.status !== undefined) patch.status = d.status;
  if (d.deadline !== undefined) patch.deadline = d.deadline;
  if (d.officialLink !== undefined) patch.officialLink = d.officialLink;
  if (d.category !== undefined) patch.category = d.category;
  if (d.notes !== undefined) patch.notes = d.notes;
  if (d.tasks !== undefined) patch.tasks = d.tasks;

  const [row] = await db
    .update(airdrops)
    .set(patch)
    .where(and(eq(airdrops.id, req.params.id), eq(airdrops.ownerId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(toOut(row));
});

// DELETE /api/airdrops/:id — delete own record
router.delete('/:id', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest;
  const deleted = await db
    .delete(airdrops)
    .where(and(eq(airdrops.id, req.params.id), eq(airdrops.ownerId, userId)))
    .returning({ id: airdrops.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ deleted: true });
});

export default router;
