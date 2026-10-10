import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ImportForm } from "./import-form";

export const metadata: Metadata = {
  title: "Import a plan, LiftKit",
};

export default function NewPlanPage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 pt-4 pb-tabbar">
      <PageHeader
        title="Import a plan"
        subtitle="Paste a Google Sheet link or the CSV itself. You'll see a preview before anything is saved."
        back={{ href: "/plans", label: "Plans" }}
      />
      <ImportForm />
    </main>
  );
}
