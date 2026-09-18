import {
  acceptClause,
  authorizeScope,
  connectRepository,
} from "@/engine/orchestrator";
import { fail, guard, present } from "@/server/http";

type Params = { params: Promise<{ runId: string }> };

interface Body {
  action: "conectar-repositorio" | "aceptar-clausula" | "autorizar";
  clauseId?: string;
  accepted?: boolean;
}

/** POST /api/v1/runs/:runId/alcance — paso 1: onboarding y autorización. */
export async function POST(request: Request, { params }: Params) {
  const { runId } = await params;
  const body = (await request.json()) as Body;

  switch (body.action) {
    case "conectar-repositorio":
      return guard(async () => present(await connectRepository(runId)));
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
