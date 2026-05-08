import { Card } from "@/components/Card";
import { formatBytes } from "@/lib/format-bytes";
import { sodaDocs, totalDocs } from "@/lib/socrata-docs";
import { formatNumber } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Explorar documentos · SECOP Dashboard",
  description:
    "Busca y filtra entre 17,3M de documentos electrónicos publicados en SECOP II por extensión, entidad y nombre.",
};

export const revalidate = 300;

type DocRow = {
  id_documento?: string;
  proceso?: string;
  nombre_archivo?: string;
  extensi_n?: string;
  descripci_n?: string;
  tamanno_archivo?: string;
  fecha_carga?: string;
  entidad?: string;
  nit_entidad?: string;
  url_descarga_documento?: { url?: string } | string;
};

function escapeSoql(s: string): string {
  return s.replace(/'/g, "''");
}

function buildWhere(filters: { ext?: string; entidad?: string; q?: string }): string | undefined {
  const parts: string[] = [];
  if (filters.ext) parts.push(`extensi_n = '${escapeSoql(filters.ext)}'`);
  if (filters.entidad) parts.push(`entidad = '${escapeSoql(filters.entidad)}'`);
  if (filters.q) {
    const q = escapeSoql(filters.q);
    parts.push(
      `(upper(nombre_archivo) like upper('%${q}%') OR upper(descripci_n) like upper('%${q}%') OR upper(entidad) like upper('%${q}%'))`,
    );
  }
  return parts.length ? parts.join(" AND ") : undefined;
}

export default async function ExplorarDocsPage({
  searchParams,
}: {
  searchParams: Promise<{ ext?: string; entidad?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 50;
  const where = buildWhere(sp);

  const [rows, count, exts, entidades] = await Promise.all([
    sodaDocs<DocRow>({
      $select:
        "id_documento, proceso, nombre_archivo, extensi_n, tamanno_archivo, fecha_carga, entidad, nit_entidad, url_descarga_documento",
      $where: where,
      $order: "fecha_carga DESC NULL LAST",
      $limit: pageSize,
      $offset: (page - 1) * pageSize,
    }),
    totalDocs(where),
    sodaDocs<{ extensi_n: string; n: string }>({
      $select: "extensi_n, count(*) AS n",
      $group: "extensi_n",
      $order: "n DESC",
      $limit: 30,
    }),
    sodaDocs<{ entidad: string; n: string }>({
      $select: "entidad, count(*) AS n",
      $group: "entidad",
      $order: "n DESC",
      $limit: 100,
    }),
  ]);

  const totalPages = Math.min(200, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--color-accent-2)] font-medium">
          Dataset · dmgg-8hin
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Explorar documentos</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Filtra y busca en {formatNumber(count)} documentos. Datos en vivo desde la API.
        </p>
      </div>

      <Card>
        <form className="grid grid-cols-1 md:grid-cols-4 gap-3" role="search" aria-label="Filtros de documentos">
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Buscar</span>
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Nombre, descripción o entidad…"
              className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Extensión</span>
            <select
              name="ext"
              defaultValue={sp.ext ?? ""}
              className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Todas las extensiones</option>
              {exts
                .filter((e) => e.extensi_n)
                .map((e) => (
                  <option key={e.extensi_n} value={e.extensi_n}>
                    {e.extensi_n} ({formatNumber(Number(e.n))})
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Entidad</span>
            <select
              name="entidad"
              defaultValue={sp.entidad ?? ""}
              className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Top 100 entidades</option>
              {entidades
                .filter((e) => e.entidad)
                .map((e) => (
                  <option key={e.entidad} value={e.entidad}>
                    {e.entidad}
                  </option>
                ))}
            </select>
          </label>
          <div className="md:col-span-4 flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90"
            >
              Aplicar filtros
            </button>
            <Link
              href="/documentos/explorar"
              className="px-4 py-2 rounded-lg ring-1 ring-[var(--color-border)] text-sm hover:bg-[var(--color-surface-2)]"
            >
              Limpiar
            </Link>
            <div className="ml-auto text-xs text-[var(--color-muted)] self-center">
              Página {page} de {formatNumber(totalPages)}
            </div>
          </div>
        </form>
      </Card>

      <Card
        title={`Resultados (${formatNumber(count)} documentos)`}
        subtitle={`Mostrando ${rows.length} en esta página`}
      >
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-[var(--color-muted)] border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-5 font-medium">ID</th>
                <th className="text-left py-3 px-2 font-medium">Archivo</th>
                <th className="text-left py-3 px-2 font-medium">Ext.</th>
                <th className="text-right py-3 px-2 font-medium">Tamaño</th>
                <th className="text-left py-3 px-2 font-medium">Entidad</th>
                <th className="text-left py-3 px-5 font-medium">Cargado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--color-muted)]">
                    Sin resultados con esos filtros.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const url =
                  typeof r.url_descarga_documento === "object"
                    ? r.url_descarga_documento?.url
                    : r.url_descarga_documento;
                return (
                  <tr
                    key={r.id_documento}
                    className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)]/50"
                  >
                    <td className="py-2.5 px-5 font-mono text-[10px] text-[var(--color-muted)] whitespace-nowrap">
                      {r.id_documento}
                    </td>
                    <td className="py-2.5 px-2 max-w-[300px] truncate" title={r.nombre_archivo}>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[var(--color-accent-2)]"
                        >
                          {r.nombre_archivo || "—"}
                        </a>
                      ) : (
                        r.nombre_archivo || "—"
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-xs">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-muted)]">
                        {r.extensi_n || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      {formatBytes(r.tamanno_archivo)}
                    </td>
                    <td className="py-2.5 px-2 max-w-[260px] truncate" title={r.entidad}>
                      {r.entidad || "—"}
                    </td>
                    <td className="py-2.5 px-5 text-xs text-[var(--color-muted)] tabular-nums whitespace-nowrap">
                      {r.fecha_carga ? r.fecha_carga.slice(0, 10) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-center gap-2">
        {page > 1 && (
          <Link
            href={{ pathname: "/documentos/explorar", query: { ...sp, page: String(page - 1) } }}
            className="px-3 py-1.5 rounded-lg ring-1 ring-[var(--color-border)] text-sm hover:bg-[var(--color-surface-2)]"
          >
            ← Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={{ pathname: "/documentos/explorar", query: { ...sp, page: String(page + 1) } }}
            className="px-3 py-1.5 rounded-lg ring-1 ring-[var(--color-border)] text-sm hover:bg-[var(--color-surface-2)]"
          >
            Siguiente →
          </Link>
        )}
      </div>
    </div>
  );
}
