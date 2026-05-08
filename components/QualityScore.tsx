import { cn } from "@/lib/utils";

export function QualityScore({ score, size = 180 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color =
    clamped >= 75 ? "var(--color-success)" : clamped >= 50 ? "var(--color-warn)" : "var(--color-danger)";
  const label = clamped >= 75 ? "Limpio" : clamped >= 50 ? "Mixto" : "Sucio";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score de calidad de datos: ${Math.round(clamped)} de 100, veredicto ${label}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-[42px] font-medium tabular-nums leading-none">
          {Math.round(clamped)}
        </div>
        <div
          className={cn("kicker mt-2")}
          style={{ color }}
          aria-hidden
        >
          {label}
        </div>
      </div>
    </div>
  );
}
