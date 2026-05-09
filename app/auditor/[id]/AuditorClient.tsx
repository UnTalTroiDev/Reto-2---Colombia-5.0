"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Categoria =
  | "implementacion"
  | "licitacion"
  | "relaciones"
  | "conflictos_interes"
  | "financiero";

const CATEGORIAS_INFO: Array<{
  key: Categoria;
  short: string;
  full: string;
  desc: string;
}> = [
  {
    key: "implementacion",
    short: "Implementación",
    full: "Irregularidades en la implementación",
    desc: "Plazos sospechosos, otrosíes excesivos, ejecución sin liquidación.",
  },
  {
    key: "licitacion",
    short: "Licitación",
    full: "Procesos de licitación viciados",
    desc: "Modalidad que recorta competencia, justificación genérica, fraccionamiento.",
  },
  {
    key: "relaciones",
    short: "Relaciones",
    full: "Relaciones inusuales",
    desc: "Concentración proveedor-entidad, identidades incompletas, autosupervisión.",
  },
  {
    key: "conflictos_interes",
    short: "Conflictos",
    full: "Conflictos de interés",
    desc: "Misma persona como representante, ordenador, supervisor o pagador.",
  },
  {
    key: "financiero",
    short: "Financiero",
    full: "Inconsistencias financieras",
    desc: "Anticipos atípicos, pagos > facturación, redondeos sospechosos.",
  },
];

type Signal = {
  id: string;
  category: string;
  umbrella?: Categoria;
  severity: "alta" | "media" | "baja";
  weight: number;
  title: string;
  detail: string;
};

type Heuristica = {
  score: number;
  level: "crítico" | "alto" | "medio" | "bajo" | "mínimo";
  signals: Signal[];
  summary: { high: number; medium: number; low: number };
};

type LlmResult = {
  scoreAjustado: number;
  nivel: "crítico" | "alto" | "medio" | "bajo" | "mínimo";
  categoriasDetectadas: Categoria[];
  banderasAdicionales: Array<{
    titulo: string;
    severidad: "alta" | "media" | "baja";
    categoria: Categoria;
    explicacion: string;
  }>;
  justificacion: string;
  recomendacion: string;
  citasObjeto: string[];
};

type Contexto = {
  entidad: string;
  proveedor: string;
  departamento: string;
  modalidad: string;
  valor: number;
  urlSecop: string | null;
};

