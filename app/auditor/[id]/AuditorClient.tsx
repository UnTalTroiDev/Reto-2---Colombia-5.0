"use client";

import { useEffect, useRef, useState } from "react";

type Signal = {
  id: string;
  category: string;
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
  banderasAdicionales: Array<{
    titulo: string;
    severidad: "alta" | "media" | "baja";
    explicacion: string;
  }>;
  justificacion: string;
  recomendacion: string;
  citasObjeto: string[];
};

export function AuditorClient({ id }: { id: string }) {
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
      setError(msg || "Error de streaming. Verifica CEREBRAS_API_KEY.");
      setStatus("error");
      es.close();
    });

    return () => {
      es.close();
    };
  }, [id]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <section className="lg:col-span-5 space-y-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
          <div className="kicker mb-2">Heurística determinística</div>
          {heuristic ? (
            <>
              <ScoreBlock
                score={heuristic.score}
                level={heuristic.level}
                label="Score base"
                summary={heuristic.summary}
              />
              <ul className="mt-6 space-y-3">
                {heuristic.signals.map((s) => (
                  <li key={s.id} className="border-l-2 border-[var(--color-border-strong)] pl-3 py-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium leading-tight">{s.title}</span>
                      <SeverityBadge severity={s.severity} weight={s.weight} />
                    </div>
                    <p className="text-[12px] text-[var(--color-fg-2)] mt-1.5 leading-snug">
                      {s.detail}
                    </p>
                  </li>
                ))}
                {heuristic.signals.length === 0 && (
                  <li className="text-[13px] text-[var(--color-muted)]">
                    No se detectaron señales heurísticas para este contrato.
                  </li>
                )}
              </ul>
            </>
          ) : (
            <div className="space-y-3">
              <div className="h-12 bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-20 bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-20 bg-[var(--color-surface-2)] animate-pulse" />
            </div>
          )}
        </div>
      </section>

      <section className="lg:col-span-7 space-y-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <div className="kicker">Análisis cualitativo · Qwen 3 235B (Cerebras)</div>
            <StatusPill status={status} />
          </div>

          {llm ? (
            <>
              <ScoreBlock
                score={llm.scoreAjustado}
                level={llm.nivel}
                label="Score ajustado por AI"
              />
              <p className="text-[14px] leading-relaxed mt-5 text-[var(--color-fg)]">
                {llm.justificacion}
              </p>

              {llm.banderasAdicionales.length > 0 && (
                <>
                  <div className="kicker mt-6 mb-2">Banderas adicionales del LLM</div>
                  <ul className="space-y-2">
                    {llm.banderasAdicionales.map((b, i) => (
                      <li
                        key={i}
                        className="bg-[var(--color-surface-2)]/60 border-l-2 border-[var(--color-accent)] pl-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium">{b.titulo}</span>
                          <SeverityBadge severity={b.severidad} />
                        </div>
                        <p className="text-[12px] text-[var(--color-fg-2)] mt-1 leading-snug">
                          {b.explicacion}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {llm.citasObjeto.length > 0 && (
                <>
                  <div className="kicker mt-6 mb-2">Fragmentos citados del objeto</div>
                  <ul className="space-y-1.5">
                    {llm.citasObjeto.map((c, i) => (
                      <li
                        key={i}
                        className="text-[12px] font-mono text-[var(--color-fg-2)] bg-[var(--color-surface-2)]/40 px-3 py-2 border-l-2 border-[var(--color-accent-2)]"
                      >
                        “{c}”
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="mt-6 p-4 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
                <div className="kicker mb-1">Recomendación para veeduría</div>
                <p className="text-[13px] text-[var(--color-fg)] leading-relaxed">
                  {llm.recomendacion}
                </p>
              </div>
            </>
          ) : status === "error" ? (
            <div className="text-[13px] text-[var(--color-danger)] py-6">{error}</div>
          ) : (
            <>
              <div className="text-[12px] text-[var(--color-muted)] mb-3">
                {status === "loading"
                  ? "Cargando contrato y contexto de mercado…"
                  : "Generando análisis (streaming)…"}
              </div>
              <pre className="text-[12px] font-mono text-[var(--color-fg-2)] whitespace-pre-wrap leading-relaxed bg-[var(--color-surface-2)]/30 p-4 max-h-[480px] overflow-auto">
                {streamText || "  ▍"}
              </pre>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ScoreBlock({
  score,
  level,
  label,
  summary,
}: {
  score: number;
  level: string;
  label: string;
  summary?: { high: number; medium: number; low: number };
}) {
  const tone =
    score >= 70
      ? "bg-[var(--color-danger)] text-white"
      : score >= 50
        ? "bg-[var(--color-warn)] text-[var(--color-bg)]"
        : score >= 30
          ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
          : "bg-[var(--color-success)]/30 text-[var(--color-fg)]";
  return (
    <div className="flex items-center gap-4">
      <div className={`px-4 py-3 ${tone}`}>
        <div className="font-mono text-[40px] leading-none tabular-nums font-medium">{score}</div>
      </div>
      <div className="flex flex-col">
        <div className="kicker">{label}</div>
        <div className="text-[18px] font-semibold uppercase tracking-tight mt-0.5">{level}</div>
        {summary && (
          <div className="flex gap-2 mt-1 text-[11px] font-mono text-[var(--color-muted)]">
            <span>{summary.high} alta</span>
            <span>·</span>
            <span>{summary.medium} media</span>
            <span>·</span>
            <span>{summary.low} baja</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SeverityBadge({
  severity,
  weight,
}: {
  severity: "alta" | "media" | "baja";
  weight?: number;
}) {
  const cls =
    severity === "alta"
      ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30"
      : severity === "media"
        ? "bg-[var(--color-warn)]/15 text-[var(--color-warn)] border-[var(--color-warn)]/30"
        : "bg-[var(--color-fg-2)]/10 text-[var(--color-fg-2)] border-[var(--color-fg-2)]/20";
  return (
    <span
      className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${cls} flex-shrink-0`}
    >
      {severity}
      {weight !== undefined && ` · ${weight}`}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    idle: { label: "—", cls: "text-[var(--color-muted)]" },
    loading: { label: "● cargando", cls: "text-[var(--color-accent-2)]" },
    streaming: { label: "● streaming", cls: "text-[var(--color-accent)] animate-pulse" },
    done: { label: "✓ completo", cls: "text-[var(--color-success)]" },
    error: { label: "✗ error", cls: "text-[var(--color-danger)]" },
  };
  const e = map[status] ?? map.idle;
  return <span className={`text-[11px] font-mono ${e.cls}`}>{e.label}</span>;
}
