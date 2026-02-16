// ============================================
// /api/tasks/[id] - Single Task Operations
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { authenticate, isAuthError, requireRole } from '@/lib/auth/middleware';
import { UpdateTaskSchema, type ApiResponse } from '@/lib/types';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

// --- GET /api/tasks/[id] - Get task with verifications ---
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const requestId = crypto.randomUUID();

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  try {
    const db = getDb();

    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.tenantId, auth.tenantId)))
      .limit(1);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: `Task ${id} not found` },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 404 }
      );
    }

    // Get verification history
    const taskVerifications = await db
      .select()
      .from(schema.verifications)
      .where(and(eq(schema.verifications.taskId, id), eq(schema.verifications.tenantId, auth.tenantId)));

    return NextResponse.json(
      {
        success: true,
        data: { ...task, verifications: taskVerifications },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(`[tasks:get] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch task' },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// --- PUT /api/tasks/[id] - Update task ---
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const requestId = crypto.randomUUID();

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireRole(auth, 'admin', 'operator');
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const parsed = UpdateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: parsed.error.flatten(),
          },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const db = getDb();

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.title) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.photoVerificationConfig) updateData.photoVerificationConfig = parsed.data.photoVerificationConfig;
    if (parsed.data.assignedTo !== undefined) updateData.assignedTo = parsed.data.assignedTo;
    if (parsed.data.customerId !== undefined) updateData.customerId = parsed.data.customerId;
    if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate);
    if (parsed.data.metadata) updateData.metadata = parsed.data.metadata;

    const [updated] = await db
      .update(schema.tasks)
      .set(updateData)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.tenantId, auth.tenantId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: `Task ${id} not found` },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updated,
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(`[tasks:update] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update task' },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// --- DELETE /api/tasks/[id] - Delete task ---
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const requestId = crypto.randomUUID();

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireRole(auth, 'admin');
  if (roleError) return roleError;

  try {
    const db = getDb();

    const [deleted] = await db
      .delete(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.tenantId, auth.tenantId)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: `Task ${id} not found` },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 404 }
      );
    }

    // Audit log
    await db.insert(schema.auditLog).values({
      tenantId: auth.tenantId,
      action: 'task_deleted',
      entityType: 'task',
      entityId: id,
      userId: auth.userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: { id, deleted: true },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(`[tasks:delete] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete task' },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
