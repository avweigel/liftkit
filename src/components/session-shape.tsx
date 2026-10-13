// a session at a glance: one bar per step, width by time, height by effort
export function SessionShape({
  steps,
  className = "h-8 w-full",
}: {
  steps: Array<{ seconds: number; level: number }>;
  className?: string;
}) {
  const total = steps.reduce((n, s) => n + s.seconds, 0) || 1;
  return (
    <div className={`flex items-end gap-px ${className}`} aria-hidden>
      {steps.map((s, i) => (
        <span
          key={i}
          className="rounded-[2px] bg-(--accent)"
          style={{
            flexGrow: s.seconds / total,
            flexBasis: 0,
            height: `${Math.max(14, (s.level / 9) * 100)}%`,
            opacity: 0.3 + (s.level / 9) * 0.7,
          }}
        />
      ))}
    </div>
  );
}
