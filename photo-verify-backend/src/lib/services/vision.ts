// ============================================
// Multi-Provider Vision Service
// ============================================
// Abstraction layer over OpenAI Vision & Google Gemini
// Automatically routes to the correct provider based on config
// Tracks token usage for billing per tenant

import OpenAI from 'openai';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { PhotoVerificationConfig, VerificationCriterion, AIProvider } from '@/lib/types';

// ── Singleton clients ──

let _openaiClient: OpenAI | null = null;
let _geminiClient: GoogleGenerativeAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!_geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    _geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _geminiClient;
}

// ── Token usage tracking ──

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// ── Response structure we expect from any model ──

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

// ── Combined result with token usage ──

export interface VisionAnalysisWithUsage {
  analysis: VisionAnalysisResult;
  tokenUsage: TokenUsage;
}

// ── Pricing table (USD per 1M tokens) ──

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o-mini':        { inputPer1M: 0.15,  outputPer1M: 0.60 },
  'gpt-4o':             { inputPer1M: 2.50,  outputPer1M: 10.00 },
  // Gemini
  'gemini-2.0-flash':      { inputPer1M: 0.10,  outputPer1M: 0.40 },
  'gemini-2.0-flash-lite': { inputPer1M: 0.025, outputPer1M: 0.10 },
  'gemini-1.5-pro':        { inputPer1M: 1.25,  outputPer1M: 5.00 },
};

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1M;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal precision
}

// ── Shared prompt builders ──

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

// ── Default models per provider ──

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
};

// ── OpenAI Vision Provider ──

async function analyzeWithOpenAI(
  imageInput: { url?: string; base64?: string },
  config: PhotoVerificationConfig,
  model: string,
): Promise<VisionAnalysisWithUsage> {
  const client = getOpenAIClient();

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
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI vision model');
  }

  const tokenUsage: TokenUsage = {
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };

  return {
    analysis: parseVisionResponse(content),
    tokenUsage,
  };
}

// ── Gemini Vision Provider ──

async function analyzeWithGemini(
  imageInput: { url?: string; base64?: string },
  config: PhotoVerificationConfig,
  model: string,
): Promise<VisionAnalysisWithUsage> {
  const client = getGeminiClient();
  const genModel: GenerativeModel = client.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2000,
      responseMimeType: 'application/json',
    },
  });

  // Build the full prompt (Gemini combines system + user into one)
  const fullPrompt = `${buildSystemPrompt(config)}\n\n${buildUserPrompt(config)}`;

  // Prepare image part
  let imagePart: { inlineData: { mimeType: string; data: string } };

  if (imageInput.base64) {
    imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageInput.base64,
      },
    };
  } else if (imageInput.url) {
    // For URL images, fetch the image and convert to base64
    const imageResponse = await fetch(imageInput.url);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    imagePart = {
      inlineData: {
        mimeType: contentType,
        data: base64,
      },
    };
  } else {
    throw new Error('No image provided');
  }

  const result = await genModel.generateContent([fullPrompt, imagePart]);
  const response = result.response;
  const content = response.text();

  if (!content) {
    throw new Error('Empty response from Gemini vision model');
  }

  // Extract token usage from Gemini's usageMetadata
  const usageMetadata = response.usageMetadata;
  const tokenUsage: TokenUsage = {
    inputTokens: usageMetadata?.promptTokenCount ?? 0,
    outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
  };

  return {
    analysis: parseVisionResponse(content),
    tokenUsage,
  };
}

// ── Shared response parser ──

function parseVisionResponse(content: string): VisionAnalysisResult {
  try {
    // Clean potential markdown code fences
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned) as VisionAnalysisResult;

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

// ── Main analysis function (routes to correct provider) ──

export async function analyzeImage(
  imageInput: { url?: string; base64?: string },
  config: PhotoVerificationConfig
): Promise<VisionAnalysisWithUsage> {
  const provider: AIProvider = config.provider || 'openai';
  const model = config.model || DEFAULT_MODELS[provider];

  switch (provider) {
    case 'gemini':
      return analyzeWithGemini(imageInput, config, model);
    case 'openai':
    default:
      return analyzeWithOpenAI(imageInput, config, model);
  }
}

// ── Get available models (for API docs / UI) ──

export function getAvailableModels(): Array<{
  id: string;
  name: string;
  provider: AIProvider;
  pricing: ModelPricing;
}> {
  return [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', pricing: MODEL_PRICING['gpt-4o-mini'] },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', pricing: MODEL_PRICING['gpt-4o'] },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', pricing: MODEL_PRICING['gemini-2.0-flash'] },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'gemini', pricing: MODEL_PRICING['gemini-2.0-flash-lite'] },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', pricing: MODEL_PRICING['gemini-1.5-pro'] },
  ];
}
