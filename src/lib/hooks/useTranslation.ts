'use client';

import { useSettingsStore } from '@/store/settingsStore';
import { DE_TO_EN } from '@/lib/i18n/translations';

/**
 * Static UI-chrome translation (nav labels, buttons, headers, toasts).
 * German is the source language and the dictionary key; `vars` fills
 * `{name}` placeholders in both the German and English template.
 * Separate from translationService.ts, which live-translates dynamic
 * content (ticket messages, terms docs) via DeepL and is not a good fit
 * for instant UI chrome.
 */
export function useT() {
  const locale = useSettingsStore((s) => s.locale);

  return function t(de: string, vars?: Record<string, string | number>): string {
    const template = locale === 'en' ? (DE_TO_EN[de] ?? de) : de;
    if (!vars) return template;
    return Object.entries(vars).reduce(
      (str, [key, value]) => str.replaceAll(`{${key}}`, String(value)),
      template,
    );
  };
}
