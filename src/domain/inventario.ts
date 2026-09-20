import type { DetectedProvider, RepoFile } from "./types";

/**
 * Inventario de tratamientos: cada flujo detectado en el código como fila de un
 * registro de actividades (dato, finalidad, destinatario, transferencia, plazo).
 * ponytail: tipo y función mínimos; el módulo de inventario los completa.
 */
export interface InventoryRow {
  /** Categoría del dato, p. ej. "Documento de identidad", "Biometría facial". */
  category: string;
  /** Dónde se recolecta o almacena: archivo y línea. */
  source: string;
  purpose: string;
  /** Destinatarios internos o externos (proveedores de IA, tablas). */
  recipients: string;
  /** Transferencia o transmisión internacional: país o "No". */
  international: string;
  /** Plazo de conservación detectado o "No definido". */
  retention: string;
  sensitive: boolean;
}

export function buildInventory(_files: RepoFile[], _providers: DetectedProvider[]): InventoryRow[] {
  return [];
}
