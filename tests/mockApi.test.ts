/**
 * Unit tests for services/mockApi.ts
 *
 * Covers:
 * - SEC-001: API keys come from import.meta.env (no hardcoded keys)
 * - SEC-003: Proxy paths used instead of thingproxy
 * - ERR-001: updateTaskStatus returns false on network error
 * - ARCH-002/003: getRoutes returns RoutesWithMissions, getMissionsFromMap works
 * - TYPE-001: Typed interfaces, no 'any'
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockApi, RoutesWithMissions, TaskFeedback } from '../services/mockApi';

// ── Helpers ──

function makeFakeApiResponse(customers: Record<string, unknown>[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ userRouteTasks: customers }),
  };
}

function makeFakeCustomer(name: string, code: string, tasks: Record<string, unknown>[] = []) {
  return {
    customer_name: name,
    customer_code: code,
    customer_address: 'Calle Test 123',
    task: tasks,
  };
}

function makeFakeTask(overrides: Record<string, unknown> = {}) {
  return {
    assignation_id: 100,
    task_id: 200,
    code: 'TSK_001',
    task_name: 'Test Task',
    description: 'A test task',
    mission_category: 'SALES',
    type: 'USER_INPUT',
    required: true,
    status: 'PENDING',
    score_impact: 80,
    ...overrides,
  };
}

// ── Tests ──

describe('mockApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ────────────────────────────────────────────
  // getUserInfo
  // ────────────────────────────────────────────
  describe('getUserInfo', () => {
    it('returns a known user by emp_code', async () => {
      const user = await mockApi.getUserInfo('1234567');
      expect(user.name).toBe('Alejandra Lopez');
      expect(user.emp_code).toBe('1234567');
      expect(user.role).toBe('salesperson');
    });

    it('returns a fallback user for unknown emp_code', async () => {
      const user = await mockApi.getUserInfo('UNKNOWN');
      expect(user.id).toBe(999);
      expect(user.emp_code).toBe('UNKNOWN');
    });

    it('overrides company name when provided', async () => {
      const user = await mockApi.getUserInfo('1234567', 'Custom Corp');
      expect(user.company).toBe('Custom Corp');
    });
  });

  // ────────────────────────────────────────────
  // getRoutes — SEC-001 / SEC-003 / ARCH-002/003
  // ────────────────────────────────────────────
  describe('getRoutes', () => {
    it('SEC-003: calls /api/retool proxy path (no thingproxy)', async () => {
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse([]) as unknown as Response);
      await mockApi.getRoutes('1234567');
      expect(fetchSpy).toHaveBeenCalledOnce();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/retool');
      expect(calledUrl).not.toContain('thingproxy');
    });

    it('SEC-001: sends API key in X-Workflow-Api-Key header', async () => {
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse([]) as unknown as Response);
      await mockApi.getRoutes('1234567');
      const opts = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['X-Workflow-Api-Key']).toBeDefined();
      // Should come from env, not be hardcoded
      expect(headers['X-Workflow-Api-Key']).not.toContain('retool_wk_');
    });

    it('ARCH-002: returns RoutesWithMissions shape', async () => {
      const customers = [
        makeFakeCustomer('Tienda A', 'C001', [makeFakeTask()]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);

      const result: RoutesWithMissions = await mockApi.getRoutes('1234567');
      expect(result).toHaveProperty('routes');
      expect(result).toHaveProperty('missionsMap');
      expect(Array.isArray(result.routes)).toBe(true);
      expect(typeof result.missionsMap).toBe('object');
    });

    it('ARCH-003: routes and missions are correctly linked by visit_id', async () => {
      const customers = [
        makeFakeCustomer('Tienda A', 'C001', [makeFakeTask({ task_name: 'Task A' })]),
        makeFakeCustomer('Tienda B', 'C002', [makeFakeTask({ task_name: 'Task B' })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);

      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      expect(routes).toHaveLength(2);

      for (const route of routes) {
        const missions = missionsMap[route.visit_id];
        expect(missions).toBeDefined();
        expect(missions.length).toBeGreaterThan(0);
      }
    });

    it('falls back to FALLBACK_TASKS when API fails', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network down'));

      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      expect(routes.length).toBeGreaterThan(0);

      // Should have missions for each route
      for (const route of routes) {
        expect(missionsMap[route.visit_id]).toBeDefined();
      }
    });

    it('falls back to FALLBACK_TASKS when API returns empty', async () => {
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse([]) as unknown as Response);

      const { routes } = await mockApi.getRoutes('1234567');
      // Fallback has 2 unique customers (CUST001, CUST002)
      expect(routes.length).toBe(2);
    });

    it('deduplicates routes with same customer_code', async () => {
      const customers = [
        makeFakeCustomer('Tienda A', 'C001', [makeFakeTask({ task_name: 'Task 1' })]),
        makeFakeCustomer('Tienda A', 'C001', [makeFakeTask({ task_name: 'Task 2' })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);

      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      expect(routes).toHaveLength(1); // deduplicated
      const missions = missionsMap[routes[0].visit_id];
      expect(missions).toHaveLength(2); // but both tasks are collected
    });
  });

  // ────────────────────────────────────────────
  // getMissionsFromMap
  // ────────────────────────────────────────────
  describe('getMissionsFromMap', () => {
    it('returns missions for a known visit_id', () => {
      const map = {
        123: [{ taskid: 1, code: 'T1', name: 'Test', description: '', type: 'check' as const, category: 'sales' as const, required: true, status: 'pending' as const, impact_score: 10 }],
      };
      const result = mockApi.getMissionsFromMap(map, 123);
      expect(result).toHaveLength(1);
      expect(result[0].taskid).toBe(1);
    });

    it('returns empty array for unknown visit_id', () => {
      const result = mockApi.getMissionsFromMap({}, 999);
      expect(result).toEqual([]);
    });
  });

  // ────────────────────────────────────────────
  // updateTaskStatus — ERR-001 / SEC-003
  // ────────────────────────────────────────────
  describe('updateTaskStatus', () => {
    it('SEC-003: calls /api/updateTask proxy path', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
      await mockApi.updateTaskStatus(100);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/updateTask');
    });

    it('returns true on success', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
      const result = await mockApi.updateTaskStatus(100);
      expect(result).toBe(true);
    });

    it('ERR-001: returns false on HTTP error (not optimistic true)', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);
      const result = await mockApi.updateTaskStatus(100);
      expect(result).toBe(false);
    });

    it('ERR-001: returns false on network error (not optimistic true)', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network failure'));
      const result = await mockApi.updateTaskStatus(100);
      expect(result).toBe(false);
    });

    it('sends feedback payload when provided', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
      const feedback: TaskFeedback = { type: 'photo', photo: 'base64data' };
      await mockApi.updateTaskStatus(100, feedback);

      const opts = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(opts.body as string);
      expect(body.feedback).toEqual(feedback);
      expect(body.assignment_task_id).toBe(100);
      expect(body.task_status).toBe('DONE');
    });
  });

  // ────────────────────────────────────────────
  // parseTaskToMission (tested via getRoutes output)
  // ────────────────────────────────────────────
  describe('parseTaskToMission (via getRoutes)', () => {
    it('maps category SALES correctly', async () => {
      const customers = [
        makeFakeCustomer('T', 'C1', [makeFakeTask({ mission_category: 'SALES' })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);
      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      const mission = missionsMap[routes[0].visit_id][0];
      expect(mission.category).toBe('sales');
    });

    it('maps category COMMUNICATION correctly', async () => {
      const customers = [
        makeFakeCustomer('T', 'C1', [makeFakeTask({ mission_category: 'COMMUNICATION' })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);
      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      expect(missionsMap[routes[0].visit_id][0].category).toBe('communication');
    });

    it('maps type LIST to offer_products with suggestedProducts', async () => {
      const customers = [
        makeFakeCustomer('T', 'C1', [makeFakeTask({
          type: 'LIST',
          task_detail: {
            value: [
              { sku_code: 'SKU1', sku_name: 'Cola 500ml', price: 1500, suggested_qty: 10 },
              { sku_code: 'SKU2', sku_name: 'Cola Zero', price: 1800, suggested_qty: 5 },
            ],
          },
        })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);
      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      const mission = missionsMap[routes[0].visit_id][0];
      expect(mission.type).toBe('offer_products');
      expect(mission.suggested_products).toHaveLength(2);
      expect(mission.suggested_products![0].name).toBe('Cola 500ml');
    });

    it('maps type TAKE_PHOTO correctly', async () => {
      const customers = [
        makeFakeCustomer('T', 'C1', [makeFakeTask({ type: 'TAKE_PHOTO' })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);
      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      expect(missionsMap[routes[0].visit_id][0].type).toBe('take_photo');
    });

    it('maps type DIALOG with instruction_steps to dialog + questionnaire', async () => {
      const customers = [
        makeFakeCustomer('T', 'C1', [makeFakeTask({
          type: 'DIALOG',
          task_detail: {
            instruction_steps: ['Paso 1', 'Paso 2'],
          },
        })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);
      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      const mission = missionsMap[routes[0].visit_id][0];
      expect(mission.type).toBe('dialog');
      expect(mission.instruction_steps).toEqual(['Paso 1', 'Paso 2']);
      expect(mission.questionnaire).toBeDefined();
      expect(mission.questionnaire!.options.length).toBeGreaterThan(0);
    });

    it('maps DONE status to done', async () => {
      const customers = [
        makeFakeCustomer('T', 'C1', [makeFakeTask({ status: 'DONE' })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);
      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      expect(missionsMap[routes[0].visit_id][0].status).toBe('done');
    });

    it('defaults to pending status for non-DONE', async () => {
      const customers = [
        makeFakeCustomer('T', 'C1', [makeFakeTask({ status: 'IN_PROGRESS' })]),
      ];
      fetchSpy.mockResolvedValueOnce(makeFakeApiResponse(customers) as unknown as Response);
      const { routes, missionsMap } = await mockApi.getRoutes('1234567');
      expect(missionsMap[routes[0].visit_id][0].status).toBe('pending');
    });
  });

  // ────────────────────────────────────────────
  // getGoals
  // ────────────────────────────────────────────
  describe('getGoals', () => {
    it('returns goals with valid structure', async () => {
      const goals = await mockApi.getGoals('1234567');
      expect(goals.length).toBeGreaterThan(0);
      expect(goals[0]).toHaveProperty('goalid');
      expect(goals[0]).toHaveProperty('completion_rate');
      expect(goals[0].type).toBe('total');
    });
  });
});
