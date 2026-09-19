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
  | "col-1480"
  | "owasp"
  | "eu-ai-act"
  | "gdpr";

/** `comparado`: marco extranjero que orienta pero no se reporta como incumplimiento. */
export type FrameworkKind = "juridico" | "tecnico" | "interfaz" | "comparado";

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

/** Datos del cliente auditado, tal como los registra el abogado. */
export interface ClientInfo {
  name: string;
  nit: string;
  legalRepresentative: string;
  sector: string;
  /** Qué hace el sistema de IA auditado, en palabras del cliente. */
  system: string;
  /** Matrícula en el RUES: null si el NIT no aparece; ausente si no se pudo consultar. */
  rues?: { name: string; status: string; ciiu: string; renewed: string } | null;
}

/** Código fuente cargado para la auditoría. El hash fija la versión analizada. */
export interface SourceUpload {
  fileName: string;
  sha256: string;
  bytes: number;
  fileCount: number;
  uploadedAt: string;
  /** Fecha en que se borró el código cargado; queda solo su SHA-256. */
  deletedAt?: string;
}

/** Archivo de texto del código cargado. Se guarda aparte de la auditoría. */
export interface RepoFile {
  path: string;
  content: string;
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
}

export interface AuditScope {
  client: ClientInfo;
  source: SourceUpload;
  clauses: ScopeClause[];
  signatories: Signatory[];
  /** Identificador del entorno aislado donde se ejecutan las pruebas. */
  sandboxId: string;
  /** Anonimización de credenciales y PII antes de cualquier análisis. */
  dataMinimizationEnabled: boolean;
  authorizedAt: string | null;
  /** Secreto del enlace que el abogado envía al representante legal. */
  clientToken: string;
  /** Aceptación del acuerdo por el representante legal desde su portal. */
  /** `clausesSha256` fija el texto exacto aceptado: cualquier cambio posterior en las cláusulas se nota. */
  clientAcceptance: { name: string; idNumber: string; at: string; clausesSha256?: string } | null;
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
  /** País de tratamiento declarado por el proveedor (null si es librería local). */
  country: string | null;
  /** ¿Figura el país en la lista de nivel adecuado de la SIC? */
  adequateCountry: boolean | null;
  /** Encargado → transmisión (contrato); responsable → transferencia (art. 26). */
  role: "encargado" | "responsable" | null;
}

export interface AuditConfig {
  /** Marcos seleccionados por el equipo jurídico. */
  frameworks: FrameworkId[];
  providers: DetectedProvider[];
  /** Sustituye registros reales por datos sintéticos (principio de minimización). */
  piiMaskEnabled: boolean;
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
  /** Prueba que aplicó VIGÍA. */
  probe: string;
  /** Líneas del código que la sustentan, con secretos enmascarados. */
  response: string;
  /** Rutas del código implicadas, con número de línea. */
  locations: string[];
}

/** Naturaleza del cambio propuesto. Determina qué artefacto se modifica. */
export type PatchKind = "codigo" | "prompt" | "config" | "interfaz" | "dependencia";

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
  /** Abogado que asume el análisis: nombre y tarjeta profesional. */
  signedBy: string | null;
  /** Salvedad o ajuste del abogado al análisis propuesto por VIGÍA. */
  signatureNote: string | null;
  /** Si el retesteo falla: dónde sigue apareciendo la falla en la versión corregida. */
  retestEvidence?: string | null;
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
/* Informe de responsabilidad demostrada (paso 6)                     */
/* ------------------------------------------------------------------ */

/**
 * Evidencia de la remediación para acreditar responsabilidad demostrada ante
 * la SIC. No es un certificado de conformidad acreditado (ONAC).
 */
export interface ConformityCertificate {
  id: string;
  runId: string;
  issuedAt: string;
  clientName: string;
  scoreBefore: number;
  scoreAfter: number;
  frameworks: FrameworkId[];
  signedFindings: string[];
  /** Total de hallazgos de la auditoría (firmados y no firmados). */
  findingsCount: number;
  /** SHA-256 del .zip auditado: el informe queda atado a esa versión exacta del código. */
  sourceSha256: string;
  /** SHA-256 de evidencia, análisis y estado de todos los hallazgos. */
  findingsDigest: string;
  /** SHA-256 de la versión corregida sobre la que pasó el retesteo. */
  retestSha256: string | null;
  /** Encadenamiento por hash con el informe anterior (detecta alteraciones). */
  previousHash: string;
  hash: string;
  /** Sello de tiempo RFC 3161 de un tercero sobre `hash`; null si la TSA no respondió. */
  timestamp?: { tsa: string; at: string; token: string } | null;
}

/**
 * Subconjunto del informe que cualquiera puede consultar en /verificar sin
 * sesión: acredita integridad y fecha cierta, no revela de quién es la auditoría.
 */
export interface PublicCertificate {
  id: string;
  issuedAt: string;
  hash: string;
  previousHash: string;
  timestamp: { tsa: string; at: string; token: string } | null;
  scoreBefore: number;
  scoreAfter: number;
  sourceSha256: string;
  retestSha256: string | null;
  signedCount: number;
  findingsCount: number;
  /** Nombre y tarjeta profesional de cada abogado firmante. */
  signers: string[];
}

/* ------------------------------------------------------------------ */
/* Agregado raíz                                                       */
/* ------------------------------------------------------------------ */

export interface AuditRun {
  id: string;
  /** Abogado que abrió la auditoría; solo él puede verla. */
  ownerId: string;
  createdAt: string;
  status: RunStatus;
  scope: AuditScope;
  config: AuditConfig;
  modules: AuditModuleState[];
  logs: LogEntry[];
  findings: Finding[];
  /** Versión corregida del código contra la que se retestea. */
  retestSource?: SourceUpload | null;
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

/** Abogado usuario de VIGÍA. */
export interface User {
  id: string;
  name: string;
  email: string;
  /** Solo se exige al firmar un hallazgo, no al crear la cuenta (ver signFinding). */
  professionalCard?: string;
  firm: string;
  /** scrypt: "sal:hash" en hexadecimal. */
  passwordHash: string;
  /** Prueba de la autorización de tratamiento: versión de la política aceptada y fecha. */
  privacyAcceptance?: { version: string; at: string };
}
