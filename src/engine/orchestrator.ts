import { createHash, randomUUID } from "node:crypto";
import { after } from "next/server";

import { buildClauses, detectProviders, runChecks } from "@/domain/checks";
import { ALL_FRAMEWORK_IDS, getRules } from "@/domain/compliance";
import type {
  AuditRun,
  ClientInfo,
  FrameworkId,
  LogEntry,
  LogLevel,
  ModuleId,
  RepoFile,
  User,
} from "@/domain/types";
import { EXAMPLE_FILES } from "@/server/example-repo";
import { dependencyAdvisories } from "@/server/osv";
import { repository } from "@/server/store";
import { readZip, writeZip } from "@/server/zip";

import { MODULES, initialModuleStates, isModuleEnabled } from "./modules";

/**
 * Orquestador de la auditoría.
 *
 * Recorre los módulos habilitados, escribe la traza y acumula los hallazgos en
 * el repositorio. En este MVP corre en la misma función que recibe la orden,
 * después de responder (`after`); en la arquitectura objetivo lo toma una cola
 * de trabajos con workers aislados por cliente. La interfaz no nota la
 * diferencia porque lee el progreso del repositorio, no del orquestador.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Creación y preparación                                              */
/* ------------------------------------------------------------------ */

// Vercel rechaza peticiones de más de 4,5 MB.
const MAX_ZIP_BYTES = 4 * 1024 * 1024;

/**
 * Abre una auditoría con los datos del cliente y el código en .zip. Es la única
 * puerta de entrada: la usan la interfaz y la API con el mismo formulario.
 */
export async function createRunFromForm(owner: User, form: FormData): Promise<AuditRun> {
  const text = (key: string, max = 200) => String(form.get(key) ?? "").trim().slice(0, max);
  const client: ClientInfo = {
    name: text("cliente"),
    nit: text("nit", 30),
    legalRepresentative: text("representante"),
    sector: text("sector", 60),
    system: text("sistema", 1000),
  };
  if (client.name.length < 2 || client.legalRepresentative.length < 3) {
    throw new Error("Indica el cliente, su NIT y su representante legal");
  }
  const [nit, dv] = client.nit.replace(/[.\s]/g, "").split("-");
  if (!/^\d{6,10}$/.test(nit ?? "") || (dv !== undefined && Number(dv) !== nitCheckDigit(nit))) {
    throw new Error("El NIT o su dígito de verificación no son válidos");
  }
  client.nit = `${nit.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${nitCheckDigit(nit)}`;
  const rues = await ruesLookup(nit);
  if (rues !== undefined) client.rues = rues;

  const { fileName, zip } = await sourceZip(text("repositorio", 300), form.get("codigo"));
  const files = readZip(zip);
  if (files.length === 0) throw new Error("El .zip no contiene archivos de código legibles");

  return createRun(owner, client, fileName, zip, files);
}

const EXAMPLE_CLIENT: ClientInfo = {
  name: "Fintrex S.A.S.",
  // NIT ficticio con dígito de verificación correcto y sin registro en el RUES.
  nit: "902.999.990-6",
  legalRepresentative: "Camila Rueda Ospina",
  sector: "Financiero y fintech",
  system: "Asistente de chat para clientes, con vinculación digital por selfie y cédula.",
};

/**
 * Abre una auditoría con un cliente y un código de ejemplo (fallas reales,
 * detectadas por el mismo catálogo de pruebas), para probar el flujo sin
 * tener que llenar el formulario ni cargar un .zip.
 */
export async function createExampleRun(owner: User): Promise<AuditRun> {
  const zip = writeZip(EXAMPLE_FILES);
  return createRun(owner, EXAMPLE_CLIENT, "ejemplo-fintrex.zip", zip, EXAMPLE_FILES);
}

