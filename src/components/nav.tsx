import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          liftkit
        </Link>

        {user ? (
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="rounded-md px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              today
            </Link>
            <Link
              href="/plans"
              className="rounded-md px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              plans
            </Link>
            <Link
              href="/history"
              className="rounded-md px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              history
            </Link>
            <Link
              href="/exercises"
              className="rounded-md px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              exercises
            </Link>
            <span className="mx-2 hidden h-5 w-px bg-zinc-200 sm:inline-block dark:bg-zinc-800" />
            <SignOutButton />
          </nav>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            sign in
          </Link>
        )}
      </div>
    </header>
  );
}
