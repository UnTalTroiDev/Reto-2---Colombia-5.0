import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { BarRanking } from "@/components/charts/BarRanking";
import { Donut } from "@/components/charts/Donut";
import { groupBy, soda, totalCount } from "@/lib/socrata";
import { evaluateContract, type ContractRow } from "@/lib/risk-signals";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "GobIA Auditor · Agente AI sobre SECOP II",
  description:
    "Agente de inteligencia artificial que consume contratos reales del SECOP II vía API pública, los analiza con un LLM open-source (Qwen 3 235B) y genera un score de riesgo con señales de alerta. Datos abiertos del Estado colombiano.",
};

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2">
        <div className="lg:col-span-7">
          <div className="kicker mb-3">Hackathon Colombia 5.0 · Día 2</div>
          <h1 className="serif text-[44px] md:text-[60px] leading-[1.05] font-semibold tracking-tight text-[var(--color-fg)]">
            <span className="text-[var(--color-accent)]">GobIA</span> Auditor — un agente que lee SECOP II por ti.
          </h1>
          <p className="text-[15px] text-[var(--color-fg-2)] mt-5 max-w-2xl leading-relaxed">
            Combinamos un motor de{" "}
            <span className="text-[var(--color-accent-2)]">señales heurísticas</span>{" "}
            (modalidad, concentración proveedor-entidad, valor atípico, plazos, transparencia) con un{" "}
            <span className="text-[var(--color-accent-2)]">LLM open-source</span> que lee el objeto
            del contrato y aporta el análisis cualitativo que ninguna regla captura. Cobertura
            nacional sobre 5,6M de contratos vivos.
          </p>
          <p className="text-[12px] text-[var(--color-muted)] mt-3 max-w-2xl leading-relaxed font-mono">
            Modelos open-source en Cerebras (free tier): Qwen 3 235B Instruct ·
            OpenAI GPT-OSS 120B · Z.ai GLM 4.7 · Llama 3.1 8B (con fallback automático cuando uno se
            rate-limita).
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <Link
              href="/auditor"
              className="px-5 py-2.5 bg-[var(--color-accent)] text-[var(--color-bg)] text-[14px] font-semibold hover:bg-[var(--color-accent-soft)] transition"
            >
              Auditar contratos →
            </Link>
            <Link
              href="/calidad"
              className="px-4 py-2.5 border border-[var(--color-border-strong)] text-[13px] hover:border-[var(--color-fg-2)] transition"
            >
              Reporte de calidad
            </Link>
            <Link
              href="/explorar"
              className="px-4 py-2.5 border border-[var(--color-border-strong)] text-[13px] hover:border-[var(--color-fg-2)] transition"
            >
              Explorar 5,6M contratos
            </Link>
            <Link
              href="/api-docs"
              className="px-4 py-2.5 border border-[var(--color-border-strong)] text-[13px] hover:border-[var(--color-fg-2)] transition"
            >
              API pública
            </Link>
          </div>
        </div>
        <div className="lg:col-span-5 space-y-1">
          <div className="kicker">Total registrado en SECOP II</div>
          <Suspense fallback={<TotalSkeleton />}>
            <TotalContracts />
          </Suspense>
          <div className="text-[12px] text-[var(--color-muted)] mt-2">
            contratos desde junio 2015 · datos abiertos del Estado colombiano
          </div>
        </div>
      </section>

      <div className="rule" />

      <section>
        <div className="kicker mb-4">I · Cifras de cabecera</div>
        <Suspense fallback={<HeadlineSkeleton />}>
          <HeadlineMetrics />
        </Suspense>
      </section>

      <section className="space-y-4">
        <div className="kicker">II · Hallazgos del agente</div>
        <Suspense fallback={<TopRiskSkeleton />}>
          <TopRiskPreview />
        </Suspense>
      </section>

      <section className="space-y-4">
        <div className="kicker">III · Anatomía del contrato</div>
        <Suspense fallback={<ThreeCardsSkeleton />}>
          <AnatomySection />
        </Suspense>
      </section>

      <section className="space-y-4">
        <div className="kicker">IV · Quién recibe el dinero</div>
        <Suspense fallback={<TwoTallCardsSkeleton />}>
          <TopRecipientsSection />
        </Suspense>
      </section>

      <section className="space-y-4">
        <div className="kicker">V · Geografía y sector</div>
        <Suspense fallback={<TwoTallCardsSkeleton />}>
          <GeoSectorSection />
        </Suspense>
      </section>

      <div className="rule" />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
        <div className="lg:col-span-8">
          <div className="kicker">VI · Cierre</div>
          <h3 className="serif text-3xl font-semibold leading-snug mt-2 max-w-2xl">
            Pertinencia territorial: Colombia entera.
          </h3>
          <p className="text-[14px] text-[var(--color-fg-2)] mt-3 max-w-xl leading-relaxed">
            Bogotá es el punto de partida, pero la corrupción no entiende de departamentos.{" "}
            <strong className="text-[var(--color-accent)]">
              GobIA Auditor escala automáticamente
            </strong>{" "}
            a los 32 departamentos del país y permite a veedurías, periodistas y ciudadanía señalar
            patrones de riesgo en los contratos públicos sin necesidad de saber SOQL ni descargar
            CSVs gigantes.
          </p>
        </div>
        <div className="lg:col-span-4 flex lg:justify-end">
          <Link
            href="/auditor"
            className="px-5 py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-[14px] font-semibold hover:bg-[var(--color-accent-soft)] transition inline-block"
          >
            Probar el agente →
          </Link>
        </div>
      </section>
    </div>
  );
}

