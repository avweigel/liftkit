"use client";

import { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";
type Accent =
  | "amber"
  | "crimson"
  | "rose"
  | "fuchsia"
  | "indigo"
  | "sky"
  | "teal"
  | "emerald"
  | "slate"
  | "rainbow"
  | "vibrant"
  | "pastel"
  | "earthy"
  | "sunset"
  | "ocean";

const MODES: Array<{ value: ThemeMode; label: string; hint: string }> = [
  { value: "system", label: "system", hint: "follow your device" },
  { value: "light", label: "light", hint: "always light" },
  { value: "dark", label: "dark", hint: "always dark" },
];

type AccentPreset = {
  value: Accent;
  label: string;
  group: "warm" | "cool" | "neutral" | "multi";
  hint?: string;
  swatch:
    | { kind: "solid"; light: string; dark: string }
    | { kind: "triad"; colors: [string, string, string] }
    | { kind: "rainbow" };
};

const ACCENTS: AccentPreset[] = [
  // solid — warm
  {
    value: "amber",
    label: "amber",
    group: "warm",
    swatch: { kind: "solid", light: "#ea580c", dark: "#fb923c" },
  },
  {
    value: "crimson",
    label: "crimson",
    group: "warm",
    swatch: { kind: "solid", light: "#dc2626", dark: "#f87171" },
  },
  {
    value: "rose",
    label: "rose",
    group: "warm",
    swatch: { kind: "solid", light: "#e11d48", dark: "#fb7185" },
  },
  {
    value: "fuchsia",
    label: "fuchsia",
    group: "warm",
    swatch: { kind: "solid", light: "#c026d3", dark: "#e879f9" },
  },
  // solid — cool
  {
    value: "indigo",
    label: "indigo",
    group: "cool",
    swatch: { kind: "solid", light: "#4f46e5", dark: "#a5b4fc" },
  },
  {
    value: "sky",
    label: "sky",
    group: "cool",
    swatch: { kind: "solid", light: "#0284c7", dark: "#7dd3fc" },
  },
  {
    value: "teal",
    label: "teal",
    group: "cool",
    swatch: { kind: "solid", light: "#0d9488", dark: "#2dd4bf" },
  },
  {
    value: "emerald",
    label: "emerald",
    group: "cool",
    swatch: { kind: "solid", light: "#059669", dark: "#34d399" },
  },
  // solid — neutral
  {
    value: "slate",
    label: "slate",
    group: "neutral",
    swatch: { kind: "solid", light: "#334155", dark: "#cbd5e1" },
  },
  // multi
  {
    value: "rainbow",
    label: "rainbow",
    group: "multi",
    hint: "violet + teal + rose",
    swatch: { kind: "rainbow" },
  },
  {
    value: "vibrant",
    label: "vibrant",
    group: "multi",
    hint: "electric synthwave",
    swatch: { kind: "triad", colors: ["#ec4899", "#2563eb", "#06b6d4"] },
  },
  {
    value: "pastel",
    label: "pastel",
    group: "multi",
    hint: "soft + airy",
    swatch: { kind: "triad", colors: ["#c4b5fd", "#86efac", "#fbcfe8"] },
  },
  {
    value: "earthy",
    label: "earthy",
    group: "multi",
    hint: "moss, mustard, clay",
    swatch: { kind: "triad", colors: ["#65a30d", "#ca8a04", "#c2410c"] },
  },
  {
    value: "sunset",
    label: "sunset",
    group: "multi",
    hint: "warm sky",
    swatch: { kind: "triad", colors: ["#f97316", "#e11d48", "#7e22ce"] },
  },
  {
    value: "ocean",
    label: "ocean",
    group: "multi",
    hint: "deep water",
    swatch: { kind: "triad", colors: ["#1e40af", "#0d9488", "#06b6d4"] },
  },
];

function swatchBg(
  swatch: AccentPreset["swatch"],
): string {
  if (swatch.kind === "rainbow") {
    return "conic-gradient(from 180deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #8b5cf6, #ec4899, #ef4444)";
  }
  if (swatch.kind === "triad") {
    const [a, b, c] = swatch.colors;
    return `conic-gradient(from 220deg, ${a} 0deg, ${a} 120deg, ${b} 120deg, ${b} 240deg, ${c} 240deg, ${c} 360deg)`;
  }
  return `linear-gradient(135deg, ${swatch.light} 0%, ${swatch.light} 50%, ${swatch.dark} 50%, ${swatch.dark} 100%)`;
}

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
        {(["warm", "cool", "neutral", "multi"] as const).map((group) => {
          const items = ACCENTS.filter((a) => a.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">
                {group === "multi" ? "multi-color palettes" : group}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {items.map((a) => {
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
                        style={{ background: swatchBg(a.swatch) }}
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-bold capitalize ${active ? "text-(--accent)" : ""}`}
                        >
                          {a.label}
                        </span>
                        <span className="block truncate text-[11px] text-(--muted)">
                          {a.hint ?? a.group}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-(--muted)">
          preview
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="h-11 rounded-lg bg-(--accent) px-5 text-sm font-bold text-(--accent-contrast)"
          >
            start phase
          </button>
          <button
            type="button"
            className="h-11 rounded-lg bg-(--accent-2) px-5 text-sm font-bold text-(--accent-2-contrast)"
          >
            log set ✓
          </button>
          <button
            type="button"
            className="h-11 rounded-lg bg-(--accent-3) px-5 text-sm font-bold text-(--accent-3-contrast)"
          >
            finish workout
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="h-9 rounded-lg border border-(--border) bg-(--background) px-4 text-sm font-medium"
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
        <div className="flex items-center gap-2 text-xs text-(--muted)">
          <span className="text-(--muted)">progress bar</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--border)">
            <div className="h-full w-1/2 bg-(--accent-3)" />
          </div>
        </div>
        <p className="text-[11px] text-(--muted)">
          solid themes use one color for everything. rainbow splits into
          three harmonizing hues so the logger feels varied without being
          chaotic.
        </p>
      </section>

      <HintsSection />

      <p className="text-xs text-(--muted)">
        saved on this device only. switching devices will start fresh
        defaults.
      </p>
    </div>
  );
}

function HintsSection() {
  const [done, setDone] = useState(false);

  const resetAll = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("liftkit:hint:")) keys.push(k);
      }
      for (const k of keys) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--muted)">
          hints
        </h2>
        <p className="text-xs text-(--muted)">
          after you dismiss an onboarding tip, it stays hidden on this
          device. tap below to bring them all back.
        </p>
      </div>
      <button
        type="button"
        onClick={resetAll}
        className="h-10 rounded-lg border border-(--border) bg-(--background) px-4 text-sm font-medium"
      >
        {done ? "✓ hints reset" : "show all hints again"}
      </button>
    </section>
  );
}
