import { Card } from "@/components/Card";
import { soda, totalCount } from "@/lib/socrata";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Explorar contratos · SECOP Dashboard",
  description:
    "Explora 5,6M de contratos públicos de SECOP II con filtros por departamento, estado y búsqueda libre.",
};

export const revalidate = 300;

type ContractRow = {
  id_contrato?: string;
  nombre_entidad?: string;
  proveedor_adjudicado?: string;
  departamento?: string;
  estado_contrato?: string;
  tipo_de_contrato?: string;
  modalidad_de_contratacion?: string;
  fecha_de_firma?: string;
  valor_del_contrato?: string;
  urlproceso?: { url?: string } | string;
};

function escapeSoql(s: string): string {
  return s.replace(/'/g, "''");
}

function buildWhere(filters: { departamento?: string; estado?: string; q?: string }): string | undefined {
  const parts: string[] = [];
  if (filters.departamento) parts.push(`departamento = '${escapeSoql(filters.departamento)}'`);
  if (filters.estado) parts.push(`estado_contrato = '${escapeSoql(filters.estado)}'`);
  if (filters.q) {
    const q = escapeSoql(filters.q);
    parts.push(
      `(upper(nombre_entidad) like upper('%${q}%') OR upper(proveedor_adjudicado) like upper('%${q}%') OR upper(descripcion_del_proceso) like upper('%${q}%'))`,
    );
  }
  return parts.length ? parts.join(" AND ") : undefined;
}

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ departamento?: string; estado?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 50;
  const where = buildWhere(sp);

  const [rows, count, departamentos, estados] = await Promise.all([
    soda<ContractRow>({
      $select:
        "id_contrato, nombre_entidad, proveedor_adjudicado, departamento, estado_contrato, tipo_de_contrato, fecha_de_firma, valor_del_contrato, urlproceso",
      $where: where,
      $order: "fecha_de_firma DESC NULL LAST",
      $limit: pageSize,
      $offset: (page - 1) * pageSize,
    }),
    totalCount(where),
    soda<{ departamento: string }>({
      $select: "departamento",
      $group: "departamento",
      $order: "departamento",
      $limit: 50,
    }),
    soda<{ estado_contrato: string }>({
      $select: "estado_contrato",
      $group: "estado_contrato",
      $order: "estado_contrato",
      $limit: 30,
    }),
  ]);

  const totalPages = Math.min(200, Math.ceil(count / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Explorar contratos</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Filtra y busca en {formatNumber(count)} contratos. Datos en vivo desde la API.
        </p>
      </div>

      <Card>
        <form className="grid grid-cols-1 md:grid-cols-4 gap-3" role="search" aria-label="Filtros de contratos">
          <label className="md:col-span-2 flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Buscar</span>
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Entidad, proveedor o descripción…"
              className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Departamento</span>
            <select
              name="departamento"
              defaultValue={sp.departamento ?? ""}
              className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Todos los departamentos</option>
              {departamentos
                .filter((d) => d.departamento)
                .map((d) => (
                  <option key={d.departamento} value={d.departamento}>
                    {d.departamento}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Estado</span>
            <select
              name="estado"
              defaultValue={sp.estado ?? ""}
              className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Todos los estados</option>
              {estados
                .filter((e) => e.estado_contrato)
                .map((e) => (
                  <option key={e.estado_contrato} value={e.estado_contrato}>
                    {e.estado_contrato}
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
              href="/explorar"
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

      <Card title={`Resultados (${formatNumber(count)} contratos)`} subtitle={`Mostrando ${rows.length} en esta página`}>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-[var(--color-muted)] border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-5 font-medium">ID</th>
                <th className="text-left py-3 px-2 font-medium">Entidad</th>
                <th className="text-left py-3 px-2 font-medium">Proveedor</th>
                <th className="text-left py-3 px-2 font-medium">Depto.</th>
                <th className="text-left py-3 px-2 font-medium">Estado</th>
                <th className="text-left py-3 px-2 font-medium">Tipo</th>
                <th className="text-right py-3 px-2 font-medium">Valor</th>
                <th className="text-left py-3 px-5 font-medium">Firma</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--color-muted)]">
                    Sin resultados con esos filtros.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const url = typeof r.urlproceso === "object" ? r.urlproceso?.url : r.urlproceso;
                return (
                  <tr
                    key={r.id_contrato}
                    className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)]/50"
                  >
                    <td className="py-2.5 px-5 font-mono text-[10px] text-[var(--color-muted)]">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent-2)]">
                          {r.id_contrato}
                        </a>
                      ) : (
                        r.id_contrato
                      )}
                    </td>
                    <td className="py-2.5 px-2 max-w-[200px] truncate" title={r.nombre_entidad}>
                      {r.nombre_entidad || "—"}
                    </td>
                    <td className="py-2.5 px-2 max-w-[200px] truncate" title={r.proveedor_adjudicado}>
                      {r.proveedor_adjudicado || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-[var(--color-muted)]">
                      {r.departamento || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-xs">{r.estado_contrato || "—"}</td>
                    <td className="py-2.5 px-2 text-xs text-[var(--color-muted)]">
                      {r.tipo_de_contrato || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums font-medium">
                      {formatCurrency(r.valor_del_contrato)}
                    </td>
                    <td className="py-2.5 px-5 text-xs text-[var(--color-muted)] tabular-nums">
                      {r.fecha_de_firma ? r.fecha_de_firma.slice(0, 10) : "—"}
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
            href={{
              pathname: "/explorar",
              query: { ...sp, page: String(page - 1) },
            }}
            className="px-3 py-1.5 rounded-lg ring-1 ring-[var(--color-border)] text-sm hover:bg-[var(--color-surface-2)]"
          >
            ← Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={{
              pathname: "/explorar",
              query: { ...sp, page: String(page + 1) },
            }}
            className="px-3 py-1.5 rounded-lg ring-1 ring-[var(--color-border)] text-sm hover:bg-[var(--color-surface-2)]"
          >
            Siguiente →
          </Link>
        )}
      </div>
    </div>
  );
}
