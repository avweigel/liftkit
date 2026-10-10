import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in | LiftKit",
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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-4 pb-10">
      <div className="flex flex-1 flex-col justify-center space-y-8 py-8">
        <PageHeader
          eyebrow="LiftKit"
          title="Sign in"
          subtitle="Use Google or get a link by email. There is no password to remember."
        />
        <LoginForm
          redirectTo={params.redirectTo}
          error={params.error}
          sent={params.sent === "1"}
        />
        <p className="px-1 text-[14px] text-(--muted)">
          Once you are in, import a plan from a Google Sheet or start a workout without one.
        </p>
      </div>
    </main>
  );
}
