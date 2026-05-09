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
    <div className="space-y-12">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2">
        <div className="lg:col-span-8 rise rise-1">
          <div className="kicker mb-3">Volumen II · Expediente público · 2026</div>
          <h1 className="serif text-[44px] md:text-[60px] leading-[0.98] font-semibold tracking-tighter text-[var(--color-fg)]">
            Vigilancia activa de la <span className="text-[var(--color-accent)]">contratación</span> pública.
          </h1>
          <p className="text-[15px] text-[var(--color-fg-2)] mt-5 max-w-2xl leading-relaxed">
            Cada fila de esta tabla es un{" "}
            <em className="not-italic font-semibold text-[var(--color-fg)]">expediente</em> con un
            score de{" "}
            <span className="text-[var(--color-accent-2)]">riesgo</span> calculado por nuestro motor
            de <span className="text-[var(--color-accent-2)]">señales heurísticas</span>. Click en{" "}
            <span className="font-mono text-[12px] tracking-wider text-[var(--color-accent)]">
              AUDITAR ↗
            </span>{" "}
            para que el <span className="text-[var(--color-accent-2)]">LLM open-source</span>{" "}
            genere el informe forense completo en vivo.
          </p>
        </div>
        <div className="lg:col-span-4 rise rise-2">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
            <div className="kicker mb-3">Metodología</div>
            <ol className="space-y-2 text-[13px] text-[var(--color-fg-2)] list-none">
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-[var(--color-accent)] tabular-nums tracking-widest">01</span>
                <span>Filtramos en SODA por modalidad y valor.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-[var(--color-accent)] tabular-nums tracking-widest">02</span>
                <span>Motor heurístico puntúa cada candidato (0–100).</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-[var(--color-accent)] tabular-nums tracking-widest">03</span>
                <span>LLM open-source emite informe + recomendación.</span>
              </li>
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
    <section className="rise rise-3">
      <div className="kicker mb-3 flex items-baseline gap-3">
        <span>Filtrar expediente</span>
        <span className="text-[var(--color-border-strong)] font-mono">·</span>
        <span className="text-[var(--color-muted-2)]">Departamento / Sector / Modalidad / Valor mínimo</span>
      </div>
      <form
        className="grid grid-cols-1 md:grid-cols-5 gap-3 border-t border-b-[3px] border-[var(--color-border-strong)] py-4"
        role="search"
        aria-label="Filtros del leaderboard de riesgo"
      >
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Departamento
          </span>
          <select
            name="departamento"
            defaultValue={sp.departamento ?? ""}
            className="px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Sector
          </span>
          <select
            name="sector"
            defaultValue={sp.sector ?? ""}
            className="px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Modalidad
          </span>
          <select
            name="modalidad"
            defaultValue={sp.modalidad ?? ""}
            className="px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Valor mínimo (COP)
          </span>
          <input
            type="number"
            name="valor_min"
            defaultValue={sp.valor_min ?? "100000000"}
            min={0}
            step={50000000}
            className="px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent)] font-mono transition-colors"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-sm font-semibold hover:bg-[var(--color-accent-soft)] transition tracking-tight"
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
    </section>
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
    <section className="rise rise-4">
      <header className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="kicker">Leaderboard nacional · Top {scored.length}</div>
          <h2 className="serif text-2xl md:text-3xl font-semibold mt-1 tracking-tight">
            Contratos con mayor score de riesgo
          </h2>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
          {formatNumber(rows.length)} candidatos analizados
        </div>
      </header>

      <div className="overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="border-t border-b-[3px] border-[var(--color-border-strong)]">
            <tr className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
              <th className="text-left py-3 pl-6 pr-2 font-medium w-10">№</th>
              <th className="text-left py-3 px-2 font-medium w-20">Score</th>
              <th className="text-left py-3 px-2 font-medium">Entidad / Proveedor</th>
              <th className="text-left py-3 px-2 font-medium">Departamento</th>
              <th className="text-left py-3 px-2 font-medium">Modalidad</th>
              <th className="text-right py-3 px-2 font-medium">Valor</th>
              <th className="text-left py-3 px-2 font-medium">Hallazgo principal</th>
              <th className="text-right py-3 px-6 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {scored.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[var(--color-muted)]">
                  Sin candidatos para esos filtros.
                </td>
              </tr>
            )}
            {scored.map(({ row, assessment }, idx) => (
              <tr
                key={row.id_contrato}
                className="border-b border-[var(--color-border)]/40 transition-all hover:bg-[var(--color-surface-2)]/40 hover:shadow-[inset_3px_0_0_var(--color-accent)]"
              >
                <td className="py-4 pl-6 pr-2 font-mono text-[11px] text-[var(--color-muted)] tabular-nums tracking-widest align-top">
                  {(idx + 1).toString().padStart(2, "0")}
                </td>
                <td className="py-4 px-2 align-top">
                  <ScoreSeal score={assessment.score} level={assessment.level} />
                </td>
                <td className="py-4 px-2 max-w-[260px] align-top">
                  <div className="serif text-[15px] leading-tight font-medium" title={row.nombre_entidad ?? undefined}>
                    {row.nombre_entidad ?? "—"}
                  </div>
                  <div
                    className="text-[12px] text-[var(--color-muted)] mt-1 truncate"
                    title={row.proveedor_adjudicado ?? undefined}
                  >
                    → {row.proveedor_adjudicado ?? "—"}
                  </div>
                </td>
                <td className="py-4 px-2 text-[12px] text-[var(--color-fg-2)] align-top">
                  {row.departamento ?? "—"}
                </td>
                <td className="py-4 px-2 text-[12px] align-top">
                  {row.modalidad_de_contratacion ?? "—"}
                </td>
                <td className="py-4 px-2 text-right tabular-nums font-mono text-[12px] align-top">
                  {formatCurrency(row.valor_del_contrato)}
                </td>
                <td className="py-4 px-2 text-[12px] text-[var(--color-fg-2)] max-w-[260px] align-top">
                  <div className="truncate" title={assessment.signals[0]?.title}>
                    {assessment.signals[0]?.title ?? "—"}
                  </div>
                  {assessment.signals.length > 1 && (
                    <div className="font-mono text-[10px] text-[var(--color-muted)] mt-0.5 tracking-wider">
                      + {assessment.signals.length - 1} más
                    </div>
                  )}
                </td>
                <td className="py-4 px-6 text-right align-top">
                  <Link
                    href={`/auditor/${encodeURIComponent(row.id_contrato ?? "")}`}
                    className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent)] hover:text-[var(--color-fg)] transition whitespace-nowrap border-b border-transparent hover:border-[var(--color-accent)] pb-0.5"
                  >
                    Auditar ↗
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-px bg-[var(--color-border)]">
        <RiskScale label="Crítico" range="≥ 70" cls="bg-[var(--color-danger)]" />
        <RiskScale label="Alto" range="50–69" cls="bg-[var(--color-warn)]" />
        <RiskScale label="Medio" range="30–49" cls="bg-[var(--color-accent)]" />
        <RiskScale label="Bajo" range="< 30" cls="bg-[var(--color-success)]/40" />
      </footer>
    </section>
  );
}

