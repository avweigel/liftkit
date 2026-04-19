import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "./dashboard";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return <Dashboard userId={user.id} email={user.email ?? ""} />;

  return <Landing />;
}

function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          track your lifts.
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          import a plan from a google sheet, log every set on your phone, watch
          your numbers go up over time.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          sign in
        </Link>
        <span className="text-sm text-zinc-500">
          magic link or google. no password to remember.
        </span>
      </div>

      <ul className="grid gap-4 pt-4 text-sm text-zinc-700 sm:grid-cols-3 dark:text-zinc-300">
        <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-1 font-medium">paste a sheet url</div>
          <p className="text-zinc-500 dark:text-zinc-400">
            week, day, exercise, sets, reps. liftkit parses it.
          </p>
        </li>
        <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-1 font-medium">log on your phone</div>
          <p className="text-zinc-500 dark:text-zinc-400">
            big tap targets, last-time hints, auto-save.
          </p>
        </li>
        <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-1 font-medium">see the trend</div>
          <p className="text-zinc-500 dark:text-zinc-400">
            weight, volume, PRs per exercise.
          </p>
        </li>
      </ul>
    </main>
  );
}
