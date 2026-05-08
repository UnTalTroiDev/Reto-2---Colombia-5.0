import { jsonOk, jsonErr, preflight } from "@/lib/api-helpers";
import { groupBy, soda, totalCount } from "@/lib/socrata";

export const runtime = "nodejs";
export const revalidate = 600;

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  try {
    const [
      total,
      sumValor,
      entidades,
      proveedores,
      byEstado,
      byTipoContrato,
      byModalidad,
      bySector,
      byDepartamento,
    ] = await Promise.all([
      totalCount(),
      soda<{ s: string }>({ $select: "sum(valor_del_contrato) AS s" }).then((r) =>
        Number(r[0]?.s ?? 0),
      ),
      soda<{ n: string }>({ $select: "count(distinct nit_entidad) AS n" }).then((r) =>
        Number(r[0]?.n ?? 0),
      ),
      soda<{ n: string }>({ $select: "count(distinct documento_proveedor) AS n" }).then((r) =>
        Number(r[0]?.n ?? 0),
      ),
      groupBy("estado_contrato", { limit: 12 }),
      groupBy("tipo_de_contrato", { limit: 12 }),
      groupBy("modalidad_de_contratacion", { limit: 12 }),
      groupBy("sector", { limit: 15 }),
      groupBy("departamento", { limit: 35 }),
    ]);

    return jsonOk(
      {
        total_contratos: total,
        valor_contratado_total: sumValor,
        entidades_unicas: entidades,
        proveedores_unicos: proveedores,
        por_estado: byEstado,
        por_tipo_contrato: byTipoContrato,
        por_modalidad: byModalidad,
        por_sector: bySector,
        por_departamento: byDepartamento,
      },
      { dataset: "jbjy-vk9h", computed_at: new Date().toISOString() },
      600,
    );
  } catch (e) {
    return jsonErr("upstream_error", String(e), 502);
  }
}
