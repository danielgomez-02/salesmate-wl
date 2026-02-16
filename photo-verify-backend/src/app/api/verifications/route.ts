// ============================================
// GET /api/verifications - Verification History
// ============================================
// Query verification results by:
// - externalTaskId (for hybrid/external mode)
// - taskId (for internal mode)
// - tenantId (all verifications for a tenant)

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, isAuthError } from '@/lib/auth/middleware';
import { getDb, schema } from '@/lib/db';
import type { ApiResponse } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  // 1. Authenticate
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const externalTaskId = searchParams.get('externalTaskId');
    const taskId = searchParams.get('taskId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query conditions
    const conditions = [eq(schema.verifications.tenantId, auth.tenantId)];

    if (externalTaskId) {
      conditions.push(eq(schema.verifications.externalTaskId, externalTaskId));
    }

    if (taskId) {
      conditions.push(eq(schema.verifications.taskId, taskId));
    }

    // Execute query
    const verifications = await db
      .select({
        id: schema.verifications.id,
        taskId: schema.verifications.taskId,
        externalTaskId: schema.verifications.externalTaskId,
        imageUrl: schema.verifications.imageUrl,
        passed: schema.verifications.passed,
        overallConfidence: schema.verifications.overallConfidence,
        criteriaResults: schema.verifications.criteriaResults,
        configUsed: schema.verifications.configUsed,
        modelUsed: schema.verifications.modelUsed,
        processingTimeMs: schema.verifications.processingTimeMs,
        retryCount: schema.verifications.retryCount,
        createdAt: schema.verifications.createdAt,
      })
      .from(schema.verifications)
      .where(and(...conditions))
      .orderBy(desc(schema.verifications.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(
      {
        success: true,
        data: {
          verifications,
          pagination: {
            limit,
            offset,
            count: verifications.length,
          },
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(`[verifications] Error for tenant ${auth.tenantId}:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
