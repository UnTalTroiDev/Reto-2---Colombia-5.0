import { jsonOk, preflight } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 3600;

export function OPTIONS() {
  return preflight();
}

export function GET() {
  return jsonOk({
    name: "SECOP Dashboard API",
    version: "1.0.0",
    description:
      "API REST que expone datos agregados, calidad y exploración de los datasets SECOP II (jbjy-vk9h y dmgg-8hin) de datos.gov.co.",
    endpoints: [
      {
        path: "/api/health",
        method: "GET",
        description: "Health check del servicio.",
      },
      {
        path: "/api/datasets",
        method: "GET",
        description: "Lista de datasets disponibles con metadata.",
      },
      {
        path: "/api/contratos/stats",
        method: "GET",
        description:
          "Métricas agregadas del dataset jbjy-vk9h: total, valor contratado, top entidades, breakdowns por estado/tipo/modalidad/sector/departamento.",
      },
      {
        path: "/api/contratos/quality",
        method: "GET",
        description:
          "Reporte de calidad de datos sobre una muestra (default 5000, máx 50000).",
        query: { size: "number (500..50000)" },
      },
      {
        path: "/api/contratos/list",
        method: "GET",
        description: "Listado paginado de contratos con filtros opcionales.",
        query: {
          limit: "number (1..100, default 50)",
          offset: "number (0..1000000, default 0)",
          departamento: "string",
          estado: "string",
          q: "string (búsqueda en entidad/proveedor/descripción)",
        },
      },
      {
        path: "/api/contratos/rankings",
        method: "GET",
        description: "Ranking flexible por campo y medida.",
        query: {
          field:
            "nombre_entidad | proveedor_adjudicado | departamento | ciudad | sector | rama | tipo_de_contrato | modalidad_de_contratacion | estado_contrato",
          measure: "count | sum_valor",
          limit: "number (1..100, default 10)",
        },
      },
      {
        path: "/api/documentos/stats",
        method: "GET",
        description:
          "Métricas agregadas del dataset dmgg-8hin: total documentos, tamaño total, top extensiones, rangos de fecha y tamaño.",
      },
      {
        path: "/api/documentos/list",
        method: "GET",
        description: "Listado paginado de documentos.",
        query: {
          limit: "number (1..100, default 50)",
          offset: "number (0..1000000, default 0)",
          ext: "string (extensión)",
          entidad: "string",
          q: "string (búsqueda en nombre/descripción/entidad)",
          id_documento: "number (consulta por id exacto)",
        },
      },
    ],
    response_envelope: {
      success: { ok: true, data: "...", meta: "..." },
      error: { ok: false, error: { code: "string", message: "string" } },
    },
    cors: "Allowed for all origins (GET, OPTIONS)",
    cache: "Server-side cache via Next.js revalidate + Cache-Control headers",
  });
}
