"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", icon: TodayIcon, match: (p: string) => p === "/" },
  { href: "/plans", label: "Plans", icon: PlansIcon, match: (p: string) => p.startsWith("/plans") },
  { href: "/exercises", label: "Progress", icon: ProgressIcon, match: (p: string) => p.startsWith("/exercises") },
  { href: "/settings", label: "Settings", icon: SettingsIcon, match: (p: string) => p.startsWith("/settings") },
] as const;

export function TabBar() {
  const pathname = usePathname() ?? "/";
  // the workout logger is a focus screen with its own bottom bar
  if (pathname.startsWith("/log/") || pathname.startsWith("/login")) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-(--border) bg-(--background)/92 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-(--tabbar-h) max-w-lg grid-cols-4">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  active ? "text-(--accent)" : "text-(--muted) hover:text-(--foreground)"
                }`}
              >
                <Icon active={active} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { active: boolean };

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// a sun on the horizon: the 5 am start
function TodayIcon({ active }: IconProps) {
  return (
    <svg {...base}>
      <path d="M3 18h18" />
      <path d="M7 18a5 5 0 0 1 10 0" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.2 : 0} />
      <path d="M12 6v2.5M5.6 9.6l1.7 1.7M18.4 9.6l-1.7 1.7" />
    </svg>
  );
}

function PlansIcon({ active }: IconProps) {
  return (
    <svg {...base}>
      <rect x="4" y="4.5" width="16" height="15" rx="3" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <path d="M8 9h8M8 12.5h8M8 16h5" />
    </svg>
  );
}

function ProgressIcon({ active }: IconProps) {
  return (
    <svg {...base}>
      <path d="M4 19h16" />
      <path d="M5 15l4.5-4.5 3.5 3L19 7.5" strokeWidth={active ? 2.4 : 1.8} />
      <path d="M15 7.5h4v4" />
    </svg>
  );
}

function SettingsIcon({ active }: IconProps) {
  return (
    <svg {...base}>
      <path d="M5 7h9M18 7h1M5 12h3M12 12h7M5 17h11M20 17h-1" />
      <circle cx="16" cy="7" r="2" fill={active ? "currentColor" : "none"} />
      <circle cx="10" cy="12" r="2" fill={active ? "currentColor" : "none"} />
      <circle cx="18" cy="17" r="2" fill={active ? "currentColor" : "none"} />
    </svg>
  );
}
