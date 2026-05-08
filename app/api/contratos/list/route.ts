import { clampInt, jsonOk, jsonErr, preflight } from "@/lib/api-helpers";
import { soda, totalCount } from "@/lib/socrata";

export const runtime = "nodejs";
export const revalidate = 300;

export function OPTIONS() {
  return preflight();
}

function escapeSoql(s: string): string {
  return s.replace(/'/g, "''");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = clampInt(url.searchParams.get("limit"), 1, 100, 50);
    const offset = clampInt(url.searchParams.get("offset"), 0, 1_000_000, 0);
    const departamento = url.searchParams.get("departamento") ?? undefined;
    const estado = url.searchParams.get("estado") ?? undefined;
    const q = url.searchParams.get("q") ?? undefined;

    const parts: string[] = [];
    if (departamento) parts.push(`departamento = '${escapeSoql(departamento)}'`);
    if (estado) parts.push(`estado_contrato = '${escapeSoql(estado)}'`);
    if (q) {
      const e = escapeSoql(q);
      parts.push(
        `(upper(nombre_entidad) like upper('%${e}%') OR upper(proveedor_adjudicado) like upper('%${e}%') OR upper(descripcion_del_proceso) like upper('%${e}%'))`,
      );
    }
    const where = parts.length ? parts.join(" AND ") : undefined;

    const [rows, total] = await Promise.all([
      soda({
        $select:
          "id_contrato, nombre_entidad, nit_entidad, proveedor_adjudicado, departamento, estado_contrato, tipo_de_contrato, modalidad_de_contratacion, fecha_de_firma, valor_del_contrato, urlproceso",
        $where: where,
        $order: "fecha_de_firma DESC NULL LAST",
        $limit: limit,
        $offset: offset,
      }),
      totalCount(where),
    ]);

    return jsonOk(rows, {
      dataset: "jbjy-vk9h",
      total,
      limit,
      offset,
      filters: { departamento, estado, q },
    }, 300);
  } catch (e) {
    return jsonErr("list_error", String(e), 502);
  }
}
