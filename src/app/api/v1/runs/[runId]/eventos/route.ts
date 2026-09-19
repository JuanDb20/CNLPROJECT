import { currentPhase, overallProgress } from "@/engine/orchestrator";
import { fail, ownedRun, present } from "@/server/http";
import { bus, repository } from "@/server/store";

type Params = { params: Promise<{ runId: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/runs/:runId/eventos — flujo de eventos de la auditoría (SSE).
 *
 * Emite dos tipos de evento: `log` por cada entrada de la traza y `estado` con
 * la instantánea de módulos y progreso. El cliente no consulta al orquestador:
 * se suscribe al bus, que es lo que permite sustituirlo por Redis Pub/Sub y
 * varios workers sin cambiar una línea de la interfaz.
 */
export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;
  const run = await ownedRun(runId);
  if (!run) return fail("Auditoría no encontrada", 404);

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

      const sendState = async () => {
        const current = await repository.find(runId);
        if (!current) return;
        send("estado", {
          ...present(current),
          progress: overallProgress(current),
          phase: currentPhase(current),
        });
        if (current.status === "analizado" || current.status === "certificado") {
          finish();
        }
      };

      /* Reproduce la traza acumulada para que recargar la página no pierda
         contexto, y luego sigue en vivo. */
      run.logs.forEach((entry) => send("log", entry));
      void sendState();

      const unsubscribe = bus.subscribe(runId, (entry) => {
        send("log", entry);
        void sendState();
      });

      const ticker = setInterval(() => void sendState(), 800);

      const timeout = setTimeout(finish, 5 * 60 * 1000);

      function finish() {
        if (closed) return;
        closed = true;
        clearInterval(ticker);
        clearTimeout(timeout);
        unsubscribe();
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
