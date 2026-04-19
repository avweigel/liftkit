import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "sign in · liftkit",
};

type Props = {
  searchParams: Promise<{ redirectTo?: string; error?: string; sent?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  if (user) redirect(params.redirectTo || "/");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">liftkit</h1>
          <p className="text-sm text-(--muted)">sign in to log your lifts</p>
        </header>
        <LoginForm
          redirectTo={params.redirectTo}
          error={params.error}
          sent={params.sent === "1"}
        />
        <div className="rounded-lg border border-(--border) bg-(--surface) p-3 text-xs text-(--muted)">
          <div className="font-semibold text-(--foreground)">what happens next</div>
          <ol className="mt-1 space-y-0.5">
            <li>1. we load 12 phase workouts into your account.</li>
            <li>2. pick one to follow for the next 6-8 weeks.</li>
            <li>3. open the app each day and log today&rsquo;s workout.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