async function TotalContracts() {
  const rowsTotal = await totalCount();
  return (
    <div className="font-mono text-[64px] md:text-[88px] leading-none tabular-nums tracking-tighter font-medium">
      {formatNumber(rowsTotal)}
    </div>
  );
}

function TotalSkeleton() {
  return <div className="h-20 md:h-24 w-3/4 bg-[var(--color-surface-2)] animate-pulse" />;
}

async function HeadlineMetrics() {
  const [sumValor, distinctEntidades, distinctProveedores] = await Promise.all([
    soda<{ total: string }>({ $select: "sum(valor_del_contrato) AS total" }).then((r) =>
      Number(r[0]?.total ?? 0),
    ),
    soda<{ n: string }>({ $select: "count(distinct nit_entidad) AS n" }).then((r) =>
      Number(r[0]?.n ?? 0),
    ),
    soda<{ n: string }>({ $select: "count(distinct documento_proveedor) AS n" }).then((r) =>
      Number(r[0]?.n ?? 0),
    ),
  ]);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border)]">
      <StatCard
        label="Valor contratado"
        value={formatCurrency(sumValor)}
        hint="suma de valor_del_contrato"
        tone="accent"
      />
      <StatCard label="Entidades únicas" value={formatNumber(distinctEntidades)} hint="por NIT" />
      <StatCard
        label="Proveedores únicos"
        value={formatNumber(distinctProveedores)}
        hint="por documento"
      />
      <StatCard label="Calidad estimada" value="6/100" hint="ver reporte" tone="danger" />
    </div>
  );
}

function HeadlineSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 bg-[var(--color-surface)] animate-pulse" />
      ))}
    </div>
  );
}

