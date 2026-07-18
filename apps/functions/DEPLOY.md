# MatchFlow — Firebase Functions Deploy Guide

This folder deploys the Gemini-powered backend (`askConcierge`, `summarizeIncident`,
`suggestDispatch`, `simplifyText`, `rankEgressOptions`). The Next.js web app is
deployed **separately** on Vercel.

## Prerequisites
- Node 20+, `npm i -g firebase-tools`
- A Firebase project (Firebase Console → Add project). Note its **Project ID**.
- Blaze (pay-as-you-go) plan enabled — required for Cloud Functions.

## 1. Login & link project
```powershell
firebase login
firebase use --add          # pick your project, set as default
```

## 2. Set the Gemini API key (secret — never hardcoded)
```powershell
firebase functions:secrets:set GEMINI_API_KEY
# paste the AI Studio key (AIzaSy...) when prompted
```
The functions read `process.env.GEMINI_API_KEY` at runtime. If unset, every
function degrades to the deterministic `flow-engine` fallback (still works).

## 3. Deploy Firestore rules + indexes
```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

## 4. Seed required data
The functions read `congestionState` from Firestore at call time. Seed it:
1. Firebase Console → Project Settings → **Service accounts** →
   *Generate new private key* → save as `apps/functions/service-account.json`
   (already gitignored — do not commit it).
2. From the repo root:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "apps/functions/service-account.json"
   $env:GCLOUD_PROJECT = "your-firebase-project-id"
   npx tsx apps/functions/seed.ts
   ```
   This seeds `congestionState` (required), `concourseGraph`, and one demo
   incident so the ops console has live content on first load.

## 5. Deploy the functions
```powershell
firebase deploy --only functions
```
Note the generated HTTPS callable URLs / function names — the web client calls
them by name via `httpsCallable` (see `apps/web/src/lib/db.ts` wiring).

## Model note
All functions use the rolling `gemini-flash-latest` alias (set in
`src/index.ts` `MODEL_FAST` / `MODEL_HIGH_CAP`). It always points at the
current stable Flash model, so deploys never break on a version sunset.

## Local emulator testing (optional)
```powershell
firebase emulators:start
# then run integration tests against FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```
