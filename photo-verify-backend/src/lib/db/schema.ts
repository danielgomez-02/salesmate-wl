// ============================================
// Database Schema - Drizzle ORM + Neon Postgres
// ============================================

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  real,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// --- Tenants (Bottlers) ---
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  config: jsonb('config').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('tenants_slug_idx').on(table.slug),
]);

// --- Tasks (PHOTO_VERIFY missions) ---
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('photo_verify'),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'failed', 'manual_review'],
  }).notNull().default('pending'),
  photoVerificationConfig: jsonb('photo_verification_config').notNull(),
  assignedTo: text('assigned_to'),
  customerId: text('customer_id'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('tasks_tenant_idx').on(table.tenantId),
  index('tasks_status_idx').on(table.status),
  index('tasks_tenant_status_idx').on(table.tenantId, table.status),
]);

// --- Verifications (results of photo analysis) ---
export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),  // Optional: for internal tasks
  externalTaskId: text('external_task_id'),  // For tasks from external APIs (Retool, etc.)
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  passed: boolean('passed').notNull(),
  overallConfidence: real('overall_confidence').notNull(),
  criteriaResults: jsonb('criteria_results').notNull().default([]),
  configUsed: jsonb('config_used'),  // Store the config snapshot used for this verification
  modelUsed: text('model_used').notNull(),
  processingTimeMs: integer('processing_time_ms').notNull(),
  rawModelResponse: text('raw_model_response'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('verifications_task_idx').on(table.taskId),
  index('verifications_external_task_idx').on(table.externalTaskId),
  index('verifications_tenant_idx').on(table.tenantId),
  index('verifications_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('verifications_tenant_external_idx').on(table.tenantId, table.externalTaskId),
]);

// --- Audit Log (for tracking all operations) ---
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  userId: text('user_id'),
  details: jsonb('details').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('audit_tenant_idx').on(table.tenantId),
  index('audit_created_idx').on(table.createdAt),
]);

// --- Type exports for Drizzle select/insert ---
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
