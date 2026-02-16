// ============================================
// Storage Service - Vercel Blob
// ============================================

import { put, del, list } from '@vercel/blob';

const MAX_IMAGE_SIZE = (parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10)) * 1024 * 1024;

// --- Upload an image to Vercel Blob ---
export async function uploadImage(
  tenantId: string,
  taskId: string,
  file: File | Blob,
  filename?: string
): Promise<{ url: string; size: number }> {
  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image exceeds maximum size of ${process.env.MAX_IMAGE_SIZE_MB || 10}MB`);
  }

  // Build path with tenant isolation
  const timestamp = Date.now();
  const ext = filename?.split('.').pop() || 'jpg';
  const path = `${tenantId}/${taskId}/${timestamp}.${ext}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: true,
  });

  return {
    url: blob.url,
    size: file.size,
  };
}

// --- Upload base64 image ---
export async function uploadBase64Image(
  tenantId: string,
  taskId: string,
  base64Data: string
): Promise<{ url: string; size: number }> {
  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image exceeds maximum size of ${process.env.MAX_IMAGE_SIZE_MB || 10}MB`);
  }

  const timestamp = Date.now();
  const path = `${tenantId}/${taskId}/${timestamp}.jpg`;

  const blob = await put(path, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'image/jpeg',
  });

  return {
    url: blob.url,
    size: buffer.length,
  };
}

// --- Delete an image ---
export async function deleteImage(url: string): Promise<void> {
  await del(url);
}

// --- List images for a tenant ---
export async function listTenantImages(
  tenantId: string,
  limit: number = 100
): Promise<Array<{ url: string; size: number; uploadedAt: Date }>> {
  const result = await list({
    prefix: `${tenantId}/`,
    limit,
  });

  return result.blobs.map((blob) => ({
    url: blob.url,
    size: blob.size,
    uploadedAt: blob.uploadedAt,
  }));
}
