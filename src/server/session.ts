import { redirect } from "next/navigation";

import type { AuditRun } from "@/domain/types";

import { currentRun } from "./http";

/**
 * Garantiza que la pantalla tiene una auditoría en curso.
 *
 * Si la cookie de sesión apunta a una auditoría inexistente (por ejemplo tras
 * reiniciar el servidor), devuelve al usuario al inicio en lugar de renderizar
 * una pantalla vacía.
 */
export async function requireRun(): Promise<AuditRun> {
  const run = await currentRun();
  if (!run) redirect("/");
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
  if (run.findings.length === 0) redirect("/auditoria/ejecucion");
  return run;
}
