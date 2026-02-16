// ============================================
// /api/tenants - Tenant Management
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { authenticate, isAuthError, requireRole } from '@/lib/auth/middleware';
import { signToken } from '@/lib/auth/jwt';
import { CreateTenantSchema, type ApiResponse } from '@/lib/types';

export const runtime = 'nodejs';

// --- GET /api/tenants - List tenants (admin only) ---
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireRole(auth, 'admin');
  if (roleError) return roleError;

  try {
    const db = getDb();
    const allTenants = await db.select().from(schema.tenants);

    return NextResponse.json(
      {
        success: true,
        data: allTenants,
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(`[tenants:list] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tenants' },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// --- POST /api/tenants - Create a new tenant ---
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireRole(auth, 'admin');
  if (roleError) return roleError;

  try {
    const body = await request.json();
    const parsed = CreateTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tenant data',
            details: parsed.error.flatten(),
          },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if slug already exists
    const [existing] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, parsed.data.slug))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `Tenant with slug "${parsed.data.slug}" already exists`,
          },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 409 }
      );
    }

    // Create tenant
    const [tenant] = await db.insert(schema.tenants).values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      config: parsed.data.config,
    }).returning();

    // Generate an admin token for the new tenant
    const token = await signToken({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      role: 'admin',
    });

    // Audit log
    await db.insert(schema.auditLog).values({
      tenantId: auth.tenantId,
      action: 'tenant_created',
      entityType: 'tenant',
      entityId: tenant.id,
      userId: auth.userId,
      details: { name: parsed.data.name, slug: parsed.data.slug },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          tenant,
          token, // Return token for immediate use
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error(`[tenants:create] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create tenant' },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
