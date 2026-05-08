import { jsonOk, jsonErr, preflight } from "@/lib/api-helpers";
import { groupByDocs, sodaDocs, totalDocs } from "@/lib/socrata-docs";

export const runtime = "nodejs";
export const revalidate = 600;

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  try {
    const [total, sumSize, entidades, procesos, byExt, sizeStats, dateRange] = await Promise.all([
      totalDocs(),
      sodaDocs<{ s: string }>({ $select: "sum(tamanno_archivo) AS s" }).then((r) =>
        Number(r[0]?.s ?? 0),
      ),
      sodaDocs<{ n: string }>({ $select: "count(distinct nit_entidad) AS n" }).then((r) =>
        Number(r[0]?.n ?? 0),
      ),
      sodaDocs<{ n: string }>({ $select: "count(distinct proceso) AS n" }).then((r) =>
        Number(r[0]?.n ?? 0),
      ),
      groupByDocs("extensi_n", { limit: 30 }),
      sodaDocs<{ mx: string; mn: string; avg: string }>({
        $select:
          "max(tamanno_archivo) AS mx, min(tamanno_archivo) AS mn, avg(tamanno_archivo) AS avg",
      }).then((r) => r[0]),
      sodaDocs<{ mn: string; mx: string }>({
        $select: "min(fecha_carga) AS mn, max(fecha_carga) AS mx",
      }).then((r) => r[0]),
    ]);

    return jsonOk(
      {
        total_documentos: total,
        tamano_total_bytes: sumSize,
        entidades_unicas: entidades,
        procesos_unicos: procesos,
        extensiones: byExt,
        tamano: {
          maximo: Number(sizeStats?.mx ?? 0),
          minimo: Number(sizeStats?.mn ?? 0),
          promedio: Number(sizeStats?.avg ?? 0),
        },
        fechas: {
          minima: dateRange?.mn?.slice(0, 10) ?? null,
          maxima: dateRange?.mx?.slice(0, 10) ?? null,
        },
      },
      { dataset: "dmgg-8hin", computed_at: new Date().toISOString() },
      600,
    );
  } catch (e) {
    return jsonErr("upstream_error", String(e), 502);
  }
}
