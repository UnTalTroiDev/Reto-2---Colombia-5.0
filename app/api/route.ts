import { jsonOk, preflight } from "@/lib/api-helpers";
import { API_INFO, ENDPOINTS, RESPONSE_ENVELOPE } from "@/lib/api-meta";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 3600;

export function OPTIONS() {
  return preflight();
}

export function GET() {
  return jsonOk({
    ...API_INFO,
    endpoints: ENDPOINTS,
    response_envelope: RESPONSE_ENVELOPE,
    cors: "Allowed for all origins (GET, OPTIONS)",
    cache: "Server-side cache via Next.js revalidate + Cache-Control headers",
    docs: "/api-docs",
  });
}
