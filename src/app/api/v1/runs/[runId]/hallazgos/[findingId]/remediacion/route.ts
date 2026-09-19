import { openPullRequest, retest, signFinding } from "@/engine/remediation";
import { currentUser } from "@/server/auth";
import { fail, guard, ownedRun, present } from "@/server/http";

type Params = { params: Promise<{ runId: string; findingId: string }> };

interface Body {
  action: "abrir-pr" | "retestear" | "firmar";
  salvedad?: string;
}

/**
 * POST /api/v1/runs/:runId/hallazgos/:findingId/remediacion
 * Pasos 5 y 6: propuesta de parche, PR en rama aislada, retesteo y firma.
 */
export async function POST(request: Request, { params }: Params) {
  const { runId, findingId } = await params;
  const [run, user] = await Promise.all([ownedRun(runId), currentUser()]);
  if (!run || !user) return fail("Auditoría no encontrada", 404);
  const body = (await request.json().catch(() => ({}))) as Body;

  switch (body.action) {
    case "abrir-pr":
      return guard(async () => present(await openPullRequest(runId, findingId)));
    case "retestear":
      return guard(async () => present(await retest(runId, findingId)));
    case "firmar":
      return guard(async () =>
        present(
          await signFinding(
            runId,
            findingId,
            // Firma el abogado autenticado; la API no acepta un firmante distinto.
            { name: user.name, professionalCard: user.professionalCard },
            body.salvedad == null ? null : String(body.salvedad),
          ),
        ),
      );
    default:
      return fail("Acción no soportada");
  }
}
