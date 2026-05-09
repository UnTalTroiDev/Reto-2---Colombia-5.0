/**
 * Auditor LLM: toma un contrato + sus señales determinísticas, y le pide
 * a Cerebras (Llama 3.3 70B) un análisis cualitativo en español jurídico colombiano.
 *
 * Devuelve JSON estructurado: ajuste de score, banderas adicionales, justificación,
 * y recomendación de acción para una veeduría ciudadana.
 */

import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type { ContractRow, RiskAssessment } from "@/lib/risk-signals";

/**
 * Cadena de modelos OSS en Cerebras, ordenada por calidad.
 * Si el primero responde 429 (rate limit), pasamos al siguiente.
 * Las rate limits en Cerebras son por modelo, así que el fallback funciona.
 */
const MODEL_CHAIN: string[] = [
  process.env.CEREBRAS_MODEL ?? "qwen-3-235b-a22b-instruct-2507",
  "gpt-oss-120b",
  "zai-glm-4.7",
  "llama3.1-8b",
];
// Dedup en caso de override igual a uno de los fallbacks
const MODELS = Array.from(new Set(MODEL_CHAIN));

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

/**
 * Cache en memoria por id_contrato. Sobrevive a invocaciones tibias (Fluid Compute)
 * pero no entre cold starts. Suficiente para una demo en hackathon.
 */
type CacheEntry = { result: LlmAuditResult; modelUsed: string; expires: number };
const auditCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

function cacheKey(row: ContractRow, base: RiskAssessment): string {
  return `${row.id_contrato ?? "na"}::${base.score}`;
}

/**
 * Las 5 banderas rojas canónicas para auditoría de contratación pública.
 * Esquema basado en lineamientos de Transparencia por Colombia, Contraloría
 * General de la República y OECD anti-corruption framework.
 */
export const CATEGORIAS_RIESGO = [
  "implementacion",
  "licitacion",
  "relaciones",
  "conflictos_interes",
  "financiero",
] as const;
export type CategoriaRiesgo = (typeof CATEGORIAS_RIESGO)[number];

export const CATEGORIA_LABEL: Record<CategoriaRiesgo, { name: string; descripcion: string }> = {
  implementacion: {
    name: "Irregularidades en la implementación",
    descripcion:
      "Fallas en la ejecución del contrato: plazos sospechosos, otrosíes excesivos, contratos no liquidados, sobre-ejecución.",
  },
  licitacion: {
    name: "Procesos de licitación viciados",
    descripcion:
      "Modalidad de selección que recorta competencia, justificación genérica, fraccionamiento, evasión de licitación pública.",
  },
  relaciones: {
    name: "Relaciones inusuales",
    descripcion:
      "Concentración del mismo proveedor con la misma entidad, identidades del proveedor incompletas, autosupervisión (mismo gestor y supervisor).",
  },
  conflictos_interes: {
    name: "Conflictos de interés",
    descripcion:
      "Coincidencias entre representante legal del proveedor, ordenador del gasto, supervisor o pagador. Pagos a uno mismo o relaciones familiares.",
  },
  financiero: {
    name: "Inconsistencias financieras",
    descripcion:
      "Anticipos excesivos o no habilitados, valores anómalos, redondeos sospechosos, amortización incompleta, pago > facturado.",
  },
};

export type LlmAuditResult = {
  scoreAjustado: number; // 0..100, mayor = más riesgo
  nivel: "crítico" | "alto" | "medio" | "bajo" | "mínimo";
  /** Subset de las 5 categorías canónicas que el LLM detectó. */
  categoriasDetectadas: CategoriaRiesgo[];
  banderasAdicionales: Array<{
    titulo: string;
    severidad: "alta" | "media" | "baja";
    categoria: CategoriaRiesgo;
    explicacion: string;
  }>;
  justificacion: string; // 2-3 oraciones para un periodista/ciudadano
  recomendacion: string; // qué hacer: ¿pedir info?, ¿alertar a la Contraloría?, ¿auditar adendas?
  citasObjeto: string[]; // fragmentos del objeto del contrato citados
};

