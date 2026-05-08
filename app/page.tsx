import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { BarRanking } from "@/components/charts/BarRanking";
import { Donut } from "@/components/charts/Donut";
import { groupBy, soda, totalCount } from "@/lib/socrata";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resumen de contratos · SECOP Dashboard",
  description:
    "Métricas en vivo del dataset SECOP II (jbjy-vk9h): valor contratado, top entidades, top proveedores, distribución por departamento y sector.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [
    rowsTotal,
    sumValor,
    distinctEntidades,
    distinctProveedores,
    byEstado,
    byDepartamento,
    byTipoContrato,
    byModalidad,
    bySector,
    topEntidades,
    topProveedores,
  ] = await Promise.all([
    totalCount(),
    soda<{ total: string }>({ $select: "sum(valor_del_contrato) AS total" }).then((r) =>
      Number(r[0]?.total ?? 0),
    ),
    soda<{ n: string }>({ $select: "count(distinct nit_entidad) AS n" }).then((r) =>
      Number(r[0]?.n ?? 0),
    ),
    soda<{ n: string }>({ $select: "count(distinct documento_proveedor) AS n" }).then((r) =>
      Number(r[0]?.n ?? 0),
    ),
    groupBy("estado_contrato", { limit: 8 }),
    groupBy("departamento", { limit: 12 }),
    groupBy("tipo_de_contrato", { limit: 8 }),
    groupBy("modalidad_de_contratacion", { limit: 8 }),
    groupBy("sector", { limit: 10 }),
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
    <div className="space-y-12">
      {/* Hero — editorial */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2">
        <div className="lg:col-span-7">
          <div className="kicker mb-3">Volumen 1 · Contratación pública</div>
          <h1 className="serif text-[44px] md:text-[56px] leading-[1.05] font-semibold tracking-tight text-[var(--color-fg)]">
            Cinco millones de promesas{" "}
            <span className="text-[var(--color-accent)]">firmadas</span> con dinero público.
          </h1>
          <p className="text-[15px] text-[var(--color-fg-2)] mt-5 max-w-2xl leading-relaxed">
            Dataset abierto de la Agencia Nacional de Contratación Pública (Colombia Compra
            Eficiente). Cada fila es un contrato celebrado por una entidad estatal con un proveedor.
            Las métricas se calculan{" "}
            <em className="text-[var(--color-accent-2)] not-italic font-mono text-[13px]">
              server-side sobre los 5,6M de filas
            </em>{" "}
            — nunca se descarga el dataset completo.
          </p>
          <div className="flex gap-2 mt-6">
            <Link
              href="/calidad"
              className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg)] text-[13px] font-medium hover:bg-[var(--color-accent-soft)] transition"
            >
              Ver reporte de calidad →
            </Link>
            <Link
              href="/explorar"
              className="px-4 py-2 border border-[var(--color-border-strong)] text-[13px] hover:border-[var(--color-fg-2)] transition"
            >
              Explorar contratos
            </Link>
          </div>
        </div>
        <div className="lg:col-span-5 space-y-1">
          <div className="kicker">Total registrado en SECOP II</div>
          <div className="font-mono text-[64px] md:text-[88px] leading-none tabular-nums tracking-tighter font-medium">
            {formatNumber(rowsTotal)}
          </div>
          <div className="text-[12px] text-[var(--color-muted)] mt-2">
            contratos desde junio 2015
          </div>
        </div>
      </section>

      <div className="rule" />

      {/* Headline metrics */}
      <section>
        <div className="kicker mb-4">I · Cifras de cabecera</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border)]">
          <StatCard
            label="Valor contratado"
            value={formatCurrency(sumValor)}
            hint="suma de valor_del_contrato"
            tone="accent"
          />
          <StatCard
            label="Entidades únicas"
            value={formatNumber(distinctEntidades)}
            hint="por NIT"
          />
          <StatCard
            label="Proveedores únicos"
            value={formatNumber(distinctProveedores)}
            hint="por documento"
          />
          <StatCard
            label="Calidad estimada"
            value="6/100"
            hint="ver reporte"
            tone="danger"
          />
        </div>
      </section>

      {/* Estado + Tipo + Modalidad */}
      <section className="space-y-4">
        <div className="kicker">II · Anatomía del contrato</div>
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
                  <span className="text-[var(--color-muted)] tabular-nums">
                    {formatNumber(d.value)}
                  </span>
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
      </section>

      {/* Top entidades + proveedores */}
      <section className="space-y-4">
        <div className="kicker">III · Quién recibe el dinero</div>
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
      </section>

      {/* Geografía + sector */}
      <section className="space-y-4">
        <div className="kicker">IV · Geografía y sector</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card kicker="Departamento" title="Distribución territorial" subtitle="Top 12">
            <BarRanking data={byDepartamento} format="number" color="#5b8db5" height={420} />
          </Card>
          <Card kicker="Sector" title="Por industria" subtitle="Top 10">
            <BarRanking data={bySector} format="number" color="#a16ba1" height={420} />
          </Card>
        </div>
      </section>

      <div className="rule" />

      {/* Editorial CTA */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
        <div className="lg:col-span-8">
          <div className="kicker">V · Pregunta de cierre</div>
          <h3 className="serif text-3xl font-semibold leading-snug mt-2 max-w-2xl">
            ¿Estos datos están limpios?
          </h3>
          <p className="text-[14px] text-[var(--color-fg-2)] mt-3 max-w-xl leading-relaxed">
            La respuesta corta: no. Hay 5 columnas que aparecen en el esquema pero{" "}
            <strong className="text-[var(--color-accent)]">jamás se llenan</strong>, y los valores
            extremos del campo <code className="font-mono text-[12px]">valor_del_contrato</code>{" "}
            son outliers obvios sin filtrar.
          </p>
        </div>
        <div className="lg:col-span-4 flex lg:justify-end">
          <Link
            href="/calidad"
            className="px-5 py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-[14px] font-medium hover:bg-[var(--color-accent-soft)] transition inline-block"
          >
            Leer el reporte completo →
          </Link>
        </div>
      </section>
    </div>
  );
}
