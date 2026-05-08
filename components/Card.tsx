import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
  kicker,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  kicker?: string;
}) {
  return (
    <section
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden",
        className,
      )}
    >
      {(title || action || kicker) && (
        <header className="px-6 py-5 flex items-start justify-between border-b border-[var(--color-border)] gap-4">
          <div className="min-w-0">
            {kicker && <div className="kicker mb-1.5">{kicker}</div>}
            {title && (
              <h2 className="serif text-xl font-semibold text-[var(--color-fg)] leading-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[13px] text-[var(--color-muted)] mt-1.5">{subtitle}</p>
            )}
          </div>
          {action ? <div className="flex-shrink-0">{action}</div> : null}
        </header>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}
