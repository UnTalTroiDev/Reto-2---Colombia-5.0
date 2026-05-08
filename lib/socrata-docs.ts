/**
 * SODA v2 client for the dmgg-8hin dataset
 * (SECOP II — Archivos Descarga Desde 2025).
 */

export const DOCS_DATASET_ID = "dmgg-8hin";
export const DOCS_BASE = `https://www.datos.gov.co/resource/${DOCS_DATASET_ID}.json`;

const APP_TOKEN = process.env.SOCRATA_APP_TOKEN;

type SoqlParams = {
  $select?: string;
  $where?: string;
  $group?: string;
  $order?: string;
  $limit?: number;
  $offset?: number;
  $q?: string;
};

export async function sodaDocs<T = Record<string, unknown>>(
  params: SoqlParams,
  opts: { revalidate?: number } = {},
): Promise<T[]> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const url = `${DOCS_BASE}?${search.toString()}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (APP_TOKEN) headers["X-App-Token"] = APP_TOKEN;
  const res = await fetch(url, {
    headers,
    next: { revalidate: opts.revalidate ?? 600 },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SODA docs ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function totalDocs(where?: string): Promise<number> {
  const r = await sodaDocs<{ n: string }>({
    $select: "count(*) AS n",
    $where: where,
  });
  return Number(r[0]?.n ?? 0);
}

export async function groupByDocs(
  field: string,
  opts: {
    where?: string;
    measure?: string;
    alias?: string;
    limit?: number;
    order?: string;
  } = {},
): Promise<Array<{ key: string; value: number }>> {
  const measure = opts.measure ?? "count(*)";
  const alias = opts.alias ?? "value";
  const order = opts.order ?? `${alias} DESC`;
  const rows = await sodaDocs<Record<string, string>>({
    $select: `${field} AS key, ${measure} AS ${alias}`,
    $where: opts.where,
    $group: field,
    $order: order,
    $limit: opts.limit ?? 20,
  });
  return rows.map((r) => ({ key: r.key ?? "(vacío)", value: Number(r[alias] ?? 0) }));
}
