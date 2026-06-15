# Yuiri

A Boys' School Referral CRM for managing client intake, evaluations, school matching, and billing for Jewish boys' school placements.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Auth:** NextAuth.js
- **Database:** Firebase / Firestore
- **UI:** Tailwind CSS, Radix UI, shadcn/ui components
- **Charts:** Recharts

## Setup

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd YUIRI
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Firebase project credentials and generate a `NEXTAUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

3. **Seed the database**

   ```bash
   npx tsx scripts/seed.ts
   ```

   This creates sample users, clients, appointments, evaluations, and billing records in Firestore.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Default Login Credentials

| Role      | Email                  | Password        |
| --------- | ---------------------- | --------------- |
| Admin     | admin@yuiri.com        | admin123        |
| Scheduler | scheduler@yuiri.com    | scheduler123    |
| Evaluator | evaluator@yuiri.com    | evaluator123    |
| Billing   | billing@yuiri.com      | billing123      |

## User Roles

- **ADMIN** -- Full access to all features: user management, client records, appointments, evaluations, and billing.
- **SCHEDULER** -- Manages client intake, creates and updates appointments, and handles scheduling logistics.
- **EVALUATOR** -- Conducts student evaluations, writes assessment reports, and recommends school placements.
- **BILLING** -- Manages invoices, tracks payments, and handles financial records for client services.
