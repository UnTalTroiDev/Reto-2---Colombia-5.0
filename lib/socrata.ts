/**
 * SODA v2 client for datos.gov.co — SECOP integrated dataset (jbjy-vk9h).
 * No auth required for read queries (rate-limited without app token).
 */

export const DATASET_ID = "jbjy-vk9h";
export const SOCRATA_BASE = `https://www.datos.gov.co/resource/${DATASET_ID}.json`;

const APP_TOKEN = process.env.SOCRATA_APP_TOKEN;

export type SoqlParams = {
  $select?: string;
  $where?: string;
  $group?: string;
  $order?: string;
  $limit?: number;
  $offset?: number;
  $q?: string;
  $having?: string;
};

export async function soda<T = Record<string, unknown>>(
  params: SoqlParams,
  opts: { revalidate?: number } = {},
): Promise<T[]> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const url = `${SOCRATA_BASE}?${search.toString()}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (APP_TOKEN) headers["X-App-Token"] = APP_TOKEN;

  const res = await fetch(url, {
    headers,
    next: { revalidate: opts.revalidate ?? 600 },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SODA ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function totalCount(where?: string): Promise<number> {
  const rows = await soda<{ count: string }>({
    $select: "count(*) AS count",
    $where: where,
  });
  return Number(rows[0]?.count ?? 0);
}

export async function groupBy(
  field: string,
  opts: {
    where?: string;
    measure?: string; // e.g. "sum(valor_del_contrato)" or "count(*)"
    alias?: string;
    limit?: number;
    order?: string;
  } = {},
): Promise<Array<{ key: string; value: number }>> {
  const measure = opts.measure ?? "count(*)";
  const alias = opts.alias ?? "value";
  const order = opts.order ?? `${alias} DESC`;
  const rows = await soda<Record<string, string>>({
    $select: `${field} AS key, ${measure} AS ${alias}`,
    $where: opts.where,
    $group: field,
    $order: order,
    $limit: opts.limit ?? 20,
  });
  return rows.map((r) => ({
    key: r.key ?? "(vacío)",
    value: Number(r[alias] ?? 0),
  }));
}

/** Fetch a sample for client-side data quality analysis. */
export async function sample<T = Record<string, unknown>>(
  size: number,
  where?: string,
): Promise<T[]> {
  return soda<T>({ $limit: size, $where: where, $order: ":id" });
}

export type DatasetSchema = {
  name: string;
  fields: string[];
  types: string[];
  fieldTypeMap: Record<string, string>;
  typeCount: Record<string, number>;
  lastModified: string | null;
};

/**
 * Authoritative dataset schema, parsed from response headers
 * (X-SODA2-Fields / X-SODA2-Types). This is the canonical answer
 * for "how many variables does the dataset have" — never guess from
 * a sample, since SODA omits all-null fields from row payloads.
 */
export async function getSchema(): Promise<DatasetSchema> {
  const url = `${SOCRATA_BASE}?$limit=1`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (APP_TOKEN) headers["X-App-Token"] = APP_TOKEN;
  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`getSchema ${res.status}`);
  const fieldsHeader = res.headers.get("X-SODA2-Fields") ?? "[]";
  const typesHeader = res.headers.get("X-SODA2-Types") ?? "[]";
  const lastModified = res.headers.get("X-SODA2-Truth-Last-Modified");
  const fields: string[] = JSON.parse(fieldsHeader);
  const types: string[] = JSON.parse(typesHeader);
  const fieldTypeMap: Record<string, string> = {};
  const typeCount: Record<string, number> = {};
  fields.forEach((f, i) => {
    const t = types[i] ?? "unknown";
    fieldTypeMap[f] = t;
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  });

  // Try to fetch the human-readable dataset name from /api/views.
  let name = "SECOP II — Contratos Electrónicos";
  try {
    const meta = await fetch(`https://www.datos.gov.co/api/views/${DATASET_ID}.json`, {
      headers,
      next: { revalidate: 86400 },
    });
    if (meta.ok) {
      const body = await meta.json();
      if (body?.name) name = body.name;
    }
  } catch {
    /* fall back to default name */
  }

  return { name, fields, types, fieldTypeMap, typeCount, lastModified };
}
