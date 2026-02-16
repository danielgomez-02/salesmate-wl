// ============================================
// JWT Token Generator - For Testing
// ============================================
// Usage: npm run generate-token
// Or: npx tsx scripts/generate-token.ts [tenantSlug] [role]

import { SignJWT } from 'jose';

async function main() {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const issuer = process.env.JWT_ISSUER || 'photo-verify-backend';

  const tenantSlug = process.argv[2] || 'demo-bottler';
  const role = process.argv[3] || 'admin';

  // For POC: use a deterministic tenant ID based on slug
  const tenantId = process.argv[4] || '00000000-0000-0000-0000-000000000001';

  const secretKey = new TextEncoder().encode(secret);

  const token = await new SignJWT({
    tenantId,
    tenantSlug,
    role,
    userId: 'test-user',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime('30d') // Long-lived for testing
    .sign(secretKey);

  console.log('\n=== PHOTO_VERIFY - JWT Token Generator ===\n');
  console.log('Tenant Slug:', tenantSlug);
  console.log('Tenant ID:  ', tenantId);
  console.log('Role:       ', role);
  console.log('Expires:     30 days');
  console.log('\n--- Token ---\n');
  console.log(token);
  console.log('\n--- Usage ---\n');
  console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/health`);
  console.log('');
}

main().catch(console.error);
