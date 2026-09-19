import { acceptClause, authorizeScope } from "@/engine/orchestrator";
import { fail, guard, ownedRun, present } from "@/server/http";

type Params = { params: Promise<{ runId: string }> };

interface Body {
  action: "aceptar-clausula" | "autorizar";
  clauseId?: string;
  accepted?: boolean;
}

/** POST /api/v1/runs/:runId/alcance — paso 1: onboarding y autorización. */
export async function POST(request: Request, { params }: Params) {
  const { runId } = await params;
  if (!(await ownedRun(runId))) return fail("Auditoría no encontrada", 404);
  const body = (await request.json().catch(() => ({}))) as Body;

  switch (body.action) {
    case "aceptar-clausula":
      if (!body.clauseId) return fail("Falta clauseId");
      return guard(async () =>
        present(await acceptClause(runId, body.clauseId!, body.accepted ?? true)),
      );
    case "autorizar":
      return guard(async () => present(await authorizeScope(runId)));
    default:
      return fail("Acción no soportada");
  }
}
