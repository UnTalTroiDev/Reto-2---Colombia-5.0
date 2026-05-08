import { jsonOk, preflight } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 60;

export function OPTIONS() {
  return preflight();
}

export function GET() {
  return jsonOk(
    { status: "ok", service: "secop-dashboard-api", version: "1.0.0" },
    { timestamp: new Date().toISOString() },
    60,
  );
}
