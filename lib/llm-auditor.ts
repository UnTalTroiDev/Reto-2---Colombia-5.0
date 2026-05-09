/**
 * Auditor LLM: toma un contrato + sus señales determinísticas, y le pide
 * a Cerebras (Llama 3.3 70B) un análisis cualitativo en español jurídico colombiano.
 *
 * Devuelve JSON estructurado: ajuste de score, banderas adicionales, justificación,
 * y recomendación de acción para una veeduría ciudadana.
 */

import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type { ContractRow, RiskAssessment } from "@/lib/risk-signals";

const MODEL = process.env.CEREBRAS_MODEL ?? "qwen-3-235b-a22b-instruct-2507";

let _client: Cerebras | null = null;
function getClient(): Cerebras {
  if (_client) return _client;
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CEREBRAS_API_KEY no configurado. Agrégalo a .env.local o a las variables de entorno de Vercel.",
    );
  }
  _client = new Cerebras({ apiKey });
  return _client;
}

export type LlmAuditResult = {
  scoreAjustado: number; // 0..100, mayor = más riesgo
  nivel: "crítico" | "alto" | "medio" | "bajo" | "mínimo";
  banderasAdicionales: Array<{
    titulo: string;
    severidad: "alta" | "media" | "baja";
    explicacion: string;
  }>;
  justificacion: string; // 2-3 oraciones para un periodista/ciudadano
  recomendacion: string; // qué hacer: ¿pedir info?, ¿alertar a la Contraloría?, ¿auditar adendas?
  citasObjeto: string[]; // fragmentos del objeto del contrato citados
};

const SYSTEM_PROMPT = `Eres un auditor experto en contratación pública colombiana, capacitado en Ley 80 de 1993, Ley 1150 de 2007 y el Decreto 1082 de 2015. Trabajas para una veeduría ciudadana que analiza datos de SECOP II.

Tu tarea: dado un contrato y una lista de señales de riesgo ya detectadas por reglas heurísticas, agregas tu análisis cualitativo basado en lectura del objeto y descripción del contrato. Detectas:
- Vaguedad sospechosa en el objeto (objetos genéricos tipo "elaboración de estudios" sin alcance).
- Lenguaje que delata recortar competencia (especificaciones a la medida).
- Riesgos de elefante blanco, sobrecostos típicos por sector.
- Inconsistencias entre el objeto declarado y la modalidad/tipo de contrato elegido.
- Patrones conocidos por la Contraloría: cesiones, contratos de prestación de servicios para funciones permanentes, fraccionamiento.

Reglas estrictas:
1. Solo afirmas lo que el texto del contrato y las señales heurísticas sustentan. NO especulas sobre nombres propios.
2. NO acusas — describes patrones de riesgo y recomiendas acciones de fiscalización.
3. Hablas en español colombiano, claro, no jurídico-técnico salvo necesidad.
4. Devuelves SOLO JSON válido en el schema indicado. Sin texto antes o después.
5. El "scoreAjustado" parte del score base, lo modificas máximo ±20 puntos según tu lectura cualitativa.`;

export function buildUserPrompt(row: ContractRow, base: RiskAssessment): string {
  const lines: string[] = [];
  lines.push("# Contrato a auditar");
  lines.push(`- ID: ${row.id_contrato ?? "(sin id)"}`);
  lines.push(`- Entidad: ${row.nombre_entidad ?? "—"} (NIT ${row.nit_entidad ?? "—"})`);
  lines.push(`- Proveedor: ${row.proveedor_adjudicado ?? "—"} (Doc ${row.documento_proveedor ?? "—"})`);
  lines.push(`- Departamento: ${row.departamento ?? "—"} · Ciudad: ${row.ciudad ?? "—"}`);
  lines.push(`- Sector: ${row.sector ?? "—"}`);
  lines.push(`- Tipo: ${row.tipo_de_contrato ?? "—"}`);
  lines.push(`- Modalidad: ${row.modalidad_de_contratacion ?? "—"}`);
  lines.push(`- Estado: ${row.estado_contrato ?? "—"}`);
  lines.push(`- Valor: ${row.valor_del_contrato ?? "—"} COP`);
  lines.push(`- Anticipo: ${row.valor_de_pago_adelantado ?? "—"} COP`);
  lines.push(`- Firma: ${row.fecha_de_firma ?? "—"}`);
  lines.push(`- Inicio: ${row.fecha_de_inicio_del_contrato ?? "—"}`);
  lines.push(`- Fin: ${row.fecha_de_fin_del_contrato ?? "—"}`);
  lines.push(`- Días adicionados (otrosíes): ${row.dias_adicionados ?? 0}`);
  lines.push(`- Origen de recursos: ${row.origen_de_los_recursos ?? "—"}`);
  lines.push(`- Liquidación: ${row.liquidaci_n ?? "—"}`);
  lines.push("");
  lines.push("# Objeto / descripción del proceso");
  const obj = row.objeto_del_contrato ?? row.descripcion_del_proceso ?? "(no reportado)";
  lines.push(obj.slice(0, 2000));
  lines.push("");
  lines.push(`# Señales heurísticas ya detectadas (score base ${base.score}/100, nivel ${base.level})`);
  if (base.signals.length === 0) {
    lines.push("- (Ninguna señal automática detectada)");
  } else {
    base.signals.forEach((s, i) => {
      lines.push(`${i + 1}. [${s.severity.toUpperCase()} · peso ${s.weight}] ${s.title}`);
      lines.push(`   ${s.detail}`);
    });
  }
  lines.push("");
  lines.push("# Devuelve EXCLUSIVAMENTE este JSON (sin markdown, sin prefijos):");
  lines.push(`{
  "scoreAjustado": <int 0..100, partiendo de ${base.score} con ajuste máximo ±20>,
  "nivel": "crítico" | "alto" | "medio" | "bajo" | "mínimo",
  "banderasAdicionales": [
    { "titulo": "<corto>", "severidad": "alta" | "media" | "baja", "explicacion": "<1-2 oraciones>" }
  ],
  "justificacion": "<2-3 oraciones explicando el score para un periodista>",
  "recomendacion": "<acción concreta para una veeduría: pedir adendas, revisar pólizas, alertar Contraloría, etc.>",
  "citasObjeto": ["<fragmento textual del objeto que sustenta el riesgo>", "..."]
}`);
  return lines.join("\n");
}

