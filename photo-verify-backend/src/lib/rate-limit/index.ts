// ============================================
// Rate Limiting - Vercel KV (Upstash Redis)
// ============================================

import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// --- Check rate limit for a given key ---
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `rl:${key}:${Math.floor(now / config.windowSeconds)}`;

    // Increment counter
    const count = await kv.incr(windowKey);

    // Set expiry on first request in window
    if (count === 1) {
      await kv.expire(windowKey, config.windowSeconds);
    }

    const resetAt = (Math.floor(now / config.windowSeconds) + 1) * config.windowSeconds;

    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt,
    };
  } catch (error) {
    // If KV is down, allow the request (fail open for POC)
    console.error('Rate limit check failed:', error);
    return { allowed: true, remaining: -1, resetAt: 0 };
  }
}

// --- Rate limit middleware for API routes ---
export async function rateLimitMiddleware(
  tenantId: string,
  endpoint: string,
  config?: Partial<RateLimitConfig>
): Promise<NextResponse | null> {
  const defaults: RateLimitConfig = {
    maxRequests: 30,   // 30 requests
    windowSeconds: 60, // per minute
    ...config,
  };

  const key = `${tenantId}:${endpoint}`;
  const result = await checkRateLimit(key, defaults);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Try again in ${result.resetAt - Math.floor(Date.now() / 1000)} seconds.`,
          details: {
            limit: defaults.maxRequests,
            window: `${defaults.windowSeconds}s`,
            resetAt: new Date(result.resetAt * 1000).toISOString(),
          },
        },
      } satisfies ApiResponse,
      {
        status: 429,
        headers: {
          'Retry-After': String(result.resetAt - Math.floor(Date.now() / 1000)),
          'X-RateLimit-Limit': String(defaults.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
  }

  return null; // Allowed
}
