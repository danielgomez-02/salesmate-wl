import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { BrandConfig } from '../types';
import { defaultBrands, DEFAULT_BRAND } from '../config/defaultBrands';

const STORAGE_KEY_BRAND = 'salesmate_brand';
const STORAGE_KEY_CUSTOM = 'salesmate_brands_custom';
const API_URL = '/api/brands';

/* ─── helpers ─── */

function applyBrandCSS(brand: BrandConfig) {
  const root = document.documentElement;
  const c = brand.colors;
  root.style.setProperty('--brand-primary', c.primary);
  root.style.setProperty('--brand-primary-light', c.primaryLight);
  root.style.setProperty('--brand-primary-dark', c.primaryDark);
  root.style.setProperty('--brand-accent', c.accent);
  root.style.setProperty('--brand-accent-light', c.accentLight);
  root.style.setProperty('--brand-success', c.success);
  root.style.setProperty('--brand-success-light', c.successLight);
  root.style.setProperty('--brand-cat-sales', c.categoryColors.sales);
  root.style.setProperty('--brand-cat-execution', c.categoryColors.execution);
  root.style.setProperty('--brand-cat-communication', c.categoryColors.communication);
  root.style.setProperty('--brand-cat-activation', c.categoryColors.activation);
}

/** Parse first path segment: /cocacola/foo → "cocacola", /config → "config", / → "" */
function getPathSegment(): string {
  return (window.location.pathname.replace(/^\/+/, '').split('/')[0] || '').toLowerCase();
}

function loadCustomBrands(): Record<string, BrandConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCustomBrands(b: Record<string, BrandConfig>) {
  localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(b));
}

/** Blank brand template */
export function createBlankBrand(id: string): BrandConfig {
  return {
    id,
    labels: {
      appName: id.charAt(0).toUpperCase() + id.slice(1),
      appTagline: 'Salesmate Platform',
      companyName: '',
      missionSystem: 'PRO',
      pointsLabel: 'Puntos PRO',
      routineLabel: 'Rutina PRO',
      categories: { sales: 'VENTAS', execution: 'EJECUCIÓN', communication: 'COMUNICACIÓN', activation: 'ACTIVACIÓN' },
      loginTitle: 'Salesmate',
      loginPlaceholder: 'Código de Empleado',
      loginButton: 'Ingresar',
    },
    colors: {
      primary: '#6366F1', primaryLight: '#EEF2FF', primaryDark: '#4338CA',
      accent: '#06B6D4', accentLight: '#CFFAFE',
      success: '#10B981', successLight: '#D1FAE5',
      categoryColors: { sales: '#38bdf8', execution: '#a855f7', communication: '#2dd4bf', activation: '#f59e0b' },
    },
    images: {
      fallbackProduct: 'https://ui-avatars.com/api/?name=P&background=6366F1&color=fff&size=256',
      avatarBg: '6366F1', avatarColor: 'fff',
    },
    storagePrefix: `${id}_sm_v1_`,
    defaultEmpCode: '1234567',
  };
}

/* ─── API helpers ─── */

async function apiFetchBrands(): Promise<Record<string, BrandConfig> | null> {
  try {
    const res = await fetch(API_URL, { cache: 'no-cache' });
    if (res.ok) return res.json();
  } catch { /* network error, fall through */ }
  return null;
}

async function apiSaveBrand(id: string, brand: BrandConfig): Promise<boolean> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, brand }),
    });
    return res.ok;
  } catch { return false; }
}

async function apiDeleteBrand(id: string): Promise<boolean> {
  try {
    const res = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return res.ok;
  } catch { return false; }
}

/* ─── Context type ─── */

interface BrandContextValue {
  brand: BrandConfig;
  brandId: string;
  brands: Record<string, BrandConfig>;
  brandKeys: string[];
  loading: boolean;
  initialPath: string;
  setBrandId: (id: string) => void;
  saveBrand: (id: string, config: BrandConfig) => void;
  deleteBrand: (id: string) => void;
  exportBrands: () => string;
  pushBrandPath: (id: string) => void;
}

const BrandContext = createContext<BrandContextValue | null>(null);

