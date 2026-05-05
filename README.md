# musicmaker

**Booking, inventory, support & compliance platform for Musikschafferei / GMK-Center am Winterhafen, Linz.**

Live: [musicmaker.studio](https://musicmaker.studio)

---

## What it does

| Module | Description |
|---|---|
| 📅 Booking | Real-time room booking calendar for 4 studio rooms · 15-min slots · portrait & landscape views · collision detection |
| 📦 Inventory | Equipment inventory with auto-ref numbers, photos, location tracking, full-text search, change logs |
| 📄 Terms of Use | 4 inline PDF documents (AGB + Hausordnung, DE + EN) with upload & mass email |
| 🎧 Support | Text + voice ticket system with status flow and push notifications |
| ⚙️ Admin | User management, rating system (4 criteria, weighted avg), quota tracking, billing, CSV export |
| 🌐 Translations | DeepL-powered auto-translation for all UI, notifications, and emails |
| 🌙 Dark mode | Full alternative color scheme (not just inverted) |
| 📱 PWA | Installable on iOS & Android via "Add to Home Screen" |

---

## Tech stack

- **Next.js 14** — App Router, React Server Components, TypeScript
- **Firebase** — Auth, Firestore, Storage, Cloud Messaging (push notifications), App Check
- **Tailwind CSS** — utility-first styling with CSS variables for theming
- **Zustand** — lightweight client state (auth + settings)
- **Framer Motion** — animations for bottom sheets, transitions
- **DeepL API** — auto-translation with Firestore caching
- **Nodemailer** — transactional emails via SMTP

---

## Rooms

| Room | Area | Color |
|---|---|---|
| Songbird | 38 m² | #F1C40F (yellow) |
| Heros | 23 m² | #74B9FF (light blue) |
| Unstoppable | 19 m² | #A29BFE (purple) |
| Imagine | 56 m² | #00B894 (grass green) |

---

## User roles

```
Main-Master  (elias@musikschafferei.at · elias@musicmaker.studio · p.strohbach@icloud.com)
  └── Master  (≤15, manages own circle)
        └── Admin  (≤30 per Master)
              └── Mitglied  (100k+)
```

User types: **Abo-Kunde** (default) · **Lehrer** · **Schüler** (restricted) · **Sondermitglied**

---

## Quick start

```bash
# 1. Copy environment template
cp .env.local.example .env.local
# 2. Fill in your Firebase config values in .env.local

# 3. Install dependencies
npm install

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
src/
  app/                 Next.js 14 App Router pages
    (auth)/            Unauthenticated routes
    (app)/             Auth-guarded shell (bottom nav)
    api/               API routes (notifications, translate, export, email)
  components/          React components by feature
  lib/
    firebase/          Firebase client + Admin SDK
    services/          Business logic (booking, inventory, support, admin, rating, terms)
    models/            TypeScript interfaces for all Firestore docs
    utils/             Constants, date helpers, role utils
  store/               Zustand stores (auth, settings)
  styles/              Tailwind base + CSS design tokens
firestore.rules        Firestore security rules
storage.rules          Firebase Storage security rules
firestore.indexes.json Composite indexes
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step deployment instructions in plain language.

---

## Build checklist

See [TODO.md](./TODO.md) for the full 27-step build checklist.
