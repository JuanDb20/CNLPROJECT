"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { FrameworkId } from "@/domain/types";
import {
  acceptAllClauses,
  acceptClause,
  acceptScopeAsClient,
  authorizeScope,
  createExampleRun,
  createRunFromForm,
  saveConfig,
  sourceZip,
  startExecution,
} from "@/engine/orchestrator";
import {
  issueCertificate,
  openPullRequest,
  retest,
  signFinding,
  uploadCorrected,
} from "@/engine/remediation";
import { login, loginDemo, logout, register, requireUser } from "@/server/auth";
import { MODO_COOKIE, RUN_COOKIE, clientRun } from "@/server/http";
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
  store.set(RUN_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}


/* ------------------------------ Cuenta ------------------------------ */

export async function registrarse(form: FormData) {
  try {
    await register({
      name: String(form.get("nombre") ?? ""),
      email: String(form.get("correo") ?? ""),
      firm: String(form.get("firma") ?? ""),
      password: String(form.get("clave") ?? ""),
      privacyAccepted: form.get("politica") === "on",
    });
  } catch (error) {
    redirect(`/registro?error=${error instanceof Error ? error.message : "datos"}`);
  }
  redirect("/panel");
}

export async function ingresar(form: FormData) {
  const result = await login(String(form.get("correo") ?? ""), String(form.get("clave") ?? ""));
  redirect(result === "ok" ? "/panel" : `/ingresar?error=${result}`);
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
  } catch (error) {
    /* El motor da mensajes precisos ("el repositorio debe ser público", "el .zip
       supera 4 MB"); se devuelven con los datos escritos para no rellenar todo otra vez. */
    const back = new URLSearchParams({
      error: error instanceof Error ? error.message : "datos",
    });
    for (const campo of ["cliente", "nit", "representante", "sector", "sistema", "repositorio", "despliegue"]) {
      const valor = String(form.get(campo) ?? "").slice(0, 300);
      if (valor) back.set(campo, valor);
    }
    redirect(`/panel/nueva?${back}`);
  }
  await openRun(id);
  redirect("/auditoria/alcance");
}

/** Auditoría con cliente y código de ejemplo, para probar el flujo sin llenar el formulario. */
export async function crearAuditoriaEjemplo() {
  const user = await requireUser();
  const id = (await createExampleRun(user)).id;
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

/** Marca aceptadas todas las cláusulas: el acuerdo ya se firmó por fuera de VIGÍA. */
export async function aceptarTodasLasClausulas() {
  await acceptAllClauses(await runId());
  redirect("/auditoria/alcance");
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

/** Carga la versión corregida (.zip o GitHub) y retestea contra ella. */
export async function retestearVersion(form: FormData) {
  const id = await runId();
  const hallazgo = String(form.get("hallazgo") ?? "");
  const back = `/auditoria/remediacion?hallazgo=${encodeURIComponent(hallazgo)}`;
  try {
    const { fileName, zip } = await sourceZip(String(form.get("repositorio") ?? "").trim(), form.get("codigo"));
    await uploadCorrected(id, fileName, zip);
  } catch (error) {
    const message = error instanceof Error ? error.message : "version";
    redirect(`${back}&error=${encodeURIComponent(message.slice(0, 300))}`);
  }
  redirect(back);
}

export async function firmarHallazgo(findingId: string, form: FormData) {
  // Firma quien inició sesión: el nombre no se toma del formulario, la tarjeta
  // profesional sí, porque VIGÍA solo la exige en este paso, no al registrarse.
  const user = await requireUser();
  await signFinding(
    await runId(),
    findingId,
    { name: user.name, professionalCard: String(form.get("tarjeta") ?? "") },
    String(form.get("salvedad") ?? ""),
  );
  revalidatePath("/auditoria", "layout");
}

export async function expedirCertificado() {
  await issueCertificate(await runId());
  revalidatePath("/auditoria/remediacion");
}

/**
 * Borra el código cargado una vez expedido el informe: la cláusula 4 del acuerdo
 * promete que solo queda su SHA-256, y ese hash ya está dentro del informe.
 */
export async function borrarCodigo() {
  const run = await requireRun();
  if (run.status !== "certificado") redirect("/auditoria/remediacion");
  await repository.deleteSource(run.id);
  await repository.update(run.id, (current) => ({
    ...current,
    scope: {
      ...current.scope,
      source: { ...current.scope.source, deletedAt: new Date().toISOString() },
    },
  }));
  revalidatePath("/auditoria", "layout");
  redirect("/auditoria/remediacion");
}

/* --------------------------- Modo aprendizaje -------------------------- */

/** Alterna las explicaciones paso a paso. Se guarda en una cookie, no en la auditoría. */
export async function alternarModoAprendizaje() {
  const store = await cookies();
  if (store.get(MODO_COOKIE)) {
    store.delete(MODO_COOKIE);
  } else {
    store.set(MODO_COOKIE, "aprendizaje", {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  revalidatePath("/", "layout");
}

/* ------------------------- Portal del cliente ------------------------- */

export async function aceptarAlcanceCliente(form: FormData) {
  const run = await clientRun(String(form.get("runId") ?? ""), String(form.get("token") ?? ""));
  if (!run) redirect("/");
  const back = `/cliente/${run.id}/${run.scope.clientToken}`;
  if (run.scope.clientAcceptance || run.status !== "borrador") redirect(back);
  if (form.get("acepto") !== "on") redirect(`${back}?error=1`);
  try {
    await acceptScopeAsClient(run.id, String(form.get("nombre") ?? ""), String(form.get("cedula") ?? ""));
  } catch {
    redirect(`${back}?error=1`);
  }
  redirect(back);
}
