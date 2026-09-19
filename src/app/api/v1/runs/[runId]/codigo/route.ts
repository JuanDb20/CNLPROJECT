import { fail, guard, ownedRun, present } from "@/server/http";
import { repository } from "@/server/store";

type Params = { params: Promise<{ runId: string }> };

/**
 * DELETE /api/v1/runs/:runId/codigo — borra el código cargado (original y
 * versión corregida). Solo con el informe ya expedido: el SHA-256 que lo ata a
 * esa versión del código queda dentro del informe, así que nada se pierde.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { runId } = await params;
  const run = await ownedRun(runId);
  if (!run) return fail("Auditoría no encontrada", 404);
  if (run.status !== "certificado") {
    return fail("El código solo se borra una vez expedido el informe");
  }
  return guard(async () => {
    await repository.deleteSource(runId);
    return present(
      await repository.update(runId, (current) => ({
        ...current,
        scope: {
          ...current.scope,
          source: { ...current.scope.source, deletedAt: new Date().toISOString() },
        },
      })),
    );
  });
}
