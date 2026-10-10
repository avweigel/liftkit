"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/page-header";

type ThemeMode = "system" | "light" | "dark";
type Accent = "dawn" | "fjord" | "lingon";

const THEME_KEY = "liftkit:theme";
const ACCENT_KEY = "liftkit:accent";

const MODES: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// swatch colours mirror the --accent values in globals.css. a swatch can't
// read them from a data-accent attribute because dawn is the absence of one.
const ACCENTS: Array<{ value: Accent; label: string; hint: string; swatch: string }> = [
  {
    value: "dawn",
    label: "Dawn",
    hint: "Warm amber, the default",
    swatch: "light-dark(#c25e1c, #ffb067)",
  },
  {
    value: "fjord",
    label: "Fjord",
    hint: "Cool sea blue",
    swatch: "light-dark(#0f6f88, #6cd0e2)",
  },
  {
    value: "lingon",
    label: "Lingon",
    hint: "Berry red",
    swatch: "light-dark(#b52f56, #ff8fae)",
  },
];

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function readAccent(): Accent {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    return v === "fjord" || v === "lingon" ? v : "dawn";
  } catch {
    return "dawn";
  }
}

// the init script in layout.tsx reads these keys before paint; it only
// honours fjord and lingon, so "dawn" is stored but leaves no attribute
function persistMode(next: ThemeMode) {
  const root = document.documentElement;
  if (next === "system") delete root.dataset.theme;
  else root.dataset.theme = next;
  try {
    if (next === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage blocked: the change still applies until reload */
  }
}

function persistAccent(next: Accent) {
  const root = document.documentElement;
  if (next === "dawn") delete root.dataset.accent;
  else root.dataset.accent = next;
  try {
    localStorage.setItem(ACCENT_KEY, next);
  } catch {
    /* storage blocked: the change still applies until reload */
  }
}

export function ThemeControls() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<Accent>("dawn");

  useEffect(() => {
    // localStorage is only readable after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(readMode());
    setAccent(readAccent());
  }, []);

  const applyMode = (next: ThemeMode) => {
    setMode(next);
    persistMode(next);
  };

  const applyAccent = (next: Accent) => {
    setAccent(next);
    persistAccent(next);
  };

  return (
    <>
      <section className="space-y-3">
        <SectionTitle>Appearance</SectionTitle>
        <div className="card space-y-5 p-4">
          <div className="space-y-2">
            <div className="label">Theme</div>
            <div
              role="radiogroup"
              aria-label="Theme"
              className="grid grid-cols-3 gap-1 rounded-[14px] bg-(--surface-2) p-1"
            >
              {MODES.map((m) => {
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => applyMode(m.value)}
                    className={`h-11 rounded-[11px] text-[15px] font-semibold transition-colors ${
                      active
                        ? "bg-(--surface) text-(--foreground) shadow-sm"
                        : "text-(--muted)"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="label">Accent</div>
            <div role="radiogroup" aria-label="Accent" className="space-y-2">
              {ACCENTS.map((a) => {
                const active = accent === a.value;
                return (
                  <button
                    key={a.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => applyAccent(a.value)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-[12px] border px-3 text-left transition-colors ${
                      active
                        ? "border-(--accent-line) bg-(--accent-soft)"
                        : "border-(--border) bg-(--surface)"
                    }`}
                  >
                    <span
                      className="h-7 w-7 shrink-0 rounded-full"
                      style={{ background: a.swatch }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-medium">
                        {a.label}
                      </span>
                      <span className="block text-[13px] text-(--muted)">
                        {a.hint}
                      </span>
                    </span>
                    {active && <Check />}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[13px] text-(--faint)">
            Saved on this device only.
          </p>
        </div>
      </section>

      <HintsSection />
    </>
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
    <section className="space-y-3">
      <SectionTitle>Hints</SectionTitle>
      <div className="card space-y-4 p-4">
        <p className="text-[15px] text-(--muted)">
          Tips you dismissed stay hidden on this device. Bring them back if
          you want a refresher.
        </p>
        <button
          type="button"
          onClick={resetAll}
          className="btn btn-secondary btn-block"
        >
          {done ? "Hints are back" : "Show all hints again"}
        </button>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg
      className="shrink-0 text-(--accent)"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
