import { Card } from "@/components/Card";
import { soda } from "@/lib/socrata";
import { evaluateContract, type ContractRow } from "@/lib/risk-signals";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "GobIA Auditor · Riesgo de contratación SECOP II",
  description:
    "Agente AI que analiza contratos públicos de SECOP II y genera un score de riesgo con señales de alerta. Usa Cerebras (Qwen 3 OSS) para análisis cualitativo en español.",
};

export const dynamic = "force-dynamic";

type SP = {
  departamento?: string;
  sector?: string;
  modalidad?: string;
  valor_min?: string;
};

function escapeSoql(s: string): string {
  return s.replace(/'/g, "''");
}

export default async function AuditorPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const key = JSON.stringify(sp);

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2">
        <div className="lg:col-span-8">
          <div className="kicker mb-3">
            Volumen 2 · Agente auditor · IA
          </div>
          <h1 className="serif text-[40px] md:text-[52px] leading-[1.05] font-semibold tracking-tight text-[var(--color-fg)]">
            GobIA <span className="text-[var(--color-accent)]">Auditor</span> — un agente que lee SECOP II por ti.
          </h1>
          <p className="text-[15px] text-[var(--color-fg-2)] mt-5 max-w-2xl leading-relaxed">
            Combinamos un motor de{" "}
            <em className="text-[var(--color-accent-2)] not-italic font-mono text-[13px]">
              señales heurísticas determinísticas
            </em>{" "}
            (modalidad, concentración, valor atípico, plazos, transparencia) con un{" "}
            <em className="text-[var(--color-accent-2)] not-italic font-mono text-[13px]">
              LLM open-source
            </em>{" "}
            (Qwen 3 235B en Cerebras) que lee el objeto del contrato y aporta el análisis cualitativo
            que las reglas no capturan. Cobertura nacional, datos vivos.
          </p>
        </div>
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
            <div className="kicker">Cómo funciona</div>
            <ol className="mt-3 space-y-2 text-[13px] text-[var(--color-fg-2)] list-decimal pl-5">
              <li>Filtramos los contratos de mayor riesgo potencial vía SODA.</li>
              <li>Cada uno corre por el motor heurístico (score 0–100).</li>
              <li>Click en uno: el LLM genera análisis + recomendación.</li>
            </ol>
          </div>
        </div>
      </section>

      <div className="rule" />

      <Suspense key={`form-${key}`} fallback={<FilterSkeleton />}>
        <FilterForm sp={sp} />
      </Suspense>

      <Suspense key={`board-${key}`} fallback={<LeaderboardSkeleton />}>
        <Leaderboard sp={sp} />
      </Suspense>
    </div>
  );
}

