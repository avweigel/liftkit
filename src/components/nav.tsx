import { createClient } from "@/lib/supabase/server";
import { TabBar } from "./tab-bar";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return <TabBar />;
}
