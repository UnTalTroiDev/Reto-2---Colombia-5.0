import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { BarRanking } from "@/components/charts/BarRanking";
import { Donut } from "@/components/charts/Donut";
import { formatBytes } from "@/lib/format-bytes";
import { groupByDocs, sodaDocs, totalDocs } from "@/lib/socrata-docs";
import { formatNumber } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Documentos electrónicos · SECOP Dashboard",
  description:
    "Análisis del dataset dmgg-8hin: 17,3M de archivos cargados a SECOP II desde 2025. Tamaño, extensiones, top entidades y timeline de cargas.",
};

export const dynamic = "force-dynamic";

export default function DocumentosPage() {
  return (
    <div className="space-y-12">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2">
        <div className="lg:col-span-7">
          <div className="kicker mb-3">Volumen 2 · Documentos electrónicos</div>
          <h1 className="serif text-[44px] md:text-[56px] leading-[1.05] font-semibold tracking-tight">
            Diecisiete millones de{" "}
            <span className="text-[var(--color-accent)]">papeles</span> en la nube del Estado.
          </h1>
          <p className="text-[15px] text-[var(--color-fg-2)] mt-5 max-w-2xl leading-relaxed">
            Cada fila del dataset{" "}
            <code className="font-mono text-[13px] text-[var(--color-accent-2)]">dmgg-8hin</code>{" "}
            representa un archivo cargado a SECOP II desde el 1 de enero de 2025 — desde estudios
            previos en PDF hasta minutas en Word, certificaciones en Excel y planos en CAD.
          </p>
          <Link
            href="/documentos/explorar"
            className="inline-block mt-6 px-4 py-2 border border-[var(--color-border-strong)] text-[13px] hover:border-[var(--color-fg-2)] transition"
          >
            Explorar documentos →
          </Link>
        </div>
        <div className="lg:col-span-5 space-y-1">
          <div className="kicker">Documentos cargados</div>
          <Suspense fallback={<HeroNumberSkeleton />}>
            <DocsHeroNumber />
          </Suspense>
        </div>
      </section>

      <div className="rule" />

      <section>
        <div className="kicker mb-4">I · Cifras de cabecera</div>
        <Suspense fallback={<HeadlineSkeleton cols={4} />}>
          <DocsHeadlineMetrics />
        </Suspense>
      </section>

      <section>
        <div className="kicker mb-4">II · Estadísticas de tamaño</div>
        <Suspense fallback={<HeadlineSkeleton cols={3} />}>
          <SizeStats />
        </Suspense>
      </section>

      <section className="space-y-4">
        <div className="kicker">III · Por extensión y entidad</div>
        <Suspense fallback={<ThreeCardsSkeleton />}>
          <ExtensionsAndEntities />
        </Suspense>
      </section>

      <section>
        <Suspense fallback={<TimelineSkeleton />}>
          <TimelineCard />
        </Suspense>
      </section>

      <Card kicker="Información" title="Sobre este dataset">
        <div className="text-[13px] text-[var(--color-fg-2)] leading-relaxed space-y-2">
          <p>
            <span className="kicker text-[var(--color-fg-2)]">Identificador</span>{" "}
            <code className="font-mono">dmgg-8hin</code> · 17.353.029 filas · 11 columnas (6 texto,
            3 número, 1 fecha, 1 URL).
          </p>
          <p className="text-[var(--color-muted)]">
            Endpoint:{" "}
            <code className="font-mono text-[12px]">
              https://www.datos.gov.co/resource/dmgg-8hin.json
            </code>
          </p>
          <p className="text-[var(--color-muted)]">
            Las métricas de esta página se calculan exclusivamente con queries SoQL agregadas
            (server-side); jamás se descargan los 17,3M de registros.
          </p>
        </div>
      </Card>
    </div>
  );
}

async function DocsHeroNumber() {
  const [rowsTotal, sumSize] = await Promise.all([
    totalDocs(),
    sodaDocs<{ s: string }>({ $select: "sum(tamanno_archivo) AS s" }).then((r) =>
      Number(r[0]?.s ?? 0),
    ),
  ]);
  return (
    <>
      <div className="font-mono text-[64px] md:text-[88px] leading-none tabular-nums tracking-tighter font-medium">
        {formatNumber(rowsTotal)}
      </div>
      <div className="text-[12px] text-[var(--color-muted)] mt-2">
        ocupan{" "}
        <span className="font-mono text-[var(--color-accent-2)]">{formatBytes(sumSize)}</span> en
        total
      </div>
    </>
  );
}

function HeroNumberSkeleton() {
  return (
    <>
      <div className="h-20 md:h-24 w-3/4 bg-[var(--color-surface-2)] animate-pulse" />
      <div className="h-3 w-48 bg-[var(--color-surface-2)] mt-3 animate-pulse" />
    </>
  );
}

