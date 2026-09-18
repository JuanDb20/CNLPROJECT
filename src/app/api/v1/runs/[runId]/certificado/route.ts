import { issueCertificate } from "@/engine/remediation";
import { fail, guard, ok } from "@/server/http";
import { repository } from "@/server/store";

type Params = { params: Promise<{ runId: string }> };

/** GET — recupera el certificado ya expedido. */
export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;
  const run = await repository.find(runId);
  if (!run) return fail("Auditoría no encontrada", 404);
  if (!run.certificate) return fail("Sin certificado expedido", 404);
  return ok(run.certificate);
}

/** POST — expide el certificado de conformidad con encadenamiento de hash. */
export async function POST(_request: Request, { params }: Params) {
  const { runId } = await params;
  return guard(() => issueCertificate(runId));
}
