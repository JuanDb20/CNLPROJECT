import { fail, ok, ownedRun, present } from "@/server/http";

type Params = { params: Promise<{ runId: string }> };

/** GET /api/v1/runs/:runId — estado completo de la auditoría y su puntuación. */
export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;
  const run = await ownedRun(runId);
  if (!run) return fail("Auditoría no encontrada", 404);
  return ok(present(run));
}
