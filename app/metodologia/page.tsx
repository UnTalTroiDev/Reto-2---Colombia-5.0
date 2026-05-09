import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Metodología · GobIA Auditor",
  description:
    "Cómo audita GobIA un contrato del SECOP II: arquitectura del agente (heurística + LLM open-source), las 5 banderas rojas canónicas y el marco legal colombiano (Ley 80, Ley 1150, Decreto 1082, Ley 1474).",
};

const BANDERAS = [
  {
    n: "01",
    key: "implementacion",
    title: "Irregularidades en la implementación",
    desc: "Plazos sospechosamente cortos o eternos, otrosíes que duplican el plazo o el valor, ejecución sin liquidación final.",
    senales: [
      "Días adicionados > 50% del plazo inicial",
      "Contrato firmado en menos de 7 días desde apertura",
      "Estado “En ejecución” con fecha fin vencida",
    ],
    legal:
      "Decreto 1082/2015 art. 2.2.1.1.2.4.3 (modificaciones contractuales). Ley 1474/2011 art. 86 (otrosíes).",
  },
  {
    n: "02",
    key: "licitacion",
    title: "Procesos de licitación viciados",
    desc: "Modalidad escogida para recortar competencia, justificación genérica que no sustenta la urgencia, fraccionamiento del objeto para evadir umbrales.",
    senales: [
      "Contratación directa sobre el umbral de mínima cuantía",
      "Justificación con plantilla genérica reutilizada",
      "Régimen especial sin sustento técnico documentado",
    ],
    legal:
      "Ley 80/1993 art. 24 (selección objetiva). Ley 1150/2007 art. 2 (modalidades). Decreto 1082/2015 art. 2.2.1.2.1.4.",
  },
  {
    n: "03",
    key: "relaciones",
    title: "Relaciones inusuales entidad-proveedor",
    desc: "Mismo proveedor concentrando el gasto de una entidad, identificación incompleta del proveedor, supervisor que pertenece al contratista.",
    senales: [
      "Proveedor con > 30% del gasto histórico de la entidad",
      "Documento de proveedor faltante o malformado",
      "Supervisor no es funcionario de la entidad contratante",
    ],
    legal:
      "Ley 80/1993 art. 8 (inhabilidades). Ley 1474/2011 art. 84 (supervisión e interventoría).",
  },
  {
    n: "04",
    key: "conflictos_interes",
    title: "Conflictos de interés",
    desc: "Misma persona natural acumulando roles incompatibles: representante legal, ordenador del gasto, supervisor o pagador del contrato.",
    senales: [
      "Coincidencia entre representante legal del proveedor y de la entidad",
      "Familiares en cargos de decisión sobre el contrato",
      "Vínculos societarios previos no declarados",
    ],
    legal:
      "Ley 1437/2011 art. 11. Ley 1474/2011 art. 1 (responsabilidad disciplinaria por conflicto).",
  },
  {
    n: "05",
    key: "financiero",
    title: "Inconsistencias financieras",
    desc: "Anticipos por encima del límite legal, pagos que exceden lo facturado, valores con patrones de redondeo sospechosos.",
    senales: [
      "Anticipo > 50% del valor del contrato",
      "Valor exactamente en cifras redondas (xx0.000.000) repetidamente",
      "Pagos acumulados > valor adjudicado",
    ],
    legal:
      "Ley 1150/2007 art. 7 (anticipo máx. 50%). Decreto 1082/2015 art. 2.2.1.1.1.5.4.",
  },
];

