import { jsonErr, preflight } from "@/lib/api-helpers";
import { fetchContractById, buildMarketContext } from "@/lib/risk-context";
import { evaluateContract } from "@/lib/risk-signals";
import { auditWithLlmStream } from "@/lib/llm-auditor";

export const runtime = "nodejs";
export const maxDuration = 60;

export function OPTIONS() {
  return preflight();
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return jsonErr("missing_id", "id_contrato es obligatorio", 400);

  const row = await fetchContractById(id);
  if (!row) return jsonErr("not_found", `Contrato ${id} no encontrado`, 404);

  const market = await buildMarketContext(row);
  const heuristic = evaluateContract(row, market);

  // Primero emitimos las señales heurísticas como evento `meta`,
  // luego el stream del LLM.
  const encoder = new TextEncoder();
  const heuristicEvent = encoder.encode(
    `event: heuristic\ndata: ${JSON.stringify({ contrato: row, contexto: market, heuristica: heuristic })}\n\n`,
  );

  let llmStream: ReadableStream<Uint8Array>;
  try {
    llmStream = await auditWithLlmStream(row, heuristic);
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    llmStream = new ReadableStream({
      start(c) {
        c.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`),
        );
        c.close();
      },
    });
  }

  const composed = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(heuristicEvent);
      const reader = llmStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(composed, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
