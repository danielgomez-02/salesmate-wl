/**
 * IndexedDB offline storage for Salesmate PWA.
 * Stores user data, routes, missions, and queues offline completions for sync.
 *
 * PERF-001: Uses connection pooling — a single IDBDatabase instance is reused
 * across operations, only opening a new one if the previous was closed/errored.
 */

import { UserData, RouteItem, Mission } from '../types';
import type { TaskFeedback } from './mockApi';

const DB_NAME = 'salesmate_offline';
const DB_VERSION = 1;

// ── Typed data shapes for IndexedDB stores ──

interface CachedUserData {
  key: string;
  brandId: string;
  empCode: string;
  name: string;
  emp_code: string;
  company: string;
  cachedAt: number;
}

interface CachedRoutes {
  cacheKey: string;
  brandId: string;
  empCode: string;
  routes: RouteItem[];
  cachedAt: number;
}

interface CachedMissions {
  cacheKey: string;
  brandId: string;
  visitId: string;
  missions: Mission[];
  cachedAt: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'mission_complete';
  brandId: string;
  visitId: string;
  taskId: string;
  data: TaskFeedback;
  timestamp: number;
}

// ── Connection pool: reuse a single IDBDatabase instance ──

let dbInstance: IDBDatabase | null = null;

function getDb(): Promise<IDBDatabase> {
  // Return existing connection if still open
  if (dbInstance) {
    try {
      // Quick check: try accessing objectStoreNames to verify the connection is alive
      if (dbInstance.objectStoreNames.length > 0) {
        return Promise.resolve(dbInstance);
      }
    } catch {
      // Connection was closed or errored, re-open below
      dbInstance = null;
    }
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('routes')) {
        db.createObjectStore('routes', { keyPath: 'cacheKey' });
      }
      if (!db.objectStoreNames.contains('missions')) {
        db.createObjectStore('missions', { keyPath: 'cacheKey' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      // Reset instance if the connection closes unexpectedly
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

// ── Internal CRUD helpers (no longer close db after each operation) ──

async function put<T extends Record<string, unknown>>(storeName: string, data: T): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function remove(storeName: string, key: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Public API ──

export const offlineDb = {
  /** Save user data after login */
  async saveUserData(brandId: string, empCode: string, userData: UserData): Promise<void> {
    await put('userData', {
      key: `${brandId}:${empCode}`,
      brandId,
      empCode,
      name: userData.name,
      emp_code: userData.emp_code,
      company: userData.company,
      cachedAt: Date.now(),
    });
  },

  /** Get cached user data */
  async getUserData(brandId: string, empCode: string): Promise<Pick<UserData, 'name' | 'emp_code' | 'company'> | null> {
    const result = await get<CachedUserData>('userData', `${brandId}:${empCode}`);
    return result ? { name: result.name, emp_code: result.emp_code, company: result.company } : null;
  },

  /** Save routes for a user */
  async saveRoutes(brandId: string, empCode: string, routes: RouteItem[]): Promise<void> {
    await put('routes', {
      cacheKey: `${brandId}:${empCode}`,
      brandId,
      empCode,
      routes,
      cachedAt: Date.now(),
    });
  },

  /** Get cached routes */
  async getRoutes(brandId: string, empCode: string): Promise<RouteItem[] | null> {
    const result = await get<CachedRoutes>('routes', `${brandId}:${empCode}`);
    return result?.routes || null;
  },

  /** Save missions for a visit */
  async saveMissions(brandId: string, visitId: string, missions: Mission[]): Promise<void> {
    await put('missions', {
      cacheKey: `${brandId}:${visitId}`,
      brandId,
      visitId,
      missions,
      cachedAt: Date.now(),
    });
  },

  /** Get cached missions */
  async getMissions(brandId: string, visitId: string): Promise<Mission[] | null> {
    const result = await get<CachedMissions>('missions', `${brandId}:${visitId}`);
    return result?.missions || null;
  },

  /** Queue a mission completion for offline sync */
  async queueMissionCompletion(brandId: string, visitId: string, taskId: string, feedbackData: TaskFeedback): Promise<void> {
    const item: SyncQueueItem = {
      id: `${taskId}_${Date.now()}`,
      type: 'mission_complete',
      brandId,
      visitId,
      taskId,
      data: feedbackData,
      timestamp: Date.now(),
    };
    await put('syncQueue', item as unknown as Record<string, unknown>);
  },

  /** Get all pending sync items */
  async getPendingSyncs(): Promise<SyncQueueItem[]> {
    return getAll<SyncQueueItem>('syncQueue');
  },

  /** Remove a sync item after successful sync */
  async removeSyncItem(id: string): Promise<void> {
    await remove('syncQueue', id);
  },

  /** Process pending syncs (call when back online) */
  async processSyncQueue(syncFn: (item: SyncQueueItem) => Promise<boolean>): Promise<number> {
    const pending = await this.getPendingSyncs();
    let synced = 0;
    for (const item of pending) {
      try {
        const success = await syncFn(item);
        if (success) {
          await this.removeSyncItem(item.id);
          synced++;
        }
      } catch (e) {
        console.warn('Sync failed for item', item.id, e);
      }
    }
    return synced;
  },

  /** Get count of pending syncs */
  async getPendingSyncCount(): Promise<number> {
    const items = await this.getPendingSyncs();
    return items.length;
  },
};
