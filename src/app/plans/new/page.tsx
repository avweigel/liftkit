import type { Metadata } from "next";
import { ImportForm } from "./import-form";

export const metadata: Metadata = {
  title: "import plan · liftkit",
};

export default function NewPlanPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">import a plan</h1>
        <p className="text-sm text-zinc-500">
          paste a google sheet url, or paste the csv directly. required columns:
          week, day, day_name, exercise, sets, reps, weight, rest_sec, notes.
        </p>
      </header>
      <ImportForm />
    </main>
  );
}
