import type { ScopeClause } from "./types";

/**
 * Inspección de solo lectura del despliegue declarado en el alcance.
 * ponytail: tipos y cláusula mínimos; el módulo de despliegue los completa.
 */

export interface LivePage {
  /** Ruta consultada, p. ej. "/", "/.env", "/politica-de-tratamiento". */
  path: string;
  status: number;
  headers: Record<string, string>;
  /** Primeros bytes del cuerpo, en texto. */
  body: string;
}

export interface LiveInspection {
  url: string;
  at: string;
  pages: LivePage[];
}

/** Cláusula del acuerdo de alcance que autoriza peticiones de solo lectura a la URL declarada. */
export function buildLiveClause(url: string): ScopeClause {
  return {
    id: "clause-live",
    label: "Autorización de inspección de solo lectura del despliegue declarado",
    detail:
      `El cliente autoriza peticiones GET y HEAD, sin autenticación y sin carga, a ${url} y a sus rutas ` +
      "públicas bien conocidas (política de tratamiento, archivos de configuración expuestos, cabeceras), " +
      "con el único fin de verificar lo que cualquier visitante puede ver. Ninguna petición modifica, " +
      "borra ni sobrecarga el sistema (Ley 1273 de 2009, arts. 269A y 269B).",
    required: true,
    accepted: false,
  };
}
