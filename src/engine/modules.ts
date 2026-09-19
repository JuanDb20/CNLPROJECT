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
  /** Payloads adversariales que envía en intensidad media. */
  basePayloads: number;
  /** Duración simulada en milisegundos, proporcional al coste real. */
  durationMs: number;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: "static-scan",
    name: "Análisis de código estático",
    description: "Llaves expuestas, control de acceso a la base de datos, dependencias y flujos de datos hacia proveedores de IA",
    frameworks: ["owasp", "col-1581", "gdpr"],
    basePayloads: 0,
    durationMs: 3200,
  },
  {
    id: "prompt-injection",
    name: "Inyección de prompt (adversarial)",
    description: "Herramientas del agente, instrucciones del modelo y controles de autorización frente a jailbreaks",
    frameworks: ["owasp", "col-1581", "col-1266", "gdpr"],
    basePayloads: 12,
    durationMs: 6400,
  },
  {
    id: "consent-ux",
    name: "Verificación de consentimiento y UX",
    description: "Detección de patrones oscuros y de la validez de la autorización",
    frameworks: ["col-1581", "col-1480", "gdpr"],
    basePayloads: 4,
    durationMs: 3600,
  },
  {
    id: "transparency",
    name: "Mapeo normativo de transparencia",
    description: "Evaluación de las obligaciones de revelación de la naturaleza del sistema",
    frameworks: ["col-1480", "col-1581", "owasp", "eu-ai-act"],
    basePayloads: 3,
    durationMs: 2800,
  },
];

const INTENSITY_FACTOR = { baja: 0.5, media: 1, alta: 2 } as const;

export function payloadsFor(
  module: ModuleDefinition,
  intensity: keyof typeof INTENSITY_FACTOR,
): number {
  return Math.round(module.basePayloads * INTENSITY_FACTOR[intensity]);
}

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
