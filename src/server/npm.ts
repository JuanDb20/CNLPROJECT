import type { Hit } from "@/domain/check-kit";
import type { RepoFile } from "@/domain/types";

/**
 * Licencia de cada dependencia según el registro público de npm (sin llave).
 * ponytail: stub; el módulo de licencias lo implementa.
 */
export async function dependencyLicenses(_files: RepoFile[]): Promise<Hit[]> {
  return [];
}
