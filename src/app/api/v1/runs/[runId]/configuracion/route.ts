import { saveConfig } from "@/engine/orchestrator";
import { guard, present } from "@/server/http";
import type { FrameworkId } from "@/domain/types";

type Params = { params: Promise<{ runId: string }> };

/** PATCH /api/v1/runs/:runId/configuracion — paso 2: marcos y minimización. */
export async function PATCH(request: Request, { params }: Params) {
  const { runId } = await params;
  const body = (await request.json()) as {
    frameworks?: FrameworkId[];
    piiMaskEnabled?: boolean;
  };
  return guard(async () => present(await saveConfig(runId, body)));
}
