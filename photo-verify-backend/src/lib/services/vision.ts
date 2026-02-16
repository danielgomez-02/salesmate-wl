// ============================================
// OpenAI Vision Service
// ============================================
// Abstraction layer over OpenAI's Vision API
// Designed to be model-agnostic for future swaps

import OpenAI from 'openai';
import type { PhotoVerificationConfig, VerificationCriterion } from '@/lib/types';

// --- Initialize OpenAI client (singleton) ---
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// --- Response structure we expect from the model ---
export interface VisionAnalysisResult {
  criteria_results: Array<{
    criterion_id: string;
    passed: boolean;
    value: string | number | boolean;
    confidence: number;
    reasoning: string;
  }>;
  overall_assessment: string;
  overall_confidence: number;
}

// --- Build the system prompt for verification ---
function buildSystemPrompt(config: PhotoVerificationConfig): string {
  return `You are an expert image verification system for retail/field operations.
Your job is to analyze photos and verify specific criteria.

IMPORTANT RULES:
- Be precise and objective in your analysis
- If you cannot determine something with confidence, say so
- Return your confidence as a decimal between 0.0 and 1.0
- For "boolean" criteria: determine if the condition is true or false
- For "count" criteria: count the specific items asked about
- For "text" criteria: extract or identify the requested text/information

You MUST respond with valid JSON only. No markdown, no code blocks, just raw JSON.

Response format:
{
  "criteria_results": [
    {
      "criterion_id": "<id>",
      "passed": <true/false>,
      "value": <observed value>,
      "confidence": <0.0-1.0>,
      "reasoning": "<brief explanation>"
    }
  ],
  "overall_assessment": "<brief summary>",
  "overall_confidence": <0.0-1.0>
}`;
}

// --- Build the user prompt with criteria details ---
function buildUserPrompt(config: PhotoVerificationConfig): string {
  const criteriaList = config.criteria
    .map((c: VerificationCriterion, i: number) => {
      let details = `${i + 1}. [${c.id}] "${c.label}" (type: ${c.type})`;
      if (c.expectedValue !== undefined) details += ` | expected: ${c.expectedValue}`;
      if (c.min !== undefined) details += ` | min: ${c.min}`;
      if (c.max !== undefined) details += ` | max: ${c.max}`;
      if (c.required) details += ' | REQUIRED';
      return details;
    })
    .join('\n');

  return `${config.prompt}

Verify the following criteria in this image:

${criteriaList}

Analyze the image carefully and respond with JSON containing results for each criterion.`;
}

// --- Main analysis function ---
export async function analyzeImage(
  imageInput: { url?: string; base64?: string },
  config: PhotoVerificationConfig
): Promise<VisionAnalysisResult> {
  const client = getClient();
  const model = config.model || process.env.DEFAULT_VISION_MODEL || 'gpt-4o-mini';

  // Build image content part
  const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart = imageInput.url
    ? { type: 'image_url', image_url: { url: imageInput.url, detail: 'high' } }
    : { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageInput.base64}`, detail: 'high' } };

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(config),
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildUserPrompt(config) },
          imageContent,
        ],
      },
    ],
    max_tokens: 2000,
    temperature: 0.1, // Low temperature for consistent analysis
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from vision model');
  }

  try {
    const parsed = JSON.parse(content) as VisionAnalysisResult;

    // Validate the response structure
    if (!parsed.criteria_results || !Array.isArray(parsed.criteria_results)) {
      throw new Error('Invalid response structure: missing criteria_results array');
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse model response as JSON: ${content.slice(0, 200)}`);
    }
    throw error;
  }
}

// --- Get available models ---
export function getAvailableModels(): Array<{ id: string; name: string; costPer1kImages: string }> {
  return [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', costPer1kImages: '~$0.15' },
    { id: 'gpt-4o', name: 'GPT-4o', costPer1kImages: '~$2.50' },
  ];
}
