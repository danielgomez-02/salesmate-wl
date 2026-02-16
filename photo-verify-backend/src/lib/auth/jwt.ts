// ============================================
// JWT Utilities - using jose (Edge compatible)
// ============================================

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { AuthContext } from '@/lib/types';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
};

const getIssuer = () => process.env.JWT_ISSUER || 'photo-verify-backend';

// --- JWT Payload extended with tenant info ---
export interface TokenPayload extends JWTPayload {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  role: 'admin' | 'operator' | 'viewer';
}

// --- Sign a new JWT ---
export async function signToken(payload: Omit<TokenPayload, 'iss' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(getIssuer())
    .setExpirationTime('24h')
    .sign(getSecret());
}

// --- Verify and decode a JWT ---
export async function verifyToken(token: string): Promise<AuthContext> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: getIssuer(),
    });

    const tp = payload as unknown as TokenPayload;

    if (!tp.tenantId || !tp.tenantSlug) {
      throw new Error('Invalid token: missing tenant information');
    }

    return {
      tenantId: tp.tenantId,
      tenantSlug: tp.tenantSlug,
      userId: tp.userId,
      role: tp.role || 'viewer',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
    throw new Error('Token verification failed');
  }
}

// --- Extract token from Authorization header ---
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}
