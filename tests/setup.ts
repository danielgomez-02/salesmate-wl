/**
 * Vitest global setup file.
 * Configures jsdom environment, mocks, and testing library matchers.
 */

import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// ── Mock import.meta.env for tests ──
// Vitest auto-populates import.meta.env, but we ensure test defaults exist
if (typeof import.meta.env !== 'undefined') {
  import.meta.env.VITE_RETOOL_ROUTES_API_KEY = 'test_routes_key';
  import.meta.env.VITE_RETOOL_UPDATE_API_KEY = 'test_update_key';
  import.meta.env.VITE_RETOOL_ROUTES_URL = 'https://api.retool.com/test/routes';
  import.meta.env.VITE_RETOOL_UPDATE_URL = 'https://api.retool.com/test/update';
}

// ── Mock canvas for dynamicManifest icon generation ──
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === '2d') {
    return {
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: () => {},
      fillText: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      arc: () => {},
      stroke: () => {},
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.toDataURL = function () {
  return 'data:image/png;base64,MOCK_PNG_DATA';
};

// ── Mock URL.createObjectURL / revokeObjectURL ──
const blobUrlMap = new Map<string, string>();
let blobUrlCounter = 0;

globalThis.URL.createObjectURL = (blob: Blob) => {
  const url = `blob:test/${++blobUrlCounter}`;
  blobUrlMap.set(url, 'blob');
  return url;
};

globalThis.URL.revokeObjectURL = (url: string) => {
  blobUrlMap.delete(url);
};

// Expose for test assertions
(globalThis as Record<string, unknown>).__blobUrlMap = blobUrlMap;

// ── Clean up between tests ──
afterEach(() => {
  // Reset fetch mocks if any
  vi.restoreAllMocks();
});
