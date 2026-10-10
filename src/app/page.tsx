import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "./dashboard";
import { PageHeader } from "@/components/page-header";

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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center space-y-8 px-4 pt-4 pb-tabbar">
      <PageHeader
        eyebrow="LiftKit"
        title="Your training journal"
        subtitle="Import a plan from a Google Sheet, log every set on your phone and see your numbers climb."
      />

      <div className="space-y-3">
        <Link href="/login" className="btn btn-primary btn-block">
          Sign in
        </Link>
        <p className="text-center text-[14px] text-(--muted)">
          Google or an email link. No password to remember.
        </p>
      </div>

      <ul className="card divide-y divide-(--border)">
        <LandingPoint title="Bring your plan">
          Paste a Google Sheet link with weeks, days, sets and reps. LiftKit
          turns it into workouts.
        </LandingPoint>
        <LandingPoint title="Log from the bench">
          Big tap targets, last time&rsquo;s numbers beside each set, and every
          set saves as you go.
        </LandingPoint>
        <LandingPoint title="See the trend">
          Best weight, reps and volume for every exercise, with a chart of
          your top sets.
        </LandingPoint>
      </ul>
    </main>
  );
}

function LandingPoint({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="space-y-1 p-4">
      <div className="display text-[18px]">{title}</div>
      <p className="text-[15px] text-(--muted)">{children}</p>
    </li>
  );
}
