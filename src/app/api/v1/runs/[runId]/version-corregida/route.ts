import { sourceZip } from "@/engine/orchestrator";
import { uploadCorrected } from "@/engine/remediation";
import { fail, guard, ownedRun, present } from "@/server/http";

type Params = { params: Promise<{ runId: string }> };

/**
 * POST /api/v1/runs/:runId/version-corregida
 * Multipart con `codigo` (.zip) o `repositorio` (URL de GitHub): registra la
 * versión corregida y retestea contra ella los hallazgos con parche generado.
 */
export async function POST(request: Request, { params }: Params) {
  const { runId } = await params;
  if (!(await ownedRun(runId))) return fail("Auditoría no encontrada", 404);
  const form = await request.formData();
  return guard(async () => {
    const { fileName, zip } = await sourceZip(String(form.get("repositorio") ?? "").trim(), form.get("codigo"));
    return present(await uploadCorrected(runId, fileName, zip));
  });
}
