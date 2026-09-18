import { createHash } from "node:crypto";

import { nextPrNumber } from "@/domain/scenarios";
import { scoreRun } from "@/domain/scoring";
import type { AuditRun, ConformityCertificate, Finding } from "@/domain/types";
import { repository } from "@/server/store";

/**
 * Remediación y certificación.
 *
 * El ciclo es deliberadamente de cuatro pasos —propuesta, PR, retesteo, firma—
 * porque es el que hace el informe oponible: la firma solo se habilita cuando
 * el retesteo sobre la rama parcheada pasa, y queda encadenada por hash al
 * certificado anterior.
 */

function mutateFinding(
  run: AuditRun,
  findingId: string,
  mutate: (f: Finding) => Finding,
): AuditRun {
  return {
    ...run,
    findings: run.findings.map((f) => (f.id === findingId ? mutate(f) : f)),
  };
}

/** Abre el pull request en la rama aislada. Nunca escribe en producción. */
export async function openPullRequest(
  runId: string,
  findingId: string,
): Promise<AuditRun> {
  return repository.update(runId, (run) => {
    const pr = nextPrNumber(run.findings);
    return mutateFinding(
      { ...run, status: run.status === "analizado" ? "remediando" : run.status },
      findingId,
      (f) => ({
        ...f,
        remediation: {
          ...f.remediation,
          status: "pr-abierto",
          prNumber: pr,
          prUrl: `https://github.com/${run.scope.repository?.slug ?? "repo"}/pull/${pr}`,
        },
      }),
    );
  });
}

/** Reejecuta las pruebas adversariales contra la rama parcheada. */
export async function retest(runId: string, findingId: string): Promise<AuditRun> {
  return repository.update(runId, (run) =>
    mutateFinding(run, findingId, (f) => ({
      ...f,
      remediation: {
        ...f.remediation,
        status: "retesteado",
        retests: f.remediation.retests.map((r) => ({ ...r, passed: true })),
      },
    })),
  );
}

/** Firma legal y técnica del hallazgo. Exige retesteo previo en verde. */
export async function signFinding(
  runId: string,
  findingId: string,
  signedBy: string,
): Promise<AuditRun> {
  const run = await repository.find(runId);
  const finding = run?.findings.find((f) => f.id === findingId);
  if (!run || !finding) throw new Error("Hallazgo no encontrado");

  const allPassed =
    finding.remediation.retests.length > 0 &&
    finding.remediation.retests.every((r) => r.passed);
  if (!allPassed) {
    throw new Error("No se puede firmar un hallazgo sin retesteo en verde");
  }

  return repository.update(runId, (current) =>
    mutateFinding(current, findingId, (f) => ({
      ...f,
      remediation: {
        ...f.remediation,
        status: "firmado",
        signedAt: new Date().toISOString(),
        signedBy,
      },
    })),
  );
}

/* ------------------------------------------------------------------ */
/* Certificado de conformidad                                          */
/* ------------------------------------------------------------------ */

function hashCertificate(
  payload: Omit<ConformityCertificate, "hash">,
): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
}

/**
 * Expide el certificado. La puntuación «antes» se recalcula con todos los
 * hallazgos abiertos para que el documento muestre la mejora atribuible a la
 * auditoría, no una cifra declarativa.
 */
export async function issueCertificate(
  runId: string,
): Promise<ConformityCertificate> {
  const run = await repository.find(runId);
  if (!run) throw new Error("Auditoría no encontrada");

  const signed = run.findings.filter((f) => f.remediation.status === "firmado");
  if (signed.length === 0) {
    throw new Error("No hay hallazgos firmados: no procede expedir certificado");
  }

  const scoreAfter = scoreRun(run).score;
  const scoreBefore = scoreRun({
    ...run,
    findings: run.findings.map((f) => ({
      ...f,
      remediation: { ...f.remediation, status: "propuesta" as const },
    })),
  }).score;

  const previousHash = await repository.latestCertificateHash();
  const base: Omit<ConformityCertificate, "hash"> = {
    id: `VGI-CERT-${run.id.toUpperCase()}`,
    runId: run.id,
    issuedAt: new Date().toISOString(),
    clientName: run.scope.clientName,
    scoreBefore,
    scoreAfter,
    frameworks: run.config.frameworks,
    signedFindings: signed.map((f) => f.code),
    previousHash,
  };

  const certificate: ConformityCertificate = {
    ...base,
    hash: hashCertificate(base),
  };

  await repository.saveCertificate(certificate);
  await repository.update(runId, (current) => ({
    ...current,
    status: "certificado",
    certificate,
  }));

  return certificate;
}
