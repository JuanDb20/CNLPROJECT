import { saveConfig } from "@/engine/orchestrator";
import { fail, guard, ownedRun, present } from "@/server/http";
import type { FrameworkId } from "@/domain/types";

type Params = { params: Promise<{ runId: string }> };

/** PATCH /api/v1/runs/:runId/configuracion — paso 2: marcos y minimización. */
export async function PATCH(request: Request, { params }: Params) {
  const { runId } = await params;
  if (!(await ownedRun(runId))) return fail("Auditoría no encontrada", 404);
  const body = (await request.json().catch(() => ({}))) as {
    frameworks?: FrameworkId[];
    piiMaskEnabled?: boolean;
  };
  return guard(async () => present(await saveConfig(runId, body)));
}
