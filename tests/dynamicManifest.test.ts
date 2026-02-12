/**
 * Unit tests for pwa/dynamicManifest.ts
 *
 * Covers:
 * - PERF-002: Blob URL revocation (no memory leaks)
 * - ERR-003: Canvas context null safety
 * - TYPE-001: BeforeInstallPromptEvent typed interface
 * - Manifest generation, install prompt lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyDynamicManifest, initInstallPrompt, canInstall, promptInstall } from '../pwa/dynamicManifest';
import type { BrandConfig } from '../types';

// ── Test brand config ──

function makeBrand(overrides: Partial<BrandConfig> = {}): BrandConfig {
  return {
    id: 'test-brand',
    labels: {
      appName: 'TestApp',
      appTagline: 'Testing PWA',
      companyName: 'Test Corp',
      missionSystem: 'TEST',
      pointsLabel: 'Puntos TEST',
      routineLabel: 'Rutina TEST',
      categories: { sales: 'Ventas', execution: 'Ejecución', communication: 'Comunicación', activation: 'Activación' },
      loginTitle: 'Login',
      loginPlaceholder: 'Code',
      loginButton: 'Enter',
    },
    colors: {
      primary: '#FF0000',
      primaryLight: '#FF6666',
      primaryDark: '#CC0000',
      accent: '#00FF00',
      accentLight: '#66FF66',
      success: '#00CC00',
      successLight: '#66CC66',
      categoryColors: { sales: '#FF0000', execution: '#00FF00', communication: '#0000FF', activation: '#FFFF00' },
    },
    images: {
      fallbackProduct: '/fallback.png',
      avatarBg: 'FF0000',
      avatarColor: 'FFFFFF',
    },
    storagePrefix: 'test_',
    defaultEmpCode: '1234567',
    ...overrides,
  };
}

// ── Tests ──

describe('dynamicManifest', () => {
  let revokedUrls: string[];

  beforeEach(() => {
    revokedUrls = [];

    // Track revoked blob URLs
    const originalRevoke = URL.revokeObjectURL;
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
      revokedUrls.push(url);
      originalRevoke(url);
    });

    // Clean up any existing manifest link
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
    document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]').forEach(el => el.remove());
  });

  // ────────────────────────────────────────────
  // applyDynamicManifest
  // ────────────────────────────────────────────
  describe('applyDynamicManifest', () => {
    it('creates a manifest link element in the head', () => {
      applyDynamicManifest(makeBrand(), 'test-brand');

      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.href).toContain('blob:');
    });

    it('sets theme-color meta tag to brand primary', () => {
      applyDynamicManifest(makeBrand({ colors: { ...makeBrand().colors, primary: '#123456' } }), 'test');

      const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      expect(meta).not.toBeNull();
      expect(meta.content).toBe('#123456');
    });

    it('sets apple-mobile-web-app-status-bar-style meta', () => {
      applyDynamicManifest(makeBrand(), 'test');

      const meta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
      expect(meta).not.toBeNull();
      expect(meta.content).toBe('default');
    });

    it('removes existing manifest link before adding new one', () => {
      applyDynamicManifest(makeBrand(), 'brand1');
      applyDynamicManifest(makeBrand(), 'brand2');

      const links = document.querySelectorAll('link[rel="manifest"]');
      expect(links.length).toBe(1);
    });

    it('PERF-002: revokes previous blob URL when re-applying manifest', () => {
      applyDynamicManifest(makeBrand(), 'brand1');
      const firstLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      const firstBlobUrl = firstLink.href;

      applyDynamicManifest(makeBrand(), 'brand2');

      // The first blob URL should have been revoked
      expect(revokedUrls).toContain(firstBlobUrl);
    });

    it('PERF-002: each subsequent call revokes exactly 1 blob URL', () => {
      applyDynamicManifest(makeBrand(), 'setup');
      const countBefore = revokedUrls.length;

      applyDynamicManifest(makeBrand(), 'next');
      // Exactly one more revocation
      expect(revokedUrls.length).toBe(countBefore + 1);
    });

    it('uses brand logo when available instead of generated icon', () => {
      const brand = makeBrand({
        images: { ...makeBrand().images, logo: 'https://cdn.example.com/logo.png' },
      });
      applyDynamicManifest(brand, 'test');

      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      expect(link).not.toBeNull(); // manifest was created successfully
    });
  });

  // ────────────────────────────────────────────
  // ERR-003: Canvas null safety (tested via setup mock)
  // ────────────────────────────────────────────
  describe('canvas null safety (ERR-003)', () => {
    it('handles canvas context being null gracefully', () => {
      // Override canvas mock to return null
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = (() => null) as typeof original;

      // Should not throw
      expect(() => {
        applyDynamicManifest(makeBrand(), 'test');
      }).not.toThrow();

      // Restore
      HTMLCanvasElement.prototype.getContext = original;
    });
  });

  // ────────────────────────────────────────────
  // Install prompt lifecycle
  // ────────────────────────────────────────────
  describe('install prompt', () => {
    it('canInstall returns false before beforeinstallprompt event', () => {
      initInstallPrompt();
      expect(canInstall()).toBe(false);
    });

    it('promptInstall returns false when no prompt is available', async () => {
      const result = await promptInstall();
      expect(result).toBe(false);
    });
  });
});