const SYSTEM_PROMPT = `Eres un auditor experto en contratación pública colombiana, capacitado en Ley 80 de 1993, Ley 1150 de 2007 y el Decreto 1082 de 2015. Trabajas para una veeduría ciudadana que analiza datos de SECOP II.

Tu marco de análisis son las 5 banderas rojas canónicas de auditoría de contratación pública:

1. IMPLEMENTACION (irregularidades en la implementación):
   - Plazos sospechosos (inicio antes de la firma, duración negativa, ejecución >5 años)
   - Otrosíes / días adicionados excesivos (>90 días)
   - Contratos terminados sin liquidación
   - Sobre-ejecución (valor facturado > valor del contrato)
   - CDP / saldos presupuestales insuficientes

2. LICITACION (procesos de licitación viciados):
   - Modalidad que recorta competencia (Contratación Directa sin justificación sólida, Régimen especial inapropiado)
   - Justificación de modalidad genérica o vacía
   - Valores justo debajo del umbral de licitación (sospecha de elusión)
   - Fraccionamiento: mismo objeto en múltiples contratos pequeños
   - Especificaciones técnicas a la medida (objeto que delata un solo oferente posible)
   - Contratos de prestación de servicios para funciones permanentes (uso indebido para evadir nómina)

3. RELACIONES (relaciones inusuales):
   - Concentración: mismo proveedor con la misma entidad N veces
   - Proveedor sin identificación o con datos incompletos (oculta identidad)
   - Autosupervisión: ordenador del gasto = supervisor (misma persona gestiona y verifica)
   - Cesiones reiteradas a terceros

4. CONFLICTOS_INTERES:
   - Representante legal del proveedor = ordenador del gasto = pagador (pago a uno mismo)
   - Vínculos familiares o societarios entre adjudicatario y entidad
   - Banco/cuenta del proveedor coincide con histórico cuestionable
   - Funcionarios públicos contratando con sus propias empresas

5. FINANCIERO (inconsistencias financieras):
   - Anticipo > 50% (límite legal en obra pública según Decreto 1082)
   - Anticipo cobrado sin habilitación de pago adelantado
   - Valor del contrato cero, negativo o atípico (>10x mediana del tipo)
   - Redondeos sospechosos (todos los valores en millones redondos = no hay cálculo real de costos)
   - Amortización incompleta: anticipo no se descuenta de pagos
   - Valor pagado > valor facturado

Tu tarea: dado un contrato + señales heurísticas, lees el objeto/descripción y emites:
(a) Un score ajustado.
(b) La lista de cuáles de las 5 banderas rojas detectaste (categoriasDetectadas).
(c) Banderas adicionales que las heurísticas no capturaron, cada una clasificada en UNA de las 5 categorías.
(d) Una justificación corta y una recomendación concreta para una veeduría.

Reglas estrictas:
1. Solo afirmas lo que el texto del contrato y las señales heurísticas sustentan. NO especulas sobre nombres propios.
2. NO acusas — describes patrones de riesgo y recomiendas acciones de fiscalización.
3. Hablas en español colombiano, claro, no jurídico-técnico salvo necesidad.
4. Devuelves SOLO JSON válido en el schema indicado. Sin texto antes o después.
5. El "scoreAjustado" parte del score base, lo modificas máximo ±20 puntos según tu lectura cualitativa.
6. categoriasDetectadas debe ser un subset de: ["implementacion","licitacion","relaciones","conflictos_interes","financiero"]. Solo las que evidencias real, no las posibles.
7. Cada bandera adicional DEBE tener "categoria" usando esos mismos slugs exactos.`;

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
  "categoriasDetectadas": ["implementacion"|"licitacion"|"relaciones"|"conflictos_interes"|"financiero", ...],
  "banderasAdicionales": [
    {
      "titulo": "<corto>",
      "severidad": "alta" | "media" | "baja",
      "categoria": "implementacion" | "licitacion" | "relaciones" | "conflictos_interes" | "financiero",
      "explicacion": "<1-2 oraciones>"
    }
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

function parseCategoria(v: unknown): CategoriaRiesgo | null {
  const s = String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z_]/g, "");
  if (s.includes("implement")) return "implementacion";
  if (s.includes("licit")) return "licitacion";
  if (s.includes("relacion")) return "relaciones";
  if (s.includes("conflicto") || s.includes("interes")) return "conflictos_interes";
  if (s.includes("financ") || s.includes("dinero") || s.includes("presupuesto")) return "financiero";
  return null;
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

  const categoriasDetectadas: CategoriaRiesgo[] = [];
  if (Array.isArray(obj.categoriasDetectadas)) {
    for (const v of obj.categoriasDetectadas) {
      const c = parseCategoria(v);
      if (c && !categoriasDetectadas.includes(c)) categoriasDetectadas.push(c);
    }
  }

  const banderas = Array.isArray(obj.banderasAdicionales)
    ? (obj.banderasAdicionales as Array<Record<string, unknown>>)
        .map((b) => {
          const cat = parseCategoria(b.categoria) ?? "implementacion";
          // Si una bandera tiene categoría pero no está en categoriasDetectadas, agregarla
          if (!categoriasDetectadas.includes(cat)) categoriasDetectadas.push(cat);
          return {
            titulo: String(b.titulo ?? "").slice(0, 200),
            severidad:
              String(b.severidad ?? "media").toLowerCase() === "alta"
                ? ("alta" as const)
                : String(b.severidad ?? "media").toLowerCase() === "baja"
                  ? ("baja" as const)
                  : ("media" as const),
            categoria: cat,
            explicacion: String(b.explicacion ?? "").slice(0, 600),
          };
        })
        .filter((b) => b.titulo)
        .slice(0, 8)
    : [];
  const citas = Array.isArray(obj.citasObjeto)
    ? (obj.citasObjeto as unknown[]).map((c) => String(c).slice(0, 400)).filter(Boolean).slice(0, 5)
    : [];
  return {
    scoreAjustado: score,
    nivel,
    categoriasDetectadas,
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

function isRateLimit(e: unknown): boolean {
  const msg = String(e instanceof Error ? e.message : e);
  return /429|rate.?limit|high.?traffic/i.test(msg);
}

async function runOnce(
  client: Cerebras,
  model: string,
  row: ContractRow,
  base: RiskAssessment,
): Promise<LlmAuditResult> {
  const completion = await client.chat.completions.create({
    model,
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
  if (!parsed) throw new Error(`LLM (${model}) devolvió JSON inválido`);
  return parsed;
}

export async function auditWithLlm(
  row: ContractRow,
  base: RiskAssessment,
): Promise<LlmAuditResult> {
  const key = cacheKey(row, base);
  const cached = auditCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.result;

  const client = getClient();
  let lastError: unknown = new Error("Sin modelos disponibles");
  for (const model of MODELS) {
    try {
      const result = await runOnce(client, model, row, base);
      auditCache.set(key, { result, modelUsed: model, expires: Date.now() + CACHE_TTL_MS });
      return result;
    } catch (e) {
      lastError = e;
      // Solo intentamos siguiente modelo si es rate limit; otros errores se propagan.
      if (!isRateLimit(e)) throw e;
    }
  }
  throw lastError;
}

/**
 * Variante streaming con fallback automático entre modelos OSS de Cerebras.
 * Si recibimos cache hit, replay instantáneo como evento `done`.
 * Si el primer modelo falla con 429, probamos el siguiente.
 * Una vez iniciado el stream sin error, los chunks se emiten al cliente.
 */
export async function auditWithLlmStream(
  row: ContractRow,
  base: RiskAssessment,
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const key = cacheKey(row, base);
  const cached = auditCache.get(key);

  // Cache hit → replay instantáneo
  if (cached && cached.expires > Date.now()) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        const fullJson = JSON.stringify(cached.result, null, 2);
        // Emite en chunks para que la UI muestre la animación de streaming
        const chunkSize = 24;
        for (let i = 0; i < fullJson.length; i += chunkSize) {
          const chunk = fullJson.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: chunk })}\n\n`),
          );
        }
        controller.enqueue(
          encoder.encode(`event: done\ndata: ${JSON.stringify(cached.result)}\n\n`),
        );
        controller.close();
      },
    });
  }

  const client = getClient();

  // Intenta abrir el stream con la cadena de modelos hasta que uno responda.
  type ChatStream = AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>;
  let stream: ChatStream | null = null;
  let modelUsed = "";
  let lastError: unknown = null;

  for (const model of MODELS) {
    try {
      stream = (await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(row, base) },
        ],
        temperature: 0.1,
        max_completion_tokens: 1200,
        top_p: 1,
        stream: true,
      })) as unknown as ChatStream;
      modelUsed = model;
      break;
    } catch (e) {
      lastError = e;
      if (!isRateLimit(e)) break; // si no es 429, no tiene sentido reintentar
    }
  }

  if (!stream) {
    const msg = String(lastError instanceof Error ? lastError.message : lastError ?? "sin modelos");
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: `Todos los modelos rate-limited: ${msg}` })}\n\n`,
          ),
        );
        controller.close();
      },
    });
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        controller.enqueue(
          encoder.encode(`event: model\ndata: ${JSON.stringify({ model: modelUsed })}\n\n`),
        );
        for await (const event of stream as ChatStream) {
          const delta = event.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            buffer += delta;
            controller.enqueue(
              encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: delta })}\n\n`),
            );
          }
        }
        const parsed = safeParseJson(buffer);
        const final =
          parsed ??
          ({
            scoreAjustado: base.score,
            nivel: base.level,
            categoriasDetectadas: [],
            banderasAdicionales: [],
            justificacion:
              "El modelo no devolvió un JSON parseable. Mostrando solo el análisis heurístico.",
            recomendacion:
              "Revisar manualmente el objeto del contrato; las señales determinísticas siguen vigentes.",
            citasObjeto: [],
          } satisfies LlmAuditResult);
        if (parsed) {
          auditCache.set(key, {
            result: parsed,
            modelUsed,
            expires: Date.now() + CACHE_TTL_MS,
          });
        }
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
