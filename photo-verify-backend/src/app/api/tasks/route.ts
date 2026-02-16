// ============================================
// /api/tasks - Task CRUD (List + Create)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { authenticate, isAuthError, requireRole } from '@/lib/auth/middleware';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { CreateTaskSchema, type ApiResponse } from '@/lib/types';

export const runtime = 'nodejs';

// --- GET /api/tasks - List tasks for tenant ---
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const rateLimited = await rateLimitMiddleware(auth.tenantId, 'tasks:list');
  if (rateLimited) return rateLimited;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const db = getDb();

    const conditions = [eq(schema.tasks.tenantId, auth.tenantId)];
    if (status) {
      conditions.push(eq(schema.tasks.status, status as typeof schema.tasks.status.enumValues[number]));
    }

    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(and(...conditions))
      .orderBy(desc(schema.tasks.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(
      {
        success: true,
        data: {
          tasks,
          pagination: { limit, offset, count: tasks.length },
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(`[tasks:list] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tasks' },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// --- POST /api/tasks - Create a new task ---
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  // Require admin or operator role
  const roleError = requireRole(auth, 'admin', 'operator');
  if (roleError) return roleError;

  const rateLimited = await rateLimitMiddleware(auth.tenantId, 'tasks:create');
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid task data',
            details: parsed.error.flatten(),
          },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const db = getDb();
    const [task] = await db.insert(schema.tasks).values({
      tenantId: auth.tenantId,
      title: parsed.data.title,
      description: parsed.data.description,
      type: 'photo_verify',
      photoVerificationConfig: parsed.data.photoVerificationConfig,
      assignedTo: parsed.data.assignedTo,
      customerId: parsed.data.customerId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      metadata: parsed.data.metadata || {},
    }).returning();

    // Audit log
    await db.insert(schema.auditLog).values({
      tenantId: auth.tenantId,
      action: 'task_created',
      entityType: 'task',
      entityId: task.id,
      userId: auth.userId,
      details: { title: parsed.data.title },
    });

    return NextResponse.json(
      {
        success: true,
        data: task,
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error(`[tasks:create] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create task' },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
