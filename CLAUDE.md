# CLAUDE.md — liftkit

Context for Claude Code when working on this repo. Read this first before making changes.

## What this is

liftkit is a personal workout tracker with plan import from Google Sheets. Initial scope: a handful of users (me + friends/family). Designed to scale to public signup without data-model changes.

## Tech stack

- **Next.js 15+** (App Router). Server Components by default. Use Client Components only when interactivity, state, or browser APIs are needed.
- **TypeScript** strict mode. No `any` unless justified.
- **Tailwind v4** utility-first. No custom CSS files beyond `globals.css`.
- **Supabase** — Postgres, Auth (magic link + Google OAuth), RLS everywhere.
- **Zod** — validate all external input (form data, sheet imports, API routes).
- **React Hook Form** — all forms.
- **Recharts** — progression charts.
- **Papaparse** — CSV parsing for plan imports.
- **lucide-react** — icons.

## Auth

- Magic link email (Supabase `signInWithOtp`) and Google OAuth.
- Both are already configured on the Supabase side. Client IDs/secrets live in Supabase, not in app code.
- Session refresh runs in `middleware.ts`.
- Server components get the user via `createClient()` from `src/lib/supabase/server.ts`.
- Client components use `src/lib/supabase/client.ts`.

## Directory conventions

```
src/
├── app/              # routes (server components default)
├── components/       # app components (shared, not page-specific)
├── lib/
│   ├── supabase/
│   │   ├── client.ts  # browser supabase client
│   │   ├── server.ts  # server components / route handlers
│   │   └── middleware.ts
│   ├── schemas/      # Zod schemas
│   └── sheets.ts     # Google Sheets CSV parser
└── styles/globals.css
```

## Data model (already deployed in Supabase)

Tables (all have RLS enabled):

- `profiles` — extends `auth.users`. Fields: `id` (uuid, FK to auth.users), `display_name`, `role` (user | admin), `units` (lb | kg). Auto-created on signup via trigger.
- `allowlist` — optional email gate. If empty, all signups allowed. If populated, only listed emails can sign up.
- `exercises` — library. Fields: `id`, `owner_id` (null = global), `name`, `slug`, `primary_muscle` (enum), `equipment` (enum), `notes`.
- `workout_plans` — imported programs. Fields: `id`, `owner_id`, `name`, `description`, `source_url`, `is_public` (default false).
- `plan_weeks` — fields: `id`, `plan_id`, `week_number`, `name`.
- `plan_days` — fields: `id`, `week_id`, `day_number`, `name`, `notes`.
- `plan_day_exercises` — fields: `id`, `day_id`, `exercise_id`, `order_index`, `prescribed_sets`, `prescribed_reps` (text, e.g. "6-8"), `prescribed_weight`, `rest_seconds`, `notes`.
- `workout_sessions` — fields: `id`, `user_id`, `plan_day_id` (nullable, null = ad hoc), `started_at`, `finished_at`, `notes`.
- `session_sets` — fields: `id`, `session_id`, `exercise_id`, `set_number`, `weight`, `reps`, `rpe` (nullable 1-10), `is_warmup` (bool), `notes`, `logged_at`.

Views (read-only):

- `v_exercise_last_performed` — last non-warmup set per user per exercise.
- `v_personal_records` — max weight / volume / reps per user per exercise, warmup excluded.

Enums:

- `user_role`: user | admin
- `muscle_group`: chest, back, shoulders, biceps, triceps, forearms, quads, hamstrings, glutes, calves, core, full_body, other
- `equipment_type`: barbell, dumbbell, machine, cable, bodyweight, kettlebell, band, other

Key design rule: ad hoc workouts are sessions with `plan_day_id = NULL`. Same logging UI, same queries.

60 exercises are already seeded as global (`owner_id = null`).

## RLS rules (already enforced)

- Users only see their own sessions, sets, profiles.
- `workout_plans` visible if `owner_id = auth.uid() OR is_public = true`.
- `exercises` visible if `owner_id IS NULL` (global) or `owner_id = auth.uid()`.
- Plan structure (weeks/days/exercises) inherits visibility from parent plan.
- Admin role bypasses some policies for maintenance.

Don't add service-role-key calls to bypass RLS.

## Plan import flow

`src/app/api/plans/import/route.ts` handles both paste-URL and CSV paste:

1. If URL: extract sheet ID + gid, fetch `.../export?format=csv&gid=<gid>`.
2. Parse CSV with Papaparse.
3. Validate rows against `src/lib/schemas/plan-import.ts` Zod schema.
4. Fuzzy-match exercise names against `exercises` table (slug + Levenshtein, threshold 0.8).
5. Return preview JSON with unmatched exercises flagged.
6. On confirm, insert plan + weeks + days + exercises. Create user-owned exercises for unmatched names.

Required sheet columns: `week, day, day_name, exercise, sets, reps, weight, rest_sec, notes`.

The Google Sheet must be shared as "Anyone with the link can view" for the fetch to work.

## Logging flow

- `/log` shows "Today's workout" if on a plan, plus "Start ad hoc" button.
- Session UI: compact rows, one thumb on mobile. Auto-save on every set.
- "Last time" hint queries `v_exercise_last_performed`.
- Warmup sets excluded from PR calculations and default volume stats.

## Writing style (READMEs, docs, UI copy, commit messages)

- No em dashes. Use commas, periods, or parentheses. This is non-negotiable.
- No corporate jargon: no "leverage," "empower," "unlock," "seamless," "robust."
- No AI-tell phrases: no "delve into," "in today's fast-paced world," "it's important to note," "let's explore."
- Direct and human. Active voice. Short sentences.
- Prose, not bullet soup, when explaining things.
- Commit messages: lowercase, imperative mood. "add login page" not "Added login page" or "Feat: Added Login Page."

## What NOT to do

- Don't use the service role key anywhere.
- Don't bypass RLS via service role in Server Components for user queries.
- Don't store session data in `localStorage`. Use Supabase session cookies.
- Don't use `any` to silence type errors. Fix the real issue.
- Don't add a password reset flow. Magic link + Google OAuth only.
- Don't add client-side Supabase admin operations.
- Don't add em dashes to anything you write.
- Don't add comments that just describe what the code does. Comments explain why, not what.
- Don't invent features not in the spec. Ask first.
