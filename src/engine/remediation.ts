import { createHash } from "node:crypto";

import { nextPrNumber, runChecks } from "@/domain/checks";
import { scoreRun } from "@/domain/scoring";
import type { AuditRun, ConformityCertificate, Finding } from "@/domain/types";
import { readZip } from "@/server/zip";
import { accounts, repository } from "@/server/store";

import { collectInputs } from "./inputs";

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

/**
 * Retesteo real: corre el mismo catálogo de pruebas sobre la versión corregida.
 * El hallazgo pasa solo si su prueba ya no lo encuentra; si sigue, queda la
 * línea donde aparece.
 */
function evaluate(finding: Finding, detected: Finding[], fileName: string): Finding {
  const still = detected.find((f) => f.code === finding.code);
  return {
    ...finding,
    remediation: {
      ...finding.remediation,
      status: still ? "pr-abierto" : "retesteado",
      retests: finding.remediation.retests.map((r) => ({ ...r, passed: !still })),
      retestEvidence: still ? `Sigue presente en ${fileName}: ${still.evidence.locations[0]}` : null,
    },
  };
}

const retestable = (f: Finding) => f.remediation.status === "pr-abierto" || f.remediation.status === "retesteado";

/** Recibe la versión corregida y retestea todos los hallazgos con parche generado. */
export async function uploadCorrected(runId: string, fileName: string, zip: Buffer): Promise<AuditRun> {
  const files = readZip(zip);
  if (files.length === 0) throw new Error("El .zip no contiene archivos de código legibles");
  /* Un retesteo solo prueba algo si la versión corregida es el mismo proyecto:
     con un repositorio ajeno ninguna prueba vuelve a encontrar su patrón y todo
     queda en verde. */
  const original = await repository.files(runId);
  const paths = new Set(files.map((f) => f.path));
  const shared = original.filter((f) => paths.has(f.path)).length;
  if (original.length > 0 && shared / original.length < 0.5) {
    throw new Error(
      "La versión corregida no corresponde al proyecto auditado: solo comparte " +
        `${shared} de ${original.length} archivos`,
    );
  }
  await repository.saveCorrected(runId, zip);
  const retestSource = {
    fileName,
    sha256: createHash("sha256").update(zip).digest("hex"),
    bytes: zip.length,
    fileCount: files.length,
    uploadedAt: new Date().toISOString(),
  };
  const current = await repository.find(runId);
  if (!current) throw new Error("Auditoría no encontrada");
  const inputs = await collectInputs(current, files);
  return repository.update(runId, (run) => {
    const detected = runChecks(files, run.scope.client, inputs.advisories, inputs);
    return {
      ...run,
      retestSource,
      findings: run.findings.map((f) => (retestable(f) ? evaluate(f, detected, fileName) : f)),
    };
  });
}

/** Retestea un hallazgo contra la versión corregida ya cargada. */
export async function retest(runId: string, findingId: string): Promise<AuditRun> {
  const run = await repository.find(runId);
  const finding = run?.findings.find((f) => f.id === findingId);
  if (!run || !finding) throw new Error("Hallazgo no encontrado");
  if (finding.remediation.status === "propuesta") throw new Error("Genera el parche antes de retestear");
  if (!run.retestSource) throw new Error("Carga la versión corregida del código para retestear");
  const files = await repository.files(runId, "corregido");
  if (files.length === 0) throw new Error("La versión corregida ya no está disponible: cárgala de nuevo");
  const inputs = await collectInputs(run, files);
  const detected = runChecks(files, run.scope.client, inputs.advisories, inputs);
  return repository.update(runId, (current) =>
    mutateFinding(current, findingId, (f) => evaluate(f, detected, run.retestSource!.fileName)),
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

  // La T.P. queda en la cuenta para no volver a teclearla en cada hallazgo.
  const owner = await accounts.find(run.ownerId);
  if (owner && owner.professionalCard !== card) {
    await accounts.update({ ...owner, professionalCard: card });
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
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// Prototipo: FreeTSA. En producción, el estampado cronológico de una ECD acreditada por ONAC.
const TSA_URL = process.env.VIGIA_TSA_URL ?? "https://freetsa.org/tsr";

/**
 * Sello de tiempo RFC 3161 sobre el hash del informe: un tercero certifica que
 * el informe existía así en ese instante. La petición DER es fija salvo el
 * SHA-256; se verifica con `openssl ts -verify`. Si la TSA falla, sale sin sello.
 */
async function timestamp(hash: string): Promise<ConformityCertificate["timestamp"]> {
  const query = Buffer.concat([
    Buffer.from("30390201013031300d060960864801650304020105000420", "hex"),
    createHash("sha256").update(hash).digest(),
    Buffer.from("0101ff", "hex"),
  ]);
  try {
    const res = await fetch(TSA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/timestamp-query" },
      body: query,
      signal: AbortSignal.timeout(8000),
    });
    const token = Buffer.from(await res.arrayBuffer());
    const t = /\x18\x0f(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z/.exec(token.toString("latin1"));
    if (!res.ok || !t) return null;
    return { tsa: new URL(TSA_URL).host, at: `${t[1]}-${t[2]}-${t[3]}T${t[4]}:${t[5]}:${t[6]}Z`, token: token.toString("base64") };
  } catch {
    return null;
  }
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

  // La cadena es por abogado: cada informe se encadena al anterior de quien lo expide.
  const previousHash = await repository.latestCertificateHash(run.ownerId);
  const base: Omit<ConformityCertificate, "hash"> = {
    id: `VGI-INF-${run.id.toUpperCase()}`,
    runId: run.id,
    issuedAt: new Date().toISOString(),
    clientName: run.scope.client.name,
    scoreBefore,
    scoreAfter,
    frameworks: run.config.frameworks,
    /* El firmante y su salvedad entran al hash: alterarlos rompe la cadena. */
    findingsCount: run.findings.length,
    signedFindings: signed.map(
      (f) =>
        `${f.code} · ${f.remediation.signedBy}` +
        (f.remediation.signatureNote ? ` · Salvedad: ${f.remediation.signatureNote}` : ""),
    ),
    sourceSha256: run.scope.source.sha256,
    retestSha256: run.retestSource?.sha256 ?? null,
    findingsDigest: createHash("sha256")
      .update(
        JSON.stringify(
          run.findings.map((f) => [f.code, f.severity, f.legalAnalysis, f.evidence.response, f.remediation.status]),
        ),
      )
      .digest("hex"),
    previousHash,
  };

  const hash = hashCertificate(base);
  const certificate: ConformityCertificate = { ...base, hash, timestamp: await timestamp(hash) };

  await repository.saveCertificate(certificate, run.ownerId);
  await repository.update(runId, (current) => ({
    ...current,
    status: "certificado",
    certificate,
  }));

  return certificate;
}
