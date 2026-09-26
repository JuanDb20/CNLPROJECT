import { METODO_Y_LIMITES, PIE_RESPONSABILIDAD, QUIEN_RESPONDE } from "@/components/informe";
import { getRules } from "@/domain/compliance";
import { formatDate, lawyerName } from "@/domain/format";
import { SEVERITY_LABEL, scoreRun, sortFindings } from "@/domain/scoring";
import type { AuditRun, RemediationStatus } from "@/domain/types";
import { docxFromLines } from "@/server/docx";
import { fail, ownedRun } from "@/server/http";

type Params = { params: Promise<{ runId: string }> };

const STATUS_LABEL: Record<RemediationStatus, string> = {
  propuesta: "Abierto: parche propuesto",
  "pr-abierto": "Abierto: parche generado",
  retesteado: "Retesteo superado; pendiente del concepto del abogado",
  firmado: "Retesteo superado; concepto jurídico firmado",
};

/**
 * Líneas del informe en el formato acordado para `docxFromLines` (ver
 * `src/domain/types.ts`, Patch.added cuando `patch.kind === "documento"`).
 * Reproduce lo esencial de `src/components/informe.tsx` en texto plano, sin
 * su lógica de React ni las secciones que solo tienen sentido en pantalla
 * (factores de proporcionalidad, mapa de riesgos, etc.). Los límites sí van:
 * es el formato que más circula.
 */
