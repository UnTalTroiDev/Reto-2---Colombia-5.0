/**
 * Data quality analyzer: runs over a sample to detect "dirty" data.
 * Returns per-field stats + overall quality score.
 */

export type FieldStat = {
  field: string;
  type: "text" | "number" | "date" | "url" | "bool" | "unknown";
  total: number;
  nonNull: number;
  nullCount: number;
  nullPct: number;
  emptyStringCount: number;
  uniqueCount: number;
  duplicatePct: number;
  placeholderCount: number; // values like "No Definido", "N/A", "0"
  sampleValues: string[];
  // Only for numeric:
  numeric?: { min: number; max: number; mean: number; negativeCount: number; zeroCount: number };
  // Only for date:
  date?: { earliest: string; latest: string; invalidCount: number };
  issues: string[];
};

export type QualityReport = {
  totalRows: number;
  fieldCount: number;
  fields: FieldStat[];
  duplicateRows: number;
  duplicateRowPct: number;
  qualityScore: number; // 0-100
  issuesBySeverity: { high: number; medium: number; low: number };
  topIssues: Array<{ field: string; issue: string; severity: "high" | "medium" | "low" }>;
};

const PLACEHOLDERS = new Set([
  "no definido",
  "no definida",
  "n/a",
  "na",
  "null",
  "ninguno",
  "ninguna",
  "sin definir",
  "sin información",
  "-",
  "--",
  "0",
]);

const NUMERIC_FIELDS_HINT = /(valor|saldo|dias|nit|count|count\(|presupuesto|sistema_|recursos|codigo_)/i;
const DATE_FIELDS_HINT = /(fecha|ultima_actualizacion)/i;
const URL_FIELDS_HINT = /(url|urlproceso)/i;
const BOOL_VALUES = new Set(["si", "sí", "no", "true", "false"]);

function detectType(field: string, samples: unknown[]): FieldStat["type"] {
  if (URL_FIELDS_HINT.test(field)) return "url";
  if (DATE_FIELDS_HINT.test(field)) return "date";
  if (NUMERIC_FIELDS_HINT.test(field)) {
    const numericish = samples.filter((v) => v !== null && v !== "" && !Number.isNaN(Number(v)));
    if (numericish.length / Math.max(1, samples.length) > 0.7) return "number";
  }
  const lowerSamples = samples
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => String(v).toLowerCase().trim());
  if (lowerSamples.length > 0 && lowerSamples.every((v) => BOOL_VALUES.has(v))) return "bool";
  return "text";
}

