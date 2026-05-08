import { clampInt, jsonOk, jsonErr, preflight } from "@/lib/api-helpers";
import { analyzeSample } from "@/lib/quality";
import { sample } from "@/lib/socrata";

export const runtime = "nodejs";
export const revalidate = 600;

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const size = clampInt(url.searchParams.get("size"), 500, 50000, 5000);
    const rows = await sample<Record<string, unknown>>(size);
    const report = analyzeSample(rows);
    return jsonOk(
      report,
      {
        dataset: "jbjy-vk9h",
        sample_size: size,
        computed_at: new Date().toISOString(),
      },
      600,
    );
  } catch (e) {
    return jsonErr("quality_error", String(e), 502);
  }
}
