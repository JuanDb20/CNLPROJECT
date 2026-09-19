import { redirect } from "next/navigation";

import type { AuditRun } from "@/domain/types";

import { requireUser } from "./auth";
import { currentRun } from "./http";

/**
 * Garantiza que la pantalla tiene una auditoría abierta y que pertenece al
 * abogado de la sesión. Si no, lo devuelve a su panel de auditorías.
 */
export async function requireRun(): Promise<AuditRun> {
  const user = await requireUser();
  const run = await currentRun();
  if (!run || run.ownerId !== user.id) redirect("/panel");
  return run;
}

/** Igual que `requireRun`, pero además exige que el alcance esté autorizado. */
export async function requireAuthorizedRun(): Promise<AuditRun> {
  const run = await requireRun();
  if (!run.scope.authorizedAt) redirect("/auditoria/alcance");
  return run;
}

/** Exige que el análisis haya terminado para poder leer el mapa de riesgos. */
export async function requireAnalyzedRun(): Promise<AuditRun> {
  const run = await requireAuthorizedRun();
  const analyzed = ["analizado", "remediando", "certificado"].includes(run.status);
  if (!analyzed) redirect("/auditoria/ejecucion");
  return run;
}