function safeParseJson(text: string): LlmAuditResult | null {
  // Tolera modelos que envuelvan en ```json ... ``` o agreguen prefijos.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  // Busca el primer { y último } para extraer JSON robusto
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice);
    return normalizeResult(obj);
  } catch {
    return null;
  }
}

function normalizeResult(obj: Record<string, unknown>): LlmAuditResult {
  const score = clamp(Number(obj.scoreAjustado ?? 0), 0, 100);
  const nivelRaw = String(obj.nivel ?? "").toLowerCase();
  const nivel: LlmAuditResult["nivel"] =
    nivelRaw.includes("crít") ? "crítico"
    : nivelRaw.includes("alto") ? "alto"
    : nivelRaw.includes("medio") ? "medio"
    : nivelRaw.includes("bajo") ? "bajo"
    : "mínimo";
  const banderas = Array.isArray(obj.banderasAdicionales)
    ? (obj.banderasAdicionales as Array<Record<string, unknown>>)
        .map((b) => ({
          titulo: String(b.titulo ?? "").slice(0, 200),
          severidad:
            String(b.severidad ?? "media").toLowerCase() === "alta"
              ? "alta" as const
              : String(b.severidad ?? "media").toLowerCase() === "baja"
                ? "baja" as const
                : "media" as const,
          explicacion: String(b.explicacion ?? "").slice(0, 600),
        }))
        .filter((b) => b.titulo)
        .slice(0, 8)
    : [];
  const citas = Array.isArray(obj.citasObjeto)
    ? (obj.citasObjeto as unknown[]).map((c) => String(c).slice(0, 400)).filter(Boolean).slice(0, 5)
    : [];
  return {
    scoreAjustado: score,
    nivel,
    banderasAdicionales: banderas,
    justificacion: String(obj.justificacion ?? "").slice(0, 1200),
    recomendacion: String(obj.recomendacion ?? "").slice(0, 800),
    citasObjeto: citas,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export async function auditWithLlm(
  row: ContractRow,
  base: RiskAssessment,
): Promise<LlmAuditResult> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(row, base) },
    ],
    temperature: 0.1,
    max_completion_tokens: 1200,
    top_p: 1,
    stream: false,
  });
  const choice = (completion as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0];
  const content = choice?.message?.content ?? "";
  const parsed = safeParseJson(content);
  if (!parsed) {
    throw new Error(`LLM devolvió JSON inválido: ${content.slice(0, 200)}`);
  }
  return parsed;
}

/**
 * Variante streaming: emite chunks de SSE para que la UI muestre el análisis
 * a medida que el modelo lo genera. El chunk final contiene el JSON estructurado.
 */
export async function auditWithLlmStream(
  row: ContractRow,
  base: RiskAssessment,
): Promise<ReadableStream<Uint8Array>> {
  const client = getClient();
  const stream = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(row, base) },
    ],
    temperature: 0.1,
    max_completion_tokens: 1200,
    top_p: 1,
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        for await (const event of stream as AsyncIterable<{
          choices?: Array<{ delta?: { content?: string } }>;
        }>) {
          const delta = event.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            buffer += delta;
            controller.enqueue(
              encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: delta })}\n\n`),
            );
          }
        }
        const parsed = safeParseJson(buffer);
        const final = parsed ?? {
          scoreAjustado: base.score,
          nivel: base.level,
          banderasAdicionales: [],
          justificacion:
            "El modelo no devolvió un JSON parseable. Mostrando solo el análisis heurístico.",
          recomendacion:
            "Revisar manualmente el objeto del contrato; las señales determinísticas siguen vigentes.",
          citasObjeto: [],
        };
        controller.enqueue(
          encoder.encode(`event: done\ndata: ${JSON.stringify(final)}\n\n`),
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: String(e) })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}
