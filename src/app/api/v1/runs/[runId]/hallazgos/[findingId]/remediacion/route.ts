import { openPullRequest, retest, signFinding } from "@/engine/remediation";
import { fail, guard, present } from "@/server/http";

type Params = { params: Promise<{ runId: string; findingId: string }> };

interface Body {
  action: "abrir-pr" | "retestear" | "firmar";
  signedBy?: string;
}

/**
 * POST /api/v1/runs/:runId/hallazgos/:findingId/remediacion
 * Pasos 5 y 6: propuesta de parche, PR en rama aislada, retesteo y firma.
 */
export async function POST(request: Request, { params }: Params) {
  const { runId, findingId } = await params;
  const body = (await request.json()) as Body;

  switch (body.action) {
    case "abrir-pr":
      return guard(async () => present(await openPullRequest(runId, findingId)));
    case "retestear":
      return guard(async () => present(await retest(runId, findingId)));
    case "firmar":
      return guard(async () =>
        present(
          await signFinding(runId, findingId, body.signedBy ?? "legal.ops@fintrex.ai"),
        ),
      );
    default:
      return fail("Acción no soportada");
  }
}
