/**
 * Production migration runner — safe to run on every deploy.
 * Uses only idempotent statements (CREATE TABLE IF NOT EXISTS).
 * Exits 0 on success, 1 on failure (which fails the deploy loudly).
 *
 * Never prints secrets. Never drops tables or modifies existing data.
 */
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[migrate] DATABASE_URL is not set — skipping migration');
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });
  try {
    // Verify connectivity first
    await sql`SELECT 1`;
    console.log('[migrate] database connectivity OK');

    // Run the idempotent schema migration
    const migrationPath = path.join(__dirname, '..', 'drizzle', '0000_regular_blue_shield.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    await sql.unsafe(migrationSql);
    console.log('[migrate] schema migration applied (idempotent)');

    // Verify the table exists
    const tables = await sql`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'airdrops'
    `;
    if (tables.length === 0) {
      throw new Error('airdrops table not found after migration');
    }
    console.log('[migrate] verified: airdrops table exists');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  // Log the message only — never the connection string or stack with secrets
  console.error('[migrate] FAILED:', err?.message || String(err));
  process.exit(1);
});
