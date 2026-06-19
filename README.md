# Yuiri

Yuiri is a boys' school referral CRM for client intake, scheduling, evaluations,
school matching, placements, billing, and reporting.

This repo now uses the `yuiri-v2` React interface with the existing Yuiri
Firebase project (`yuiri-1f4d3`) as the backend.

## Tech Stack

- Vite + React
- Tailwind CSS + shadcn/ui components
- Firebase Auth
- Firestore
- Firebase Hosting

## Local Development

```bash
npm install
npm run dev
```

The app includes fallback Firebase client config for `yuiri-1f4d3`. To override
it locally, copy `.env.example` to `.env.local` and set the `VITE_FIREBASE_*`
values.

## Build

```bash
npm run build
```

Firebase Hosting serves the static Vite build from `dist` and rewrites all
routes to `index.html`.

## Firestore Schema

The app uses `src/api/firebaseClient.js` as the only backend adapter. It reads
and writes clean Firestore collections:

- `users`
- `clients`
- `appointments`
- `appointment_availability`
- `evaluations`
- `billing`
- `schools`
- `placements`

The adapter stores canonical snake_case fields only. The first signed-in user
created in a fresh database becomes `admin`; later signups are created as
pending `user` records until approved by an admin.
