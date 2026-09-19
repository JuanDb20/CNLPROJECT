import type { ReactNode } from "react";

import { getFramework, getRules } from "@/domain/compliance";
import { SEVERITY_LABEL, scoreRun, sortFindings } from "@/domain/scoring";
import type { AuditRun, RemediationStatus } from "@/domain/types";

/* Informe de auditoría como documento: fondo blanco y tinta negra en pantalla y
   en papel, para imprimirlo o guardarlo en PDF desde el navegador. Lo comparten
   la vista del abogado y el portal del cliente. */

const STATUS: Record<RemediationStatus, string> = {
  propuesta: "Abierto: parche propuesto",
  "pr-abierto": "Abierto: parche generado",
  retesteado: "Parche retesteado, pendiente de firma",
  firmado: "Corregido y firmado",
};

const date = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short", timeZone: "America/Bogota" });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="break-after-avoid border-b border-neutral-300 pb-1.5 text-[13px] font-bold uppercase tracking-wider text-neutral-800">
        {title}
      </h2>
      <div className="mt-3 text-[12.5px] leading-relaxed text-neutral-800">{children}</div>
    </section>
  );
}

function Rows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-neutral-500">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Informe({ run }: { run: AuditRun }) {
  const { client, source, clauses, signatories, clientAcceptance, authorizedAt } = run.scope;
  const cert = run.certificate;
  const score = scoreRun(run);
  const initial = scoreRun({
    ...run,
    findings: run.findings.map((f) => ({ ...f, remediation: { ...f.remediation, status: "propuesta" as const } })),
  });
  const lawyer = signatories.find((s) => s.id === "sig-abogado")?.role.replace(/^Abogado revisor: |\. Firma cada hallazgo$/g, "");

  return (
    <article className="mx-auto max-w-[820px] bg-white px-6 py-10 text-neutral-900 shadow-sm sm:px-12 print:max-w-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-neutral-900 pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">VIGÍA · Equipo rojo legal y técnico</p>
          <h1 className="mt-1 text-[22px] font-bold leading-tight">Informe de auditoría técnico-legal</h1>
          <p className="mt-1 text-[13px] text-neutral-600">{client.name} · NIT {client.nit}</p>
        </div>
        <div className="text-right text-[11.5px] text-neutral-600">
          <p className="font-mono font-semibold text-neutral-900">{cert ? cert.id : "BORRADOR"}</p>
          <p>{cert ? `Expedido el ${date(cert.issuedAt)}` : "Aún no expedido por el abogado"}</p>
        </div>
      </header>

      <Section title="1. Partes y alcance">
        <Rows
          rows={[
            ["Cliente", `${client.name} (NIT ${client.nit})`],
            ...(client.rues
              ? [["Registro mercantil", `${client.rues.name}, matrícula ${client.rues.status.toLowerCase()}, renovada en ${client.rues.renewed} (RUES)`] as [string, string]]
              : []),
            ["Representante legal", client.legalRepresentative],
            ...(client.sector ? [["Sector", client.sector] as [string, string]] : []),
            ...(client.system ? [["Sistema auditado", client.system] as [string, string]] : []),
            ["Abogado revisor", lawyer ?? "—"],
            [
              "Autorización",
              clientAcceptance
                ? `Aceptada por ${clientAcceptance.name} (C.C. ${clientAcceptance.idNumber}) desde el portal del cliente, el ${date(clientAcceptance.at)}`
                : authorizedAt
                  ? `Acuerdo registrado por el abogado el ${date(authorizedAt)}`
                  : "Pendiente",
            ],
            ["Cláusulas aceptadas", `${clauses.filter((c) => c.accepted).length} de ${clauses.length}`],
            ...(clientAcceptance?.clausesSha256
              ? [["Texto aceptado", <span key="cl" className="font-mono text-[11px]">SHA-256 {clientAcceptance.clausesSha256}</span>] as [string, ReactNode]]
              : []),
          ]}
        />
      </Section>

      <Section title="2. Código auditado">
        <Rows
          rows={[
            ["Archivo", source.fileName],
            ["Contenido", `${source.fileCount} archivos de código · ${Math.max(1, Math.round(source.bytes / 1024))} KB`],
            ["Cargado", date(source.uploadedAt)],
            ["SHA-256", <span key="sha" className="font-mono text-[11px]">{source.sha256}</span>],
            ...(run.retestSource
              ? ([
                  ["Versión corregida", `${run.retestSource.fileName} · ${run.retestSource.fileCount} archivos · ${date(run.retestSource.uploadedAt)}`],
                  ["SHA-256 corregido", <span key="sha2" className="font-mono text-[11px]">{run.retestSource.sha256}</span>],
                ] as Array<[string, ReactNode]>)
              : []),
          ]}
        />
        <p className="mt-2 text-[11.5px] text-neutral-500">
          El hash identifica exactamente la versión analizada: cualquier cambio en el código produce otro. Los hallazgos
          corregidos se retestearon con las mismas pruebas sobre la versión corregida.
        </p>
      </Section>

      <Section title="3. Resultado">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Puntuación inicial", initial.score],
            ["Puntuación actual", score.score],
            ["Hallazgos", run.findings.length],
            ["Corregidos y firmados", score.resolved],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-neutral-300 p-3">
              <p className="text-[11px] text-neutral-500">{label}</p>
              <p className="text-[20px] font-bold">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3">
          Abiertos: {score.critical} críticos, {score.warning} advertencias y {score.informative} informativos.
          Marcos evaluados: {run.config.frameworks.map((id) => getFramework(id).shortName).join(", ")}.
        </p>
        {run.config.providers.length > 0 && (
          <p className="mt-2">
            Proveedores de IA detectados en el código:{" "}
            {run.config.providers
              .map((p) => `${p.vendor}${p.country ? ` (${p.country}${p.adequateCountry === false ? ", país sin nivel adecuado SIC" : ""})` : ""}`)
              .join("; ")}
            .
          </p>
        )}
      </Section>

      <Section title="4. Hallazgos">
        {run.findings.length === 0 && <p>No se encontraron hallazgos en el código cargado.</p>}
        <ol className="space-y-5">
          {sortFindings(run.findings).map((f) => (
            <li key={f.id} className="break-inside-avoid border-l-4 border-neutral-300 pl-4">
              <p className="font-semibold">
                <span className="font-mono">{f.code}</span> · {SEVERITY_LABEL[f.severity]} · {f.title}
              </p>
              <p className="mt-1">{f.summary}</p>
              <p className="mt-1.5 text-neutral-700">
                <span className="font-semibold">Análisis jurídico. </span>
                {f.legalAnalysis}
              </p>
              <p className="mt-1.5 text-[11.5px] text-neutral-600">
                Normas: {getRules(f.ruleIds).map((r) => r.label).join(" · ")}
              </p>
              <pre className="mt-1.5 whitespace-pre-wrap break-words rounded bg-neutral-100 p-2 font-mono text-[10.5px] leading-snug text-neutral-800 print:bg-transparent print:p-0">
                {f.evidence.response}
              </pre>
              <p className="mt-1.5 text-[11.5px]">
                <span className="font-semibold">Estado: </span>
                {STATUS[f.remediation.status]}
                {f.remediation.signedBy && ` · Firmado por ${f.remediation.signedBy}`}
                {f.remediation.signatureNote && ` · Salvedad: ${f.remediation.signatureNote}`}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {cert && (
        <Section title="5. Integridad">
          <Rows
            rows={[
              ["Hash del informe", <span key="h" className="font-mono text-[11px]">{cert.hash}</span>],
              ["Código auditado", <span key="s" className="font-mono text-[11px]">{cert.sourceSha256}</span>],
              ["Hallazgos", <span key="d" className="font-mono text-[11px]">{cert.findingsDigest}</span>],
              ["Informe anterior", <span key="p" className="font-mono text-[11px]">{cert.previousHash}</span>],
              [
                "Sello de tiempo",
                cert.timestamp ? (
                  <span key="t">
                    {`${cert.timestamp.tsa}, ${date(cert.timestamp.at)} (RFC 3161)`}{" "}
                    <a
                      download={`${cert.id}.tsr`}
                      href={`data:application/timestamp-reply;base64,${cert.timestamp.token}`}
                      className="underline print:hidden"
                    >
                      descargar sello
                    </a>
                  </span>
                ) : (
                  "Sin sello: la autoridad de sellado no respondió"
                ),
              ],
            ]}
          />
          <p className="mt-2 text-[11.5px] text-neutral-500">
            El hash cubre el código auditado, la evidencia y el análisis de cada hallazgo, los firmantes y la puntuación, y se
            encadena con el informe anterior: alterar cualquiera de ellos rompe la cadena. El sello de tiempo lo emite un
            tercero sobre el hash del informe y se verifica con{" "}
            <span className="font-mono">openssl ts -verify -data hash.txt -in sello.tsr -CAfile cacert.pem -untrusted tsa.crt</span>.
          </p>
        </Section>
      )}

      <footer className="mt-10 border-t border-neutral-300 pt-3 text-[11px] leading-relaxed text-neutral-500">
        Este informe documenta medidas de seguridad para demostrar responsabilidad (art. 26 del Decreto 1377 de 2013).
        No es un certificado de conformidad acreditado ante el ONAC. VIGÍA propone el análisis; cada hallazgo corregido lo
        asume el abogado que lo firma.
      </footer>
    </article>
  );
}
