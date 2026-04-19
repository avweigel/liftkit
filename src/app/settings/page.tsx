import type { Metadata } from "next";
import Link from "next/link";
import { ThemeControls } from "./theme-controls";

export const metadata: Metadata = {
  title: "settings · liftkit",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-3 py-5 sm:px-6 sm:py-10">
      <header className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-(--muted) hover:text-(--foreground)"
        >
          ← home
        </Link>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          settings
        </h1>
      </header>

      <ThemeControls />
    </main>
  );
}
