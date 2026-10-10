import Link from "next/link";
import type { ReactNode } from "react";

// one header shape for every screen: an optional back link, a narrow
// display title, an optional line under it and an optional action.
export function PageHeader({
  title,
  subtitle,
  back,
  action,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="space-y-1 pt-[max(env(safe-area-inset-top),0.5rem)]">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 inline-flex h-9 items-center gap-1 rounded-lg px-1 text-[15px] font-medium text-(--muted) hover:text-(--foreground)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="label mb-1">{eyebrow}</div>}
          <h1 className="display text-[34px]">{title}</h1>
        </div>
        {action && <div className="shrink-0 pb-1">{action}</div>}
      </div>
      {subtitle && <p className="text-[15px] text-(--muted)">{subtitle}</p>}
    </header>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <h2 className="display text-[22px]">{children}</h2>
      {action}
    </div>
  );
}
