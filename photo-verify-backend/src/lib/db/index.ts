// ============================================
// Database Connection - Neon Serverless
// ============================================

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create a cached database instance
function createDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  const sql = neon(process.env.POSTGRES_URL);
  return drizzle(sql, { schema });
}

// Singleton pattern for serverless
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export { schema };
