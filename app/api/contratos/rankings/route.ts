import { clampInt, jsonOk, jsonErr, preflight } from "@/lib/api-helpers";
import { groupBy } from "@/lib/socrata";

export const runtime = "nodejs";
export const revalidate = 600;

export function OPTIONS() {
  return preflight();
}

const ALLOWED_FIELDS = new Set([
  "nombre_entidad",
  "proveedor_adjudicado",
  "departamento",
  "ciudad",
  "sector",
  "rama",
  "tipo_de_contrato",
  "modalidad_de_contratacion",
  "estado_contrato",
]);

const ALLOWED_MEASURES = new Set(["count", "sum_valor"]);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const field = url.searchParams.get("field") ?? "nombre_entidad";
    const measure = url.searchParams.get("measure") ?? "count";
    const limit = clampInt(url.searchParams.get("limit"), 1, 100, 10);

    if (!ALLOWED_FIELDS.has(field)) {
      return jsonErr(
        "invalid_field",
        `Field '${field}' not allowed. Allowed: ${[...ALLOWED_FIELDS].join(", ")}`,
        400,
      );
    }
    if (!ALLOWED_MEASURES.has(measure)) {
      return jsonErr(
        "invalid_measure",
        `Measure '${measure}' not allowed. Allowed: ${[...ALLOWED_MEASURES].join(", ")}`,
        400,
      );
    }

    const measureExpr = measure === "sum_valor" ? "sum(valor_del_contrato)" : "count(*)";
    const ranking = await groupBy(field, {
      measure: measureExpr,
      alias: "value",
      limit,
    });

    return jsonOk(ranking, {
      dataset: "jbjy-vk9h",
      field,
      measure,
      limit,
    }, 600);
  } catch (e) {
    return jsonErr("rankings_error", String(e), 502);
  }
}
