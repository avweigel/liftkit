"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export type Unit = "lb" | "kg";

const LB_PER_KG = 2.20462;

// weights are stored in the lifter's profile unit. entry can happen in
// either unit, because one gym can have kg plates next to lb dumbbells.
export const BaseUnitContext = createContext<Unit>("lb");

export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const raw = from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
  // kg reads cleanly in halves; stored lb keeps a decimal so a kg entry
  // comes back exactly when shown in kg again
  return to === "kg" ? Math.round(raw * 2) / 2 : Math.round(raw * 10) / 10;
}

export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

const listeners = new Set<() => void>();
const storageKey = (exerciseId: string) => `liftkit.unit.${exerciseId}`;

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readUnit(exerciseId: string): Unit | null {
  try {
    const v = window.localStorage.getItem(storageKey(exerciseId));
    return v === "kg" || v === "lb" ? v : null;
  } catch {
    return null;
  }
}

// the unit you last entered an exercise in sticks for that exercise on this
// phone, so a kg machine stays kg next week
export function useEntryUnit(exerciseId: string): [Unit, (u: Unit) => void] {
  const base = useContext(BaseUnitContext);
  const unit = useSyncExternalStore(
    subscribe,
    () => readUnit(exerciseId) ?? base,
    () => base,
  );
  const set = (u: Unit) => {
    try {
      if (u === base) window.localStorage.removeItem(storageKey(exerciseId));
      else window.localStorage.setItem(storageKey(exerciseId), u);
    } catch {}
    listeners.forEach((l) => l());
  };
  return [unit, set];
}
