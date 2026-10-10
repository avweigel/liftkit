# LiftKit

A workout tracker built for a phone at 5 am. It runs your training plan, logs every set with one thumb, and shows how your lifts move over time.

Live at **[liftkit-av.vercel.app](https://liftkit-av.vercel.app)**.

## What it does

**Today.** The home screen lays out your day in order: warm-up, the workout, core, and an evening cardio suggestion. Warm-ups match the day (a heavy leg day gets hip and ankle prep, a pull day gets shoulder prep). Core alternates between A and B days, and picks A after heavy legs. Cardio suggestions keep hard sessions to two a week and stay easy the night before a heavy day. A week strip shows what's done and lets you train a different day.

**Logging.** Exercises are grouped by superset, and "last time" hints come from your own history. Every set saves as you go. Weight steps match the equipment: dumbbells move in real dumbbell increments, barbells in plate pairs. Left and right sides log as separate exercises, so a weak side shows up in the numbers. A rest timer starts after each set.

**Plans.** Import a program from a Google Sheet (shared as "anyone with the link can view") or paste CSV. Exercise names are matched against your library, and anything new is created for you. Ad hoc workouts use the same logger with no plan attached.

**Progress.** Personal records and history for each exercise, with warm-up sets left out.

## Running it locally

You need Node 20 or newer and a Supabase project with the LiftKit schema.

```bash
npm install
npm run dev
```

Create `.env.local` first with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
APP_TIME_ZONE=Europe/Stockholm   # optional, used for "today"
```

Sign-in is a magic link or Google, both set up in Supabase. There is no password flow.

## How it's built

Next.js (App Router, server components first), TypeScript, Tailwind v4, and Supabase for Postgres and auth. Row-level security is on for every table, and the app never uses the service role key. Zod checks all input, and Recharts draws the charts.

Workouts that aren't part of a plan are just sessions with no plan day, so one set of queries covers both.

Read `CLAUDE.md` for the data model and conventions, and `DESIGN.md` before touching the UI.

## Deploying

Every push to `main` deploys to Vercel.
