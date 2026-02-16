// ============================================
// GET /api/billing - Billing & Usage Dashboard API
// ============================================
// Returns usage summaries per tenant with token counts,
// estimated costs, and breakdowns by model/provider/period.
//
// Query params:
//   ?from=2026-01-01&to=2026-02-01   (date range, ISO format)
//   ?tenantId=xxx                      (filter by tenant, admin only)
//   ?groupBy=day|week|month            (time grouping, default: day)

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { authenticate, isAuthError } from '@/lib/auth/middleware';
import { getDb } from '@/lib/db';
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

    // Parse query params
    const fromDate = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = searchParams.get('to') || new Date().toISOString().split('T')[0];
    const groupBy = searchParams.get('groupBy') || 'day';
    const filterTenantId = searchParams.get('tenantId') || auth.tenantId;

    // Only allow filtering other tenants if admin
    const tenantId = auth.role === 'admin' && searchParams.get('tenantId')
      ? searchParams.get('tenantId')!
      : auth.tenantId;

    // 2. Summary totals
    const summaryResult = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_verifications,
        COALESCE(SUM(input_tokens), 0)::int AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS total_output_tokens,
        COALESCE(SUM(input_tokens + output_tokens), 0)::int AS total_tokens,
        ROUND(COALESCE(SUM(estimated_cost_usd), 0)::numeric, 6) AS total_cost_usd,
        ROUND(AVG(processing_time_ms)::numeric, 0)::int AS avg_processing_ms,
        COUNT(*) FILTER (WHERE passed = true)::int AS passed_count,
        COUNT(*) FILTER (WHERE passed = false)::int AS failed_count
      FROM verifications
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${fromDate}::timestamptz
        AND created_at < (${toDate}::date + interval '1 day')::timestamptz
    `);

    // 3. Breakdown by model
    const byModel = await db.execute(sql`
      SELECT
        model_used,
        COUNT(*)::int AS verifications,
        COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
        ROUND(COALESCE(SUM(estimated_cost_usd), 0)::numeric, 6) AS cost_usd,
        ROUND(AVG(processing_time_ms)::numeric, 0)::int AS avg_ms
      FROM verifications
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${fromDate}::timestamptz
        AND created_at < (${toDate}::date + interval '1 day')::timestamptz
      GROUP BY model_used
      ORDER BY cost_usd DESC
    `);

    // 4. Time series (daily/weekly/monthly)
    let dateGroup: ReturnType<typeof sql>;
    switch (groupBy) {
      case 'week':
        dateGroup = sql`date_trunc('week', created_at)::date`;
        break;
      case 'month':
        dateGroup = sql`date_trunc('month', created_at)::date`;
        break;
      default: // day
        dateGroup = sql`created_at::date`;
    }

    const timeSeries = await db.execute(sql`
      SELECT
        ${dateGroup} AS period,
        COUNT(*)::int AS verifications,
        COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
        ROUND(COALESCE(SUM(estimated_cost_usd), 0)::numeric, 6) AS cost_usd,
        COUNT(*) FILTER (WHERE passed = true)::int AS passed,
        COUNT(*) FILTER (WHERE passed = false)::int AS failed
      FROM verifications
      WHERE tenant_id = ${tenantId}
        AND created_at >= ${fromDate}::timestamptz
        AND created_at < (${toDate}::date + interval '1 day')::timestamptz
      GROUP BY ${dateGroup}
      ORDER BY period ASC
    `);

    // 5. All tenants summary (admin only)
    let allTenants = null;
    if (auth.role === 'admin' && !searchParams.get('tenantId')) {
      allTenants = await db.execute(sql`
        SELECT
          t.id AS tenant_id,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          COUNT(v.id)::int AS verifications,
          COALESCE(SUM(v.input_tokens), 0)::int AS input_tokens,
          COALESCE(SUM(v.output_tokens), 0)::int AS output_tokens,
          ROUND(COALESCE(SUM(v.estimated_cost_usd), 0)::numeric, 6) AS cost_usd,
          COUNT(v.id) FILTER (WHERE v.passed = true)::int AS passed,
          COUNT(v.id) FILTER (WHERE v.passed = false)::int AS failed
        FROM tenants t
        LEFT JOIN verifications v ON v.tenant_id = t.id
          AND v.created_at >= ${fromDate}::timestamptz
          AND v.created_at < (${toDate}::date + interval '1 day')::timestamptz
        WHERE t.is_active = true
        GROUP BY t.id, t.name, t.slug
        ORDER BY cost_usd DESC
      `);
    }

    const summary = summaryResult.rows?.[0] || summaryResult[0] || {};

    return NextResponse.json(
      {
        success: true,
        data: {
          period: { from: fromDate, to: toDate, groupBy },
          tenantId,
          summary,
          byModel: byModel.rows || byModel,
          timeSeries: timeSeries.rows || timeSeries,
          ...(allTenants ? { allTenants: allTenants.rows || allTenants } : {}),
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error(`[billing] Error:`, error);
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
