import { createClient } from "@/lib/supabase/server";
import { ExerciseBrowser } from "./exercise-browser";
import { NormalizeButton } from "./normalize-button";

type Row = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string;
  owner_id: string | null;
};

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: library } = await supabase
    .from("exercises")
    .select("id,name,primary_muscle,equipment,owner_id")
    .or(`owner_id.is.null,owner_id.eq.${user!.id}`)
    .order("name")
    .returns<Row[]>();

  const items = (library ?? []).map((r) => ({
    ...r,
    mine: r.owner_id === user!.id,
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">exercises</h1>
        <p className="text-sm text-(--muted)">
          tap one to see how your numbers have moved.
        </p>
      </header>
      {items.some((i) => i.mine) && <NormalizeButton />}
      <ExerciseBrowser items={items} />
    </main>
  );
}
