import { createContext, useContext } from 'react';
import { translations, Lang } from './translations';

// Read lang from URL params, default to 'es'
export function getLanguageFromURL(): Lang {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang')?.toLowerCase();
  if (lang === 'en' || lang === 'pt' || lang === 'es') return lang;
  return 'es';
}

export const LanguageContext = createContext<Lang>('es');

export function useLanguage() {
  const lang = useContext(LanguageContext);
  const dict = translations[lang] || translations.es;

  /** Translate a key, with optional interpolation: t('key', { name: 'X' }) */
  function t(key: string, vars?: Record<string, string | number>): string {
    let text = dict[key] ?? translations.es[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }

  return { t, lang };
}