/* ─── Provider ─── */

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialPath] = useState(() => getPathSegment());

  const [allBrands, setAllBrands] = useState<Record<string, BrandConfig>>(() => {
    return { ...defaultBrands, ...loadCustomBrands() };
  });

  const [loading, setLoading] = useState(true);

  const [brandId, _setBrandId] = useState<string>(() => {
    const segment = getPathSegment();
    const merged = { ...defaultBrands, ...loadCustomBrands() };

    // If URL has a brand segment that exists, use it
    if (segment && segment !== 'config' && merged[segment]) return segment;

    // If URL has a brand segment that does NOT exist yet, still keep it as brandId
    // so we can resolve it after brands load from API
    if (segment && segment !== 'config' && segment !== '') return segment;

    const params = new URLSearchParams(window.location.search);
    const urlBrand = params.get('brand');
    if (urlBrand && merged[urlBrand]) return urlBrand;

    const stored = localStorage.getItem(STORAGE_KEY_BRAND);
    if (stored && merged[stored]) return stored;

    return DEFAULT_BRAND;
  });

  // Fetch brands from API on mount (falls back to static brands.json)
  useEffect(() => {
    (async () => {
      try {
        // Try API first (always fresh from GitHub)
        const apiBrands = await apiFetchBrands();
        if (apiBrands && Object.keys(apiBrands).length > 0) {
          setAllBrands(apiBrands);
          // Sync localStorage cache
          const custom: Record<string, BrandConfig> = {};
          for (const [k, v] of Object.entries(apiBrands)) {
            if (!defaultBrands[k]) custom[k] = v;
          }
          saveCustomBrands(custom);
          return;
        }

        // Fallback: static brands.json
        const res = await fetch('/brands.json');
        if (res.ok) {
          const json: Record<string, BrandConfig> = await res.json();
          setAllBrands(_prev => ({ ...json, ...loadCustomBrands() }));
        }
      } catch { /* keep defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Set loading=false after API brands resolve
  useEffect(() => {
    if (Object.keys(allBrands).length > 0 && loading) {
      setLoading(false);
    }
  }, [allBrands, loading]);

  const brandKeys = useMemo(() => Object.keys(allBrands), [allBrands]);

  // Resolve brand: if brandId exists in allBrands use it, otherwise fallback
  const brand = useMemo(() => {
    if (allBrands[brandId]) return allBrands[brandId];
    // brandId from URL doesn't match any known brand — use a neutral fallback
    return allBrands[DEFAULT_BRAND] || Object.values(allBrands)[0];
  }, [allBrands, brandId]);

  // Track whether the current brandId actually resolves to a real brand
  const brandExists = useMemo(() => !!allBrands[brandId], [allBrands, brandId]);

  useEffect(() => {
    if (brand && brandExists) {
      applyBrandCSS(brand);
      localStorage.setItem(STORAGE_KEY_BRAND, brandId);
    }
  }, [brand, brandId, brandExists]);

  const setBrandId = useCallback((id: string) => _setBrandId(id), []);

  const pushBrandPath = useCallback((id: string) => {
    window.history.pushState({}, '', `/${id}`);
  }, []);

  const saveBrand = useCallback((id: string, config: BrandConfig) => {
    const brandData = { ...config, id };

    // Update local state immediately (optimistic)
    setAllBrands(prev => {
      const next = { ...prev, [id]: brandData };
      // Also cache in localStorage as fallback
      const custom = loadCustomBrands();
      custom[id] = brandData;
      saveCustomBrands(custom);
      return next;
    });

    // Persist to API (fire-and-forget, non-blocking)
    apiSaveBrand(id, brandData).then(ok => {
      if (!ok) console.warn(`[BrandContext] API save failed for "${id}", kept in localStorage`);
    });
  }, []);

  const deleteBrand = useCallback((id: string) => {
    setAllBrands(prev => {
      const next = { ...prev };
      delete next[id];
      const custom = loadCustomBrands();
      delete custom[id];
      saveCustomBrands(custom);
      return next;
    });
    _setBrandId(prev => prev === id ? DEFAULT_BRAND : prev);

    // Persist deletion to API
    apiDeleteBrand(id).then(ok => {
      if (!ok) console.warn(`[BrandContext] API delete failed for "${id}"`);
    });
  }, []);

  const exportBrands = useCallback(() => JSON.stringify(allBrands, null, 2), [allBrands]);

  const value = useMemo<BrandContextValue>(() => ({
    brand, brandId, brands: allBrands, brandKeys, loading, initialPath,
    setBrandId, saveBrand, deleteBrand, exportBrands, pushBrandPath,
  }), [brand, brandId, allBrands, brandKeys, loading, initialPath, setBrandId, saveBrand, deleteBrand, exportBrands, pushBrandPath]);

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
};

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used within a BrandProvider');
  return ctx;
}
