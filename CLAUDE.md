# CLAUDE.md — musicmaker Project Context

## What this app is
Booking, inventory, support, and compliance platform for **Musikschafferei / GMK-Center am Winterhafen, Linz**.  
Domain: **musicmaker.studio**  
Scale target: 100,000+ users · iOS + Android + Web

## Tech stack
| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, RSC) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS variables for theming |
| State | Zustand (client) + React Query (server) |
| Backend | Firebase (Auth · Firestore · Storage · FCM · App Check) |
| Animations | Framer Motion |
| Dates | date-fns |
| PDF viewer | react-pdf |
| Audio recording | MediaRecorder API (browser-native) |
| Translation | DeepL Free API |
| Deployment | Firebase Hosting + Next.js Edge runtime |

Flutter was the original spec intent but is not installed; Next.js gives identical mobile UX via PWA + Capacitor if needed.

## File structure
```
src/
  app/                    Next.js App Router pages
    (auth)/               Unauthenticated pages (login, register)
    (app)/                Authenticated shell (bottom nav, auth guard)
      booking/
      inventory/
      terms/
      support/
      admin/
      settings/
    api/                  API routes (notifications, translate, export)
  components/
    ui/                   Generic design-system components
    layout/               BottomNav, TopBar, AuthGuard
    booking/              Calendar widgets
    inventory/
    support/
    admin/
  lib/
    firebase/             config, auth helpers, Firestore helpers, FCM
    hooks/                Custom React hooks
    services/             Business-logic services (pure TS)
    models/               TypeScript interfaces for all Firestore docs
    utils/                dateUtils, roleUtils, constants
  store/                  Zustand stores
  styles/                 globals.css (Tailwind base + CSS vars)
public/
  manifest.json           PWA
  icons/
firestore.rules
firestore.indexes.json
firebase.json
```

## Room reference
| Room | ID | Area | Color (hex) |
|---|---|---|---|
| Songbird | songbird | 38 m² | `#F1C40F` (yellow) |
| Heros | heros | 23 m² | `#74B9FF` (light blue) |
| Unstoppable | unstoppable | 19 m² | `#A29BFE` (purple) |
| Imagine | imagine | 56 m² | `#00B894` (grass green) |

## User role hierarchy
```
Main-Master  (elias@musikschafferei.at · elias@musicmaker.studio · p.strohbach@icloud.com)
  └── Master  (≤ 15, manages own circle)
        └── Admin  (≤ 30 per Master)
              └── Mitglied  (100 k+)
```

### User types (orthogonal to role)
- **Abo-Kunde** — default
- **Lehrer** — invoiced; end-of-month hour confirmation
- **Schüler** — restricted: only Nutzungsbedingungen + Support
- **Sondermitglied** — invoiced; monthly/quarterly summary email

## Firestore collections
`users` · `standorte` · `raeume` · `buchungen` · `lager_artikel` · `lager_dropdowns` · `lager_log` · `lager_suche_log` · `support_tickets` · `ratings` · `rating_gewichtung` · `nutzungsbedingungen` · `app_config`

## Key UX rules
- Max 2 taps to any feature
- Bottom nav: Buchung · Lager · Nutzungsbedingungen · Support (+ Verwaltung for Master+)
- Booking slots: 15 min granularity, min 1 h, default suggest 2 h
- Collision error (German): "Bitte um Verzeihung, aber da hat sich grade jemand direkt vor dir eingebucht"
- Double booking same user: "Bitte Kontakt mit Elias aufnehmen"
- Schüler restricted message: "Diese Funktion ist nur für Studio- und Proberaumnutzer verfügbar."
- Border radius: 12 px everywhere
- Max 2 font size steps per screen
- Push notifications: 10 min before start (alarm off reminder), 10 min before end (alarm on)
- Collision notification: cannot be disabled by user

## Admin emails (Main-Master)
- elias@musikschafferei.at
- elias@musicmaker.studio
- p.strohbach@icloud.com

## Environment variables needed
See `.env.local.example` for the full list. Must be set before running.

## Build sequence
Follow TODO.md phases 1–5 in order. Each step is a checkbox.

## Translation notes
- DeepL auto-translates all UI, notifications, and emails
- Translations cached in Firestore sub-collection `translations` on each doc
- Excluded from translation: location names, room names, usernames, the 4 PDF files
- User default = device language; overridable in Settings

## Security
- Firestore rules enforce role hierarchy (see `firestore.rules`)
- Firebase App Check (reCAPTCHA v3 on web, DeviceCheck on iOS, Play Integrity on Android)
- GDPR: user data export endpoint, account deletion endpoint