async function TopRiskPreview() {
  const where =
    "valor_del_contrato > 100000000 AND (upper(modalidad_de_contratacion) like upper('%directa%') OR upper(modalidad_de_contratacion) like upper('%régimen especial%') OR upper(modalidad_de_contratacion) like upper('%minima cuantia%') OR upper(modalidad_de_contratacion) like upper('%mínima cuantía%'))";
  const rows = await soda<ContractRow>({
    $select:
      "id_contrato, nombre_entidad, proveedor_adjudicado, departamento, modalidad_de_contratacion, tipo_de_contrato, valor_del_contrato, fecha_de_firma, fecha_de_inicio_del_contrato, fecha_de_fin_del_contrato, dias_adicionados, descripcion_del_proceso, objeto_del_contrato, justificacion_modalidad_de, documento_proveedor, valor_de_pago_adelantado",
    $where: where,
    $order: "valor_del_contrato DESC NULL LAST",
    $limit: 80,
  });
  const scored = rows
    .map((r) => ({ row: r, a: evaluateContract(r, {}) }))
    .sort((a, b) => b.a.score - a.a.score)
    .slice(0, 5);

  return (
    <Card
      kicker="Vista previa"
      title="Top 5 contratos con mayor score de riesgo"
      subtitle="Identificados por el motor heurístico. Click para auditoría AI completa."
      action={
        <Link
          href="/auditor"
          className="text-[12px] font-medium text-[var(--color-accent)] hover:underline"
        >
          Ver leaderboard completo →
        </Link>
      }
    >
      <ul className="divide-y divide-[var(--color-border)]/50">
        {scored.map(({ row, a }) => (
          <li key={row.id_contrato}>
            <Link
              href={`/auditor/${encodeURIComponent(row.id_contrato ?? "")}`}
              className="grid grid-cols-12 items-center gap-3 py-3 hover:bg-[var(--color-surface-2)]/40 transition px-2 -mx-2"
            >
              <div className="col-span-1">
                <div
                  className={`px-2 py-1 font-mono text-[14px] font-medium tabular-nums text-center ${
                    a.score >= 70
                      ? "bg-[var(--color-danger)] text-white"
                      : a.score >= 50
                        ? "bg-[var(--color-warn)] text-[var(--color-bg)]"
                        : "bg-[var(--color-accent)] text-[var(--color-bg)]"
                  }`}
                >
                  {a.score}
                </div>
              </div>
              <div className="col-span-5 min-w-0">
                <div className="truncate text-[13px] font-medium" title={row.nombre_entidad ?? undefined}>
                  {row.nombre_entidad ?? "—"}
                </div>
                <div
                  className="truncate text-[11px] text-[var(--color-muted)]"
                  title={row.proveedor_adjudicado ?? undefined}
                >
                  → {row.proveedor_adjudicado ?? "—"}
                </div>
              </div>
              <div className="col-span-2 text-[11px] text-[var(--color-muted)] truncate">
                {row.departamento ?? "—"}
              </div>
              <div className="col-span-2 text-[11px] truncate">{row.modalidad_de_contratacion ?? "—"}</div>
              <div className="col-span-2 text-right tabular-nums font-mono text-[12px]">
                {formatCurrency(row.valor_del_contrato)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TopRiskSkeleton() {
  return (
    <div className="h-[420px] border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse" />
  );
}

async function AnatomySection() {
  const [byEstado, byTipoContrato, byModalidad] = await Promise.all([
    groupBy("estado_contrato", { limit: 8 }),
    groupBy("tipo_de_contrato", { limit: 8 }),
    groupBy("modalidad_de_contratacion", { limit: 8 }),
  ]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card kicker="Estado" title="Distribución" subtitle="¿En qué estado está el contrato?">
        <Donut data={byEstado} format="number" />
        <ul className="text-[13px] space-y-1.5 mt-4 font-mono">
          {byEstado.slice(0, 5).map((d, i) => (
            <li key={d.key} className="flex items-center justify-between">
              <span className="flex items-center gap-2 truncate">
                <span
                  className="size-2 flex-shrink-0"
                  style={{
                    background: ["#e0623a", "#d4a64a", "#6ba368", "#5b8db5", "#a16ba1"][i],
                  }}
                  aria-hidden
                />
                <span className="truncate">{d.key}</span>
              </span>
              <span className="text-[var(--color-muted)] tabular-nums">{formatNumber(d.value)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card kicker="Tipo" title="Categorías" subtitle="Top 8 tipos de contrato">
        <BarRanking data={byTipoContrato} format="number" color="#d4a64a" />
      </Card>
      <Card kicker="Modalidad" title="Procesos" subtitle="Cómo se contrata">
        <BarRanking data={byModalidad} format="number" color="#6ba368" />
      </Card>
    </div>
  );
}

function ThreeCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-80 border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse"
        />
      ))}
    </div>
  );
}

async function TopRecipientsSection() {
  const [topEntidades, topProveedores] = await Promise.all([
    groupBy("nombre_entidad", {
      measure: "sum(valor_del_contrato)",
      alias: "value",
      limit: 10,
    }),
    groupBy("proveedor_adjudicado", {
      measure: "sum(valor_del_contrato)",
      alias: "value",
      limit: 10,
    }),
  ]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card
        kicker="Top 10"
        title="Entidades por valor contratado"
        subtitle="Suma de valor_del_contrato"
      >
        <BarRanking data={topEntidades} format="currency" color="#e0623a" height={420} />
      </Card>
      <Card
        kicker="Top 10"
        title="Proveedores por valor adjudicado"
        subtitle="Suma de valor_del_contrato"
      >
        <BarRanking data={topProveedores} format="currency" color="#d4a64a" height={420} />
      </Card>
    </div>
  );
}

function TwoTallCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="h-[480px] border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse"
        />
      ))}
    </div>
  );
}

async function GeoSectorSection() {
  const [byDepartamento, bySector] = await Promise.all([
    groupBy("departamento", { limit: 12 }),
    groupBy("sector", { limit: 10 }),
  ]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card kicker="Departamento" title="Distribución territorial" subtitle="Top 12">
        <BarRanking data={byDepartamento} format="number" color="#5b8db5" height={420} />
      </Card>
      <Card kicker="Sector" title="Por industria" subtitle="Top 10">
        <BarRanking data={bySector} format="number" color="#a16ba1" height={420} />
      </Card>
    </div>
  );
}
