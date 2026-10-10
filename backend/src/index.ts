import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { clerkMiddleware } from '@clerk/express';
import airdropsRouter from './routes/airdrops.js';
import importRouter from './routes/import.js';

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(clerkMiddleware());

// Public health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'airdrop-tracker-api' });
});

app.use('/api/airdrops', airdropsRouter);
// /api/airdrops/draft lives under the same prefix for a tidy OpenAPI surface
app.use('/api/airdrops', importRouter);

// Serve the built SPA (Docker copies frontend/dist -> ./public)
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback for client-side routes (but not /api/*)
  app.get(/^(?!\/(api|health)).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// 404 + error handler (never leak secrets/tokens)
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err?.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
});
