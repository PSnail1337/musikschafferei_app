---
name: musicmaker project overview
description: Core facts about the musicmaker app — stack, domain, features, admin emails
type: project
---

musicmaker is a booking, inventory, support & compliance platform for Musikschafferei / GMK-Center am Winterhafen, Linz.

**Domain:** musicmaker.studio (purchased)  
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Firebase (Auth + Firestore + Storage + FCM) · Zustand · Framer Motion · DeepL API

**Why:** Stack was recommended because Flutter is not installed. Next.js gives identical mobile UX via PWA; can be wrapped in Capacitor later for native app stores.

**Main admin emails (Main-Master):**
- elias@musikschafferei.at
- elias@musicmaker.studio
- p.strohbach@icloud.com

**How to apply:** These emails are granted 'main-master' role automatically on first login (see `MAIN_MASTER_EMAILS` in `src/lib/utils/constants.ts` and `src/lib/firebase/auth.ts`).

**Current status (2026-05-02):** All 27 steps implemented as scaffolding. Needs `.env.local` populated with real Firebase credentials, then `npm install && npm run dev` to run. See `DEPLOYMENT.md` for deployment steps.
