"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { FrameworkId } from "@/domain/types";
import {
  acceptClause,
  authorizeScope,
  createRunFromForm,
  saveConfig,
  startExecution,
} from "@/engine/orchestrator";
import {
  issueCertificate,
  openPullRequest,
  retest,
  signFinding,
} from "@/engine/remediation";
import { login, loginDemo, logout, register, requireUser } from "@/server/auth";
import { RUN_COOKIE } from "@/server/http";
import { requireRun } from "@/server/session";
import { repository } from "@/server/store";

/**
 * Acciones de servidor.
 *
 * Son una fachada delgada sobre el motor: validan la sesión y delegan. La misma
 * lógica está expuesta en /api/v1 para integraciones externas, de modo que la
 * interfaz no es el único cliente posible del producto.
 */

/** Auditoría abierta del abogado de la sesión (redirige si no es suya). */
async function runId(): Promise<string> {
  return (await requireRun()).id;
}

async function openRun(id: string) {
  const store = await cookies();
  store.set(RUN_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
}

/* ------------------------------ Cuenta ------------------------------ */

export async function registrarse(form: FormData) {
  try {
    await register({
      name: String(form.get("nombre") ?? ""),
      email: String(form.get("correo") ?? ""),
      professionalCard: String(form.get("tarjeta") ?? ""),
      firm: String(form.get("firma") ?? ""),
      password: String(form.get("clave") ?? ""),
    });
  } catch (error) {
    redirect(`/registro?error=${error instanceof Error ? error.message : "datos"}`);
  }
  redirect("/panel");
}

export async function ingresar(form: FormData) {
  const ok = await login(String(form.get("correo") ?? ""), String(form.get("clave") ?? ""));
  redirect(ok ? "/panel" : "/ingresar?error=credenciales");
}

export async function salir() {
  await logout();
  redirect("/ingresar");
}

export async function ingresarPrueba() {
  await loginDemo();
  redirect("/panel");
}

/* ---------------------------- Auditorías ---------------------------- */

export async function crearAuditoria(form: FormData) {
  const user = await requireUser();
  let id: string;
  try {
    id = (await createRunFromForm(user, form)).id;
  } catch {
    redirect("/panel/nueva?error=1");
  }
  await openRun(id);
  redirect("/auditoria/alcance");
}

const STEP_BY_STATUS = {
  borrador: "alcance",
  configurado: "configuracion",
  ejecutando: "ejecucion",
  analizado: "riesgos",
  remediando: "remediacion",
  certificado: "remediacion",
} as const;

export async function abrirAuditoria(id: string) {
  const user = await requireUser();
  const run = await repository.find(id);
  if (!run || run.ownerId !== user.id) redirect("/panel");
  await openRun(run.id);
  redirect(`/auditoria/${STEP_BY_STATUS[run.status]}`);
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

export async function firmarHallazgo(findingId: string, form: FormData) {
  await signFinding(
    await runId(),
    findingId,
    {
      name: String(form.get("abogado") ?? ""),
      professionalCard: String(form.get("tarjeta") ?? ""),
    },
    String(form.get("salvedad") ?? ""),
  );
  revalidatePath("/auditoria", "layout");
}

export async function expedirCertificado() {
  await issueCertificate(await runId());
  revalidatePath("/auditoria/remediacion");
}
