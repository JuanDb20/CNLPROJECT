import type { FrameworkId } from "./types";

/**
 * Paquetes normativos por sector: el campo "sector" del cliente activa marcos y
 * obligaciones propias (fintech, salud, menores, comercio…).
 * ponytail: tipo y función mínimos; el módulo de sectores los completa.
 */
export interface SectorPack {
  id: string;
  name: string;
  /** Marcos que el paquete recomienda seleccionar. */
  frameworks: FrameworkId[];
  /** Obligaciones (ids de ComplianceRule) que el paquete pone en primer plano. */
  ruleIds: string[];
  /** Por qué aplica, en lenguaje de abogado. */
  note: string;
}

/** Paquete que corresponde al texto libre del sector, o null si ninguno aplica. */
export function sectorPack(_sector: string): SectorPack | null {
  return null;
}
