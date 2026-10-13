"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import {
  localizeDistance,
  weightUnitFor,
  type Measurement,
  type Unit,
} from "./units-core";

export {
  convert,
  formatWeight,
  localizeDistance,
  weightUnitFor,
  type Measurement,
  type Unit,
} from "./units-core";

// how numbers are shown, from Settings. separate from the stored unit below,
// so switching never rewrites anything you've logged.
export const MeasurementContext = createContext<Measurement>("metric");

export function useShownUnit(): Unit {
  return weightUnitFor(useContext(MeasurementContext));
}

export function useLocalizeDistance(): (text: string) => string {
  const m = useContext(MeasurementContext);
  return (text) => localizeDistance(text, m);
}

// weights are stored in the lifter's profile unit. entry can happen in
// either unit, because one gym can have kg plates next to lb dumbbells.
export const BaseUnitContext = createContext<Unit>("lb");

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
  const shown = useShownUnit();
  const unit = useSyncExternalStore(
    subscribe,
    () => readUnit(exerciseId) ?? shown,
    () => shown,
  );
  const set = (u: Unit) => {
    try {
      if (u === shown) window.localStorage.removeItem(storageKey(exerciseId));
      else window.localStorage.setItem(storageKey(exerciseId), u);
    } catch {}
    listeners.forEach((l) => l());
  };
  return [unit, set];
}