function ScoreSeal({ score, level }: { score: number; level: string }) {
  const borderTone =
    score >= 70
      ? "border-[var(--color-danger)]"
      : score >= 50
        ? "border-[var(--color-warn)]"
        : score >= 30
          ? "border-[var(--color-accent)]"
          : "border-[var(--color-border-strong)]";
  const textTone =
    score >= 70
      ? "text-[var(--color-danger)]"
      : score >= 50
        ? "text-[var(--color-warn)]"
        : score >= 30
          ? "text-[var(--color-accent)]"
          : "text-[var(--color-fg-2)]";
  return (
    <div className={`inline-flex flex-col items-center border-2 ${borderTone} px-2.5 py-1.5 bg-[var(--color-surface)]`}>
      <div className={`serif text-[26px] leading-none font-medium tabular-nums ${textTone}`}>
        {score}
      </div>
      <div className="font-mono text-[8px] uppercase tracking-[0.25em] mt-0.5 text-[var(--color-muted)]">
        {level}
      </div>
    </div>
  );
}

function RiskScale({ label, range, cls }: { label: string; range: string; cls: string }) {
  return (
    <div className="bg-[var(--color-surface)] p-3 flex items-center gap-3">
      <span className={`size-2.5 ${cls}`} aria-hidden />
      <div className="flex flex-col">
        <span className="text-[12px] font-medium uppercase tracking-wider">{label}</span>
        <span className="font-mono text-[10px] text-[var(--color-muted)] tabular-nums">{range}</span>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="h-[600px] bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse" />
  );
}
