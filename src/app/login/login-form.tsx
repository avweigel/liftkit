"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { emailSchema, type EmailInput } from "@/lib/schemas/auth";

type Props = {
  redirectTo?: string;
  error?: string;
  sent?: boolean;
};

export function LoginForm({ redirectTo, error: initialError, sent }: Props) {
  const supabase = createClient();
  const [pending, setPending] = useState(false);
  const [sentNow, setSentNow] = useState(sent ?? false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailInput>({
    resolver: zodResolver(emailSchema),
  });

  const callbackUrl = (next?: string) => {
    const base = `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const onSubmit = async ({ email }: EmailInput) => {
    setPending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl(redirectTo),
      },
    });
    setPending(false);
    if (error) {
      setError(error.message.toLowerCase());
      return;
    }
    setSentNow(true);
  };

  const signInWithGoogle = async () => {
    setPending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(redirectTo),
      },
    });
    if (error) {
      setPending(false);
      setError(error.message.toLowerCase());
    }
  };

  if (sentNow) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        check your inbox for a sign-in link.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        continue with google
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <label className="block space-y-1.5">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            email
          </span>
          <input
            type="email"
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            disabled={pending}
            placeholder="you@example.com"
            {...register("email")}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
          />
        </label>
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-lg bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "sending…" : "send magic link"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
