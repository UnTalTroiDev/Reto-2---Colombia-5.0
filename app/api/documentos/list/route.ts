import { clampInt, jsonOk, jsonErr, preflight } from "@/lib/api-helpers";
import { sodaDocs, totalDocs } from "@/lib/socrata-docs";

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
    const ext = url.searchParams.get("ext") ?? undefined;
    const entidad = url.searchParams.get("entidad") ?? undefined;
    const q = url.searchParams.get("q") ?? undefined;
    const id = url.searchParams.get("id_documento") ?? undefined;

    const parts: string[] = [];
    if (id) parts.push(`id_documento = ${Number(id)}`);
    if (ext) parts.push(`extensi_n = '${escapeSoql(ext)}'`);
    if (entidad) parts.push(`entidad = '${escapeSoql(entidad)}'`);
    if (q) {
      const e = escapeSoql(q);
      parts.push(
        `(upper(nombre_archivo) like upper('%${e}%') OR upper(descripci_n) like upper('%${e}%') OR upper(entidad) like upper('%${e}%'))`,
      );
    }
    const where = parts.length ? parts.join(" AND ") : undefined;

    const [rows, total] = await Promise.all([
      sodaDocs({
        $select:
          "id_documento, proceso, nombre_archivo, extensi_n, descripci_n, tamanno_archivo, fecha_carga, entidad, nit_entidad, url_descarga_documento",
        $where: where,
        $order: "fecha_carga DESC NULL LAST",
        $limit: limit,
        $offset: offset,
      }),
      totalDocs(where),
    ]);

    return jsonOk(rows, {
      dataset: "dmgg-8hin",
      total,
      limit,
      offset,
      filters: { ext, entidad, q, id_documento: id },
    }, 300);
  } catch (e) {
    return jsonErr("list_error", String(e), 502);
  }
}
