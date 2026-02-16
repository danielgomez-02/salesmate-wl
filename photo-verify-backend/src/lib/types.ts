// ============================================
// PHOTO_VERIFY Shared Types
// ============================================

import { z } from 'zod';

// --- Verification Criterion ---
export const VerificationCriterionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['boolean', 'count', 'text']),
  required: z.boolean().default(true),
  expectedValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export type VerificationCriterion = z.infer<typeof VerificationCriterionSchema>;

// --- Photo Verification Config (embedded in task) ---
export const PhotoVerificationConfigSchema = z.object({
  prompt: z.string().describe('Instructions for the vision model'),
  criteria: z.array(VerificationCriterionSchema).min(1),
  model: z.enum(['gpt-4o', 'gpt-4o-mini']).default('gpt-4o-mini'),
  maxRetries: z.number().default(2),
  fallbackToManual: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).default(0.8),
});

export type PhotoVerificationConfig = z.infer<typeof PhotoVerificationConfigSchema>;

// --- Verification Request ---
export const VerifyRequestSchema = z.object({
  taskId: z.string(),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  config: PhotoVerificationConfigSchema.optional(), // Override task config
}).refine(
  (data) => data.imageUrl || data.imageBase64,
  { message: 'Either imageUrl or imageBase64 must be provided' }
);

export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

// --- Criterion Result ---
export interface CriterionResult {
  criterionId: string;
  label: string;
  passed: boolean;
  value: string | number | boolean;
  confidence: number;
  reasoning: string;
}

// --- Verification Result ---
export interface VerificationResult {
  passed: boolean;
  overallConfidence: number;
  criteriaResults: CriterionResult[];
  modelUsed: string;
  processingTimeMs: number;
  processedAt: string;
  rawModelResponse?: string;
}

// --- Task Types ---
export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.literal('photo_verify'),
  photoVerificationConfig: PhotoVerificationConfigSchema,
  assignedTo: z.string().optional(),
  customerId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'manual_review']).optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// --- Tenant Types ---
export const CreateTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  config: z.object({
    maxRequestsPerMinute: z.number().default(30),
    maxRequestsPerDay: z.number().default(1000),
    defaultModel: z.enum(['gpt-4o', 'gpt-4o-mini']).default('gpt-4o-mini'),
    storageLimitMb: z.number().default(100),
    allowedOrigins: z.array(z.string()).default([]),
  }).default({}),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;

// --- API Response ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    tenantId: string;
    requestId: string;
    timestamp: string;
  };
}

// --- Auth Context ---
export interface AuthContext {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  role: 'admin' | 'operator' | 'viewer';
}
