import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Locale } from '@/lib/utils/constants';
import { TRANSLATION_EXCLUSIONS } from '@/lib/utils/constants';

interface CacheEntry {
  [key: string]: string;
}

// In-memory cache for the current session
const memCache: Map<string, string> = new Map();

function cacheKey(text: string, locale: Locale) {
  return `${locale}:${text}`;
}

/** Translate a single string via DeepL (cached in Firestore + memory) */
export async function translate(text: string, locale: Locale): Promise<string> {
  if (locale === 'de') return text;  // German is the source language

  // Skip words/names that should never be translated
  if (TRANSLATION_EXCLUSIONS.some((ex) => text.includes(ex))) return text;

  const key = cacheKey(text, locale);

  // Memory cache
  if (memCache.has(key)) return memCache.get(key)!;

  // Firestore cache (hashed key to avoid invalid doc IDs)
  const hash  = await hashString(key);
  const cRef  = doc(db, 'translations', hash);
  const cSnap = await getDoc(cRef);
  if (cSnap.exists()) {
    const val = (cSnap.data() as { value: string }).value;
    memCache.set(key, val);
    return val;
  }

  // Call DeepL API via our own Next.js API route (keeps API key server-side)
  const res = await fetch('/api/translate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, locale }),
  });
  const data = await res.json();
  const translated: string = data.translated ?? text;

  // Cache results
  memCache.set(key, translated);
  await setDoc(cRef, { key, value: translated, cachedAt: serverTimestamp() });

  return translated;
}

/** Translate a whole object's string values */
export async function translateRecord<T extends Record<string, string>>(
  record: T,
  locale: Locale,
): Promise<T> {
  const entries = await Promise.all(
    Object.entries(record).map(async ([k, v]) => [k, await translate(v, locale)] as const),
  );
  return Object.fromEntries(entries) as T;
}

async function hashString(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple hash
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
