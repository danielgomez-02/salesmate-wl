// ============================================
// Photo Verification API Service
// ============================================
// Calls the PHOTO_VERIFY backend in external/hybrid mode
// Tasks come from Retool, verification config comes with them

import type {
  PhotoVerificationConfig,
  VerificationResult,
  CriterionResult,
} from '../types';

const PHOTO_VERIFY_API = import.meta.env.VITE_PHOTO_VERIFY_API_URL || 'https://salesmate-wl.vercel.app';
const PHOTO_VERIFY_TOKEN = import.meta.env.VITE_PHOTO_VERIFY_TOKEN || '';

export interface VerificationHistoryItem {
  id: string;
  externalTaskId: string | null;
  imageUrl: string;
  passed: boolean;
  overallConfidence: number;
  criteriaResults: CriterionResult[];
  modelUsed: string;
  processingTimeMs: number;
  createdAt: string;
}

// --- Verify a photo against criteria (external/hybrid mode) ---
export async function verifyPhoto(
  externalTaskId: string,
  imageBase64: string,
  config: PhotoVerificationConfig,
): Promise<VerificationResult> {
  const response = await fetch(`${PHOTO_VERIFY_API}/api/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PHOTO_VERIFY_TOKEN}`,
    },
    body: JSON.stringify({
      externalTaskId: String(externalTaskId),
      imageBase64: cleanBase64(imageBase64),
      config,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(errData.error?.message || `Verification failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'Verification failed');
  }

  return data.data as VerificationResult;
}

// --- Get verification history for an external task ---
export async function getVerificationHistory(
  externalTaskId: string,
): Promise<VerificationHistoryItem[]> {
  const response = await fetch(
    `${PHOTO_VERIFY_API}/api/verifications?externalTaskId=${encodeURIComponent(String(externalTaskId))}`,
    {
      headers: {
        'Authorization': `Bearer ${PHOTO_VERIFY_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.verifications || [];
}

// --- Helper: strip data URL prefix from base64 ---
function cleanBase64(base64: string): string {
  // Remove "data:image/jpeg;base64," prefix if present
  const idx = base64.indexOf(',');
  if (idx !== -1) {
    return base64.substring(idx + 1);
  }
  return base64;
}
