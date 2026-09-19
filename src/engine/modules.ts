import type { AuditModuleState, FrameworkId, ModuleId } from "@/domain/types";

/**
 * Registro de módulos de análisis.
 *
 * Cada módulo declara los marcos que cubre y su coste relativo. El orquestador
 * no sabe *qué* hace cada módulo: solo los ejecuta en orden y recoge hallazgos.
 * En la arquitectura objetivo cada entrada de este registro corresponde a un
 * worker independiente que consume de una cola.
 */

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  /** Marcos que este módulo es capaz de evaluar. */
  frameworks: FrameworkId[];
  /** Pausa entre tramos de la traza, en milisegundos: el análisis es lectura de código, no espera real. */
  durationMs: number;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: "static-scan",
    name: "Análisis de código estático",
    description: "Llaves expuestas, control de acceso a la base de datos, dependencias y flujos de datos hacia proveedores de IA",
    frameworks: ["owasp", "col-1581", "gdpr"],
    durationMs: 300,
  },
  {
    id: "prompt-injection",
    name: "Revisión de herramientas del agente y prompt del sistema",
    description: "Instrucciones del modelo, herramientas expuestas al agente y controles de autorización, leídos del código",
    frameworks: ["owasp", "col-1581", "col-1266", "gdpr"],
    durationMs: 300,
  },
  {
    id: "consent-ux",
    name: "Verificación de consentimiento y UX",
    description: "Detección de patrones oscuros y de la validez de la autorización",
    frameworks: ["col-1581", "col-1480", "gdpr"],
    durationMs: 300,
  },
  {
    id: "transparency",
    name: "Mapeo normativo de transparencia",
    description: "Evaluación de las obligaciones de revelación de la naturaleza del sistema",
    frameworks: ["col-1480", "col-1581", "owasp", "eu-ai-act"],
    durationMs: 300,
  },
];

/** Un módulo se omite si ninguno de sus marcos fue seleccionado. */
export function isModuleEnabled(
  module: ModuleDefinition,
  selected: FrameworkId[],
): boolean {
  return module.frameworks.some((f) => selected.includes(f));
}

export function initialModuleStates(): AuditModuleState[] {
  return MODULES.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    status: "esperando",
    progress: 0,
    payloadsSent: 0,
    findingsFound: 0,
  }));
}

export function getModule(id: ModuleId): ModuleDefinition {
  const found = MODULES.find((m) => m.id === id);
  if (!found) throw new Error(`Módulo desconocido: ${id}`);
  return found;
}