export function analyzeSample(rows: Record<string, unknown>[]): QualityReport {
  if (rows.length === 0) {
    return {
      totalRows: 0,
      fieldCount: 0,
      fields: [],
      duplicateRows: 0,
      duplicateRowPct: 0,
      qualityScore: 0,
      issuesBySeverity: { high: 0, medium: 0, low: 0 },
      topIssues: [],
    };
  }

  // Collect every field name across rows.
  const fieldSet = new Set<string>();
  for (const row of rows) for (const k of Object.keys(row)) fieldSet.add(k);
  const allFields = Array.from(fieldSet);

  const stats: FieldStat[] = [];
  const issuesBySeverity = { high: 0, medium: 0, low: 0 };
  const topIssues: QualityReport["topIssues"] = [];

  for (const field of allFields) {
    const rawValues = rows.map((r) => r[field]);
    const type = detectType(field, rawValues.slice(0, 200));
    const seen = new Map<string, number>();
    let nullCount = 0;
    let emptyStringCount = 0;
    let placeholderCount = 0;
    let negativeCount = 0;
    let zeroCount = 0;
    let invalidDateCount = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;
    let numericN = 0;
    let earliest: number | null = null;
    let latest: number | null = null;

    for (const v of rawValues) {
      if (v === null || v === undefined) {
        nullCount++;
        continue;
      }
      const s = String(v).trim();
      if (s === "") {
        emptyStringCount++;
        continue;
      }
      const lower = s.toLowerCase();
      if (PLACEHOLDERS.has(lower)) placeholderCount++;

      seen.set(s, (seen.get(s) ?? 0) + 1);

      if (type === "number") {
        const n = Number(s);
        if (Number.isFinite(n)) {
          if (n < 0) negativeCount++;
          if (n === 0) zeroCount++;
          if (n < min) min = n;
          if (n > max) max = n;
          sum += n;
          numericN++;
        }
      }

      if (type === "date") {
        const t = Date.parse(s);
        if (!Number.isFinite(t)) invalidDateCount++;
        else {
          if (earliest === null || t < earliest) earliest = t;
          if (latest === null || t > latest) latest = t;
        }
      }
    }

    const total = rawValues.length;
    const effectiveNull = nullCount + emptyStringCount;
    const nonNull = total - effectiveNull;
    const uniqueCount = seen.size;
    const duplicatePct = nonNull === 0 ? 0 : 1 - uniqueCount / nonNull;

    const sampleValues = Array.from(seen.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([v]) => v);

    const issues: string[] = [];

    const nullPct = effectiveNull / total;
    if (nullPct > 0.5) {
      issues.push(`> 50% valores faltantes (${(nullPct * 100).toFixed(1)}%)`);
      issuesBySeverity.high++;
      topIssues.push({ field, issue: `${(nullPct * 100).toFixed(0)}% nulos`, severity: "high" });
    } else if (nullPct > 0.2) {
      issues.push(`Faltantes elevados (${(nullPct * 100).toFixed(1)}%)`);
      issuesBySeverity.medium++;
    } else if (nullPct > 0.05) {
      issuesBySeverity.low++;
    }

    if (placeholderCount / Math.max(1, total) > 0.1) {
      issues.push(
        `Placeholders frecuentes ("No Definido"/"N/A"): ${placeholderCount} (${((placeholderCount / total) * 100).toFixed(1)}%)`,
      );
      issuesBySeverity.medium++;
      topIssues.push({
        field,
        issue: `${placeholderCount} placeholders ("No Definido"/"N/A")`,
        severity: "medium",
      });
    }

    if (type === "number" && negativeCount > 0 && /(valor|saldo|presupuesto)/i.test(field)) {
      issues.push(`${negativeCount} valores negativos en campo monetario`);
      issuesBySeverity.medium++;
      topIssues.push({ field, issue: `${negativeCount} valores negativos`, severity: "medium" });
    }

    if (type === "date" && invalidDateCount > 0) {
      issues.push(`${invalidDateCount} fechas inválidas`);
      issuesBySeverity.medium++;
    }

    const stat: FieldStat = {
      field,
      type,
      total,
      nonNull,
      nullCount: effectiveNull,
      nullPct,
      emptyStringCount,
      uniqueCount,
      duplicatePct,
      placeholderCount,
      sampleValues,
      issues,
    };

    if (type === "number" && numericN > 0) {
      stat.numeric = {
        min: min === Number.POSITIVE_INFINITY ? 0 : min,
        max: max === Number.NEGATIVE_INFINITY ? 0 : max,
        mean: sum / numericN,
        negativeCount,
        zeroCount,
      };
    }
    if (type === "date" && earliest !== null && latest !== null) {
      stat.date = {
        earliest: new Date(earliest).toISOString().slice(0, 10),
        latest: new Date(latest).toISOString().slice(0, 10),
        invalidCount: invalidDateCount,
      };
    }

    stats.push(stat);
  }

  // Whole-row duplicates (using id_contrato when present, otherwise hash all fields).
  const idField = allFields.find((f) => f === "id_contrato") ?? null;
  const seenRows = new Set<string>();
  let duplicateRows = 0;
  for (const row of rows) {
    const key = idField ? String(row[idField] ?? "") : JSON.stringify(row);
    if (key === "" || key === "null") continue;
    if (seenRows.has(key)) duplicateRows++;
    else seenRows.add(key);
  }
  const duplicateRowPct = duplicateRows / rows.length;

  if (duplicateRowPct > 0.01) {
    issuesBySeverity.high++;
    topIssues.unshift({
      field: idField ?? "(toda la fila)",
      issue: `${duplicateRows} filas duplicadas (${(duplicateRowPct * 100).toFixed(2)}%)`,
      severity: "high",
    });
  }

  // Quality score: weighted by severity; capped 0..100.
  const fieldCount = stats.length;
  const penalty =
    issuesBySeverity.high * 8 + issuesBySeverity.medium * 3 + issuesBySeverity.low * 0.5;
  const qualityScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    totalRows: rows.length,
    fieldCount,
    fields: stats.sort((a, b) => b.nullPct - a.nullPct),
    duplicateRows,
    duplicateRowPct,
    qualityScore,
    issuesBySeverity,
    topIssues: topIssues.slice(0, 10),
  };
}