async function FilterForm({ sp }: { sp: SP }) {
  const [departamentos, sectores] = await Promise.all([
    soda<{ departamento: string }>({
      $select: "departamento",
      $group: "departamento",
      $order: "departamento",
      $limit: 50,
    }),
    soda<{ sector: string }>({
      $select: "sector",
      $group: "sector",
      $order: "sector",
      $limit: 30,
    }),
  ]);

  return (
    <Card kicker="Filtros" title="Buscar contratos de mayor riesgo">
      <form
        className="grid grid-cols-1 md:grid-cols-5 gap-3"
        role="search"
        aria-label="Filtros del leaderboard de riesgo"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Departamento
          </span>
          <select
            name="departamento"
            defaultValue={sp.departamento ?? ""}
            className="px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">Toda Colombia</option>
            {departamentos
              .filter((d) => d.departamento)
              .map((d) => (
                <option key={d.departamento} value={d.departamento}>
                  {d.departamento}
                </option>
              ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Sector</span>
          <select
            name="sector"
            defaultValue={sp.sector ?? ""}
            className="px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">Todos los sectores</option>
            {sectores
              .filter((s) => s.sector)
              .map((s) => (
                <option key={s.sector} value={s.sector}>
                  {s.sector}
                </option>
              ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Modalidad
          </span>
          <select
            name="modalidad"
            defaultValue={sp.modalidad ?? ""}
            className="px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">Todas</option>
            <option value="directa">Contratación directa</option>
            <option value="régimen especial">Régimen especial</option>
            <option value="mínima cuantía">Mínima cuantía</option>
            <option value="selección abreviada">Selección abreviada</option>
            <option value="licitación">Licitación pública</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
            Valor mínimo (COP)
          </span>
          <input
            type="number"
            name="valor_min"
            defaultValue={sp.valor_min ?? "100000000"}
            min={0}
            step={50000000}
            className="px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)] font-mono"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-sm font-medium hover:bg-[var(--color-accent-soft)] transition"
          >
            Auditar
          </button>
          <Link
            href="/auditor"
            className="px-4 py-2 border border-[var(--color-border-strong)] text-sm hover:border-[var(--color-fg-2)] transition"
          >
            Limpiar
          </Link>
        </div>
      </form>
    </Card>
  );
}

function FilterSkeleton() {
  return (
    <div className="h-44 bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
  );
}

async function Leaderboard({ sp }: { sp: SP }) {
  const valorMin = Number(sp.valor_min ?? 100_000_000);
  const parts: string[] = [];
  parts.push(`valor_del_contrato > ${Number.isFinite(valorMin) ? valorMin : 100_000_000}`);
  if (sp.departamento) parts.push(`departamento = '${escapeSoql(sp.departamento)}'`);
  if (sp.sector) parts.push(`sector = '${escapeSoql(sp.sector)}'`);
  if (sp.modalidad) {
    parts.push(`upper(modalidad_de_contratacion) like upper('%${escapeSoql(sp.modalidad)}%')`);
  } else {
    parts.push(
      `(upper(modalidad_de_contratacion) like upper('%directa%') OR upper(modalidad_de_contratacion) like upper('%régimen especial%') OR upper(modalidad_de_contratacion) like upper('%minima cuantia%') OR upper(modalidad_de_contratacion) like upper('%mínima cuantía%'))`,
    );
  }

  const where = parts.join(" AND ");

  const rows = await soda<ContractRow>({
    $select:
      "id_contrato, nombre_entidad, nit_entidad, proveedor_adjudicado, documento_proveedor, departamento, sector, estado_contrato, tipo_de_contrato, modalidad_de_contratacion, justificacion_modalidad_de, fecha_de_firma, fecha_de_inicio_del_contrato, fecha_de_fin_del_contrato, valor_del_contrato, valor_de_pago_adelantado, dias_adicionados, descripcion_del_proceso, objeto_del_contrato",
    $where: where,
    $order: "valor_del_contrato DESC NULL LAST",
    $limit: 200,
  });

  const scored = rows
    .map((r) => ({ row: r, assessment: evaluateContract(r, {}) }))
    .sort((a, b) => b.assessment.score - a.assessment.score)
    .slice(0, 25);

  return (
    <Card
      kicker={`Top ${scored.length} de ${rows.length} candidatos`}
      title="Leaderboard nacional de riesgo"
      subtitle="Score determinístico (heurísticas) — click en un contrato para auditoría AI individual."
    >
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-[var(--color-muted)] border-b border-[var(--color-border)]">
              <th className="text-left py-3 px-6 font-medium w-16">Score</th>
              <th className="text-left py-3 px-2 font-medium">Entidad / Proveedor</th>
              <th className="text-left py-3 px-2 font-medium">Departamento</th>
              <th className="text-left py-3 px-2 font-medium">Modalidad</th>
              <th className="text-right py-3 px-2 font-medium">Valor</th>
              <th className="text-left py-3 px-2 font-medium">Top señal</th>
              <th className="text-right py-3 px-6 font-medium">Auditar</th>
            </tr>
          </thead>
          <tbody>
            {scored.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[var(--color-muted)]">
                  Sin candidatos para esos filtros.
                </td>
              </tr>
            )}
            {scored.map(({ row, assessment }) => (
              <tr
                key={row.id_contrato}
                className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)]/40"
              >
                <td className="py-3 px-6">
                  <ScoreBadge score={assessment.score} level={assessment.level} />
                </td>
                <td className="py-3 px-2 max-w-[260px]">
                  <div className="truncate font-medium" title={row.nombre_entidad ?? undefined}>
                    {row.nombre_entidad ?? "—"}
                  </div>
                  <div
                    className="truncate text-[12px] text-[var(--color-muted)]"
                    title={row.proveedor_adjudicado ?? undefined}
                  >
                    → {row.proveedor_adjudicado ?? "—"}
                  </div>
                </td>
                <td className="py-3 px-2 text-[12px] text-[var(--color-muted)]">
                  {row.departamento ?? "—"}
                </td>
                <td className="py-3 px-2 text-[12px]">
                  {row.modalidad_de_contratacion ?? "—"}
                </td>
                <td className="py-3 px-2 text-right tabular-nums font-mono text-[12px]">
                  {formatCurrency(row.valor_del_contrato)}
                </td>
                <td className="py-3 px-2 text-[12px] text-[var(--color-fg-2)] max-w-[260px] truncate">
                  {assessment.signals[0]?.title ?? "—"}
                  {assessment.signals.length > 1 && (
                    <span className="text-[var(--color-muted)] ml-1">
                      +{assessment.signals.length - 1}
                    </span>
                  )}
                </td>
                <td className="py-3 px-6 text-right">
                  <Link
                    href={`/auditor/${encodeURIComponent(row.id_contrato ?? "")}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30 text-[12px] font-medium hover:bg-[var(--color-accent)]/20 transition whitespace-nowrap"
                  >
                    Auditar →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-[12px] text-[var(--color-muted)]">
        <div>
          Total contratos analizados: <span className="font-mono">{formatNumber(rows.length)}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="size-2 bg-[var(--color-danger)]" /> crítico ≥70
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 bg-[var(--color-warn)]" /> alto 50–69
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 bg-[var(--color-accent)]" /> medio 30–49
          </span>
        </div>
      </div>
    </Card>
  );
}

function ScoreBadge({ score, level }: { score: number; level: string }) {
  const tone =
    score >= 70
      ? "bg-[var(--color-danger)] text-white"
      : score >= 50
        ? "bg-[var(--color-warn)] text-[var(--color-bg)]"
        : score >= 30
          ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-fg)]";
  return (
    <div className="inline-flex flex-col items-start">
      <div className={`px-2 py-1 font-mono text-[14px] font-medium tabular-nums ${tone}`}>
        {score}
      </div>
      <div className="text-[10px] text-[var(--color-muted)] mt-1 uppercase tracking-wider">
        {level}
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="h-[600px] bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
  );
}
