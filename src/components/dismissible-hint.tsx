"use client";

import { useEffect, useState } from "react";

const KEY_PREFIX = "liftkit:hint:";

export function DismissibleHint({
  storageKey,
  children,
  className = "",
}: {
  storageKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  // null = not yet hydrated; we render nothing on the server and during
  // the first client frame so dismissed hints don't flash into view.
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const dismissed =
        localStorage.getItem(KEY_PREFIX + storageKey) === "1";
      setShow(!dismissed);
    } catch {
      setShow(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY_PREFIX + storageKey, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (show !== true) return null;

  return (
    <div className={`relative ${className}`}>
      {children}
      <button
        type="button"
        onClick={dismiss}
        aria-label="dismiss hint"
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-(--muted) hover:bg-(--border) hover:text-(--foreground)"
      >
        ×
      </button>
    </div>
  );
}

export const HINT_KEYS = {
  dashboardTip: "dashboard-tip",
  planDetailStart: "plan-detail-start",
  loggerHowTo: "logger-how-to",
} as const;
