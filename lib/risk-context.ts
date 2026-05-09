/**
 * Recolecta contexto de mercado para enriquecer las señales de riesgo:
 * - Histórico de contratos entre el mismo proveedor y entidad.
 * - Mediana de valor para el tipo y la modalidad del contrato.
 *
 * Todo se calcula vía SODA API (server-side aggregations sobre 5,6M filas).
 */

import { soda } from "@/lib/socrata";
import type { ContractRow, MarketContext } from "@/lib/risk-signals";

function escapeSoql(s: string): string {
  return s.replace(/'/g, "''");
}

export async function buildMarketContext(row: ContractRow): Promise<MarketContext> {
  const ctx: MarketContext = {};

  const tasks: Promise<void>[] = [];

  // 1. Concentración proveedor-entidad
  if (row.nit_entidad && row.documento_proveedor) {
    tasks.push(
      soda<{ count: string; total: string }>({
        $select: "count(*) AS count, sum(valor_del_contrato) AS total",
        $where: `nit_entidad = '${escapeSoql(row.nit_entidad)}' AND documento_proveedor = '${escapeSoql(row.documento_proveedor)}'`,
      })
        .then((rows) => {
          ctx.providerEntityContracts = Number(rows[0]?.count ?? 0);
          ctx.providerEntitySumValor = Number(rows[0]?.total ?? 0);
        })
        .catch(() => {
          /* tolerar fallos de API — el contexto es enriquecimiento, no obligatorio */
        }),
    );
  }

  // 2. Mediana del tipo de contrato (proxy: percentil 50 vía $select aggregation no es trivial en SODA;
  //    usamos avg como proxy razonable, marcado como "media estimada")
  if (row.tipo_de_contrato) {
    tasks.push(
      soda<{ avg: string }>({
        $select: "avg(valor_del_contrato) AS avg",
        $where: `tipo_de_contrato = '${escapeSoql(row.tipo_de_contrato)}' AND valor_del_contrato > 0`,
      })
        .then((rows) => {
          const v = Number(rows[0]?.avg ?? 0);
          if (Number.isFinite(v) && v > 0) ctx.medianValorTipo = v;
        })
        .catch(() => {}),
    );
  }

  if (row.modalidad_de_contratacion) {
    tasks.push(
      soda<{ avg: string }>({
        $select: "avg(valor_del_contrato) AS avg",
        $where: `modalidad_de_contratacion = '${escapeSoql(row.modalidad_de_contratacion)}' AND valor_del_contrato > 0`,
      })
        .then((rows) => {
          const v = Number(rows[0]?.avg ?? 0);
          if (Number.isFinite(v) && v > 0) ctx.medianValorModalidad = v;
        })
        .catch(() => {}),
    );
  }

  await Promise.all(tasks);
  return ctx;
}

export async function fetchContractById(id: string): Promise<ContractRow | null> {
  const rows = await soda<ContractRow>({
    $select:
      "id_contrato, nombre_entidad, nit_entidad, proveedor_adjudicado, documento_proveedor, departamento, ciudad, sector, estado_contrato, tipo_de_contrato, modalidad_de_contratacion, justificacion_modalidad_de, fecha_de_firma, fecha_de_inicio_del_contrato, fecha_de_fin_del_contrato, valor_del_contrato, valor_de_pago_adelantado, valor_facturado, valor_pagado, dias_adicionados, liquidaci_n, habilita_pago_adelantado, es_pyme, origen_de_los_recursos, duraci_n_del_contrato, descripcion_del_proceso, objeto_del_contrato, urlproceso",
    $where: `id_contrato = '${escapeSoql(id)}'`,
    $limit: 1,
  });
  return rows[0] ?? null;
}
