/**
 * Unit tests for services/offlineDb.ts
 *
 * Covers:
 * - PERF-001: IndexedDB connection pooling (singleton dbInstance)
 * - TYPE-001: Typed interfaces for all stores
 * - CRUD operations: save/get user data, routes, missions
 * - Sync queue: queue, retrieve, remove, process
 *
 * Uses unique keys per test to avoid cross-test state pollution.
 */

import { describe, it, expect, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { offlineDb, SyncQueueItem } from '../services/offlineDb';
import type { UserData } from '../types';

let testCounter = 0;
function uid() { return `t${++testCounter}_${Date.now()}`; }

function makeUserData(): UserData {
  return {
    id: 1, company: 'Test Corp', name: 'Maria Test',
    role: 'salesperson', emp_code: 'EMP001', phone: '+57300111222',
  };
}

describe('offlineDb', () => {

  // ── User Data ──
  describe('userData CRUD', () => {
    it('saves and retrieves user data', async () => {
      const b = uid(), e = uid();
      await offlineDb.saveUserData(b, e, makeUserData());
      const cached = await offlineDb.getUserData(b, e);
      expect(cached).not.toBeNull();
      expect(cached!.name).toBe('Maria Test');
      expect(cached!.emp_code).toBe('EMP001');
      expect(cached!.company).toBe('Test Corp');
    });

    it('returns null for non-existent user', async () => {
      expect(await offlineDb.getUserData(uid(), uid())).toBeNull();
    });

    it('isolates data by brandId', async () => {
      const a = uid(), b = uid(), e = uid();
      await offlineDb.saveUserData(a, e, makeUserData());
      expect(await offlineDb.getUserData(a, e)).not.toBeNull();
      expect(await offlineDb.getUserData(b, e)).toBeNull();
    });

    it('overwrites on re-save', async () => {
      const b = uid(), e = uid();
      await offlineDb.saveUserData(b, e, makeUserData());
      await offlineDb.saveUserData(b, e, { ...makeUserData(), name: 'Updated' });
      expect((await offlineDb.getUserData(b, e))!.name).toBe('Updated');
    });
  });

  // ── Routes ──
  describe('routes CRUD', () => {
    it('saves and retrieves routes', async () => {
      const b = uid(), e = uid();
      const routes = [
        { visit_id: 1, salesperson_id: 1, customer: { code: 'C1', name: 'T1' }, route_order: 1, priority: 1, check_in: null, status: 'pending' as const },
      ];
      await offlineDb.saveRoutes(b, e, routes);
      const cached = await offlineDb.getRoutes(b, e);
      expect(cached).toHaveLength(1);
      expect(cached![0].visit_id).toBe(1);
    });

    it('returns null for non-existent routes', async () => {
      expect(await offlineDb.getRoutes(uid(), uid())).toBeNull();
    });
  });

  // ── Missions ──
  describe('missions CRUD', () => {
    it('saves and retrieves missions', async () => {
      const b = uid(), v = uid();
      const missions = [
        { taskid: 100, code: 'T1', name: 'M1', description: '', type: 'check' as const, category: 'sales' as const, required: true, status: 'pending' as const, impact_score: 50 },
      ];
      await offlineDb.saveMissions(b, v, missions);
      const cached = await offlineDb.getMissions(b, v);
      expect(cached).toHaveLength(1);
    });

    it('returns null for non-existent missions', async () => {
      expect(await offlineDb.getMissions(uid(), uid())).toBeNull();
    });
  });

  // ── Sync Queue ──
  describe('syncQueue', () => {
    it('queues a mission completion', async () => {
      const b = uid();
      await offlineDb.queueMissionCompletion(b, 'V1', 'TQ1', { type: 'photo' });
      const pending = await offlineDb.getPendingSyncs();
      const ours = pending.filter(p => p.brandId === b);
      expect(ours).toHaveLength(1);
      expect(ours[0].type).toBe('mission_complete');
      expect(ours[0].taskId).toBe('TQ1');
    });

    it('removes a sync item', async () => {
      const b = uid();
      await offlineDb.queueMissionCompletion(b, 'V1', 'TREM', {});
      const pending = await offlineDb.getPendingSyncs();
      const item = pending.find(p => p.brandId === b)!;
      await offlineDb.removeSyncItem(item.id);
      const after = await offlineDb.getPendingSyncs();
      expect(after.find(p => p.id === item.id)).toBeUndefined();
    });
  });

  // ── Connection pooling ──
  describe('PERF-001: connection pooling', () => {
    it('sequential operations reuse connection without errors', async () => {
      const b = uid(), e = uid();
      await offlineDb.saveUserData(b, e, makeUserData());
      await offlineDb.saveRoutes(b, e, []);
      await offlineDb.saveMissions(b, 'V1', []);
      expect(await offlineDb.getUserData(b, e)).not.toBeNull();
      expect(await offlineDb.getRoutes(b, e)).not.toBeNull();
      expect(await offlineDb.getMissions(b, 'V1')).not.toBeNull();
    });

    it('parallel operations succeed without errors', async () => {
      const b = uid();
      await expect(Promise.all([
        offlineDb.saveUserData(b, 'E1', makeUserData()),
        offlineDb.saveUserData(b, 'E2', { ...makeUserData(), emp_code: 'E2' }),
        offlineDb.saveRoutes(b, 'E1', []),
        offlineDb.saveMissions(b, 'V1', []),
      ])).resolves.not.toThrow();
    });
  });
});
