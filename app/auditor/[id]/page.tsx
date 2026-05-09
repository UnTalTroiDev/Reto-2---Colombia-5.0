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
    title: `Auditoría ${id} · GobIA Auditor`,
    description: `Análisis AI de riesgo del contrato SECOP II ${id} con motor de señales heurísticas + LLM open-source.`,
  };
}

export default async function AuditoriaPage({ params }: { params: Params }) {
  const { id } = await params;
  const contrato = await fetchContractById(id);
  if (!contrato) notFound();

  const url = typeof contrato.urlproceso === "object" ? contrato.urlproceso?.url : contrato.urlproceso;
  const objeto = contrato.objeto_del_contrato ?? contrato.descripcion_del_proceso ?? "(no reportado)";

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="kicker">
        <Link href="/auditor" className="hover:text-[var(--color-accent)]">
          ← Volver al leaderboard
        </Link>
      </nav>

      <header className="space-y-4">
        <div className="kicker">
          Contrato · {contrato.id_contrato}
          {url && (
            <>
              {" · "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--color-accent)] underline"
              >
                Ver en SECOP II ↗
              </a>
            </>
          )}
        </div>
        <h1 className="serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
          {contrato.nombre_entidad ?? "(entidad no reportada)"}
        </h1>
        <p className="text-[15px] text-[var(--color-fg-2)] leading-relaxed max-w-4xl">
          Adjudicado a{" "}
          <strong className="text-[var(--color-fg)]">{contrato.proveedor_adjudicado ?? "(sin proveedor)"}</strong>
          {" · "}
          {contrato.modalidad_de_contratacion ?? "modalidad no reportada"} ·{" "}
          {contrato.tipo_de_contrato ?? "tipo no reportado"}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[var(--color-border)] mt-4">
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

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
        <div className="kicker mb-2">Objeto del contrato</div>
        <p className="text-[14px] leading-relaxed text-[var(--color-fg)] whitespace-pre-wrap">
          {objeto}
        </p>
      </section>

      <AuditorClient id={id} />

      <footer className="text-[11px] text-[var(--color-muted)] border-t border-[var(--color-border)] pt-4">
        Datos en vivo de{" "}
        <a
          className="hover:text-[var(--color-accent)] underline"
          href={`https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=${encodeURIComponent(id)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          datos.gov.co · jbjy-vk9h
        </a>
        . Análisis generado con Qwen 3 235B (Cerebras) — modelo open-source de Alibaba. El score y
        las recomendaciones son orientativas para veeduría ciudadana, no constituyen acusación.
      </footer>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-[var(--color-surface)] p-3">
      <div className="kicker text-[10px]">{label}</div>
      <div
        className={`text-[13px] mt-1 truncate ${mono ? "font-mono tabular-nums" : ""}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