export function AuditorClient({
  id,
  today,
  contexto,
}: {
  id: string;
  today: string;
  contexto: Contexto;
}) {
  const [heuristic, setHeuristic] = useState<Heuristica | null>(null);
  const [streamText, setStreamText] = useState("");
  const [llm, setLlm] = useState<LlmResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    setStatus("loading");
    const url = `/api/auditor/${encodeURIComponent(id)}/stream`;
    const es = new EventSource(url);

    es.addEventListener("heuristic", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setHeuristic(data.heuristica);
        setStatus("streaming");
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("delta", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setStreamText((prev) => prev + (data.text ?? ""));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("done", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setLlm(data);
        setStatus("done");
      } catch {
        /* ignore */
      }
      es.close();
    });

    es.addEventListener("error", (e) => {
      const msg = e instanceof MessageEvent ? String(e.data ?? "") : "";
      setError(msg || "Error de streaming. Verifica CEREBRAS_API_KEY en Vercel.");
      setStatus("error");
      es.close();
    });

    return () => {
      es.close();
    };
  }, [id]);

  // Conjunto de categorías disparadas por heurística + LLM (union)
  const heuristicCats = useMemo(() => {
    const set = new Set<Categoria>();
    heuristic?.signals.forEach((s) => {
      if (s.umbrella) set.add(s.umbrella);
    });
    return set;
  }, [heuristic]);
  const llmCats = useMemo(() => new Set<Categoria>(llm?.categoriasDetectadas ?? []), [llm]);

  return (
    <div className="space-y-6 rise rise-4">
      {/* ── 5 ALERTAS DE BANDERAS ROJAS ─────────────────────────── */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="serif text-[28px] md:text-[34px] font-semibold tracking-tight leading-none text-[var(--color-accent)]">
              5 banderas rojas
            </h2>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)] mt-2">
              Marco canónico de auditoría
            </div>
          </div>
          <div className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--color-warn)]" /> Heurística
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--color-danger)]" /> LLM
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[var(--color-border)]">
          {CATEGORIAS_INFO.map((c) => {
            const heuristicHit = heuristicCats.has(c.key);
            const llmHit = llmCats.has(c.key);
            const active = heuristicHit || llmHit;
            return (
              <AlertCell
                key={c.key}
                short={c.short}
                full={c.full}
                desc={c.desc}
                active={active}
                heuristic={heuristicHit}
                llm={llmHit}
                pending={!llm && status !== "error"}
              />
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Panel izquierdo: heurística determinística ───────────── */}
        <section className="lg:col-span-5">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 h-full">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="kicker">I · Heurística determinista</div>
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
              SECOP-rules-v1
            </span>
          </div>
          {heuristic ? (
            <>
              <ScoreSeal
                score={heuristic.score}
                level={heuristic.level}
                label="Score base"
                tone="neutral"
                summary={heuristic.summary}
              />
              <div className="rule mt-6 mb-4" />
              <ul className="space-y-0">
                {heuristic.signals.map((s, i) => (
                  <li
                    key={s.id}
                    className="grid grid-cols-12 gap-3 py-4 border-b border-[var(--color-border)]/40 last:border-b-0"
                  >
                    <div className="col-span-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                        EV-{(i + 1).toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="col-span-8">
                      <h4 className="serif text-[15px] leading-snug font-medium text-[var(--color-fg)]">
                        {s.title}
                      </h4>
                      <p className="text-[12px] text-[var(--color-fg-2)] mt-1.5 leading-relaxed">
                        {s.detail}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-col items-end gap-1">
                      <SeverityType severity={s.severity} />
                      <span className="font-mono text-[10px] text-[var(--color-muted)] tabular-nums">
                        +{s.weight}
                      </span>
                    </div>
                  </li>
                ))}
                {heuristic.signals.length === 0 && (
                  <li className="text-[13px] text-[var(--color-muted)] py-4">
                    No se detectaron señales heurísticas para este contrato.
                  </li>
                )}
              </ul>
            </>
          ) : (
            <div className="space-y-3">
              <div className="h-16 bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-20 bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-20 bg-[var(--color-surface-2)] animate-pulse" />
            </div>
          )}
        </div>
      </section>

      {/* ── Panel derecho: análisis cualitativo del LLM ─────────── */}
      <section className="lg:col-span-7">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 h-full relative overflow-hidden">
          {/* Sello decorativo */}
          {llm && <Stamp today={today} />}

          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="kicker">II · Análisis cualitativo · LLM</div>
            <StatusPill status={status} />
          </div>

          {llm ? (
            <>
              <ScoreSeal
                score={llm.scoreAjustado}
                level={llm.nivel}
                label="Score ajustado por AI"
                tone="accent"
              />

              <div className="rule mt-6 mb-4" />

              <div className="kicker mb-3">Justificación</div>
              <p className="dropcap serif text-[15px] leading-[1.65] text-[var(--color-fg)] max-w-2xl">
                {llm.justificacion}
              </p>

              {llm.banderasAdicionales.length > 0 && (
                <>
                  <div className="kicker mt-8 mb-3">
                    Banderas adicionales <span className="text-[var(--color-muted-2)]">· {llm.banderasAdicionales.length}</span>
                  </div>
                  <ul className="space-y-0 border-t border-[var(--color-border)]">
                    {llm.banderasAdicionales.map((b, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-12 gap-3 py-3 border-b border-[var(--color-border)]/40"
                      >
                        <div className="col-span-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent-2)]">
                            BA-{(i + 1).toString().padStart(2, "0")}
                          </span>
                        </div>
                        <div className="col-span-8">
                          <h4 className="serif text-[15px] leading-snug font-medium text-[var(--color-fg)]">
                            {b.titulo}
                          </h4>
                          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--color-accent)] mt-1">
                            {CATEGORIAS_INFO.find((c) => c.key === b.categoria)?.full ?? b.categoria}
                          </div>
                          <p className="text-[12px] text-[var(--color-fg-2)] mt-1.5 leading-relaxed">
                            {b.explicacion}
                          </p>
                        </div>
                        <div className="col-span-2 flex justify-end items-start">
                          <SeverityType severity={b.severidad} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {llm.citasObjeto.length > 0 && (
                <>
                  <div className="kicker mt-8 mb-3">Fragmentos citados</div>
                  <ul className="space-y-2">
                    {llm.citasObjeto.map((c, i) => (
                      <li
                        key={i}
                        className="serif italic text-[14px] text-[var(--color-fg-2)] border-l-2 border-[var(--color-accent-2)] pl-4 py-1 leading-relaxed"
                      >
                        <span className="text-[var(--color-accent)] mr-1">“</span>
                        {c}
                        <span className="text-[var(--color-accent)] ml-1">”</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

            </>
          ) : status === "error" ? (
            <ErrorPanel message={error ?? ""} />
          ) : (
            <StreamingPanel status={status} text={streamText} />
          )}
        </div>
      </section>
      </div>

      {/* ── ACCIÓN — bloque headline full-width, clímax del dossier ─── */}
      {llm && (
        <section className="rise rise-4" aria-labelledby="accion-veeduria">
          <div className="relative">
            {/* Stripe superior con marca de acción */}
            <div className="bg-[var(--color-accent)] text-[var(--color-bg)] px-6 md:px-8 py-3.5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[20px] leading-none" aria-hidden>
                  ►
                </span>
                <h2
                  id="accion-veeduria"
                  className="font-mono text-[12px] md:text-[14px] uppercase tracking-[0.32em] font-bold leading-none"
                >
                  Acción para veeduría
                </h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-90">
                Conclusión del agente · score {llm.scoreAjustado}/100
              </span>
            </div>

            {/* Cuerpo: recomendación AI a tamaño headline */}
            <div className="border-l-[3px] border-r-[3px] border-b-[3px] border-[var(--color-accent)] bg-[var(--color-accent)]/8 p-6 md:p-10">
              <div className="kicker mb-4 text-[var(--color-accent)]">
                Recomendación del agente
              </div>
              <p className="dropcap serif text-[22px] md:text-[28px] leading-[1.4] text-[var(--color-fg)] font-medium max-w-4xl tracking-tight">
                {llm.recomendacion}
              </p>

              <CitizenActions id={id} contexto={contexto} llm={llm} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AlertCell({
  short,
  full,
  desc,
  active,
  heuristic,
  llm,
  pending,
}: {
  short: string;
  full: string;
  desc: string;
  active: boolean;
  heuristic: boolean;
  llm: boolean;
  pending: boolean;
}) {
  const stateClass = active
    ? "bg-[var(--color-danger)]/10 border-l-2 border-l-[var(--color-danger)]"
    : "bg-[var(--color-surface)] border-l-2 border-l-transparent";
  const titleColor = active ? "text-[var(--color-danger)]" : "text-[var(--color-fg-2)]";
  const valueColor = active ? "text-[var(--color-fg)]" : "text-[var(--color-muted)]";

  return (
    <article
      className={`p-4 ${stateClass} relative transition-colors`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`kicker ${titleColor}`}>{short}</span>
        <div className="flex gap-1">
          {heuristic && (
            <span
              title="Detectado por heurística"
              className="size-1.5 rounded-full bg-[var(--color-warn)] flex-shrink-0"
              aria-hidden
            />
          )}
          {llm && (
            <span
              title="Detectado por LLM"
              className="size-1.5 rounded-full bg-[var(--color-danger)] animate-pulse flex-shrink-0"
              aria-hidden
            />
          )}
        </div>
      </div>
      <div className={`serif text-[15px] mt-1.5 leading-tight font-medium ${valueColor}`}>
        {active ? "ALERTA" : pending ? "..." : "limpio"}
      </div>
      <div
        className="text-[10px] text-[var(--color-muted)] mt-1.5 leading-snug line-clamp-2"
        title={`${full} — ${desc}`}
      >
        {full}
      </div>
    </article>
  );
}

function ScoreSeal({
  score,
  level,
  label,
  tone,
  summary,
}: {
  score: number;
  level: string;
  label: string;
  tone: "neutral" | "accent";
  summary?: { high: number; medium: number; low: number };
}) {
  const borderTone =
    tone === "accent"
      ? "border-[var(--color-accent)]"
      : score >= 70
        ? "border-[var(--color-danger)]"
        : score >= 50
          ? "border-[var(--color-warn)]"
          : score >= 30
            ? "border-[var(--color-accent)]"
            : "border-[var(--color-border-strong)]";
  const numTone =
    score >= 70
      ? "text-[var(--color-danger)]"
      : score >= 50
        ? "text-[var(--color-warn)]"
        : score >= 30
          ? "text-[var(--color-accent)]"
          : "text-[var(--color-fg)]";
  return (
    <div className="flex items-center gap-5">
      <div className={`inline-flex flex-col items-center border-2 ${borderTone} px-5 py-3 bg-[var(--color-surface)]`}>
        <div className={`serif text-[60px] leading-none font-medium tabular-nums ${numTone}`}>
          {score}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] mt-1.5 text-[var(--color-muted)]">
          / 100
        </div>
      </div>
      <div className="flex flex-col">
        <div className="kicker">{label}</div>
        <div className="serif text-[24px] font-semibold uppercase tracking-tight mt-0.5">{level}</div>
        {summary && (
          <div className="flex gap-3 mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">
            <span className="flex items-center gap-1">
              <span className="size-1.5 bg-[var(--color-danger)]" />
              {summary.high} alta
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 bg-[var(--color-warn)]" />
              {summary.medium} media
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 bg-[var(--color-fg-2)]" />
              {summary.low} baja
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SeverityType({ severity }: { severity: "alta" | "media" | "baja" }) {
  if (severity === "alta") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-danger)] text-white font-mono text-[10px] uppercase tracking-[0.22em] font-bold border border-[var(--color-danger)] whitespace-nowrap"
        role="img"
        aria-label="Severidad alta"
      >
        <span aria-hidden className="text-[9px] leading-none">●●●</span>
        <span>Alta</span>
      </span>
    );
  }
  if (severity === "media") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-warn)] text-[var(--color-bg)] font-mono text-[10px] uppercase tracking-[0.22em] font-bold border border-[var(--color-warn)] whitespace-nowrap"
        role="img"
        aria-label="Severidad media"
      >
        <span aria-hidden className="text-[9px] leading-none">●●○</span>
        <span>Media</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-transparent text-[var(--color-fg-2)] font-mono text-[10px] uppercase tracking-[0.22em] font-bold border border-[var(--color-muted-2)] whitespace-nowrap"
      role="img"
      aria-label="Severidad baja"
    >
      <span aria-hidden className="text-[9px] leading-none">●○○</span>
      <span>Baja</span>
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    idle: { label: "—", cls: "text-[var(--color-muted)]" },
    loading: { label: "● cargando", cls: "text-[var(--color-accent-2)]" },
    streaming: {
      label: "● en vivo · qwen 3 235b",
      cls: "text-[var(--color-accent)]",
    },
    done: { label: "✓ informe completo", cls: "text-[var(--color-success)]" },
    error: { label: "✗ error", cls: "text-[var(--color-danger)]" },
  };
  const e = map[status] ?? map.idle;
  const pulsing = status === "streaming" || status === "loading";
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-[0.2em] ${e.cls} ${pulsing ? "animate-pulse" : ""}`}
    >
      {e.label}
    </span>
  );
}

function StreamingPanel({ status, text }: { status: string; text: string }) {
  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)] flex items-center gap-2">
        <span
          className={`size-1.5 rounded-full ${status === "loading" ? "bg-[var(--color-accent-2)]" : "bg-[var(--color-accent)]"} animate-pulse`}
        />
        {status === "loading"
          ? "Recolectando contexto de mercado…"
          : "Generando informe forense…"}
      </div>
      <pre className="font-mono text-[12px] leading-[1.75] text-[var(--color-fg-2)] whitespace-pre-wrap bg-[var(--color-bg-2)] p-5 border border-[var(--color-border)] max-h-[480px] overflow-auto">
        {text || "  "}
        <span className="cursor-blink text-[var(--color-accent)] not-italic font-bold">▍</span>
      </pre>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="border-2 border-[var(--color-danger)] bg-[var(--color-danger)]/5 p-5 mt-4">
      <div className="kicker text-[var(--color-danger)] mb-2">Error · Análisis no disponible</div>
      <p className="text-[13px] text-[var(--color-fg-2)] leading-relaxed">{message}</p>
      <p className="text-[12px] font-mono text-[var(--color-muted)] mt-3 leading-relaxed">
        Las señales heurísticas siguen vigentes en el panel izquierdo. Para activar el análisis AI,
        configura <span className="text-[var(--color-accent)]">CEREBRAS_API_KEY</span> en las
        variables de entorno de Vercel.
      </p>
    </div>
  );
}

function CitizenActions({
  id,
  contexto,
  llm,
}: {
  id: string;
  contexto: Contexto;
  llm: LlmResult;
}) {
  const [copied, setCopied] = useState(false);

  const valorCop = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(contexto.valor);

  const banderasLista = llm.categoriasDetectadas
    .map((c) => CATEGORIAS_INFO.find((x) => x.key === c)?.full ?? c)
    .join(" · ");

  const auditorUrl =
    typeof window !== "undefined" ? window.location.href : `https://gobia.local/auditor/${id}`;

  const resumen = [
    `[GobIA Auditor — Score ${llm.scoreAjustado}/100 · ${llm.nivel.toUpperCase()}]`,
    `Expediente: ${id}`,
    `Entidad: ${contexto.entidad}`,
    `Proveedor: ${contexto.proveedor}`,
    `Departamento: ${contexto.departamento} · Modalidad: ${contexto.modalidad}`,
    `Valor: ${valorCop}`,
    banderasLista ? `Banderas detectadas: ${banderasLista}` : "",
    "",
    `Justificación: ${llm.justificacion}`,
    "",
    `Recomendación: ${llm.recomendacion}`,
    "",
    `Dossier completo: ${auditorUrl}`,
    contexto.urlSecop ? `Expediente SECOP II: ${contexto.urlSecop}` : "",
    "",
    "— Generado por GobIA Auditor (LLM open-source · Hackathon Colombia 5.0). Insumo para veeduría ciudadana, no constituye acusación.",
  ]
    .filter(Boolean)
    .join("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(resumen);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard bloqueado: fallback no-op */
    }
  }

  const asuntoEmail = `Posible alerta SECOP II · Score ${llm.scoreAjustado}/100 · ${id}`;
  const cuerpoEmail = encodeURIComponent(resumen);
  const mailto = `mailto:anticorrupcion@contraloria.gov.co?subject=${encodeURIComponent(asuntoEmail)}&body=${cuerpoEmail}`;

  const tweetText = encodeURIComponent(
    `Auditoría AI sobre SECOP II → ${contexto.entidad} adjudicó ${valorCop} a ${contexto.proveedor}. Score de riesgo: ${llm.scoreAjustado}/100 (${llm.nivel}). Vía @GobIA_Auditor`,
  );
  const tweetUrl = encodeURIComponent(auditorUrl);
  const twitter = `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`;

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-5">
      <div className="kicker mb-3 flex items-center gap-2">
        <span className="font-mono text-[var(--color-accent-2)]">⚑</span> Acción ciudadana
      </div>
      <p className="text-[12px] text-[var(--color-fg-2)] leading-relaxed mb-4 max-w-xl">
        Este dossier es ciudadano y reproducible. Difúndalo, escálelo a control fiscal o
        guárdelo para seguimiento. Todos los enlaces incluyen el resumen ejecutivo y citan la
        fuente original.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar resumen ejecutivo del expediente al portapapeles"
          className="px-3 py-2.5 border border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition text-left group"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)] mb-1">
            01 · Copiar
          </div>
          <div className="text-[13px] text-[var(--color-fg)] font-medium leading-tight">
            {copied ? "✓ Resumen copiado" : "Resumen al portapapeles"}
          </div>
          <div className="text-[10px] text-[var(--color-muted)] mt-1 leading-snug">
            Markdown listo para WhatsApp, Slack o Notion.
          </div>
        </button>

        <a
          href={mailto}
          aria-label="Enviar denuncia por email a la Contraloría General de la República"
          className="px-3 py-2.5 border border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition text-left group"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)] mb-1">
            02 · Email
          </div>
          <div className="text-[13px] text-[var(--color-fg)] font-medium leading-tight">
            Enviar a Contraloría →
          </div>
          <div className="text-[10px] text-[var(--color-muted)] mt-1 leading-snug">
            anticorrupcion@contraloria.gov.co
          </div>
        </a>

        <a
          href={twitter}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartir el hallazgo en X / Twitter"
          className="px-3 py-2.5 border border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition text-left group"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)] mb-1">
            03 · Difundir
          </div>
          <div className="text-[13px] text-[var(--color-fg)] font-medium leading-tight">
            Compartir en X / Twitter ↗
          </div>
          <div className="text-[10px] text-[var(--color-muted)] mt-1 leading-snug">
            Texto pre-redactado con score y entidad.
          </div>
        </a>
      </div>
    </div>
  );
}

function Stamp({ today }: { today: string }) {
  return (
    <div
      aria-hidden
      className="absolute right-4 top-4 -rotate-[8deg] opacity-30 pointer-events-none hidden md:block"
    >
      <div className="border-2 border-[var(--color-accent)] rounded-full px-4 py-3 text-center min-w-[110px]">
        <div className="font-mono text-[8px] uppercase tracking-[0.3em] text-[var(--color-accent)] leading-tight">
          Auditado
          <br />
          por GobIA
        </div>
        <div className="font-mono text-[7px] text-[var(--color-fg-2)] mt-1 tracking-widest">
          {today}
        </div>
      </div>
    </div>
  );
}