const LEYES = [
  {
    n: "Ley 80",
    año: "1993",
    titulo: "Estatuto General de Contratación de la Administración Pública",
    resumen:
      "Marco fundacional. Define principios de selección objetiva, transparencia y responsabilidad de servidores públicos.",
  },
  {
    n: "Ley 1150",
    año: "2007",
    titulo: "Eficiencia y transparencia en la contratación pública",
    resumen:
      "Regula modalidades de selección, anticipos y exige publicación en SECOP. Origen del dato que GobIA audita.",
  },
  {
    n: "Decreto 1082",
    año: "2015",
    titulo: "Reglamentario único del sector administrativo de planeación",
    resumen:
      "Régimen reglamentario operativo. Procedimientos para cada modalidad, supervisión e interventoría.",
  },
  {
    n: "Ley 1474",
    año: "2011",
    titulo: "Estatuto Anticorrupción",
    resumen:
      "Refuerza inhabilidades, otrosíes y responsabilidad disciplinaria. Base jurídica de las banderas rojas 03 y 04.",
  },
];

export default function MetodologiaPage() {
  return (
    <div className="space-y-14">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2 rise rise-1">
        <div className="lg:col-span-8">
          <div className="kicker mb-3">Anexo metodológico · cómo audita el agente</div>
          <h1 className="serif text-[44px] md:text-[60px] leading-[0.98] font-semibold tracking-tighter text-[var(--color-fg)]">
            Cómo lee la <span className="text-[var(--color-accent)]">AI</span> un contrato público.
          </h1>
          <p className="text-[15px] text-[var(--color-fg-2)] mt-5 max-w-2xl leading-relaxed">
            GobIA Auditor combina dos capas independientes —{" "}
            <span className="text-[var(--color-accent-2)]">heurística determinista</span> y{" "}
            <span className="text-[var(--color-accent-2)]">razonamiento cualitativo del LLM</span>{" "}
            — sobre el dataset oficial del SECOP II. Esta página describe el flujo, las 5 banderas
            rojas que orientan la auditoría y el marco legal colombiano que las sustenta.
          </p>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
            <div className="kicker mb-2">Resumen ejecutivo</div>
            <ul className="space-y-2 text-[13px] text-[var(--color-fg-2)] list-none">
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-[var(--color-accent)] tabular-nums tracking-widest">
                  ⓘ
                </span>
                <span>5,6M contratos analizables en vivo vía SODA API.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-[var(--color-accent)] tabular-nums tracking-widest">
                  ⓘ
                </span>
                <span>Heurística + LLM open-source. Sin caja negra propietaria.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-[var(--color-accent)] tabular-nums tracking-widest">
                  ⓘ
                </span>
                <span>Score 0–100, 5 banderas, recomendación accionable.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="rule" />

      {/* ── Diagrama de flujo ─────────────────────────────────── */}
      <section className="rise rise-2">
        <div className="kicker mb-4">I · Arquitectura del agente</div>
        <h2 className="serif text-3xl md:text-4xl font-semibold tracking-tight mb-6 max-w-3xl">
          Tres pasos, dos modelos, una conclusión.
        </h2>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-border)]">
          <Step
            n="01"
            title="Ingesta SODA"
            tag="datos.gov.co · jbjy-vk9h"
            body="Consultamos el dataset oficial del SECOP II vía SoQL en tiempo real. Sin descargas masivas: pedimos exactamente lo que vamos a auditar (filtro por modalidad, valor, departamento, sector)."
          />
          <Step
            n="02"
            title="Motor heurístico"
            tag="SECOP-rules-v1 · determinista"
            body="Cada contrato pasa por un conjunto de reglas (modalidad, plazos, concentración, anticipos, transparencia). Cada señal aporta un peso 0–100 con severidad alta/media/baja. Score reproducible, sin AI."
          />
          <Step
            n="03"
            title="LLM open-source"
            tag="Cerebras · Qwen 3 / GPT-OSS / GLM 4.7 / Llama 3.1"
            body="El objeto del contrato y la heurística entran como contexto a un LLM open-source con fallback automático entre 4 modelos. Devuelve banderas adicionales, justificación, citas verbatim y recomendación para veeduría."
          />
        </ol>

        <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
          <div className="kicker mb-3">Diagrama de datos</div>
          <pre className="font-mono text-[11px] md:text-[12px] leading-[1.7] text-[var(--color-fg-2)] overflow-x-auto whitespace-pre">
{`   ┌──────────────────────┐
   │  datos.gov.co · SODA │   ← 5,6M filas, jbjy-vk9h
   └──────────┬───────────┘
              │  SoQL  (filtros: modalidad, valor, depto)
              ▼
   ┌──────────────────────┐
   │  Motor heurístico    │   ← 6 categorías → 5 banderas
   │  SECOP-rules-v1      │     score base ∈ [0,100]
   └──────────┬───────────┘
              │  contexto enriquecido + texto del objeto
              ▼
   ┌──────────────────────┐
   │  LLM (Cerebras OSS)  │   ← Qwen 3 235B → GPT-OSS 120B
   │  fallback automático │     → GLM 4.7  → Llama 3.1 8B
   └──────────┬───────────┘
              │  JSON estructurado · streaming SSE
              ▼
   ┌──────────────────────┐
   │  Dossier editorial   │   ← score ajustado · banderas
   │  /auditor/[id]       │     justificación · recomendación
   └──────────────────────┘`}
          </pre>
        </div>
      </section>

      <div className="rule" />

      {/* ── Las 5 banderas rojas ──────────────────────────────── */}
      <section className="rise rise-3">
        <div className="kicker mb-4">II · Las cinco banderas rojas canónicas</div>
        <h2 className="serif text-3xl md:text-4xl font-semibold tracking-tight max-w-3xl">
          Un marco compartido entre la heurística y el LLM.
        </h2>
        <p className="text-[14px] text-[var(--color-fg-2)] mt-4 max-w-2xl leading-relaxed">
          Las cinco banderas son el lenguaje común. Tanto las reglas como el modelo cualitativo
          mapean cualquier hallazgo a una de estas cinco categorías, lo que permite consolidar la
          alerta visual y trazar el origen (heurístico vs. LLM) en el drill-down.
        </p>

        <ol className="mt-8 space-y-0 border-t border-b-[3px] border-[var(--color-border-strong)]">
          {BANDERAS.map((b) => (
            <li
              key={b.key}
              className="grid grid-cols-12 gap-4 md:gap-6 py-6 border-b border-[var(--color-border)]/50 last:border-b-0"
            >
              <div className="col-span-2 md:col-span-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-accent)]">
                  Bandera
                </span>
                <div className="serif text-[36px] leading-none font-medium tabular-nums text-[var(--color-fg)] mt-1">
                  {b.n}
                </div>
              </div>
              <div className="col-span-10 md:col-span-7">
                <h3 className="serif text-[22px] md:text-[26px] leading-tight font-semibold text-[var(--color-fg)]">
                  {b.title}
                </h3>
                <p className="text-[14px] text-[var(--color-fg-2)] mt-2 leading-relaxed">
                  {b.desc}
                </p>
                <div className="kicker mt-4 mb-2">Señales que la disparan</div>
                <ul className="space-y-1">
                  {b.senales.map((s) => (
                    <li
                      key={s}
                      className="text-[13px] text-[var(--color-fg-2)] flex gap-2 leading-relaxed"
                    >
                      <span className="text-[var(--color-accent)] flex-shrink-0">›</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-12 md:col-span-4">
                <div className="bg-[var(--color-surface-2)] border-l-2 border-[var(--color-accent-2)] p-4 h-full">
                  <div className="kicker mb-1.5">Sustento legal</div>
                  <p className="font-mono text-[11px] leading-[1.7] text-[var(--color-fg-2)]">
                    {b.legal}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="rule" />

      {/* ── Marco legal ───────────────────────────────────────── */}
      <section className="rise rise-4">
        <div className="kicker mb-4">III · Marco legal colombiano</div>
        <h2 className="serif text-3xl md:text-4xl font-semibold tracking-tight max-w-3xl">
          Las cuatro normas sobre las que se mide el contrato.
        </h2>
        <p className="text-[14px] text-[var(--color-fg-2)] mt-4 max-w-2xl leading-relaxed">
          GobIA no inventa criterios: contrasta cada contrato contra la jerarquía normativa
          vigente. Los pesos heurísticos y el prompt del LLM están atados a estos textos.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-border)]">
          {LEYES.map((l) => (
            <article key={l.n} className="bg-[var(--color-surface)] p-6">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div className="serif text-[28px] font-semibold leading-none text-[var(--color-accent)] tracking-tight">
                  {l.n}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
                  · {l.año}
                </div>
              </div>
              <h3 className="serif text-[16px] font-semibold text-[var(--color-fg)] leading-snug">
                {l.titulo}
              </h3>
              <p className="text-[13px] text-[var(--color-fg-2)] mt-2 leading-relaxed">
                {l.resumen}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="rule" />

      {/* ── Aviso ético ───────────────────────────────────────── */}
      <section className="rise rise-4">
        <div className="kicker mb-4">IV · Alcance y advertencias</div>
        <div className="border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5 p-6 max-w-3xl">
          <div className="kicker text-[var(--color-accent)] mb-3">Lectura obligatoria</div>
          <p className="serif text-[16px] leading-[1.65] text-[var(--color-fg)]">
            El score y las recomendaciones de GobIA Auditor son{" "}
            <strong>insumos orientativos para veeduría ciudadana, periodismo de datos y
            análisis preliminar</strong>. No constituyen prueba judicial ni acusación formal. La
            decisión de elevar un caso a Contraloría, Procuraduría o Fiscalía requiere
            verificación adicional con expediente físico y debido proceso.
          </p>
          <ul className="mt-4 space-y-1.5 text-[13px] text-[var(--color-fg-2)]">
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)]">›</span>
              <span>Los datos provienen de SECOP II y heredan su calidad (ver reporte de calidad).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)]">›</span>
              <span>Modelos LLM open-source con fallback. Hay variabilidad entre corridas.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)]">›</span>
              <span>Cobertura desde junio 2015. Contratos previos no auditables.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
        <div className="lg:col-span-8">
          <div className="kicker">V · Próximo paso</div>
          <h3 className="serif text-3xl font-semibold leading-snug mt-2 max-w-2xl">
            Vea la metodología en acción sobre un contrato real.
          </h3>
          <p className="text-[14px] text-[var(--color-fg-2)] mt-3 max-w-xl leading-relaxed">
            Cada auditoría individual muestra qué reglas se dispararon, qué dijo el LLM y a qué
            bandera mapea. Trazabilidad total, sin caja negra.
          </p>
        </div>
        <div className="lg:col-span-4 flex lg:justify-end gap-2">
          <Link
            href="/auditor"
            className="px-5 py-3 bg-[var(--color-accent)] text-[var(--color-bg)] text-[14px] font-semibold hover:bg-[var(--color-accent-soft)] transition inline-block"
          >
            Ver leaderboard →
          </Link>
          <Link
            href="/api-docs"
            className="px-4 py-3 border border-[var(--color-border-strong)] text-[14px] hover:border-[var(--color-fg-2)] transition inline-block"
          >
            API pública
          </Link>
        </div>
      </section>
    </div>
  );
}

function Step({
  n,
  title,
  tag,
  body,
}: {
  n: string;
  title: string;
  tag: string;
  body: string;
}) {
  return (
    <li className="bg-[var(--color-surface)] p-6 list-none">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-accent)]">
          Paso {n}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
          ↓
        </span>
      </div>
      <h3 className="serif text-[22px] font-semibold leading-tight text-[var(--color-fg)]">
        {title}
      </h3>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent-2)] mt-1.5">
        {tag}
      </div>
      <p className="text-[13px] text-[var(--color-fg-2)] mt-3 leading-relaxed">{body}</p>
    </li>
  );
}
