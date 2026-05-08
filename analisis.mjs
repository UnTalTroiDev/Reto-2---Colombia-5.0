/**
 * Analisis rapido de calidad de datos sobre SECOP integrado (jbjy-vk9h).
 * Descarga una muestra estadistica y responde preguntas tipicas de un formulario
 * de evaluacion de datos.
 *
 * Uso:    node analisis.mjs              (muestra 5000 filas, default)
 *         node analisis.mjs 20000        (muestra mayor)
 *         SOCRATA_APP_TOKEN=xxx node ... (mejores rate limits)
 *
 * Salida: analisis-resultado.json + tabla en consola lista para copiar.
 */

import { writeFileSync } from "node:fs";

const DATASET = "jbjy-vk9h";
const BASE = `https://www.datos.gov.co/resource/${DATASET}.json`;
const SAMPLE_SIZE = Math.min(Math.max(Number(process.argv[2]) || 5000, 500), 50000);
const TOKEN = process.env.SOCRATA_APP_TOKEN;

const PLACEHOLDERS = new Set([
  "no definido", "no definida", "n/a", "na", "null",
  "ninguno", "ninguna", "sin definir", "sin información", "-", "--",
]);

const NUMERIC_HINT = /(valor|saldo|dias|presupuesto|sistema_|recursos)/i;
const DATE_HINT = /(fecha|ultima_actualizacion)/i;
const URL_HINT = /(url)/i;

