// ============================================
// POST /api/verify - Photo Verification Endpoint
// ============================================
// Core endpoint: receives a photo + taskId, runs
// verification against the task's criteria config

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, isAuthError } from '@/lib/auth/middleware';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { verifyPhoto } from '@/lib/services/verification';
import { uploadBase64Image } from '@/lib/services/storage';
import { VerifyRequestSchema, type ApiResponse, type VerificationResult } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60s for Hobby plan

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  // 1. Authenticate
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  // 2. Rate limit
  const rateLimited = await rateLimitMiddleware(auth.tenantId, 'verify', {
    maxRequests: 20,     // 20 verifications
    windowSeconds: 60,   // per minute
  });
  if (rateLimited) return rateLimited;

  try {
    // 3. Parse and validate body
    const body = await request.json();
    const parsed = VerifyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
          },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const { taskId, imageUrl, imageBase64, config: configOverride } = parsed.data;

    // 4. If base64, upload to Blob first and get URL
    let finalImageInput: { url?: string; base64?: string };

    if (imageBase64) {
      try {
        const uploaded = await uploadBase64Image(auth.tenantId, taskId, imageBase64);
        finalImageInput = { url: uploaded.url };
      } catch {
        // If Blob upload fails, use base64 directly (works but uses more tokens)
        finalImageInput = { base64: imageBase64 };
      }
    } else {
      finalImageInput = { url: imageUrl };
    }

    // 5. Run verification
    const result: VerificationResult = await verifyPhoto(
      taskId,
      finalImageInput,
      auth,
      configOverride
    );

    // 6. Return result
    return NextResponse.json(
      {
        success: true,
        data: result,
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse<VerificationResult>,
      { status: 200 }
    );
  } catch (error) {
    console.error(`[verify] Error for tenant ${auth.tenantId}:`, error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message,
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status }
    );
  }
}
