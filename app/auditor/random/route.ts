import { soda } from "@/lib/socrata";
import { evaluateContract, type ContractRow } from "@/lib/risk-signals";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Devuelve una redirección 307 a /auditor/[id] de un contrato pre-filtrado
 * con perfil de alto riesgo (modalidad sensible, valor > 100M). Útil para
 * la demo: un click y el jurado ve el agente en vivo sobre un caso real.
 */
export async function GET(req: Request) {
  const where =
    "valor_del_contrato > 100000000 AND (upper(modalidad_de_contratacion) like upper('%directa%') OR upper(modalidad_de_contratacion) like upper('%régimen especial%') OR upper(modalidad_de_contratacion) like upper('%minima cuantia%') OR upper(modalidad_de_contratacion) like upper('%mínima cuantía%'))";

  const rows = await soda<ContractRow>(
    {
      $select:
        "id_contrato, nombre_entidad, proveedor_adjudicado, departamento, modalidad_de_contratacion, tipo_de_contrato, valor_del_contrato, fecha_de_firma, fecha_de_inicio_del_contrato, fecha_de_fin_del_contrato, dias_adicionados, descripcion_del_proceso, objeto_del_contrato, justificacion_modalidad_de, documento_proveedor, valor_de_pago_adelantado",
      $where: where,
      $order: "valor_del_contrato DESC NULL LAST",
      $limit: 100,
    },
    { revalidate: 600 },
  );

  const candidatos = rows
    .map((r) => ({ row: r, a: evaluateContract(r, {}) }))
    .filter((x) => x.row.id_contrato && x.a.score >= 50);

  const base = new URL(req.url);

  if (candidatos.length === 0) {
    return NextResponse.redirect(new URL("/auditor", base), {
      status: 307,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const pick = candidatos[Math.floor(Math.random() * candidatos.length)];
  const id = encodeURIComponent(pick.row.id_contrato as string);
  return NextResponse.redirect(new URL(`/auditor/${id}`, base), {
    status: 307,
    headers: { "Cache-Control": "no-store" },
  });
}
