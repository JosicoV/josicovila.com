export const language: 'es' | 'en' =
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';

export const isSpanish = language === 'es';

export function l(es: string, en: string): string {
  return isSpanish ? es : en;
}

if (typeof document !== 'undefined') document.documentElement.lang = language;
