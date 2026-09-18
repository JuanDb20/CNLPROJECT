"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { FrameworkId } from "@/domain/types";
import {
  acceptClause,
  authorizeScope,
  connectRepository,
  createRun,
  saveConfig,
  startExecution,
} from "@/engine/orchestrator";
import {
  issueCertificate,
  openPullRequest,
  retest,
  signFinding,
} from "@/engine/remediation";
import { RUN_COOKIE, currentRunId } from "@/server/http";

/**
 * Acciones de servidor.
 *
 * Son una fachada delgada sobre el motor: validan la sesión y delegan. La misma
 * lógica está expuesta en /api/v1 para integraciones externas, de modo que la
 * interfaz no es el único cliente posible del producto.
 */

async function runId(): Promise<string> {
  const id = await currentRunId();
  if (!id) redirect("/");
  return id;
}

export async function iniciarAuditoria() {
  const run = await createRun();
  const store = await cookies();
  store.set(RUN_COOKIE, run.id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/auditoria/alcance");
}

export async function conectarRepositorio() {
  await connectRepository(await runId());
  revalidatePath("/auditoria/alcance");
}

export async function alternarClausula(clauseId: string, accepted: boolean) {
  await acceptClause(await runId(), clauseId, accepted);
  revalidatePath("/auditoria/alcance");
}

export async function confirmarAlcance() {
  await authorizeScope(await runId());
  redirect("/auditoria/configuracion");
}

export async function guardarConfiguracion(patch: {
  frameworks?: FrameworkId[];
  piiMaskEnabled?: boolean;
}) {
  await saveConfig(await runId(), patch);
  revalidatePath("/auditoria/configuracion");
}

export async function iniciarEscaneo(patch: {
  frameworks: FrameworkId[];
  piiMaskEnabled: boolean;
}) {
  const id = await runId();
  await saveConfig(id, patch);
  await startExecution(id);
  redirect("/auditoria/ejecucion");
}

export async function reejecutarEscaneo() {
  await startExecution(await runId());
  revalidatePath("/auditoria/ejecucion");
}

export async function abrirPullRequest(findingId: string) {
  await openPullRequest(await runId(), findingId);
  /* Abrir el PR cierra el paso 5 y abre el 6: se lleva al usuario a la pantalla
     donde puede retestear y firmar ese hallazgo concreto. */
  redirect(`/auditoria/remediacion?hallazgo=${findingId}`);
}

export async function retestear(findingId: string) {
  await retest(await runId(), findingId);
  revalidatePath("/auditoria", "layout");
}

export async function firmarHallazgo(findingId: string) {
  await signFinding(await runId(), findingId, "legal.ops@fintrex.ai");
  revalidatePath("/auditoria", "layout");
}

export async function expedirCertificado() {
  await issueCertificate(await runId());
  revalidatePath("/auditoria/remediacion");
}
