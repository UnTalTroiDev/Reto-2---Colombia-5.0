import { clampInt, jsonOk, jsonErr, preflight } from "@/lib/api-helpers";
import { soda } from "@/lib/socrata";
import { evaluateContract, type ContractRow } from "@/lib/risk-signals";

export const runtime = "nodejs";
export const revalidate = 600;

export function OPTIONS() {
  return preflight();
}

function escapeSoql(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Estrategia: el dataset es muy grande para puntuar todo en runtime.
 * Filtramos en SODA por modalidades de mayor riesgo + valor mínimo,
 * traemos un pool de candidatos, los puntuamos con el motor heurístico
 * y devolvemos los top-N.
 *
 * Soporta filtros opcionales: departamento, sector, modalidad, valor_min.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = clampInt(url.searchParams.get("limit"), 5, 50, 20);
    const pool = clampInt(url.searchParams.get("pool"), 50, 500, 200);
    const departamento = url.searchParams.get("departamento") ?? undefined;
    const sector = url.searchParams.get("sector") ?? undefined;
    const modalidad = url.searchParams.get("modalidad") ?? undefined;
    const valorMin = clampInt(url.searchParams.get("valor_min"), 0, 1_000_000_000_000, 100_000_000);

    const parts: string[] = [];
    parts.push(`valor_del_contrato > ${valorMin}`);
    if (departamento) parts.push(`departamento = '${escapeSoql(departamento)}'`);
    if (sector) parts.push(`sector = '${escapeSoql(sector)}'`);
    if (modalidad) {
      parts.push(`upper(modalidad_de_contratacion) like upper('%${escapeSoql(modalidad)}%')`);
    } else {
      // Sin filtro explícito, priorizamos modalidades históricamente más sensibles.
      parts.push(
        `(upper(modalidad_de_contratacion) like upper('%directa%') OR upper(modalidad_de_contratacion) like upper('%régimen especial%') OR upper(modalidad_de_contratacion) like upper('%minima cuantia%') OR upper(modalidad_de_contratacion) like upper('%mínima cuantía%'))`,
      );
    }

    const where = parts.join(" AND ");

    const rows = await soda<ContractRow>({
      $select:
        "id_contrato, nombre_entidad, nit_entidad, proveedor_adjudicado, documento_proveedor, departamento, ciudad, sector, estado_contrato, tipo_de_contrato, modalidad_de_contratacion, justificacion_modalidad_de, fecha_de_firma, fecha_de_inicio_del_contrato, fecha_de_fin_del_contrato, valor_del_contrato, valor_de_pago_adelantado, dias_adicionados, descripcion_del_proceso, objeto_del_contrato, urlproceso",
      $where: where,
      $order: "valor_del_contrato DESC NULL LAST",
      $limit: pool,
    });

    const scored = rows
      .map((r) => {
        const assessment = evaluateContract(r, {});
        return { row: r, assessment };
      })
      .sort((a, b) => b.assessment.score - a.assessment.score)
      .slice(0, limit)
      .map(({ row, assessment }) => ({
        id_contrato: row.id_contrato,
        nombre_entidad: row.nombre_entidad,
        proveedor_adjudicado: row.proveedor_adjudicado,
        departamento: row.departamento,
        sector: row.sector,
        modalidad_de_contratacion: row.modalidad_de_contratacion,
        tipo_de_contrato: row.tipo_de_contrato,
        valor_del_contrato: row.valor_del_contrato,
        fecha_de_firma: row.fecha_de_firma,
        urlproceso: typeof row.urlproceso === "object" ? row.urlproceso?.url : row.urlproceso,
        score: assessment.score,
        level: assessment.level,
        signals: assessment.signals.length,
        topSignal: assessment.signals[0]?.title ?? null,
      }));

    return jsonOk(
      scored,
      {
        dataset: "jbjy-vk9h",
        evaluated: rows.length,
        returned: scored.length,
        filters: { departamento, sector, modalidad, valor_min: valorMin },
      },
      600,
    );
  } catch (e) {
    return jsonErr("leaderboard_error", String(e instanceof Error ? e.message : e), 502);
  }
}