function createRun(
  owner: User,
  client: ClientInfo,
  fileName: string,
  zip: Buffer,
  files: RepoFile[],
): Promise<AuditRun> {
  const id = randomUUID().replaceAll("-", "").slice(0, 12);
  const now = new Date().toISOString();
  const run: AuditRun = {
    id,
    ownerId: owner.id,
    createdAt: now,
    status: "borrador",
    scope: {
      client,
      source: {
        fileName,
        sha256: createHash("sha256").update(zip).digest("hex"),
        bytes: zip.length,
        fileCount: files.length,
        uploadedAt: now,
      },
      clauses: buildClauses(client.name),
      signatories: [
        {
          id: "sig-client",
          role: `Representante legal de ${client.name}: ${client.legalRepresentative}. Autoriza las pruebas`,
        },
        {
          id: "sig-abogado",
          role:
            `Abogado revisor: ${owner.name}` +
            (owner.professionalCard ? ` (T.P. ${owner.professionalCard})` : "") +
            ". Firma cada hallazgo con su tarjeta profesional",
        },
      ],
      sandboxId: `sandbox-${id}`,
      dataMinimizationEnabled: true,
      authorizedAt: null,
      clientToken: randomUUID().replaceAll("-", ""),
      clientAcceptance: null,
    },
    config: {
      frameworks: ALL_FRAMEWORK_IDS,
      providers: [],
      piiMaskEnabled: true,
      intensity: "media",
    },
    modules: initialModuleStates(),
    logs: [],
    findings: [],
    certificate: null,
  };
  return repository.create(run, zip);
}

/** Dígito de verificación de la DIAN: pesos primos de derecha a izquierda, módulo 11. */
export function nitCheckDigit(nit: string): number {
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const sum = [...nit].reverse().reduce((acc, d, i) => acc + Number(d) * weights[i], 0) % 11;
  return sum > 1 ? 11 - sum : sum;
}

/**
 * Matrícula del cliente en el RUES, por los datos abiertos de Confecámaras en
 * datos.gov.co (sin llave). undefined si no responde: la auditoría no depende de ello.
 */
async function ruesLookup(nit: string): Promise<ClientInfo["rues"]> {
  try {
    const res = await fetch(
      `https://www.datos.gov.co/resource/c82u-588k.json?nit=${nit}&$select=razon_social,estado_matricula,cod_ciiu_act_econ_pri,ultimo_ano_renovado&$order=ultimo_ano_renovado DESC&$limit=1`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" },
    );
    if (!res.ok) return undefined;
    const [row] = (await res.json()) as Array<Record<string, string>>;
    return row
      ? { name: row.razon_social, status: row.estado_matricula, ciiu: row.cod_ciiu_act_econ_pri, renewed: row.ultimo_ano_renovado }
      : null;
  } catch {
    return undefined;
  }
}

/** El código llega en .zip o se descarga de un repositorio público de GitHub. */
export async function sourceZip(repoUrl: string, file: FormDataEntryValue | null) {
  if (repoUrl) {
    const repo = repoUrl.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    if (!repo) throw new Error("Indica la URL de un repositorio de GitHub");
    // Host fijo y nombre validado: el usuario no elige a qué servidor se conecta VIGÍA.
    const res = await fetch(`https://codeload.github.com/${repo[1]}/${repo[2]}/zip/HEAD`, {
      cache: "no-store",
    });
    if (!res.ok || !res.body) throw new Error("No se pudo descargar: el repositorio debe ser público");
    const chunks: Buffer[] = [];
    let size = 0;
    const reader = res.body.getReader();
    for (let part = await reader.read(); !part.done; part = await reader.read()) {
      size += part.value.length;
      if (size > MAX_ZIP_BYTES) {
        await reader.cancel();
        throw new Error("El repositorio comprimido supera 4 MB");
      }
      chunks.push(Buffer.from(part.value));
    }
    return { fileName: `github.com/${repo[1]}/${repo[2]}`, zip: Buffer.concat(chunks) };
  }
  if (!(file instanceof File) || !/\.zip$/i.test(file.name) || file.size === 0) {
    throw new Error("Carga el código del sistema en un archivo .zip");
  }
  if (file.size > MAX_ZIP_BYTES) throw new Error("El .zip supera 4 MB");
  return { fileName: file.name.slice(0, 200), zip: Buffer.from(await file.arrayBuffer()) };
}

export async function acceptClause(
  runId: string,
  clauseId: string,
  accepted: boolean,
): Promise<AuditRun> {
  return repository.update(runId, (run) => ({
    ...run,
    scope: {
      ...run.scope,
      clauses: run.scope.clauses.map((c) =>
        c.id === clauseId ? { ...c, accepted } : c,
      ),
    },
  }));
}

