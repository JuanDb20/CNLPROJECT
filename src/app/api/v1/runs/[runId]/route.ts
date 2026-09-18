import { fail, ok, present } from "@/server/http";
import { repository } from "@/server/store";

type Params = { params: Promise<{ runId: string }> };

/** GET /api/v1/runs/:runId — estado completo de la auditoría y su puntuación. */
export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;
  const run = await repository.find(runId);
  if (!run) return fail("Auditoría no encontrada", 404);
  return ok(present(run));
}
