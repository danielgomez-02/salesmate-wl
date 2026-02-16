// ============================================
// Verification Orchestrator
// ============================================
// Coordinates the full verification flow:
// 1. Validate input
// 2. Call Vision API
// 3. Evaluate criteria
// 4. Store results + token usage + cost
// 5. Update task status

import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { analyzeImage, estimateCostUsd, type VisionAnalysisResult, type VisionAnalysisWithUsage, type TokenUsage } from './vision';
import type {
  AuthContext,
  PhotoVerificationConfig,
  CriterionResult,
  VerificationResult,
  VerificationCriterion,
  AIProvider,
} from '@/lib/types';

// --- Extended result with billing data ---
interface VerificationResultInternal extends VerificationResult {
  retryCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

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

// --- Main verification function (Internal mode: task in our DB) ---
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

  // 3. Run core verification logic
  const result = await runVerification(imageInput, config, auth, startTime);

  // 4. Store result linked to internal task
  const imageUrl = imageInput.url || `base64:${(imageInput.base64 || '').slice(0, 50)}...`;

  await db.insert(schema.verifications).values({
    taskId,
    tenantId: auth.tenantId,
    imageUrl,
    passed: result.passed,
    overallConfidence: result.overallConfidence,
    criteriaResults: result.criteriaResults,
    configUsed: config,
    modelUsed: result.modelUsed,
    processingTimeMs: result.processingTimeMs,
    inputTokens: result.inputTokens ?? null,
    outputTokens: result.outputTokens ?? null,
    estimatedCostUsd: result.estimatedCostUsd ?? null,
    rawModelResponse: result.rawModelResponse,
    retryCount: result.retryCount || 0,
  });

  // 5. Update internal task status
  const newStatus = result.passed ? 'completed' : (config.fallbackToManual ? 'manual_review' : 'failed');
  await db.update(schema.tasks)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId));

  // 6. Audit log
  await db.insert(schema.auditLog).values({
    tenantId: auth.tenantId,
    action: 'photo_verified',
    entityType: 'task',
    entityId: taskId,
    userId: auth.userId,
    details: {
      mode: 'internal',
      passed: result.passed,
      confidence: result.overallConfidence,
      modelUsed: result.modelUsed,
      processingTimeMs: result.processingTimeMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      retryCount: result.retryCount,
    },
  });

  return result;
}

// --- External/Hybrid verification (task lives in Retool/external API) ---
export async function verifyPhotoExternal(
  externalTaskId: string,
  imageInput: { url?: string; base64?: string },
  config: PhotoVerificationConfig,
  auth: AuthContext,
): Promise<VerificationResult> {
  const db = getDb();
  const startTime = Date.now();

  // 1. Run core verification logic
  const result = await runVerification(imageInput, config, auth, startTime);

  // 2. Store result linked to external task ID
  const imageUrl = imageInput.url || `base64:${(imageInput.base64 || '').slice(0, 50)}...`;

  await db.insert(schema.verifications).values({
    externalTaskId,
    tenantId: auth.tenantId,
    imageUrl,
    passed: result.passed,
    overallConfidence: result.overallConfidence,
    criteriaResults: result.criteriaResults,
    configUsed: config,
    modelUsed: result.modelUsed,
    processingTimeMs: result.processingTimeMs,
    inputTokens: result.inputTokens ?? null,
    outputTokens: result.outputTokens ?? null,
    estimatedCostUsd: result.estimatedCostUsd ?? null,
    rawModelResponse: result.rawModelResponse,
    retryCount: result.retryCount || 0,
  });

  // 3. Audit log
  await db.insert(schema.auditLog).values({
    tenantId: auth.tenantId,
    action: 'photo_verified',
    entityType: 'external_task',
    entityId: externalTaskId,
    userId: auth.userId,
    details: {
      mode: 'external',
      externalTaskId,
      passed: result.passed,
      confidence: result.overallConfidence,
      modelUsed: result.modelUsed,
      processingTimeMs: result.processingTimeMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      retryCount: result.retryCount,
    },
  });

  return result;
}

// --- Core verification logic (shared by both modes) ---
async function runVerification(
  imageInput: { url?: string; base64?: string },
  config: PhotoVerificationConfig,
  auth: AuthContext,
  startTime: number,
): Promise<VerificationResultInternal> {
  if (!config || !config.criteria || config.criteria.length === 0) {
    throw new Error('Verification configuration has no criteria');
  }

  // Resolve provider and model
  const provider: AIProvider = config.provider || 'openai';
  const defaultModels: Record<AIProvider, string> = { openai: 'gpt-4o-mini', gemini: 'gemini-2.0-flash' };
  const model = config.model || defaultModels[provider];
  const modelUsedLabel = `${provider}/${model}`;

  // 1. Call Vision API with retry logic
  let analysisWithUsage: VisionAnalysisWithUsage | null = null;
  let retryCount = 0;
  let lastError: Error | null = null;
  let totalTokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  const maxRetries = config.maxRetries || 2;

  while (retryCount <= maxRetries && !analysisWithUsage) {
    try {
      analysisWithUsage = await analyzeImage(imageInput, config);
      // Accumulate tokens from successful attempt
      totalTokenUsage.inputTokens += analysisWithUsage.tokenUsage.inputTokens;
      totalTokenUsage.outputTokens += analysisWithUsage.tokenUsage.outputTokens;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryCount++;
      if (retryCount <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }
    }
  }

  // 2. If all retries failed
  if (!analysisWithUsage) {
    const processingTimeMs = Date.now() - startTime;

    if (config.fallbackToManual) {
      return {
        passed: false,
        overallConfidence: 0,
        criteriaResults: [],
        modelUsed: modelUsedLabel,
        processingTimeMs,
        processedAt: new Date().toISOString(),
        rawModelResponse: lastError?.message || 'All retries failed',
        retryCount,
        inputTokens: totalTokenUsage.inputTokens,
        outputTokens: totalTokenUsage.outputTokens,
        estimatedCostUsd: estimateCostUsd(model, totalTokenUsage),
      };
    }

    throw new Error(`Verification failed after ${maxRetries} retries: ${lastError?.message}`);
  }

  // 3. Evaluate criteria
  const criteriaResults = evaluateCriteria(analysisWithUsage.analysis, config);
  const allRequiredPassed = config.criteria
    .filter((c: VerificationCriterion) => c.required)
    .every((c: VerificationCriterion) => {
      const result = criteriaResults.find((r) => r.criterionId === c.id);
      return result?.passed === true;
    });

  const overallConfidence = analysisWithUsage.analysis.overall_confidence;
  const passed = allRequiredPassed && overallConfidence >= config.confidenceThreshold;

  const processingTimeMs = Date.now() - startTime;
  const costUsd = estimateCostUsd(model, totalTokenUsage);

  return {
    passed,
    overallConfidence,
    criteriaResults,
    modelUsed: modelUsedLabel,
    processingTimeMs,
    processedAt: new Date().toISOString(),
    rawModelResponse: JSON.stringify(analysisWithUsage.analysis),
    retryCount,
    inputTokens: totalTokenUsage.inputTokens,
    outputTokens: totalTokenUsage.outputTokens,
    estimatedCostUsd: costUsd,
  };
}