async function DocsHeadlineMetrics() {
  const [rowsTotal, sumSize, distinctEntidades, distinctProcesos, nullDescr] = await Promise.all([
    totalDocs(),
    sodaDocs<{ s: string }>({ $select: "sum(tamanno_archivo) AS s" }).then((r) =>
      Number(r[0]?.s ?? 0),
    ),
    sodaDocs<{ n: string }>({ $select: "count(distinct nit_entidad) AS n" }).then((r) =>
      Number(r[0]?.n ?? 0),
    ),
    sodaDocs<{ n: string }>({ $select: "count(distinct proceso) AS n" }).then((r) =>
      Number(r[0]?.n ?? 0),
    ),
    sodaDocs<{ n: string }>({
      $select: "count(*) AS n",
      $where: "descripci_n IS NULL",
    }).then((r) => Number(r[0]?.n ?? 0)),
  ]);
  const nullPct = rowsTotal > 0 ? nullDescr / rowsTotal : 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border)]">
      <StatCard
        label="Tamaño acumulado"
        value={formatBytes(sumSize)}
        hint="suma de tamanno_archivo"
        tone="accent"
      />
      <StatCard label="Entidades únicas" value={formatNumber(distinctEntidades)} hint="por NIT" />
      <StatCard
        label="Procesos únicos"
        value={formatNumber(distinctProcesos)}
        hint="por código"
      />
      <StatCard
        label="Descripciones nulas"
        value={formatNumber(nullDescr)}
        hint={`${(nullPct * 100).toFixed(4)}%`}
        tone={nullPct > 0.05 ? "warn" : "success"}
      />
    </div>
  );
}

async function SizeStats() {
  const stats = await sodaDocs<{ mx: string; mn: string; avg: string }>({
    $select:
      "max(tamanno_archivo) AS mx, min(tamanno_archivo) AS mn, avg(tamanno_archivo) AS avg",
  }).then((r) => r[0]);
  const max = Number(stats?.mx ?? 0);
  const min = Number(stats?.mn ?? 0);
  const avg = Number(stats?.avg ?? 0);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--color-border)]">
      <StatCard label="Máximo" value={formatBytes(max)} hint="archivo más grande" />
      <StatCard label="Mínimo" value={formatBytes(min)} hint="archivo más pequeño" />
      <StatCard label="Promedio" value={formatBytes(avg)} hint="media aritmética" />
    </div>
  );
}

function HeadlineSkeleton({ cols }: { cols: 3 | 4 }) {
  const grid = cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-2 ${grid} gap-px bg-[var(--color-border)]`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-32 bg-[var(--color-surface)] animate-pulse" />
      ))}
    </div>
  );
}

async function ExtensionsAndEntities() {
  const [byExt, topEntidades, topEntidadesPorTamano] = await Promise.all([
    groupByDocs("extensi_n", { limit: 12 }),
    groupByDocs("entidad", { limit: 10 }),
    groupByDocs("entidad", {
      measure: "sum(tamanno_archivo)",
      alias: "value",
      limit: 10,
    }),
  ]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card kicker="Extensiones" title="Tipos de archivo" subtitle="Top 12">
        <Donut data={byExt} format="number" />
        <ul className="text-[13px] font-mono space-y-1.5 mt-4">
          {byExt.slice(0, 6).map((d, i) => (
            <li key={d.key} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span
                  className="size-2"
                  style={{
                    background: [
                      "#e0623a",
                      "#d4a64a",
                      "#6ba368",
                      "#5b8db5",
                      "#a16ba1",
                      "#c75450",
                    ][i],
                  }}
                  aria-hidden
                />
                <span className="uppercase">{d.key}</span>
              </span>
              <span className="text-[var(--color-muted)] tabular-nums">
                {formatNumber(d.value)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card kicker="Top 10" title="Entidades por # documentos">
        <BarRanking data={topEntidades} format="number" color="#e0623a" />
      </Card>
      <Card kicker="Top 10" title="Entidades por tamaño total" subtitle="Suma de bytes">
        <BarRanking data={topEntidadesPorTamano} format="bytes" color="#d4a64a" />
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

async function TimelineCard() {
  const porMes = await sodaDocs<{ mes: string; n: string }>({
    $select: "date_trunc_ym(fecha_carga) AS mes, count(*) AS n",
    $group: "mes",
    $order: "mes",
  }).then((r) => r.map((d) => ({ key: (d.mes ?? "").slice(0, 7), value: Number(d.n) })));
  return (
    <Card
      kicker="Cronología"
      title="Cargas por mes"
      subtitle="Volumen de documentos cargados a SECOP II"
    >
      <BarRanking
        data={porMes}
        format="number"
        color="#6ba368"
        height={Math.max(280, porMes.length * 28)}
      />
    </Card>
  );
}

function TimelineSkeleton() {
  return (
    <div className="h-80 border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse" />
  );
}
