import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensurePhasesLoaded } from "@/lib/seed/ensure-phases";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  try {
    const result = await ensurePhasesLoaded(supabase, user.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "seed failed" },
      { status: 500 },
    );
  }
}
