import type { LiveInspection } from "@/domain/live";

/**
 * Inspección de solo lectura del despliegue declarado (GET/HEAD a rutas públicas).
 * ponytail: stub; el módulo de despliegue lo implementa con guardas contra SSRF.
 */
export async function inspectDeployment(_url: string): Promise<LiveInspection | null> {
  return null;
}
