# musicmaker — Build Checklist

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Firebase (Auth + Firestore + Storage + FCM)  
**Domain:** musicmaker.studio  
**Target:** 100,000+ users · iOS + Android (PWA / Capacitor) + Web

---

## Phase 1 — Foundation

- [x] **Step 1** — Firebase project setup & environment configuration (config, env template, firebase.json)
- [x] **Step 2** — Next.js project scaffold + all package dependencies (package.json, tsconfig, Tailwind, PostCSS)
- [x] **Step 3** — Firebase Auth: email/password + Google sign-in, login & register screens
- [x] **Step 4** — Role-based access control: Main-Master › Master › Admin › Mitglied + user types (Abo-Kunde, Lehrer, Schüler, Sondermitglied)
- [x] **Step 5** — Firestore data models & collection helpers for all 13 collections

## Phase 2 — Core Booking

- [x] **Step 6** — Home screen: dashboard with bottom nav (Buchung · Lager · Nutzungsbedingungen · Support · Verwaltung)
- [x] **Step 7** — Booking calendar landscape view: all 4 rooms side-by-side, vertical time axis, 15-min slots
- [x] **Step 8** — Booking calendar portrait view: single room, swipe/tab to switch rooms
- [x] **Step 9** — Booking flow: slot selection → confirm sheet → write to Firestore + real-time collision detection
- [x] **Step 10** — Push notifications via FCM: 10 min before start (alarm off), 10 min before end (alarm on), >5 h booking alert to Master
- [x] **Step 11** — Cancellation logic: 24 h window (configurable per user by Master), Master override
- [x] **Step 12** — Studio combo booking (Heros + Unstoppable), Master-only access

## Phase 3 — Inventory · Terms · Support

- [x] **Step 13** — Inventory CRUD: auto-ref ART-00001++, name, description, quantity, photo upload, location dropdowns
- [x] **Step 14** — Inventory change log (Main-Master) + search log (Master) with before/after diffs
- [x] **Step 15** — Terms of Use: 4 PDF viewer tabs (AGB DE/EN, Hausordnung DE/EN), download, upload + optional mass email
- [x] **Step 16** — Support ticket system: text + voice input, Feedback/Reklamation, status flow new→read→in progress→done, push on status change

## Phase 4 — Admin Tools

- [x] **Step 17** — User management screen: invite, deactivate, set role/type, set cancellation window, assign to Master circle
- [x] **Step 18** — Rating system: 4 criteria × 1-5 stars, weighted average (Main-Master sets weights 1-10), only visible to Main-Master (overall) + rating Master (own circle)
- [x] **Step 19** — Annual quota & billing: hours-per-year quota per user, quota exceeded → email to Master
- [x] **Step 20** — Lehrer billing: end-of-month notification, 4-day window to confirm paid hours, escalation email if no response
- [x] **Step 21** — Sondermitglied: monthly/quarterly booking summary email to Main-Master
- [x] **Step 22** — Export: Master exports own circle booking data (CSV/PDF)

## Phase 5 — Polish

- [x] **Step 23** — DeepL translation: auto-translate all UI strings, notifications & emails; cache in Firestore sub-collection; exclude location/room names, usernames, 4 PDFs
- [x] **Step 24** — Dark mode: full alternative color scheme (not just inverted), toggleable in settings
- [x] **Step 25** — Settings screen: language selector, notification toggles (all except collision), account actions
- [x] **Step 26** — Firestore security rules + Firebase App Check (all read/write locked down by role)
- [x] **Step 27** — Performance optimization (lazy loading, query pagination, image optimization) + GDPR compliance + PWA manifest + service worker

---

_Steps are checked off as implemented. See CLAUDE.md for architecture decisions._
