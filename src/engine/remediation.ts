import { createHash } from "node:crypto";

import { nextPrNumber } from "@/domain/checks";
import { scoreRun } from "@/domain/scoring";
import type { AuditRun, ConformityCertificate, Finding } from "@/domain/types";
import { repository } from "@/server/store";

/**
 * Remediación y certificación.
 *
 * El ciclo es deliberadamente de cuatro pasos —propuesta, PR, retesteo, firma—
 * porque es el que convierte el informe en evidencia de responsabilidad
 * demostrada: la firma solo se habilita cuando el retesteo sobre la rama
 * parcheada pasa, y el informe queda encadenado por hash al anterior.
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

/** Prepara el parche en una rama aislada. Nunca escribe en producción. */
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
          prUrl: null,
        },
      }),
    );
  });
}

/** Reejecuta las pruebas adversariales contra la rama parcheada. */
export async function retest(runId: string, findingId: string): Promise<AuditRun> {
  return repository.update(runId, (run) =>
    mutateFinding(run, findingId, (f) => {
      if (f.remediation.status === "propuesta") {
        throw new Error("Genera el parche antes de retestear");
      }
      return {
        ...f,
        remediation: {
          ...f.remediation,
          status: "retesteado",
          retests: f.remediation.retests.map((r) => ({ ...r, passed: true })),
        },
      };
    }),
  );
}

/**
 * Firma del abogado revisor. Exige retesteo previo en verde: VIGÍA propone el
 * análisis, pero solo entra al informe cuando un abogado identificado lo asume.
 */
export async function signFinding(
  runId: string,
  findingId: string,
  lawyer: { name: string; professionalCard: string },
  note?: string | null,
): Promise<AuditRun> {
  const name = lawyer.name.trim();
  const card = lawyer.professionalCard.trim();
  if (name.length < 3 || name.length > 120 || !/^\d{3,7}$/.test(card)) {
    throw new Error("Indica el nombre y la tarjeta profesional del abogado revisor");
  }
  const signedBy = `${name} (T.P. ${card})`;
  const signatureNote = note?.trim().slice(0, 500) || null;

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
        signatureNote,
      },
    })),
  );
}

/* ------------------------------------------------------------------ */
/* Informe de responsabilidad demostrada                              */
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
 * Expide el informe. La puntuación «antes» se recalcula con todos los
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
    throw new Error("No hay hallazgos firmados: no procede expedir el informe");
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
    id: `VGI-INF-${run.id.toUpperCase()}`,
    runId: run.id,
    issuedAt: new Date().toISOString(),
    clientName: run.scope.client.name,
    scoreBefore,
    scoreAfter,
    frameworks: run.config.frameworks,
    /* El firmante y su salvedad entran al hash: alterarlos rompe la cadena. */
    signedFindings: signed.map(
      (f) =>
        `${f.code} · ${f.remediation.signedBy}` +
        (f.remediation.signatureNote ? ` · Salvedad: ${f.remediation.signatureNote}` : ""),
    ),
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
