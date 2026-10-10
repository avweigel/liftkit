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

function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function LoginForm({ redirectTo, error: initialError, sent }: Props) {
  const supabase = createClient();
  const [pending, setPending] = useState(false);
  const [sentNow, setSentNow] = useState(sent ?? false);
  const [sentTo, setSentTo] = useState<string | null>(null);
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
      setError(sentenceCase(error.message));
      return;
    }
    setSentTo(email);
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
      setError(sentenceCase(error.message));
    }
  };

  if (sentNow) {
    return (
      <div className="card space-y-4 p-5">
        <div className="space-y-1">
          <p className="display text-[20px]">Check your email</p>
          <p className="text-[15px] text-(--muted)">
            {sentTo ? (
              <>
                We sent a sign-in link to{" "}
                <span className="font-medium text-(--foreground)">{sentTo}</span>.
                Open it on this device to continue.
              </>
            ) : (
              "We sent you a sign-in link. Open it on this device to continue."
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSentNow(false)}
          className="btn btn-secondary btn-block"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-5 p-5">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        className="btn btn-secondary btn-block"
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-(--border)" />
        <span className="label">or</span>
        <span className="h-px flex-1 bg-(--border)" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <label className="block space-y-1.5">
          <span className="label">Email</span>
          <input
            type="email"
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            disabled={pending}
            placeholder="you@example.com"
            {...register("email")}
            className="h-12 w-full rounded-[12px] border border-(--border) bg-(--surface-2) px-3.5 text-(--foreground) outline-none transition-colors placeholder:text-(--faint) focus:border-(--accent) disabled:opacity-60"
          />
        </label>
        {errors.email?.message && (
          <p className="text-[14px] text-(--danger)">
            {sentenceCase(errors.email.message)}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-block"
        >
          {pending ? "Sending link" : "Email me a sign-in link"}
        </button>
      </form>

      {error && <p className="text-[14px] text-(--danger)">{error}</p>}
    </div>
  );
}
