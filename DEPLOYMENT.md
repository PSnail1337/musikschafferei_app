# Deployment Guide — musicmaker

Step-by-step instructions in plain language. No prior technical knowledge required beyond following these steps.

---

## Prerequisites (one-time setup)

You need:
- A computer with internet access
- A Google account (for Firebase)
- A [DeepL](https://www.deepl.com/pro-api) account (free tier is fine)
- An email sending service (e.g. [Brevo](https://www.brevo.com) — free plan works)

---

## Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it `musicmaker` → click through to create
3. Once created, click the **Web** icon (`</>`) to add a web app
4. Name it `musicmaker-web` → click **Register app**
5. You'll see a block of code with `apiKey`, `authDomain`, etc. — **copy these values**

---

## Step 2 — Enable Firebase services

Inside your Firebase project:

### Authentication
1. Go to **Authentication → Get started**
2. Click **Sign-in method** → enable **Email/Password**
3. Also enable **Google** (sign-in with your app's email)

### Firestore
1. Go to **Firestore Database → Create database**
2. Choose **Production mode** → select a location close to Austria (e.g. `europe-west3`)
3. Click **Done**

### Storage
1. Go to **Storage → Get started**
2. Choose production mode → same region as Firestore

### Cloud Messaging (Push Notifications)
1. Go to **Project Settings → Cloud Messaging**
2. Scroll to **Web Push certificates** → click **Generate key pair**
3. Copy the **VAPID key** that appears

### Service Account (for server-side)
1. Go to **Project Settings → Service accounts**
2. Click **Generate new private key** → download the JSON file
3. Open it in a text editor — you'll need `project_id`, `client_email`, and `private_key`

---

## Step 3 — Configure environment variables

In the project folder, copy the example file:
```
cp .env.local.example .env.local
```

Open `.env.local` and fill in the values:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app config (Step 1) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Cloud Messaging VAPID key (Step 2) |
| `FIREBASE_ADMIN_PROJECT_ID` | Service account JSON → `project_id` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account JSON → `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account JSON → `private_key` (include quotes) |
| `DEEPL_API_KEY` | Your DeepL API key |
| `SMTP_HOST` | Your email provider's SMTP host (e.g. `smtp-relay.brevo.com`) |
| `SMTP_PORT` | Usually `587` |
| `SMTP_USER` | Your SMTP username |
| `SMTP_PASS` | Your SMTP password |
| `SMTP_FROM` | `noreply@musicmaker.studio` |
| `NEXT_PUBLIC_APP_URL` | `https://musicmaker.studio` |

---

## Step 4 — Upload Firestore rules & indexes

Install Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
```

Deploy rules and indexes:
```bash
firebase deploy --only firestore
```

---

## Step 5 — Deploy to Vercel (recommended)

[Vercel](https://vercel.com) is the easiest way to host a Next.js app.

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub
2. Click **New Project** → import your GitHub repository
3. In the **Environment Variables** section, add all variables from `.env.local`
4. Click **Deploy** — Vercel builds and deploys automatically

**Custom domain:** In Vercel → Domains → add `musicmaker.studio` → follow DNS instructions.

---

## Step 6 — Alternative: Firebase Hosting + Cloud Run

If you prefer to host entirely on Firebase:

```bash
# Build the Next.js app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

For the API routes (server-side logic), deploy to **Cloud Run**:
```bash
gcloud run deploy musicmaker --source . --region europe-west3
```

---

## Step 7 — Configure the Firebase Messaging service worker

1. Open `public/firebase-messaging-sw.js`
2. Replace the `self.__FIREBASE_*__` placeholders with your actual config values
   (these are safe to embed in the service worker — they are already public)

---

## Step 8 — Upload PWA icons

Create PNG icons in these sizes and place them in `public/icons/`:
- `icon-72.png`, `icon-96.png`, `icon-128.png`, `icon-192.png`, `icon-512.png`

You can generate these from any image using [realfavicongenerator.net](https://realfavicongenerator.net).

---

## Step 9 — Upload Terms of Use PDFs

1. Log in as Main-Master (`elias@musikschafferei.at`, `elias@musicmaker.studio`, or `p.strohbach@icloud.com`)
2. Go to **Nutzungsbedingungen**
3. Upload the 4 PDFs (AGB DE, AGB EN, Hausordnung DE, Hausordnung EN)

---

## Step 10 — Test everything

- [ ] Sign up with a new account → verify role is "Mitglied"
- [ ] Sign in as Main-Master → verify role is "Main-Master"
- [ ] Create a booking → verify it appears in the calendar
- [ ] Try to double-book → verify collision message appears
- [ ] Create a support ticket → verify it appears in the admin view
- [ ] Add an inventory item → verify it appears with correct ref number
- [ ] Toggle dark mode in Settings → verify color scheme changes

---

## Maintenance

### Update the app
```bash
git pull
npm install
npm run build
# redeploy to Vercel (auto if connected to GitHub)
```

### View logs
- Vercel: go to your project → Deployments → Functions logs
- Firebase: go to Firebase Console → Functions (if using Cloud Functions)

### Backup Firestore data
Firebase Console → Firestore → Export → choose a Cloud Storage bucket.

---

## Support

For technical issues: contact p.strohbach@icloud.com
