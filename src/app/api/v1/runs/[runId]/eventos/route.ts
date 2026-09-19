import { currentPhase, overallProgress } from "@/engine/orchestrator";
import { fail, ownedRun, present } from "@/server/http";
import { repository } from "@/server/store";

type Params = { params: Promise<{ runId: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/runs/:runId/eventos — flujo de eventos de la auditoría (SSE).
 *
 * Emite dos tipos de evento: `log` por cada entrada nueva de la traza y
 * `estado` con la instantánea de módulos y progreso. Lee del repositorio cada
 * segundo, así que el orquestador puede correr en otra instancia o en un worker.
 */
export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;
  if (!(await ownedRun(runId))) return fail("Auditoría no encontrada", 404);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      /* Envía la traza acumulada y luego solo lo nuevo, para que recargar la
         página no pierda contexto. */
      let sent = 0;
      const sendState = async () => {
        const current = await repository.find(runId);
        if (!current) return;
        current.logs.slice(sent).forEach((entry) => send("log", entry));
        sent = current.logs.length;
        send("estado", {
          ...present(current),
          progress: overallProgress(current),
          phase: currentPhase(current),
        });
        if (current.status === "analizado" || current.status === "certificado") {
          finish();
        }
      };

      void sendState();
      const ticker = setInterval(() => void sendState(), 1000);

      const timeout = setTimeout(finish, 5 * 60 * 1000);

      function finish() {
        if (closed) return;
        closed = true;
        clearInterval(ticker);
        clearTimeout(timeout);
        try {
          controller.close();
        } catch {
          /* ya cerrado por el cliente */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