/** El representante legal acepta todo el acuerdo desde su portal, con nombre y cédula. */
export async function acceptScopeAsClient(
  runId: string,
  name: string,
  idNumber: string,
): Promise<AuditRun> {
  name = name.trim().slice(0, 120);
  idNumber = idNumber.replace(/\D/g, "");
  if (name.length < 3 || idNumber.length < 5 || idNumber.length > 12) {
    throw new Error("Indica tu nombre completo y tu número de cédula");
  }
  return repository.update(runId, (run) => ({
    ...run,
    scope: {
      ...run.scope,
      clauses: run.scope.clauses.map((c) => ({ ...c, accepted: true })),
      // Firma electrónica (Decreto 2364 de 2012): el registro queda atado al texto que se aceptó.
      clientAcceptance: {
        name,
        idNumber,
        at: new Date().toISOString(),
        clausesSha256: createHash("sha256")
          .update(JSON.stringify(run.scope.clauses.map((c) => [c.label, c.detail])))
          .digest("hex"),
      },
    },
  }));
}

/** Cierra el paso 1: exige las cláusulas obligatorias aceptadas. */
export async function authorizeScope(runId: string): Promise<AuditRun> {
  const run = await repository.find(runId);
  if (!run) throw new Error("Auditoría no encontrada");

  const providers = detectProviders(await repository.files(runId));
  const pending = run.scope.clauses.filter((c) => c.required && !c.accepted);
  if (pending.length > 0) {
    throw new Error("Faltan cláusulas obligatorias del acuerdo de alcance");
  }

  return repository.update(runId, (current) => ({
    ...current,
    status: "configurado",
    scope: { ...current.scope, authorizedAt: new Date().toISOString() },
    config: { ...current.config, providers },
  }));
}

export async function saveConfig(
  runId: string,
  patch: { frameworks?: FrameworkId[]; piiMaskEnabled?: boolean },
): Promise<AuditRun> {
  return repository.update(runId, (run) => ({
    ...run,
    config: {
      ...run.config,
      frameworks: patch.frameworks ?? run.config.frameworks,
      piiMaskEnabled: patch.piiMaskEnabled ?? run.config.piiMaskEnabled,
    },
  }));
}

/* ------------------------------------------------------------------ */
/* Traza                                                               */
/* ------------------------------------------------------------------ */

async function log(
  runId: string,
  level: LogLevel,
  module: ModuleId | "orchestrator",
  message: string,
): Promise<void> {
  await repository.update(runId, (run) => {
    const entry: LogEntry = {
      seq: run.logs.length + 1,
      at: new Date().toISOString(),
      level,
      module,
      message,
    };
    return { ...run, logs: [...run.logs, entry] };
  });
}

/* ------------------------------------------------------------------ */
/* Ejecución                                                           */
/* ------------------------------------------------------------------ */

/**
 * Lanza la ejecución y devuelve de inmediato. El progreso se lee del
 * repositorio, igual que ocurriría con un worker externo.
 */
export async function startExecution(runId: string): Promise<AuditRun> {
  const run = await repository.find(runId);
  if (!run) throw new Error("Auditoría no encontrada");
  if (!run.scope.authorizedAt) {
    throw new Error("La auditoría no tiene alcance autorizado");
  }
  // Una ejecución sin traza en el último minuto se da por caída y se relanza.
  const lastActivity = Date.parse(run.logs.at(-1)?.at ?? run.createdAt);
  if (run.status === "ejecutando" && Date.now() - lastActivity < 60_000) return run;

  const started = await repository.update(runId, (current) => ({
    ...current,
    status: "ejecutando",
    logs: [],
    findings: [],
    modules: initialModuleStates(),
    certificate: null,
  }));

  after(() => execute(runId));
  return started;
}

