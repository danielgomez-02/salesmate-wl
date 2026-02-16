// ============================================
// POST /api/upload - Photo Upload Endpoint
// ============================================
// Upload a photo to Vercel Blob storage
// Returns a URL that can be used with /api/verify

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, isAuthError } from '@/lib/auth/middleware';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { uploadImage } from '@/lib/services/storage';
import type { ApiResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  // 1. Authenticate
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  // 2. Rate limit
  const rateLimited = await rateLimitMiddleware(auth.tenantId, 'upload', {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (rateLimited) return rateLimited;

  try {
    // 3. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const taskId = formData.get('taskId') as string | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No file provided. Use form field "file".' },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'taskId is required.' },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`,
          },
          meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    // 4. Upload to Blob storage
    const result = await uploadImage(auth.tenantId, taskId, file, file.name);

    return NextResponse.json(
      {
        success: true,
        data: {
          url: result.url,
          size: result.size,
          filename: file.name,
          contentType: file.type,
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error(`[upload] Error for tenant ${auth.tenantId}:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Upload failed',
        },
        meta: { tenantId: auth.tenantId, requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
