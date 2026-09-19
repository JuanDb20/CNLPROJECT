import { createHash, randomUUID } from "node:crypto";

import { buildClauses, detectProviders, runChecks } from "@/domain/checks";
import { ALL_FRAMEWORK_IDS, getRules } from "@/domain/compliance";
import type {
  AuditRun,
  ClientInfo,
  FrameworkId,
  LogEntry,
  LogLevel,
  ModuleId,
  User,
} from "@/domain/types";
import { bus, repository, runningRuns } from "@/server/store";
import { readZip } from "@/server/zip";

import { MODULES, initialModuleStates, isModuleEnabled } from "./modules";

/**
 * Orquestador de la auditoría.
 *
 * Recorre los módulos habilitados, emite la traza y acumula los hallazgos. En
 * este MVP corre como una tarea en proceso; en la arquitectura objetivo el
 * mismo contrato (`startExecution` encola, los módulos publican en el bus) se
 * satisface con una cola de trabajos y workers aislados por cliente, sin que la
 * interfaz note la diferencia porque consume el bus y no el orquestador.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Creación y preparación                                              */
/* ------------------------------------------------------------------ */

const MAX_ZIP_BYTES = 10 * 1024 * 1024;

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
  if (client.name.length < 2 || client.nit.length < 5 || client.legalRepresentative.length < 3) {
    throw new Error("Indica el cliente, su NIT y su representante legal");
  }

  const file = form.get("codigo");
  if (!(file instanceof File) || !/\.zip$/i.test(file.name) || file.size === 0) {
    throw new Error("Carga el código del sistema en un archivo .zip");
  }
  if (file.size > MAX_ZIP_BYTES) throw new Error("El .zip supera 10 MB");

  const zip = Buffer.from(await file.arrayBuffer());
  const files = readZip(zip);
  if (files.length === 0) throw new Error("El .zip no contiene archivos de código legibles");

  const id = randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const run: AuditRun = {
    id,
    ownerId: owner.id,
    createdAt: now,
    status: "borrador",
    scope: {
      client,
      source: {
        fileName: file.name.slice(0, 200),
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
          role: `Abogado revisor: ${owner.name} (T.P. ${owner.professionalCard}). Firma cada hallazgo`,
        },
      ],
      sandboxId: `sandbox-${id}`,
      dataMinimizationEnabled: true,
      authorizedAt: null,
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
  return repository.create(run, files);
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
  let entry: LogEntry | null = null;
  await repository.update(runId, (run) => {
    entry = {
      seq: run.logs.length + 1,
      at: new Date().toISOString(),
      level,
      module,
      message,
    };
    return { ...run, logs: [...run.logs, entry] };
  });
  if (entry) bus.publish(runId, entry);
}

/* ------------------------------------------------------------------ */
/* Ejecución                                                           */
/* ------------------------------------------------------------------ */

/**
 * Lanza la ejecución y devuelve de inmediato. El progreso se consume por el bus
 * de eventos, igual que ocurriría con un worker externo.
 */
export async function startExecution(runId: string): Promise<AuditRun> {
  const run = await repository.find(runId);
  if (!run) throw new Error("Auditoría no encontrada");
  if (!run.scope.authorizedAt) {
    throw new Error("La auditoría no tiene alcance autorizado");
  }
  if (runningRuns.has(runId)) return run;

  runningRuns.add(runId);
  const started = await repository.update(runId, (current) => ({
    ...current,
    status: "ejecutando",
    logs: [],
    findings: [],
    modules: initialModuleStates(),
    certificate: null,
  }));

  void execute(runId).finally(() => runningRuns.delete(runId));
  return started;
}

async function execute(runId: string): Promise<void> {
  const run = await repository.find(runId);
  if (!run) return;

  const selected = run.config.frameworks;
  const files = await repository.files(runId);
  const catalog = runChecks(files, run.scope.client.name);

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
