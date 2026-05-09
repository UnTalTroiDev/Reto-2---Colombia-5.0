import { jsonOk, jsonErr, preflight } from "@/lib/api-helpers";
import { fetchContractById, buildMarketContext } from "@/lib/risk-context";
import { evaluateContract } from "@/lib/risk-signals";
import { auditWithLlm } from "@/lib/llm-auditor";

export const runtime = "nodejs";
// No revalidate — el cache está en Vercel Data Cache vía SODA fetch.

export function OPTIONS() {
  return preflight();
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) return jsonErr("missing_id", "id_contrato es obligatorio", 400);

    const row = await fetchContractById(id);
    if (!row) return jsonErr("not_found", `Contrato ${id} no encontrado`, 404);

    const market = await buildMarketContext(row);
    const heuristic = evaluateContract(row, market);

    let llm = null;
    let llmError: string | null = null;
    try {
      llm = await auditWithLlm(row, heuristic);
    } catch (e) {
      llmError = String(e instanceof Error ? e.message : e);
    }

    return jsonOk(
      {
        contrato: row,
        contexto: market,
        heuristica: heuristic,
        ai: llm,
        aiError: llmError,
      },
      { dataset: "jbjy-vk9h", id, model: process.env.CEREBRAS_MODEL ?? "qwen-3-235b-a22b-instruct-2507" },
      300,
    );
  } catch (e) {
    return jsonErr("auditor_error", String(e instanceof Error ? e.message : e), 502);
  }
}
