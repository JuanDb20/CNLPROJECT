/**
 * Modelo de dominio de VIGÍA.
 *
 * Todo el vocabulario de la auditoría vive aquí y no depende de React, de Next
 * ni de ningún motor de persistencia. Es la frontera que permite reemplazar el
 * motor simulado por el motor real (o el almacenamiento en memoria por
 * Postgres) sin reescribir la aplicación.
 */

/* ------------------------------------------------------------------ */
/* Marco normativo                                                     */
/* ------------------------------------------------------------------ */

/** Regímenes normativos que VIGÍA sabe evaluar. */
export type FrameworkId =
  | "col-1581"
  | "col-1266"
  | "eu-ai-act"
  | "gdpr"
  | "owasp-llm"
  | "dark-patterns";

export type FrameworkKind = "juridico" | "tecnico" | "interfaz";

export interface Framework {
  id: FrameworkId;
  /** Nombre corto para chips y filtros. */
  shortName: string;
  name: string;
  jurisdiction: string;
  kind: FrameworkKind;
  /** Norma o estándar citable. */
  citation: string;
  description: string;
}

/** Una obligación concreta y citable dentro de un marco. */
export interface ComplianceRule {
  id: string;
  framework: FrameworkId;
  /** Etiqueta que se muestra en la trazabilidad, p. ej. "Ley 1581 Art. 9". */
  label: string;
  title: string;
  /** Qué exige la norma, en lenguaje de abogado. */
  obligation: string;
}

/* ------------------------------------------------------------------ */
/* Alcance y autorización (paso 1)                                     */
/* ------------------------------------------------------------------ */

export interface RepositoryRef {
  provider: "github" | "gitlab" | "bitbucket";
  slug: string;
  /** Ramas explícitamente autorizadas para el ejercicio de red team. */
  authorizedBranches: string[];
  connectedAt: string;
}

/** Cláusula del acuerdo de alcance que el responsable legal debe aceptar. */
export interface ScopeClause {
  id: string;
  label: string;
  detail: string;
  required: boolean;
  accepted: boolean;
}

export interface Signatory {
  id: string;
  role: string;
  /** Huella del firmante; nunca se almacenan credenciales. */
  fingerprint: string;
}

export interface AuditScope {
  clientName: string;
  repository: RepositoryRef | null;
  clauses: ScopeClause[];
  signatories: Signatory[];
  /** Identificador del entorno aislado donde se ejecutan las pruebas. */
  sandboxId: string;
  /** Anonimización de credenciales y PII antes de cualquier análisis. */
  dataMinimizationEnabled: boolean;
  authorizedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Configuración (paso 2)                                              */
/* ------------------------------------------------------------------ */

export interface DetectedProvider {
  id: string;
  vendor: string;
  model: string;
  surface: string;
  classification: "third-party-llm" | "self-hosted" | "sdk";
}

export interface AuditConfig {
  /** Marcos seleccionados por el equipo jurídico. */
  frameworks: FrameworkId[];
  providers: DetectedProvider[];
  /** Sustituye registros reales por datos sintéticos (principio de minimización). */
  piiMaskEnabled: boolean;
  /** Intensidad del red team: cuántos payloads por módulo. */
  intensity: "baja" | "media" | "alta";
}

/* ------------------------------------------------------------------ */
/* Ejecución (paso 3)                                                  */
/* ------------------------------------------------------------------ */

export type ModuleId =
  | "static-scan"
  | "prompt-injection"
  | "consent-ux"
  | "transparency";

export type ModuleStatus = "esperando" | "ejecutando" | "completado" | "omitido";

export interface AuditModuleState {
  id: ModuleId;
  name: string;
  description: string;
  status: ModuleStatus;
  /** 0–100. */
  progress: number;
  payloadsSent: number;
  findingsFound: number;
}

export type LogLevel = "system" | "info" | "payload" | "vuln" | "ok";

export interface LogEntry {
  seq: number;
  at: string;
  level: LogLevel;
  module: ModuleId | "orchestrator";
  message: string;
}

export type RunStatus =
  | "borrador"
  | "configurado"
  | "ejecutando"
  | "analizado"
  | "remediando"
  | "certificado";

/* ------------------------------------------------------------------ */
/* Hallazgos (pasos 4 y 5)                                             */
/* ------------------------------------------------------------------ */

export type Severity = "critico" | "advertencia" | "informativo";

export interface Evidence {
  /** Entrada adversarial exacta que se envió al sistema. */
  probe: string;
  /** Respuesta del sistema en el sandbox (ya minimizada). */
  response: string;
  /** Rutas del repositorio implicadas. */
  locations: string[];
}

/** Naturaleza del cambio propuesto. Determina qué artefacto se modifica. */
export type PatchKind = "prompt" | "config" | "interfaz" | "dependencia";

export interface Patch {
  kind: PatchKind;
  /** Artefacto sobre el que se aplica el cambio. */
  target: string;
  /** Líneas eliminadas. */
  removed: string[];
  /** Líneas añadidas. */
  added: string[];
  /** Por qué el parche cierra el hallazgo, en términos de la norma. */
  expectedImpact: string;
}

export type RemediationStatus =
  | "propuesta"
  | "pr-abierto"
  | "retesteado"
  | "firmado";

export interface RetestResult {
  label: string;
  passed: boolean;
}

export interface Remediation {
  status: RemediationStatus;
  patch: Patch;
  /** Rama aislada; nunca se escribe en producción. */
  branch: string;
  prNumber: number | null;
  prUrl: string | null;
  changeNote: string;
  retests: RetestResult[];
  signedAt: string | null;
  signedBy: string | null;
}

export interface Finding {
  id: string;
  /** Código legible para el informe, p. ej. "VGI-042". */
  code: string;
  module: ModuleId;
  severity: Severity;
  title: string;
  summary: string;
  /** Explicación jurídica del riesgo. */
  legalAnalysis: string;
  /** Obligaciones incumplidas, por id de ComplianceRule. */
  ruleIds: string[];
  evidence: Evidence;
  remediation: Remediation;
}

/* ------------------------------------------------------------------ */
/* Certificado (paso 6)                                               */
/* ------------------------------------------------------------------ */

export interface ConformityCertificate {
  id: string;
  runId: string;
  issuedAt: string;
  clientName: string;
  scoreBefore: number;
  scoreAfter: number;
  frameworks: FrameworkId[];
  signedFindings: string[];
  /** Encadenamiento tipo log inmutable: hash del certificado anterior. */
  previousHash: string;
  hash: string;
}

/* ------------------------------------------------------------------ */
/* Agregado raíz                                                       */
/* ------------------------------------------------------------------ */

export interface AuditRun {
  id: string;
  createdAt: string;
  status: RunStatus;
  scope: AuditScope;
  config: AuditConfig;
  modules: AuditModuleState[];
  logs: LogEntry[];
  findings: Finding[];
  certificate: ConformityCertificate | null;
}

/** Resumen calculado; nunca se persiste, se deriva de los hallazgos. */
export interface RunScore {
  score: number;
  level: "bajo" | "medio" | "alto";
  critical: number;
  warning: number;
  informative: number;
  resolved: number;
}
