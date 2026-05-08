import { Card } from "@/components/Card";
import { QualityScore } from "@/components/QualityScore";
import { StatCard } from "@/components/StatCard";
import { analyzeSample } from "@/lib/quality";
import { sample } from "@/lib/socrata";
import { formatNumber, formatPct } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calidad de datos · SECOP Dashboard",
  description:
    "Análisis estadístico de calidad de datos sobre el dataset SECOP II — nulos, duplicados, placeholders y tipos inconsistentes.",
};

export const dynamic = "force-dynamic";

const SAMPLE_SIZE = 5000;

const SEVERITY_TONE: Record<"high" | "medium" | "low", string> = {
  high: "bg-red-500/15 text-red-300 ring-red-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};

const TYPE_TONE: Record<string, string> = {
  text: "bg-violet-500/10 text-violet-300",
  number: "bg-cyan-500/10 text-cyan-300",
  date: "bg-amber-500/10 text-amber-300",
  url: "bg-pink-500/10 text-pink-300",
  bool: "bg-emerald-500/10 text-emerald-300",
  unknown: "bg-zinc-500/10 text-zinc-300",
};

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{ size?: string }>;
}) {
  const { size } = await searchParams;
  const sampleSize = Math.min(Math.max(Number(size) || SAMPLE_SIZE, 500), 50000);
  const rows = await sample<Record<string, unknown>>(sampleSize);
  const report = analyzeSample(rows);

  const verdict =
    report.qualityScore >= 75
      ? { label: "Datos LIMPIOS", tone: "success" as const, msg: "El dataset está en buen estado general." }
      : report.qualityScore >= 50
        ? { label: "Datos MIXTOS", tone: "warn" as const, msg: "Hay problemas de calidad significativos en algunos campos." }
        : { label: "Datos SUCIOS", tone: "danger" as const, msg: "Múltiples problemas de calidad detectados — requiere limpieza antes de análisis." };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Calidad de datos</h1>
        <p className="text-[var(--color-muted)] mt-2 max-w-2xl">
          Análisis estadístico sobre una muestra de{" "}
          <span className="text-[var(--color-fg)] font-medium">
            {formatNumber(sampleSize)} filas
          </span>{" "}
          (de 5.6M totales). Detecta nulos, duplicados, placeholders ("No Definido", "N/A"),
          valores fuera de rango y tipos inconsistentes.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-8 flex-wrap">
          <QualityScore score={report.qualityScore} />
          <div className="flex-1 min-w-[280px]">
            <div className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Veredicto
            </div>
            <div className="text-2xl font-semibold mt-1">{verdict.label}</div>
            <p className="text-sm text-[var(--color-muted)] mt-2 max-w-md">{verdict.msg}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1 min-w-[300px]">
            <StatCard
              label="Issues altos"
              value={String(report.issuesBySeverity.high)}
              tone={report.issuesBySeverity.high > 0 ? "danger" : "default"}
            />
            <StatCard
              label="Issues medios"
              value={String(report.issuesBySeverity.medium)}
              tone={report.issuesBySeverity.medium > 0 ? "warn" : "default"}
            />
            <StatCard
              label="Issues bajos"
              value={String(report.issuesBySeverity.low)}
              tone="default"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          label="Filas analizadas"
          value={formatNumber(report.totalRows)}
          hint={`Muestra de ${formatNumber(sampleSize)}`}
        />
        <StatCard
          label="Campos por fila"
          value={String(report.fieldCount)}
          hint="Columnas del dataset"
        />
        <StatCard
          label="Filas duplicadas"
          value={`${report.duplicateRows} (${formatPct(report.duplicateRowPct)})`}
          hint="Por id_contrato"
          tone={report.duplicateRowPct > 0.01 ? "danger" : "success"}
        />
      </div>

      <Card title="Top problemas detectados" subtitle="Los más relevantes para tu formulario">
        {report.topIssues.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Sin problemas relevantes.</p>
        ) : (
          <ul className="space-y-2">
            {report.topIssues.map((iss, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg ring-1 ${SEVERITY_TONE[iss.severity]}`}
              >
                <span className="text-[10px] uppercase tracking-wider font-bold mt-0.5 px-1.5 py-0.5 rounded bg-black/30">
                  {iss.severity}
                </span>
                <div className="flex-1">
                  <div className="font-mono text-xs opacity-80">{iss.field}</div>
                  <div className="text-sm mt-0.5">{iss.issue}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Análisis por campo" subtitle="Ordenado por % de nulos descendente">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-[var(--color-muted)] border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-5 font-medium">Campo</th>
                <th className="text-left py-3 px-2 font-medium">Tipo</th>
                <th className="text-right py-3 px-2 font-medium">Nulos</th>
                <th className="text-right py-3 px-2 font-medium">Únicos</th>
                <th className="text-right py-3 px-2 font-medium">Placeholders</th>
                <th className="text-left py-3 px-5 font-medium">Ejemplos</th>
              </tr>
            </thead>
            <tbody>
              {report.fields.map((f) => (
                <tr
                  key={f.field}
                  className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)]/50"
                >
                  <td className="py-2.5 px-5 font-mono text-xs">{f.field}</td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${TYPE_TONE[f.type]}`}
                    >
                      {f.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    <span
                      className={
                        f.nullPct > 0.5
                          ? "text-red-400"
                          : f.nullPct > 0.2
                            ? "text-amber-400"
                            : "text-[var(--color-muted)]"
                      }
                    >
                      {formatPct(f.nullPct)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-[var(--color-muted)]">
                    {formatNumber(f.uniqueCount)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {f.placeholderCount > 0 ? (
                      <span className="text-amber-400">{formatNumber(f.placeholderCount)}</span>
                    ) : (
                      <span className="text-[var(--color-muted)]">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-5 text-xs text-[var(--color-muted)] truncate max-w-[280px]">
                    {f.sampleValues.slice(0, 3).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Metodología</summary>
          <div className="mt-3 space-y-2 text-[var(--color-muted)] leading-relaxed">
            <p>
              Se descarga una muestra ordenada por <code>:id</code> (orden de inserción) usando la
              API SODA v2 de datos.gov.co. Sobre esa muestra se calcula:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Nulos / vacíos:</strong> valores <code>null</code> y strings vacíos.
              </li>
              <li>
                <strong>Placeholders:</strong> valores como "No Definido", "N/A", "Sin definir".
              </li>
              <li>
                <strong>Duplicados:</strong> repeticiones de <code>id_contrato</code>.
              </li>
              <li>
                <strong>Valores numéricos negativos</strong> en campos monetarios.
              </li>
              <li>
                <strong>Fechas inválidas</strong> en campos de fecha.
              </li>
            </ul>
            <p>
              Score = 100 − (8 × issues altos) − (3 × issues medios) − (0.5 × issues bajos),
              limitado al rango 0–100.
            </p>
            <p>
              Para muestras más grandes, agregar <code>?size=20000</code> a la URL (máx 50.000).
            </p>
          </div>
        </details>
      </Card>
    </div>
  );
}
