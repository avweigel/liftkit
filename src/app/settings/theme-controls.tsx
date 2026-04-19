"use client";

import { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";
type Accent = "amber" | "crimson" | "indigo" | "teal" | "rose" | "slate";

const MODES: Array<{ value: ThemeMode; label: string; hint: string }> = [
  { value: "system", label: "system", hint: "follow your device" },
  { value: "light", label: "light", hint: "always light" },
  { value: "dark", label: "dark", hint: "always dark" },
];

type AccentPreset = {
  value: Accent;
  label: string;
  group: "warm" | "cool" | "neutral";
  swatch: { light: string; dark: string };
};

const ACCENTS: AccentPreset[] = [
  {
    value: "amber",
    label: "amber",
    group: "warm",
    swatch: { light: "#ea580c", dark: "#fb923c" },
  },
  {
    value: "crimson",
    label: "crimson",
    group: "warm",
    swatch: { light: "#dc2626", dark: "#f87171" },
  },
  {
    value: "rose",
    label: "rose",
    group: "warm",
    swatch: { light: "#e11d48", dark: "#fb7185" },
  },
  {
    value: "indigo",
    label: "indigo",
    group: "cool",
    swatch: { light: "#4f46e5", dark: "#a5b4fc" },
  },
  {
    value: "teal",
    label: "teal",
    group: "cool",
    swatch: { light: "#0d9488", dark: "#2dd4bf" },
  },
  {
    value: "slate",
    label: "slate",
    group: "neutral",
    swatch: { light: "#334155", dark: "#cbd5e1" },
  },
];

export function ThemeControls() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<Accent>("amber");

  useEffect(() => {
    try {
      const m = (localStorage.getItem("liftkit:theme") as ThemeMode) ?? "system";
      const a = (localStorage.getItem("liftkit:accent") as Accent) ?? "amber";
      setMode(m);
      setAccent(a);
    } catch {
      /* ignore */
    }
  }, []);

  const applyMode = (next: ThemeMode) => {
    setMode(next);
    const root = document.documentElement;
    if (next === "system") {
      delete root.dataset.theme;
      try {
        localStorage.removeItem("liftkit:theme");
      } catch {
        /* ignore */
      }
    } else {
      root.dataset.theme = next;
      try {
        localStorage.setItem("liftkit:theme", next);
      } catch {
        /* ignore */
      }
    }
  };

  const applyAccent = (next: Accent) => {
    setAccent(next);
    const root = document.documentElement;
    if (next === "amber") {
      delete root.dataset.accent;
      try {
        localStorage.removeItem("liftkit:accent");
      } catch {
        /* ignore */
      }
    } else {
      root.dataset.accent = next;
      try {
        localStorage.setItem("liftkit:accent", next);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
            theme
          </h2>
          <p className="text-xs text-(--muted)">
            choose light, dark, or follow your phone&apos;s setting.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => applyMode(m.value)}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-(--accent) bg-(--accent-soft)"
                    : "border-(--border) bg-(--surface) hover:border-(--accent)"
                }`}
              >
                <span
                  className={`text-sm font-bold ${active ? "text-(--accent)" : ""}`}
                >
                  {m.label}
                </span>
                <span className="text-[11px] text-(--muted)">{m.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
            accent color
          </h2>
          <p className="text-xs text-(--muted)">
            colors the buttons, active state, and progress elements.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACCENTS.map((a) => {
            const active = accent === a.value;
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => applyAccent(a.value)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-(--accent) bg-(--accent-soft)"
                    : "border-(--border) bg-(--surface) hover:border-(--accent)"
                }`}
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${a.swatch.light} 0%, ${a.swatch.light} 50%, ${a.swatch.dark} 50%, ${a.swatch.dark} 100%)`,
                  }}
                />
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-bold capitalize ${active ? "text-(--accent)" : ""}`}
                  >
                    {a.label}
                  </span>
                  <span className="block text-[11px] text-(--muted) capitalize">
                    {a.group}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-(--muted)">
          preview
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="h-11 rounded-lg bg-(--accent) px-5 text-sm font-bold text-(--accent-contrast)"
          >
            primary action
          </button>
          <button
            type="button"
            className="h-11 rounded-lg border border-(--border) bg-(--background) px-4 text-sm font-medium"
          >
            secondary
          </button>
          <span className="inline-flex items-center rounded-full bg-(--accent-soft) px-3 py-1 text-xs font-bold text-(--accent)">
            active pill
          </span>
          <span className="inline-flex items-center rounded-full bg-(--ok)/15 px-3 py-1 text-xs font-bold text-(--ok)">
            finished
          </span>
        </div>
      </section>
    </div>
  );
}
