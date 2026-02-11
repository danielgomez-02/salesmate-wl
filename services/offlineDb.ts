/**
 * IndexedDB offline storage for Salesmate PWA.
 * Stores user data, routes, missions, and queues offline completions for sync.
 */

const DB_NAME = 'salesmate_offline';
const DB_VERSION = 1;

interface SyncQueueItem {
  id: string;
  type: 'mission_complete';
  brandId: string;
  visitId: string;
  taskId: string;
  data: any;
  timestamp: number;
}

function openDb(): Promise<IDBDatabase> {
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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put(storeName: string, data: any): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(data);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => { db.close(); resolve(req.result as T | undefined); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result as T[]); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function remove(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// ── Public API ──

export const offlineDb = {
  /** Save user data after login */
  async saveUserData(brandId: string, empCode: string, userData: any) {
    await put('userData', { key: `${brandId}:${empCode}`, brandId, empCode, ...userData, cachedAt: Date.now() });
  },

  /** Get cached user data */
  async getUserData(brandId: string, empCode: string) {
    const result = await get<any>('userData', `${brandId}:${empCode}`);
    return result ? { name: result.name, emp_code: result.emp_code, company: result.company } : null;
  },

  /** Save routes for a user */
  async saveRoutes(brandId: string, empCode: string, routes: any[]) {
    await put('routes', { cacheKey: `${brandId}:${empCode}`, brandId, empCode, routes, cachedAt: Date.now() });
  },

  /** Get cached routes */
  async getRoutes(brandId: string, empCode: string) {
    const result = await get<any>('routes', `${brandId}:${empCode}`);
    return result?.routes || null;
  },

  /** Save missions for a visit */
  async saveMissions(brandId: string, visitId: string, missions: any[]) {
    await put('missions', { cacheKey: `${brandId}:${visitId}`, brandId, visitId, missions, cachedAt: Date.now() });
  },

  /** Get cached missions */
  async getMissions(brandId: string, visitId: string) {
    const result = await get<any>('missions', `${brandId}:${visitId}`);
    return result?.missions || null;
  },

  /** Queue a mission completion for offline sync */
  async queueMissionCompletion(brandId: string, visitId: string, taskId: string, feedbackData: any) {
    const item: SyncQueueItem = {
      id: `${taskId}_${Date.now()}`,
      type: 'mission_complete',
      brandId,
      visitId,
      taskId,
      data: feedbackData,
      timestamp: Date.now(),
    };
    await put('syncQueue', item);
  },

  /** Get all pending sync items */
  async getPendingSyncs(): Promise<SyncQueueItem[]> {
    return getAll<SyncQueueItem>('syncQueue');
  },

  /** Remove a sync item after successful sync */
  async removeSyncItem(id: string) {
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
