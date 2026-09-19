import { startExecution } from "@/engine/orchestrator";
import { fail, guard, ownedRun, present } from "@/server/http";

type Params = { params: Promise<{ runId: string }> };

/** El análisis sigue corriendo en `after()` tras responder: sin esto vale el tope del proyecto. */
export const maxDuration = 300;

/**
 * POST /api/v1/runs/:runId/ejecucion — paso 3: encola la ejecución.
 *
 * Devuelve de inmediato; el progreso se consume por SSE en /eventos. Ese
 * contrato es el que permite mover el orquestador a un worker externo sin
 * tocar el cliente.
 */
export async function POST(_request: Request, { params }: Params) {
  const { runId } = await params;
  if (!(await ownedRun(runId))) return fail("Auditoría no encontrada", 404);
  return guard(async () => present(await startExecution(runId)));
}
