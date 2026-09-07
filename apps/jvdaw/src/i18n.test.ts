import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('browser language selection', () => {
  it.each(['es-ES', 'es-MX', 'es-AR'])('uses Spanish for %s', async (browserLanguage) => {
    vi.stubGlobal('navigator', { language: browserLanguage });
    const { language, l } = await import('./i18n');
    expect(language).toBe('es');
    expect(l('Pistas', 'Tracks')).toBe('Pistas');
  });

  it.each(['en-US', 'fr-FR', 'de-DE'])('falls back to English for %s', async (browserLanguage) => {
    vi.stubGlobal('navigator', { language: browserLanguage });
    const { language, l } = await import('./i18n');
    expect(language).toBe('en');
    expect(l('Pistas', 'Tracks')).toBe('Tracks');
  });
});