async function soda(params) {
  const url = `${BASE}?${new URLSearchParams(params)}`;
  const headers = { Accept: "application/json" };
  if (TOKEN) headers["X-App-Token"] = TOKEN;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`SODA ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function detectType(field, values) {
  if (URL_HINT.test(field)) return "url";
  if (DATE_HINT.test(field)) return "date";
  if (NUMERIC_HINT.test(field)) {
    const numericish = values.filter((v) => v != null && v !== "" && !Number.isNaN(Number(v)));
    if (numericish.length / Math.max(1, values.length) > 0.7) return "number";
  }
  return "text";
}

function pct(n, total) {
  return total === 0 ? 0 : (n / total) * 100;
}

function fmtPct(n) {
  return `${n.toFixed(2)}%`;
}

console.log(`\n========================================================`);
console.log(`  ANALISIS DE CALIDAD - SECOP Integrado (${DATASET})`);
console.log(`  Muestra: ${SAMPLE_SIZE.toLocaleString("es-CO")} filas`);
console.log(`========================================================\n`);

const t0 = Date.now();

// 1. Total real del dataset (server-side count).
console.log("→ Consultando total de registros…");
const [{ count: totalCount }] = await soda({ $select: "count(*) AS count" });
console.log(`  Total dataset: ${Number(totalCount).toLocaleString("es-CO")} filas`);

// 2. Descargar muestra ordenada por :id (orden insercion).
console.log("→ Descargando muestra…");
const rows = await soda({ $limit: String(SAMPLE_SIZE), $order: ":id" });
console.log(`  Descargadas: ${rows.length} filas en ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

// 3. Recolectar todos los campos.
const fieldSet = new Set();
for (const r of rows) for (const k of Object.keys(r)) fieldSet.add(k);
const fields = [...fieldSet];

// 4. Stats por campo.
const fieldStats = [];
let totalNullCells = 0;
let totalCells = 0;

for (const field of fields) {
  const values = rows.map((r) => r[field]);
  const type = detectType(field, values.slice(0, 200));
  let nullCount = 0;
  let placeholderCount = 0;
  let negativeCount = 0;
  let invalidDates = 0;
  const seen = new Map();

  for (const v of values) {
    totalCells++;
    if (v == null || (typeof v === "string" && v.trim() === "")) {
      nullCount++;
      totalNullCells++;
      continue;
    }
    const s = String(typeof v === "object" ? JSON.stringify(v) : v).trim();
    seen.set(s, (seen.get(s) ?? 0) + 1);
    if (PLACEHOLDERS.has(s.toLowerCase())) placeholderCount++;
    if (type === "number" && /(valor|saldo|presupuesto)/i.test(field)) {
      const n = Number(s);
      if (Number.isFinite(n) && n < 0) negativeCount++;
    }
    if (type === "date" && !Number.isFinite(Date.parse(s))) invalidDates++;
  }

  fieldStats.push({
    field,
    type,
    null_pct: pct(nullCount, values.length),
    unique_count: seen.size,
    placeholder_count: placeholderCount,
    negative_count: negativeCount,
    invalid_date_count: invalidDates,
    sample_values: [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v),
  });
}

// 5. Filas duplicadas por id_contrato.
const idCounts = new Map();
let duplicateRows = 0;
for (const r of rows) {
  const id = r.id_contrato;
  if (!id) continue;
  if (idCounts.has(id)) duplicateRows++;
  else idCounts.set(id, 1);
}

// 6. Ranking de problemas.
fieldStats.sort((a, b) => b.null_pct - a.null_pct);
const camposCriticos = fieldStats.filter((f) => f.null_pct > 50);
const camposConPlaceholders = fieldStats.filter((f) => f.placeholder_count > rows.length * 0.1);

// 7. Score de calidad.
const issuesAltos = camposCriticos.length + (duplicateRows > rows.length * 0.01 ? 1 : 0);
const issuesMedios =
  camposConPlaceholders.length +
  fieldStats.filter((f) => f.null_pct > 20 && f.null_pct <= 50).length +
  fieldStats.filter((f) => f.negative_count > 0).length;
const issuesBajos = fieldStats.filter((f) => f.null_pct > 5 && f.null_pct <= 20).length;
const score = Math.max(0, Math.min(100, 100 - issuesAltos * 8 - issuesMedios * 3 - issuesBajos * 0.5));

// 8. Veredicto.
const veredicto = score >= 75 ? "LIMPIO" : score >= 50 ? "MIXTO" : "SUCIO";

// ----- SALIDA -----
console.log(`╔══════════════════════════════════════════════════════════════╗`);
console.log(`║   RESPUESTAS LISTAS PARA EL FORMULARIO                       ║`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

console.log(`P1. Fuente:               datos.gov.co - SECOP Integrado (${DATASET})`);
console.log(`P2. Total de registros:   ${Number(totalCount).toLocaleString("es-CO")}`);
console.log(`P3. Numero de campos:     ${fields.length}`);
const types = fieldStats.reduce((a, f) => ((a[f.type] = (a[f.type] ?? 0) + 1), a), {});
console.log(`P4. Tipos de datos:       ${Object.entries(types).map(([t, n]) => `${t}=${n}`).join(", ")}`);
console.log(`P5. Tamano muestra anal.: ${rows.length.toLocaleString("es-CO")} filas\n`);

console.log(`P6. ¿Datos limpios?:      ${veredicto} (score ${Math.round(score)}/100)`);
console.log(`P7. % nulos global:       ${fmtPct(pct(totalNullCells, totalCells))}`);
console.log(`P8. Filas duplicadas:     ${duplicateRows} (${fmtPct(pct(duplicateRows, rows.length))})`);
console.log(`P9. Campos con >50% nulos:${camposCriticos.length}`);
console.log(`P10. Issues totales:      ${issuesAltos} altos, ${issuesMedios} medios, ${issuesBajos} bajos\n`);

console.log(`──── TOP 10 CAMPOS CON MAS NULOS ────`);
console.log(`Campo                                        Tipo     %Nulos    Únicos`);
fieldStats.slice(0, 10).forEach((f) => {
  console.log(
    `${f.field.padEnd(45)}${f.type.padEnd(9)}${fmtPct(f.null_pct).padStart(8)}  ${String(f.unique_count).padStart(7)}`,
  );
});

console.log(`\n──── CAMPOS CON PLACEHOLDERS ("No Definido", "N/A") ────`);
if (camposConPlaceholders.length === 0) {
  console.log(`Ninguno con frecuencia significativa.`);
} else {
  camposConPlaceholders.slice(0, 10).forEach((f) => {
    console.log(`${f.field.padEnd(45)} ${f.placeholder_count} placeholders`);
  });
}

const resultado = {
  fuente: `datos.gov.co - SECOP Integrado (${DATASET})`,
  total_registros: Number(totalCount),
  campos: fields.length,
  tipos_de_datos: types,
  muestra_analizada: rows.length,
  veredicto,
  score_calidad: Math.round(score),
  pct_nulos_global: pct(totalNullCells, totalCells),
  filas_duplicadas: duplicateRows,
  pct_filas_duplicadas: pct(duplicateRows, rows.length),
  issues: { altos: issuesAltos, medios: issuesMedios, bajos: issuesBajos },
  campos_criticos: camposCriticos.map((f) => ({ campo: f.field, null_pct: f.null_pct })),
  campos_con_placeholders: camposConPlaceholders.map((f) => ({
    campo: f.field,
    placeholders: f.placeholder_count,
  })),
  detalle_por_campo: fieldStats,
  generado_en: new Date().toISOString(),
};

writeFileSync("analisis-resultado.json", JSON.stringify(resultado, null, 2));
console.log(`\n✓ Resultado completo en: analisis-resultado.json`);
console.log(`  Tiempo total: ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
