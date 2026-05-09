import { fetchContractById } from "@/lib/risk-context";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditorClient } from "./AuditorClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Expediente ${id} · GobIA Auditor`,
    description: `Análisis AI de riesgo del contrato SECOP II ${id} con motor de señales heurísticas + LLM open-source.`,
  };
}

export default async function AuditoriaPage({ params }: { params: Params }) {
  const { id } = await params;
  const contrato = await fetchContractById(id);
  if (!contrato) notFound();

  const url = typeof contrato.urlproceso === "object" ? contrato.urlproceso?.url : contrato.urlproceso;
  const objeto = contrato.objeto_del_contrato ?? contrato.descripcion_del_proceso ?? "(no reportado)";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-10 relative">
      <nav aria-label="Breadcrumb" className="kicker rise rise-1">
        <Link href="/auditor" className="hover:text-[var(--color-accent)] transition-colors">
          ← Volver al leaderboard
        </Link>
      </nav>

      <header className="space-y-5 rise rise-2 relative">
        <div className="flex items-baseline gap-2 flex-wrap kicker">
          <span>Expediente</span>
          <span className="text-[var(--color-border-strong)]">·</span>
          <span className="text-[var(--color-fg-2)]">{contrato.id_contrato}</span>
          {url && (
            <>
              <span className="text-[var(--color-border-strong)]">·</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--color-accent)] transition-colors underline decoration-1 underline-offset-4"
              >
                Ver en SECOP II ↗
              </a>
            </>
          )}
        </div>
        <h1 className="serif text-[40px] md:text-[56px] font-semibold leading-[0.98] tracking-tighter">
          {contrato.nombre_entidad ?? "(entidad no reportada)"}
        </h1>

        <div className="border-t border-b-[3px] border-[var(--color-border-strong)] py-3 flex items-baseline gap-3 flex-wrap text-[13px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Adjudicado a
          </span>
          <span className="font-medium text-[var(--color-fg)]">
            {contrato.proveedor_adjudicado ?? "(sin proveedor)"}
          </span>
          <span className="text-[var(--color-border-strong)]">/</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Modalidad
          </span>
          <span className="serif italic">{contrato.modalidad_de_contratacion ?? "—"}</span>
          <span className="text-[var(--color-border-strong)]">/</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Tipo
          </span>
          <span className="serif italic">{contrato.tipo_de_contrato ?? "—"}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[var(--color-border)] mt-2">
          <KV label="Departamento" value={contrato.departamento ?? "—"} />
          <KV label="Sector" value={contrato.sector ?? "—"} />
          <KV label="Estado" value={contrato.estado_contrato ?? "—"} />
          <KV label="Valor" value={formatCurrency(contrato.valor_del_contrato as never)} mono />
          <KV
            label="Días adicionados"
            value={
              contrato.dias_adicionados !== null && contrato.dias_adicionados !== undefined
                ? formatNumber(Number(contrato.dias_adicionados))
                : "0"
            }
            mono
          />
        </div>
      </header>

      <section className="rise rise-3 relative">
        <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
          <div className="kicker">Objeto declarado</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Texto verbatim · SECOP II
          </div>
        </div>
        <blockquote className="border-l-[3px] border-[var(--color-accent)] pl-6 md:pl-8 py-2">
          <p
            lang="es"
            className="dropcap serif text-[20px] md:text-[22px] leading-[1.45] text-[var(--color-fg)] max-w-3xl font-normal break-words"
            style={{
              letterSpacing: "0.015em",
              hyphens: "auto",
              WebkitHyphens: "auto",
              fontFeatureSettings: '"ss01", "ss02", "kern"',
              fontVariationSettings: '"opsz" 28, "SOFT" 60',
            }}
          >
            {objeto}
          </p>
        </blockquote>
      </section>

      <AuditorClient id={id} today={today} />

      <footer className="text-[11px] font-mono text-[var(--color-muted)] border-t border-[var(--color-border)] pt-4 leading-relaxed">
        <span className="uppercase tracking-[0.2em]">Fuente</span> ·{" "}
        <a
          className="hover:text-[var(--color-accent)] underline decoration-1 underline-offset-4"
          href={`https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=${encodeURIComponent(id)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          datos.gov.co · jbjy-vk9h
        </a>{" "}
        · <span className="uppercase tracking-[0.2em]">Modelo</span> · Qwen 3 235B-A22B (Cerebras, OSS) ·{" "}
        <span className="uppercase tracking-[0.2em]">Aviso</span> · Score y recomendaciones orientativas para
        veeduría ciudadana, no constituyen acusación.
      </footer>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-[var(--color-surface)] p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
        {label}
      </div>
      <div
        className={`text-[13px] mt-1.5 truncate ${mono ? "font-mono tabular-nums" : "serif"}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
