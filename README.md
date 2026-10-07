# Automation Academy

A personal learning dashboard for becoming an AI Automation Specialist: 16 modules, 202 practical exercises, topic videos, interview practice and a career tracker.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Auth + Postgres with Row Level Security) · Vercel

## How it works

- `proxy.ts` refreshes the Supabase session cookie on each request and redirects signed-out visitors to `/login`.
- `app/api/progress/route.ts` loads and saves progress. Every write is validated against the curriculum (`lib/state.ts`) before it reaches the database.
- `public.learning_state` stores one row per `(user_id, key)`. RLS policies mean a user can only ever read or write their own rows, even with the public key.
- Course content lives in `lib/curriculum.json` and `lib/handbook.ts`.

## Setup

1. Create a Supabase project and run `supabase/migrations/20261007000000_learning_state.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.
3. `pnpm install && pnpm dev`

## Deploy (Vercel)

1. Import this repo in Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables.
2. In Supabase → Authentication → URL Configuration, set **Site URL** to your Vercel domain and add `https://<your-domain>/auth/callback` to **Redirect URLs**.
