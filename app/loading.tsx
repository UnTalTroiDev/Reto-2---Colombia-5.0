export default function Loading() {
  return (
    <div className="space-y-12 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2">
        <div className="lg:col-span-7 space-y-3">
          <div className="h-3 w-40 bg-[var(--color-surface-2)]" />
          <div className="h-12 w-full bg-[var(--color-surface-2)]" />
          <div className="h-12 w-3/4 bg-[var(--color-surface-2)]" />
          <div className="h-4 w-2/3 bg-[var(--color-surface-2)] mt-4" />
        </div>
        <div className="lg:col-span-5">
          <div className="h-3 w-32 bg-[var(--color-surface-2)] mb-3" />
          <div className="h-24 w-full bg-[var(--color-surface-2)]" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-[var(--color-surface)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-80 border border-[var(--color-border)] bg-[var(--color-surface)]" />
        ))}
      </div>
      <div className="text-center text-[11px] kicker">Cargando datos en vivo · datos.gov.co</div>
    </div>
  );
}
