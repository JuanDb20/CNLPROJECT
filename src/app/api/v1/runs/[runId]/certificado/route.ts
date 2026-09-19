import { issueCertificate } from "@/engine/remediation";
import { fail, guard, ok, ownedRun } from "@/server/http";

type Params = { params: Promise<{ runId: string }> };

/** GET — recupera el informe de responsabilidad demostrada ya expedido. */
export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;
  const run = await ownedRun(runId);
  if (!run) return fail("Auditoría no encontrada", 404);
  if (!run.certificate) return fail("Sin informe expedido", 404);
  return ok(run.certificate);
}

/** POST — expide el informe de responsabilidad demostrada, encadenado por hash. */
export async function POST(_request: Request, { params }: Params) {
  const { runId } = await params;
  if (!(await ownedRun(runId))) return fail("Auditoría no encontrada", 404);
  return guard(() => issueCertificate(runId));
}
