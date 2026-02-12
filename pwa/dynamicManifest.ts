/**
 * Dynamic PWA manifest generator.
 * Creates a per-brand manifest so each brand installs as its own PWA.
 */

import { BrandConfig } from '../types';

/** Generate a 192px and 512px icon from brand initial + primary color using canvas */
function generateIconDataUrl(initial: string, bgColor: string, size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // ERR-003 FIX: Graceful fallback if canvas context is unavailable
  if (!ctx) {
    console.warn('Canvas 2D context unavailable — returning empty icon');
    return '';
  }

  // Background
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Letter
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.5}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, size / 2, size / 2 + size * 0.02);

  return canvas.toDataURL('image/png');
}

// PERF-002 FIX: Track the current blob URL so we can revoke it before creating a new one
let currentManifestBlobUrl: string | null = null;

/** Generate and inject a dynamic manifest for the current brand */
export function applyDynamicManifest(brand: BrandConfig, brandId: string) {
  // Remove any existing manifest link
  const existing = document.querySelector('link[rel="manifest"]');
  if (existing) existing.remove();

  // Revoke previous blob URL to prevent memory leak
  if (currentManifestBlobUrl) {
    URL.revokeObjectURL(currentManifestBlobUrl);
    currentManifestBlobUrl = null;
  }

  const initial = brand.labels.appName?.[0]?.toUpperCase() || 'S';
  const icon192 = brand.images.logo || generateIconDataUrl(initial, brand.colors.primary, 192);
  const icon512 = brand.images.logo || generateIconDataUrl(initial, brand.colors.primary, 512);

  const manifest = {
    name: `${brand.labels.appName} — ${brand.labels.companyName}`,
    short_name: brand.labels.appName,
    description: brand.labels.appTagline,
    start_url: `/${brandId}`,
    scope: '/',
    display: 'standalone' as const,
    background_color: '#ffffff',
    theme_color: brand.colors.primary,
    orientation: 'portrait' as const,
    icons: [
      { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['business', 'productivity'],
    lang: 'es',
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  currentManifestBlobUrl = URL.createObjectURL(blob);

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = currentManifestBlobUrl;
  document.head.appendChild(link);

  // Also update theme-color meta tag
  let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = brand.colors.primary;

  // Update apple meta tags
  let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
  if (!appleMeta) {
    appleMeta = document.createElement('meta');
    appleMeta.name = 'apple-mobile-web-app-status-bar-style';
    document.head.appendChild(appleMeta);
  }
  appleMeta.content = 'default';
}

/** Manage the PWA install prompt — TYPE-001 FIX: proper BeforeInstallPromptEvent type */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

export function canInstall(): boolean {
  return !!deferredPrompt;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}
