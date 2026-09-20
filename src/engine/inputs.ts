import type { LiveInspection } from "@/domain/live";
import type { Hit } from "@/domain/check-kit";
import type { AuditRun, RepoFile } from "@/domain/types";
import { inspectDeployment } from "@/server/inspeccion";
import { dependencyLicenses } from "@/server/npm";
import { dependencyAdvisories } from "@/server/osv";

export interface CheckInputs {
  advisories: Hit[];
  licenses: Hit[];
  live: LiveInspection | null;
}

/** Insumos externos de las pruebas: avisos OSV, licencias npm e inspección del despliegue. */
export async function collectInputs(run: AuditRun, files: RepoFile[]): Promise<CheckInputs> {
  const [advisories, licenses, live] = await Promise.all([
    dependencyAdvisories(files),
    dependencyLicenses(files),
    run.scope.liveUrl ? inspectDeployment(run.scope.liveUrl) : Promise.resolve(null),
  ]);
  return { advisories, licenses, live };
}
