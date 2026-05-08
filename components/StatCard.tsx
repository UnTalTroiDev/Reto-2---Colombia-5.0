import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warn" | "danger" | "accent";
  icon?: React.ReactNode;
  className?: string;
};

const TONE: Record<NonNullable<Props["tone"]>, { ring: string; bar: string; valueColor: string }> = {
  default: {
    ring: "border-[var(--color-border)]",
    bar: "bg-[var(--color-fg-2)]",
    valueColor: "text-[var(--color-fg)]",
  },
  success: {
    ring: "border-[var(--color-success)]/40",
    bar: "bg-[var(--color-success)]",
    valueColor: "text-[var(--color-fg)]",
  },
  warn: {
    ring: "border-[var(--color-warn)]/40",
    bar: "bg-[var(--color-warn)]",
    valueColor: "text-[var(--color-warn)]",
  },
  danger: {
    ring: "border-[var(--color-danger)]/40",
    bar: "bg-[var(--color-danger)]",
    valueColor: "text-[var(--color-danger)]",
  },
  accent: {
    ring: "border-[var(--color-accent)]/40",
    bar: "bg-[var(--color-accent)]",
    valueColor: "text-[var(--color-fg)]",
  },
};

export function StatCard({ label, value, hint, tone = "default", icon, className }: Props) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        "relative bg-[var(--color-surface)] border-l-2 border-y border-r border-[var(--color-border)] p-5 group transition-colors hover:border-[var(--color-border-strong)]",
        t.ring,
        className,
      )}
      role="figure"
      aria-label={`${label}: ${value}`}
    >
      <span className={cn("absolute left-0 top-0 bottom-0 w-[2px]", t.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="kicker">{label}</div>
        {icon ? <div className="text-[var(--color-muted)]" aria-hidden>{icon}</div> : null}
      </div>
      <div
        className={cn(
          "font-mono text-[28px] leading-tight font-medium mt-3 tabular-nums tracking-tight",
          t.valueColor,
        )}
      >
        {value}
      </div>
      {hint ? <div className="text-[12px] text-[var(--color-muted)] mt-1.5">{hint}</div> : null}
    </div>
  );
}
