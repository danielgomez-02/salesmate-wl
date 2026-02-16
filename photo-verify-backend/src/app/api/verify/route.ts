// ============================================
// POST /api/verify - Photo Verification Endpoint
// ============================================
// Supports two modes:
// 1. Internal: taskId (references our DB) - config from task
// 2. External/Hybrid: externalTaskId + config inline (task in Retool/external API)

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, isAuthError } from '@/lib/auth/middleware';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { verifyPhoto, verifyPhotoExternal } from '@/lib/services/verification';
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

    const { taskId, externalTaskId, imageUrl, imageBase64, config } = parsed.data;

    // 4. Determine the reference ID for storage path
    const referenceId = taskId || externalTaskId || requestId;

    // 5. If base64, upload to Blob first and get URL
    let finalImageInput: { url?: string; base64?: string };

    if (imageBase64) {
      try {
        const uploaded = await uploadBase64Image(auth.tenantId, referenceId, imageBase64);
        finalImageInput = { url: uploaded.url };
      } catch {
        // If Blob upload fails, use base64 directly (works but uses more tokens)
        finalImageInput = { base64: imageBase64 };
      }
    } else {
      finalImageInput = { url: imageUrl };
    }

    // 6. Run verification based on mode
    let result: VerificationResult;

    if (taskId) {
      // --- INTERNAL MODE: task lives in our DB ---
      result = await verifyPhoto(taskId, finalImageInput, auth, config);
    } else if (externalTaskId && config) {
      // --- EXTERNAL/HYBRID MODE: task lives in Retool/external API ---
      result = await verifyPhotoExternal(externalTaskId, finalImageInput, config, auth);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either taskId or (externalTaskId + config) must be provided',
          },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    // 7. Return result
    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          mode: taskId ? 'internal' : 'external',
          taskReference: taskId || externalTaskId,
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
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
