// ============================================
// Database Seed Script
// ============================================
// Usage: npm run seed
// Populates the database with demo data for testing

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/db/schema';

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error('ERROR: POSTGRES_URL not set. Copy .env.example to .env.local and configure it.');
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log('Seeding database...\n');

  // 1. Create demo tenants (Bottlers)
  const [bottler1] = await db.insert(schema.tenants).values({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Bottler Demo MX',
    slug: 'demo-bottler',
    config: {
      maxRequestsPerMinute: 30,
      maxRequestsPerDay: 1000,
      defaultModel: 'gpt-4o-mini',
      storageLimitMb: 100,
      allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    },
  }).onConflictDoNothing().returning();

  const [bottler2] = await db.insert(schema.tenants).values({
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Bottler Demo CO',
    slug: 'demo-bottler-co',
    config: {
      maxRequestsPerMinute: 20,
      maxRequestsPerDay: 500,
      defaultModel: 'gpt-4o-mini',
      storageLimitMb: 50,
      allowedOrigins: [],
    },
  }).onConflictDoNothing().returning();

  console.log('Created tenants:');
  if (bottler1) console.log(`  - ${bottler1.name} (${bottler1.slug}) [${bottler1.id}]`);
  if (bottler2) console.log(`  - ${bottler2.name} (${bottler2.slug}) [${bottler2.id}]`);

  // 2. Create demo tasks
  const tenantId = '00000000-0000-0000-0000-000000000001';

  const tasks = await db.insert(schema.tasks).values([
    {
      tenantId,
      title: 'Verificar planograma de nevera',
      description: 'Verificar que la nevera del cliente tiene los productos correctos',
      type: 'photo_verify',
      photoVerificationConfig: {
        prompt: 'Analiza esta foto de una nevera/refrigerador en un punto de venta. Verifica los siguientes criterios sobre los productos exhibidos.',
        criteria: [
          {
            id: 'has_brand_products',
            label: 'Productos de la marca visibles',
            type: 'boolean',
            required: true,
            expectedValue: true,
          },
          {
            id: 'product_count',
            label: 'Cantidad de filas de productos',
            type: 'count',
            required: true,
            min: 3,
            max: 10,
          },
          {
            id: 'is_clean',
            label: 'Nevera limpia y ordenada',
            type: 'boolean',
            required: false,
            expectedValue: true,
          },
        ],
        model: 'gpt-4o-mini',
        maxRetries: 2,
        fallbackToManual: true,
        confidenceThreshold: 0.75,
      },
      assignedTo: 'vendedor-001',
      customerId: 'tienda-001',
    },
    {
      tenantId,
      title: 'Verificar material POP instalado',
      description: 'Confirmar que el material publicitario fue instalado correctamente',
      type: 'photo_verify',
      photoVerificationConfig: {
        prompt: 'Analiza esta foto de un punto de venta. Verifica que el material publicitario (POP) ha sido instalado correctamente.',
        criteria: [
          {
            id: 'poster_visible',
            label: 'Poster/afiche visible',
            type: 'boolean',
            required: true,
            expectedValue: true,
          },
          {
            id: 'poster_condition',
            label: 'Material en buen estado',
            type: 'boolean',
            required: true,
            expectedValue: true,
          },
          {
            id: 'brand_text',
            label: 'Texto de marca identificado',
            type: 'text',
            required: false,
          },
        ],
        model: 'gpt-4o-mini',
        maxRetries: 1,
        fallbackToManual: true,
        confidenceThreshold: 0.8,
      },
      assignedTo: 'vendedor-002',
      customerId: 'tienda-002',
    },
    {
      tenantId,
      title: 'Verificar exhibición de producto',
      description: 'Verificar que la exhibición especial de producto está montada',
      type: 'photo_verify',
      photoVerificationConfig: {
        prompt: 'Analiza esta foto de una exhibición de productos en tienda. Verifica que cumple con los estándares de exhibición.',
        criteria: [
          {
            id: 'display_exists',
            label: 'Exhibidor presente',
            type: 'boolean',
            required: true,
            expectedValue: true,
          },
          {
            id: 'sku_count',
            label: 'Cantidad de SKUs visibles',
            type: 'count',
            required: true,
            min: 5,
          },
          {
            id: 'price_tags',
            label: 'Etiquetas de precio visibles',
            type: 'boolean',
            required: true,
            expectedValue: true,
          },
          {
            id: 'location_description',
            label: 'Ubicación de la exhibición',
            type: 'text',
            required: false,
          },
        ],
        model: 'gpt-4o-mini',
        maxRetries: 2,
        fallbackToManual: true,
        confidenceThreshold: 0.7,
      },
      assignedTo: 'vendedor-001',
      customerId: 'tienda-003',
    },
  ]).returning();

  console.log(`\nCreated ${tasks.length} demo tasks:`);
  tasks.forEach((t) => console.log(`  - ${t.title} [${t.id}]`));

  console.log('\n=== Seed complete! ===');
  console.log('\nGenerate a token to test:');
  console.log('  npm run generate-token\n');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
