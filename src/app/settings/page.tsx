import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeControls } from "./theme-controls";

export const metadata: Metadata = {
  title: "Settings | LiftKit",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-8 px-4 pt-4 pb-tabbar">
      <PageHeader title="Settings" />

      <ThemeControls />

      {user && (
        <section className="space-y-3">
          <SectionTitle>Account</SectionTitle>
          <div className="card space-y-4 p-4">
            <div className="min-w-0">
              <div className="label">Signed in as</div>
              <div className="mt-0.5 truncate text-[16px]">{user.email}</div>
            </div>
            <SignOutButton />
          </div>
        </section>
      )}
    </main>
  );
}
