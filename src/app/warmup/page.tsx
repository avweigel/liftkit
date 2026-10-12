import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { RoutineScreen } from "@/components/routines/routine-screen";
import { routineStatus, todayKind } from "@/lib/program/today-kind";
import { localToday } from "@/lib/local-date";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ kind, dayName }, status] = await Promise.all([
    todayKind(supabase, user.id),
    routineStatus(supabase, user.id, "warmup"),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 pt-4 pb-tabbar">
      <PageHeader
        back={{ href: "/", label: "Today" }}
        eyebrow={dayName ?? undefined}
        title="Warm-up"
        subtitle="About 10 minutes before you lift."
      />
      <RoutineScreen routine="warmup" kind={kind} dayKey={`day-${localToday().iso}`} status={status} />
    </main>
  );
}
