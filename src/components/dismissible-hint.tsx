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
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY_PREFIX + storageKey) === "1";
    } catch {
      /* storage blocked: show the hint */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(!dismissed);
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
        aria-label="Dismiss hint"
        className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center rounded-full text-(--muted) transition-colors hover:text-(--foreground) active:bg-(--surface-2)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

export const HINT_KEYS = {
  dashboardTip: "dashboard-tip",
  planDetailStart: "plan-detail-start",
  loggerHowTo: "logger-how-to",
} as const;
