// ============================================
// Auth Middleware - Extract and validate JWT
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from './jwt';
import type { AuthContext, ApiResponse } from '@/lib/types';

// --- Header name for passing auth context to route handlers ---
export const AUTH_HEADER = 'x-auth-context';

// --- Authenticate request and return auth context ---
export async function authenticate(request: NextRequest): Promise<AuthContext | NextResponse> {
  const token = extractToken(request.headers.get('authorization'));

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Use: Bearer <token>',
        },
      } satisfies ApiResponse,
      { status: 401 }
    );
  }

  try {
    const auth = await verifyToken(token);
    return auth;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error instanceof Error ? error.message : 'Invalid token',
        },
      } satisfies ApiResponse,
      { status: 401 }
    );
  }
}

// --- Helper: check if result is auth context or error response ---
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

// --- Helper: require specific role ---
export function requireRole(auth: AuthContext, ...roles: AuthContext['role'][]): NextResponse | null {
  if (!roles.includes(auth.role)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of these roles: ${roles.join(', ')}`,
        },
      } satisfies ApiResponse,
      { status: 403 }
    );
  }
  return null;
}
