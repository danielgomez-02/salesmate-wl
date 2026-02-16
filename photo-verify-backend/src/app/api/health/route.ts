// ============================================
// GET /api/health - Health Check
// ============================================

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    postgres: 'unchecked',
    kv: 'unchecked',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    blob: process.env.BLOB_READ_WRITE_TOKEN ? 'configured' : 'missing',
  };

  // Check Postgres
  try {
    if (process.env.POSTGRES_URL) {
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const { sql } = await import('drizzle-orm');
      await db.execute(sql`SELECT 1`);
      checks.postgres = 'connected';
    } else {
      checks.postgres = 'not_configured';
    }
  } catch {
    checks.postgres = 'disconnected';
  }

  // Check KV (Upstash Redis)
  try {
    if (process.env.KV_REST_API_URL) {
      const { kv } = await import('@vercel/kv');
      await kv.ping();
      checks.kv = 'connected';
    } else {
      checks.kv = 'not_configured';
    }
  } catch {
    checks.kv = 'disconnected';
  }

  const allHealthy = checks.postgres !== 'disconnected' && checks.openai !== 'missing';

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}
