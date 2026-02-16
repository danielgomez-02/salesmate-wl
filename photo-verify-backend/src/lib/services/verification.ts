// ============================================
// Verification Orchestrator
// ============================================
// Coordinates the full verification flow:
// 1. Validate input
// 2. Call Vision API
// 3. Evaluate criteria
// 4. Store results
// 5. Update task status

import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { analyzeImage, type VisionAnalysisResult } from './vision';
import type {
  AuthContext,
  PhotoVerificationConfig,
  CriterionResult,
  VerificationResult,
  VerificationCriterion,
} from '@/lib/types';

// --- Evaluate criteria results against config ---
function evaluateCriteria(
  analysisResults: VisionAnalysisResult,
  config: PhotoVerificationConfig
): CriterionResult[] {
  return config.criteria.map((criterion: VerificationCriterion) => {
    const result = analysisResults.criteria_results.find(
      (r) => r.criterion_id === criterion.id
    );

    if (!result) {
      return {
        criterionId: criterion.id,
        label: criterion.label,
        passed: false,
        value: 'NOT_EVALUATED',
        confidence: 0,
        reasoning: 'Criterion was not evaluated by the model',
      };
    }

    // Determine if criterion passes based on type
    let passed = result.passed;

    if (criterion.type === 'count' && (criterion.min !== undefined || criterion.max !== undefined)) {
      const count = typeof result.value === 'number' ? result.value : parseInt(String(result.value), 10);
      if (criterion.min !== undefined && count < criterion.min) passed = false;
      if (criterion.max !== undefined && count > criterion.max) passed = false;
    }

    if (criterion.type === 'boolean' && criterion.expectedValue !== undefined) {
      passed = result.value === criterion.expectedValue;
    }

    // Apply confidence threshold
    if (result.confidence < config.confidenceThreshold) {
      passed = false;
    }

    return {
      criterionId: criterion.id,
      label: criterion.label,
      passed,
      value: result.value,
      confidence: result.confidence,
      reasoning: result.reasoning,
    };
  });
}

// --- Main verification function ---
export async function verifyPhoto(
  taskId: string,
  imageInput: { url?: string; base64?: string },
  auth: AuthContext,
  configOverride?: PhotoVerificationConfig
): Promise<VerificationResult> {
  const db = getDb();
  const startTime = Date.now();

  // 1. Fetch the task and validate ownership
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.id, taskId),
        eq(schema.tasks.tenantId, auth.tenantId)
      )
    )
    .limit(1);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  if (task.type !== 'photo_verify') {
    throw new Error(`Task ${taskId} is not a photo_verify task`);
  }

  // 2. Get verification config (override or from task)
  const config = configOverride || (task.photoVerificationConfig as PhotoVerificationConfig);

  if (!config || !config.criteria || config.criteria.length === 0) {
    throw new Error('Task has no verification configuration');
  }

  // 3. Call Vision API with retry logic
  let analysisResult: VisionAnalysisResult | null = null;
  let retryCount = 0;
  let lastError: Error | null = null;

  const maxRetries = config.maxRetries || 2;

  while (retryCount <= maxRetries && !analysisResult) {
    try {
      analysisResult = await analyzeImage(imageInput, config);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryCount++;
      if (retryCount <= maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }
    }
  }

  // 4. If all retries failed
  if (!analysisResult) {
    const processingTimeMs = Date.now() - startTime;

    // If fallback to manual is enabled, mark for manual review
    if (config.fallbackToManual) {
      await db.update(schema.tasks)
        .set({ status: 'manual_review', updatedAt: new Date() })
        .where(eq(schema.tasks.id, taskId));

      return {
        passed: false,
        overallConfidence: 0,
        criteriaResults: [],
        modelUsed: config.model || 'gpt-4o-mini',
        processingTimeMs,
        processedAt: new Date().toISOString(),
        rawModelResponse: lastError?.message || 'All retries failed',
      };
    }

    throw new Error(`Verification failed after ${maxRetries} retries: ${lastError?.message}`);
  }

  // 5. Evaluate criteria
  const criteriaResults = evaluateCriteria(analysisResult, config);
  const allRequiredPassed = config.criteria
    .filter((c: VerificationCriterion) => c.required)
    .every((c: VerificationCriterion) => {
      const result = criteriaResults.find((r) => r.criterionId === c.id);
      return result?.passed === true;
    });

  const overallConfidence = analysisResult.overall_confidence;
  const passed = allRequiredPassed && overallConfidence >= config.confidenceThreshold;

  const processingTimeMs = Date.now() - startTime;

  const verificationResult: VerificationResult = {
    passed,
    overallConfidence,
    criteriaResults,
    modelUsed: config.model || 'gpt-4o-mini',
    processingTimeMs,
    processedAt: new Date().toISOString(),
    rawModelResponse: JSON.stringify(analysisResult),
  };

  // 6. Store verification result
  const imageUrl = imageInput.url || `base64:${(imageInput.base64 || '').slice(0, 50)}...`;

  await db.insert(schema.verifications).values({
    taskId,
    tenantId: auth.tenantId,
    imageUrl,
    passed,
    overallConfidence,
    criteriaResults,
    modelUsed: config.model || 'gpt-4o-mini',
    processingTimeMs,
    rawModelResponse: JSON.stringify(analysisResult),
    retryCount,
  });

  // 7. Update task status
  const newStatus = passed ? 'completed' : (config.fallbackToManual ? 'manual_review' : 'failed');
  await db.update(schema.tasks)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId));

  // 8. Audit log
  await db.insert(schema.auditLog).values({
    tenantId: auth.tenantId,
    action: 'photo_verified',
    entityType: 'task',
    entityId: taskId,
    userId: auth.userId,
    details: {
      passed,
      confidence: overallConfidence,
      modelUsed: config.model || 'gpt-4o-mini',
      processingTimeMs,
      retryCount,
    },
  });

  return verificationResult;
}
