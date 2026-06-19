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

## Data Compatibility

The v2 UI still imports `base44.entities.*` for minimal page churn, but
`src/api/base44Client.js` is now a Firebase adapter. It reads and writes
Firestore collections:

- `users`
- `clients`
- `appointments`
- `evaluations`
- `billing`
- `schools`
- `placements`

Existing camelCase records from the original Firebase app are normalized into
the snake_case fields expected by the v2 UI.
