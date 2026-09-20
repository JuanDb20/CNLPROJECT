import { buildCalendar } from "@/domain/calendario";
import { fail, ownedRun } from "@/server/http";

type Params = { params: Promise<{ runId: string }> };

/** GET /api/v1/runs/:runId/calendario — calendario .ics de las obligaciones de la auditoría. */
export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;
  const run = await ownedRun(runId);
  if (!run) return fail("Auditoría no encontrada", 404);

  const { ics } = buildCalendar(run);
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="vigia-${runId}.ics"`,
    },
  });
}
