import { jsonOk, preflight } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const revalidate = 3600;

export function OPTIONS() {
  return preflight();
}

export function GET() {
  return jsonOk(
    [
      {
        id: "jbjy-vk9h",
        name: "SECOP II — Contratos Electrónicos",
        description:
          "Información de los contratos registrados en SECOP II desde su lanzamiento.",
        endpoint: "https://www.datos.gov.co/resource/jbjy-vk9h.json",
        rows: 5_614_448,
        columns: 84,
        api_paths: {
          stats: "/api/contratos/stats",
          quality: "/api/contratos/quality",
          list: "/api/contratos/list",
          rankings: "/api/contratos/rankings",
        },
      },
      {
        id: "dmgg-8hin",
        name: "SECOP II — Archivos Descarga Desde 2025",
        description:
          "Información de referencia para la descarga de documentos publicados en SECOP II desde el 01/01/2025.",
        endpoint: "https://www.datos.gov.co/resource/dmgg-8hin.json",
        rows: 17_353_029,
        columns: 11,
        api_paths: {
          stats: "/api/documentos/stats",
          list: "/api/documentos/list",
        },
      },
    ],
    { count: 2 },
    3600,
  );
}
