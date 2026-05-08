export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

/** POST /api/translate — proxy DeepL translation (keeps API key server-side) */
export async function POST(req: NextRequest) {
  try {
    const { text, locale } = await req.json() as { text: string; locale: string };

    if (!text || !locale) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      // Fallback: return original text when DeepL not configured
      return NextResponse.json({ translated: text });
    }

    const langMap: Record<string, string> = {
      en: 'EN-US',
      de: 'DE',
    };
    const targetLang = langMap[locale] ?? locale.toUpperCase();

    const formData = new URLSearchParams({
      auth_key:    apiKey,
      text,
      target_lang: targetLang,
    });

    const res = await fetch(DEEPL_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    formData.toString(),
    });

    if (!res.ok) {
      console.error('DeepL error:', res.status, await res.text());
      return NextResponse.json({ translated: text });
    }

    const data = await res.json();
    const translated = data.translations?.[0]?.text ?? text;

    return NextResponse.json({ translated });
  } catch (err) {
    console.error('Translate error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