function informeLines(run: AuditRun): string[] {
  const { client, source, clauses, authorizedAt, signatories, clientAcceptance } = run.scope;
  const cert = run.certificate;
  const score = scoreRun(run);
  const initial = scoreRun({
    ...run,
    findings: run.findings.map((f) => ({ ...f, remediation: { ...f.remediation, status: "propuesta" as const } })),
  });
  const lawyer = lawyerName(signatories.find((s) => s.id === "sig-abogado")?.role) || "—";

  const lines: string[] = [
    "# Informe de auditoría técnico-jurídica",
    "## Evidencia para el principio de responsabilidad demostrada (Decreto 1074 de 2015, arts. 2.2.2.25.6.1 y 2.2.2.25.6.2)",
    "",
    cert ? cert.id : "BORRADOR",
    `${client.name} · NIT ${client.nit}`,
    cert
      ? `Informe expedido el ${formatDate(cert.issuedAt, { time: true })}`
      : `Generado el ${formatDate(new Date().toISOString(), { time: true })} (borrador, aún no expedido)`,
    "",
    "## 0. Objeto y límites",
    "Este informe cubre el código y la configuración de la versión identificada por el SHA-256 de la sección 2, " +
      "tal como fue cargada para esta auditoría.",
    "No cubre las políticas internas de la empresa auditada, la capacitación de su personal, sus contratos con " +
      "encargados, sus procesos de atención a consultas y reclamos de los titulares, ni ningún tratamiento de datos " +
      "que no se refleje en el código analizado; esos elementos requieren verificación documental aparte.",
    "Sí incluye, como anexos derivados del mismo código, los documentos jurídicos que VIGÍA generó como borrador y " +
      "el inventario de tratamientos que pudo derivar de él; ninguno de los dos reemplaza los procesos, contratos o " +
      "registros internos de la empresa auditada que no consten en el código.",
    `Método y límites. ${METODO_Y_LIMITES}`,
    `Quién responde por qué. ${QUIEN_RESPONDE}`,
    "Vigencia: válido para el código identificado por el SHA-256 indicado; cualquier despliegue posterior requiere " +
      "una nueva auditoría.",
    "",
    "## 1. Partes y alcance",
    `- Cliente: ${client.name} (NIT ${client.nit})`,
    `- Representante legal: ${client.legalRepresentative}`,
    `- Abogado revisor: ${lawyer}`,
    `- Autorización: ${
      clientAcceptance
        ? `aceptada por ${clientAcceptance.name} (C.C. ${clientAcceptance.idNumber}) el ${formatDate(clientAcceptance.at, { time: true })}`
        : authorizedAt
          ? `acuerdo registrado por el abogado el ${formatDate(authorizedAt, { time: true })}`
          : "Pendiente"
    }`,
    `- Cláusulas aceptadas: ${clauses.filter((c) => c.accepted).length} de ${clauses.length}`,
    "",
    "## 2. Versión auditada",
    `- Archivo: ${source.fileName}`,
    `- Contenido: ${source.fileCount} archivos de código · ${Math.max(1, Math.round(source.bytes / 1024))} KB`,
    `- Cargado: ${formatDate(source.uploadedAt, { time: true })}`,
    `- SHA-256: ${source.sha256}`,
  ];

  if (run.retestSource) {
    lines.push(
      `- Versión corregida: ${run.retestSource.fileName} · ${run.retestSource.fileCount} archivos · ${formatDate(run.retestSource.uploadedAt, { time: true })}`,
      `- SHA-256 corregido: ${run.retestSource.sha256}`,
    );
  }

  lines.push(
    "",
    "## 3. Resultado",
    `- Puntuación inicial: ${initial.score}`,
    `- Puntuación actual: ${score.score}`,
    `- Hallazgos: ${run.findings.length} (${score.critical} críticos, ${score.warning} advertencias, ${score.informative} informativos abiertos)`,
    `- Retesteados y firmados: ${score.resolved}`,
    "",
    "## 4. Hallazgos",
  );

  if (run.findings.length === 0) lines.push("No se encontraron hallazgos en el código cargado.");
  for (const f of sortFindings(run.findings)) {
    lines.push(
      `${f.code} · ${SEVERITY_LABEL[f.severity]} · ${f.title}`,
      `Normas: ${getRules(f.ruleIds).map((r) => r.label).join(" · ") || "sin normas asociadas"}`,
      `Análisis jurídico: ${f.legalAnalysis}`,
      `Evidencia: ${f.evidence.locations.join(", ") || "sin ubicación registrada"}`,
      `Estado: ${STATUS_LABEL[f.remediation.status]}` +
        (f.remediation.signedBy ? ` · Firmado por ${f.remediation.signedBy}` : "") +
        (f.remediation.signatureNote ? ` · Salvedad: ${f.remediation.signatureNote}` : ""),
      "",
    );
  }

  lines.push("## 5. Proveedores de inteligencia artificial");
  if (run.config.providers.length === 0) {
    lines.push("No se detectaron proveedores de inteligencia artificial de terceros en el código analizado.");
  } else {
    for (const p of run.config.providers) {
      lines.push(
        `- ${p.vendor}${p.model ? ` · ${p.model}` : ""} — ${p.surface} — país: ${p.country ?? "no aplica"} — ` +
          `¿país adecuado SIC?: ${p.adequateCountry === true ? "sí" : p.adequateCountry === false ? "no" : "por determinar"} — ` +
          `rol: ${p.role ?? "por determinar"}`,
      );
    }
  }

  const documentos = run.findings.filter((f) => f.remediation.patch.kind === "documento");
  lines.push("", "## 6. Documentos jurídicos generados");
  if (documentos.length === 0) {
    lines.push("Esta auditoría no generó documentos jurídicos prellenados.");
  } else {
    for (const f of documentos) {
      lines.push(`- ${f.code} · ${f.title} · ${f.remediation.patch.target} · ${STATUS_LABEL[f.remediation.status]}`);
    }
  }

  if (run.inventory && run.inventory.length > 0) {
    lines.push("", "## 7. Inventario de tratamientos");
    for (const row of run.inventory) {
      lines.push(
        `- ${row.category} · fuente: ${row.source} · finalidad: ${row.purpose} · destinatarios: ${row.recipients} · ` +
          `transferencia internacional: ${row.international} · conservación: ${row.retention}` +
          (row.sensitive ? " · dato sensible" : ""),
      );
    }
  }

  lines.push("", "## 8. Verificación");
  if (cert) {
    lines.push(`- Hash del informe: ${cert.hash}`, `- Informe anterior: ${cert.previousHash}`);
    lines.push(
      cert.timestamp
        ? `- Sello de tiempo: ${cert.timestamp.tsa}, ${formatDate(cert.timestamp.at, { time: true })} (RFC 3161)`
        : "- Sello de tiempo: sin sello, la autoridad de sellado no respondió",
    );
  } else {
    lines.push("Informe aún no expedido: sin hash ni sello de tiempo.");
  }

  lines.push(
    "",
    "Este informe documenta medidas de seguridad para acreditar el principio de responsabilidad demostrada " +
      "(Decreto 1074 de 2015, art. 2.2.2.25.6.1, que compila el art. 26 del Decreto 1377 de 2013). No es un " +
      "certificado de conformidad acreditado ante el ONAC.",
    PIE_RESPONSABILIDAD,
  );

  return lines;
}

/** GET /api/v1/runs/:runId/informe — informe de auditoría en Word. */
export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;
  const run = await ownedRun(runId);
  if (!run) return fail("Auditoría no encontrada", 404);

  // Buffer implementa BodyInit en tiempo de ejecución; el aserto evita el desajuste de
  // tipos entre los genéricos de @types/node y los de lib.dom para ArrayBufferLike.
  return new Response(docxFromLines(informeLines(run)) as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="vigia-informe-${runId}.docx"`,
    },
  });
}