async function execute(runId: string): Promise<void> {
  const run = await repository.find(runId);
  if (!run) return;

  const selected = run.config.frameworks;
  const files = await repository.files(runId);
  const catalog = runChecks(files, run.scope.client.name, await dependencyAdvisories(files));

  await log(
    runId,
    "system",
    "orchestrator",
    `Analizando ${run.scope.source.fileName} (${files.length} archivos, SHA-256 ${run.scope.source.sha256.slice(0, 12)}…) en ${run.scope.sandboxId}`,
  );

  if (run.config.piiMaskEnabled) {
    await log(
      runId,
      "info",
      "orchestrator",
      "Máscara de datos personales activa: los registros reales se sustituyen por datos sintéticos",
    );
  }

  for (const module of MODULES) {
    if (!isModuleEnabled(module, selected)) {
      await setModule(runId, module.id, { status: "omitido", progress: 100 });
      await log(
        runId,
        "info",
        module.id,
        `Módulo omitido: ningún marco seleccionado lo requiere`,
      );
      continue;
    }

    await setModule(runId, module.id, { status: "ejecutando", progress: 0 });
    await log(runId, "system", module.id, `Iniciando ${module.name.toLowerCase()}`);

    const moduleFindings = catalog.filter(
      (f) => f.module === module.id && selectedCoversFinding(f.ruleIds, selected),
    );

    /* El módulo avanza en cuatro tramos; los hallazgos se emiten intercalados
       para que la traza refleje el orden real de descubrimiento. */
    const steps = 4;
    for (let step = 1; step <= steps; step += 1) {
      await sleep(module.durationMs / steps);

      const progress = Math.round((step / steps) * 100);
      await setModule(runId, module.id, { progress });

      if (step < steps) {
        await log(
          runId,
          "payload",
          module.id,
          `Revisando lote ${step}/${steps} (${Math.round((files.length * step) / steps)}/${files.length} archivos)`,
        );
      }

      /* Reparte los hallazgos del módulo entre los tramos, por orden. */
      const from = Math.floor((moduleFindings.length * (step - 1)) / steps);
      const to = Math.floor((moduleFindings.length * step) / steps);
      for (const finding of moduleFindings.slice(from, to)) {
        await appendFinding(runId, finding);
        await log(
          runId,
          finding.severity === "critico" ? "vuln" : "info",
          module.id,
          `[${finding.code}] ${finding.title}`,
        );
      }
    }

    const found = (await repository.find(runId))?.findings.filter(
      (f) => f.module === module.id,
    ).length;

    await setModule(runId, module.id, {
      status: "completado",
      progress: 100,
      findingsFound: found ?? 0,
    });
    await log(
      runId,
      "ok",
      module.id,
      `${module.name} completado: ${found ?? 0} hallazgos`,
    );
  }

  await repository.update(runId, (current) => ({ ...current, status: "analizado" }));
  await log(
    runId,
    "ok",
    "orchestrator",
    "Análisis finalizado. Mapa de riesgos disponible para revisión legal.",
  );
}

/** Un hallazgo solo se reporta si alguno de sus marcos está seleccionado. */
function selectedCoversFinding(ruleIds: string[], selected: FrameworkId[]): boolean {
  return getRules(ruleIds).some((r) => selected.includes(r.framework));
}

async function setModule(
  runId: string,
  moduleId: ModuleId,
  patch: Partial<{
    status: AuditRun["modules"][number]["status"];
    progress: number;
    payloadsSent: number;
    findingsFound: number;
  }>,
): Promise<void> {
  await repository.update(runId, (run) => ({
    ...run,
    modules: run.modules.map((m) => (m.id === moduleId ? { ...m, ...patch } : m)),
  }));
}

async function appendFinding(
  runId: string,
  finding: AuditRun["findings"][number],
): Promise<void> {
  await repository.update(runId, (run) =>
    run.findings.some((f) => f.id === finding.id)
      ? run
      : { ...run, findings: [...run.findings, finding] },
  );
}

/** Progreso global 0–100, ponderado por módulo habilitado. */
export function overallProgress(run: AuditRun): number {
  const active = run.modules.filter((m) => m.status !== "omitido");
  if (active.length === 0) return 100;
  const sum = active.reduce((acc, m) => acc + m.progress, 0);
  return Math.round(sum / active.length);
}

export function currentPhase(run: AuditRun): string {
  const running = run.modules.find((m) => m.status === "ejecutando");
  if (running) {
    const index = run.modules.findIndex((m) => m.id === running.id) + 1;
    return `Fase ${index}: ${running.name}`;
  }
  switch (run.status) {
    case "analizado":
      return "Análisis completado";
    case "remediando":
      return "Remediación en curso";
    case "certificado":
      return "Informe expedido";
    default:
      return "En espera";
  }
}
