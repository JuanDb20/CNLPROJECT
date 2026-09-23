import { Fragment, type ReactNode } from "react";

import { buildCalendar } from "@/domain/calendario";
import { CHECK_CODES } from "@/domain/checks";
import { getFramework, getRules } from "@/domain/compliance";
import { formatDate, lawyerName } from "@/domain/format";
import { providerSummary } from "@/domain/proveedores";
import { SEVERITY_LABEL, isResolved, riskCell, scoreRun, sortFindings } from "@/domain/scoring";
import type { AuditRun, Finding, RemediationStatus } from "@/domain/types";

/* Informe de auditoría como documento: fondo blanco y tinta negra en pantalla y
   en papel, para imprimirlo o guardarlo en PDF desde el navegador. Lo comparten
   la vista del abogado y el portal del cliente. Los estilos de impresión viven
   en src/app/informe/print.css, que importan ambas pantallas. */

export const INFORME_TITULO = "Informe de auditoría técnico-jurídica";
const INFORME_SUBTITULO =
  "Evidencia para el principio de responsabilidad demostrada (Decreto 1074 de 2015, arts. 2.2.2.25.6.1 y 2.2.2.25.6.2)";

const STATUS: Record<RemediationStatus, string> = {
  propuesta: "Abierto: parche propuesto",
  "pr-abierto": "Abierto: parche generado",
  retesteado: "Parche retesteado, pendiente de firma",
  firmado: "Corregido y firmado",
};

/** Naturaleza de los datos (art. 2.2.2.25.6.1 num. 2), inferida de los hallazgos. */
const DATA_CATEGORIES: Record<string, string> = {
  "VGI-042": "datos biométricos",
  "VGI-081": "datos biométricos",
  "VGI-023": "historial crediticio (Ley 1266 de 2008)",
  "VGI-011": "datos personales almacenados en base de datos",
  "VGI-085": "datos de niños, niñas y adolescentes",
};

/** Categorías de datos que los hallazgos de esta auditoría permiten afirmar. */
export function dataCategories(findings: Finding[]): string[] {
  const found = findings.map((f) => DATA_CATEGORIES[f.code]).filter((c): c is string => Boolean(c));
  return [...new Set(found)];
}

/* Códigos que el catálogo evalúa hoy: sin la prueba, no se puede afirmar
   "Consta" sobre la política correspondiente. */
const EVALUADOS = new Set(CHECK_CODES);

const POLITICAS: Array<{ label: string; codes: string[] }> = [
  { label: "Política de tratamiento vigente y fechada", codes: ["VGI-077"] },
  { label: "Canal de derechos del titular (consultas y reclamos)", codes: ["VGI-076", "VGI-082"] },
  { label: "Registro y trazabilidad de acceso a datos personales", codes: ["VGI-084"] },
];

const LIKELIHOOD_LABEL = ["Baja", "Media", "Alta"];
const IMPACT_LABEL = ["Bajo", "Medio", "Alto"];

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
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr] sm:gap-y-1.5 print:grid-cols-[10rem_1fr] print:gap-y-1.5">
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-neutral-500 max-sm:text-[11px] max-sm:uppercase max-sm:tracking-wide">{label}</dt>
          <dd className="min-w-0 break-words max-sm:-mt-2">{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

export function Informe({ run, embedded = false }: { run: AuditRun; embedded?: boolean }) {
  const { client, source, clauses, signatories, clientAcceptance, authorizedAt } = run.scope;
  const cert = run.certificate;
  const score = scoreRun(run);
  const initial = scoreRun({
    ...run,
    findings: run.findings.map((f) => ({ ...f, remediation: { ...f.remediation, status: "propuesta" as const } })),
  });

  /* El rol del firmante trae "(T.P. 123456)" dentro del nombre; se muestra si consta. */
  const lawyerRole = signatories.find((s) => s.id === "sig-abogado")?.role;
  const lawyer = lawyerName(lawyerRole) || "—";
  const tp = lawyerRole?.match(/T\.P\. [^)]+/)?.[0];
  const lawyerLine = tp && !lawyer.includes(tp) ? `${lawyer} (${tp})` : lawyer;

  const open = run.findings.filter((f) => !isResolved(f));
  const categories = dataCategories(run.findings);
  const providers = run.config.providers;
  /* Documentos jurídicos que VIGÍA generó como borrador: el parche no es un diff. */
  const documentFindings = sortFindings(run.findings.filter((f) => f.remediation.patch.kind === "documento"));
  /* Las obligaciones con fecha viven dentro del informe, no en un archivo aparte
     que el abogado tendría que importar a su calendario para enterarse. */
  const obligaciones = buildCalendar(run).events;
  const inventory = run.inventory ?? [];

  /* Un solo h1 por página: en el portal del cliente el informe va embebido. */
  const Titulo = embedded ? "h2" : "h1";

  const cell = (likelihood: number, impact: number) =>
    open.filter((f) => {
      const [l, i] = riskCell(f);
      return l === likelihood && i === impact;
    }).length;

  const policyState = (codes: string[]) => {
    if (run.findings.some((f) => codes.includes(f.code))) return "No consta";
    return codes.some((c) => EVALUADOS.has(c)) ? "Consta" : "No verificado";
  };

  return (
    <article className="mx-auto max-w-[820px] bg-white px-6 py-10 text-neutral-900 shadow-sm sm:px-12 print:max-w-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-neutral-900 pb-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">VIGÍA · Equipo rojo legal y técnico</p>
          <Titulo className="mt-1 text-[22px] font-bold leading-tight">{INFORME_TITULO}</Titulo>
          <p className="mt-1 text-[11.5px] leading-snug text-neutral-600">{INFORME_SUBTITULO}</p>
          <p className="mt-1.5 text-[13px] text-neutral-600">{client.name} · NIT {client.nit}</p>
        </div>
        <div className="text-right text-[11.5px] text-neutral-600">
          <p className="font-mono font-semibold text-neutral-900">{cert ? cert.id : "BORRADOR"}</p>
          <p>{cert ? `Informe expedido el ${formatDate(cert.issuedAt, { time: true })}` : "Aún no expedido por el abogado"}</p>
        </div>
      </header>

      <Section title="0. Objeto y límites">
        <p>
          Este informe cubre el código y la configuración de la versión identificada por el SHA-256 de la sección 2, tal
          como fue cargada para esta auditoría.
        </p>
        <p className="mt-2">
          <span className="font-semibold">No cubre</span> las políticas internas de la empresa auditada, la capacitación
          de su personal, sus contratos con encargados, sus procesos de atención a consultas y reclamos de los titulares,
          ni ningún tratamiento de datos que no se refleje en el código analizado. Las afirmaciones sobre esos elementos
          se marcan como «no verificado» y requieren verificación documental aparte.
        </p>
        <p className="mt-2">
          Sí incluye, como anexos derivados del mismo código, los documentos jurídicos que VIGÍA generó como borrador
          (sección 10) y el inventario de tratamientos que pudo derivar de él (sección 11); ninguno de los dos
          reemplaza los procesos, contratos o registros internos de la empresa auditada que no consten en el código.
        </p>
      </Section>

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
            ["Abogado revisor", lawyerLine],
            [
              "Autorización",
              clientAcceptance
                ? `Aceptada por ${clientAcceptance.name} (C.C. ${clientAcceptance.idNumber}) desde el portal del cliente, el ${formatDate(clientAcceptance.at, { time: true })}`
                : authorizedAt
                  ? `Acuerdo registrado por el abogado el ${formatDate(authorizedAt, { time: true })}`
                  : "Pendiente",
            ],
            ["Cláusulas aceptadas", `${clauses.filter((c) => c.accepted).length} de ${clauses.length}`],
            ...(clientAcceptance?.clausesSha256
              ? [["Texto aceptado", <span key="cl" className="font-mono text-[11px]">SHA-256 {clientAcceptance.clausesSha256}</span>] as [string, ReactNode]]
              : []),
          ]}
        />
        <p className="mt-2 text-[11.5px] text-neutral-500">
          La autorización se recogió mediante enlace de un solo uso enviado al representante legal, con registro de
          nombre, documento, fecha y hash SHA-256 del texto aceptado. VIGÍA no verifica la identidad del firmante contra
          ninguna fuente externa.
        </p>
      </Section>

      <Section title="2. Código auditado">
        <Rows
          rows={[
            ["Archivo", source.fileName],
            ["Contenido", `${source.fileCount} archivos de código · ${Math.max(1, Math.round(source.bytes / 1024))} KB`],
            ["Cargado", formatDate(source.uploadedAt, { time: true })],
            ["SHA-256", <span key="sha" className="font-mono text-[11px]">{source.sha256}</span>],
            ...(run.retestSource
              ? ([
                  ["Versión corregida", `${run.retestSource.fileName} · ${run.retestSource.fileCount} archivos · ${formatDate(run.retestSource.uploadedAt, { time: true })}`],
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

      <Section title="3. Factores de proporcionalidad">
        <p className="mb-3 text-[11.5px] text-neutral-500">
          Factores del art. 2.2.2.25.6.1 del Decreto 1074 de 2015, que miden qué tan exigentes deben ser las medidas del
          responsable.
        </p>
        <Rows
          rows={[
            [
              "Tamaño empresarial",
              client.rues
                ? `${client.rues.name} · matrícula ${client.rues.status.toLowerCase()}, renovada en ${client.rues.renewed} (RUES)`
                : "No verificado: el NIT no se pudo contrastar con el RUES",
            ],
            [
              "Naturaleza de los datos",
              categories.length > 0
                ? `Según los hallazgos: ${categories.join("; ")}.`
                : "No se identificaron categorías especiales de datos en el código analizado.",
            ],
            [
              "Tipo de tratamiento",
              `Asistente conversacional con inteligencia artificial${client.system ? `: ${client.system}` : ""}. ${
                providers.length > 0
                  ? `Proveedores detectados: ${providers.map((p) => `${p.vendor} (${p.country ?? "país no declarado"})`).join("; ")}.`
                  : "No se detectaron proveedores de IA de terceros en el código."
              }`,
            ],
            [
              "Riesgo potencial",
              `${score.critical} hallazgos críticos y ${score.warning} advertencias abiertos, sobre ${run.findings.length} hallazgos de la auditoría.`,
            ],
          ]}
        />
      </Section>

      <Section title="4. Puntos de recolección y proveedores">
        {providers.length === 0 ? (
          <p>No se detectaron proveedores de inteligencia artificial de terceros en el código analizado.</p>
        ) : (
          <div className="overflow-x-auto print:overflow-x-visible">
          <table className="w-full min-w-[34rem] border-collapse text-[11.5px] print:min-w-0">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-neutral-500">
                <th className="py-1.5 pr-3 font-medium">Proveedor</th>
                <th className="py-1.5 pr-3 font-medium">Punto de recolección</th>
                <th className="py-1.5 pr-3 font-medium">País</th>
                <th className="py-1.5 pr-3 font-medium">¿País adecuado SIC?</th>
                <th className="py-1.5 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="break-inside-avoid border-b border-neutral-200 align-top">
                  <td className="py-1.5 pr-3">{p.vendor}{p.model ? ` · ${p.model}` : ""}</td>
                  <td className="py-1.5 pr-3">{p.surface}</td>
                  <td className="py-1.5 pr-3">{p.country ?? "No aplica"}</td>
                  <td className="py-1.5 pr-3">
                    {p.adequateCountry === true ? "Sí" : p.adequateCountry === false ? "No" : "Por determinar"}
                  </td>
                  <td className="py-1.5">{p.role ?? "Por determinar (verificar términos del proveedor)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <p className="mt-2 text-[11.5px] text-neutral-500">
          Los puntos de recolección son los que aparecen en el código. Los formularios, canales y finalidades que no se
          reflejen en él quedan fuera del alcance (sección 0). La lista de países con nivel adecuado es la de la Circular
          Única de la SIC (Circular Externa 005 de 2017, adicionada por la 008 de 2017).
        </p>
        {providers.length > 0 && (
          <div className="mt-3">
            <p className="text-[11.5px] font-semibold text-neutral-700">Términos de tratamiento verificados</p>
            <ul className="mt-1.5 space-y-1">
              {providers.map((p) => (
                <li key={p.id} className="break-inside-avoid text-[11.5px] text-neutral-700">
                  {providerSummary(p)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11.5px] text-neutral-500">
              Términos públicos verificados en la fecha indicada para cada proveedor; el rol (encargado o
              responsable) lo califica el abogado a partir de esos términos, no este informe.
            </p>
          </div>
        )}
      </Section>

      <Section title="5. Estado de las políticas internas">
        <Rows
          rows={POLITICAS.map(({ label, codes }) => [label, policyState(codes)] as [string, ReactNode])}
        />
        <p className="mt-2 text-[11.5px] text-neutral-500">
          Numerales 1 a 3 del art. 2.2.2.25.6.2 del Decreto 1074 de 2015. «Consta» y «no consta» se refieren únicamente a
          lo que se puede comprobar en el código; «no verificado» significa que esta auditoría no tiene prueba al
          respecto, no que el elemento falte.
        </p>
      </Section>

      <Section title="6. Resultado">
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
        <p className="mt-2 text-[11.5px] text-neutral-500">
          La puntuación es un índice de priorización sobre los hallazgos de esta auditoría. No mide cumplimiento: el
          alcance no cubre políticas internas, contratos ni procesos de atención a titulares.
        </p>
      </Section>

      <Section title="7. Gestión de riesgos">
        <div className="overflow-x-auto print:overflow-x-visible">
        <table className="w-full min-w-[22rem] border-collapse text-center text-[11.5px] print:min-w-0">
          <caption className="mb-2 text-left text-[11.5px] text-neutral-500">
            Hallazgos abiertos por probabilidad de explotación e impacto.
          </caption>
          <thead>
            <tr className="text-neutral-500">
              <th className="w-28 border border-neutral-300 p-1.5 text-left font-medium">Probabilidad \ Impacto</th>
              {IMPACT_LABEL.map((label) => (
                <th key={label} className="border border-neutral-300 p-1.5 font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[3, 2, 1].map((likelihood) => (
              <tr key={likelihood}>
                <th className="border border-neutral-300 p-1.5 text-left font-medium text-neutral-500">
                  {LIKELIHOOD_LABEL[likelihood - 1]}
                </th>
                {[1, 2, 3].map((impact) => {
                  const n = cell(likelihood, impact);
                  return (
                    <td
                      key={impact}
                      className={`border border-neutral-300 p-1.5 ${n > 0 ? "font-semibold" : "text-neutral-400"}`}
                    >
                      {n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="mt-2 text-[11.5px] text-neutral-500">
          Identificación y clasificación de riesgos conforme al num. III de la Circular Externa 002 de 2024 de la SIC.
        </p>
        <p className="mt-2">
          La puntuación es un índice de priorización interno. Las sanciones de la Ley 1581 las gradúa la SIC con los
          criterios del art. 24, entre ellos la dimensión del daño o peligro, la reincidencia y el reconocimiento expreso
          de la infracción antes de la sanción; la remediación documentada en este informe es relevante frente al último
          y frente al art. 2.2.2.25.6.2, según el cual la verificación de medidas y políticas específicas «será tenida en
          cuenta al momento de evaluar la imposición de sanciones».
        </p>
        {!embedded && (
          <p className="mt-2 text-[11.5px] print:hidden">
            <a href="/auditoria/evaluacion-impacto" className="underline">
              Ver el borrador de evaluación de impacto de privacidad
            </a>{" "}
            (num. IV de la misma circular), para revisión del abogado.
          </p>
        )}
      </Section>

      <Section title="8. Hallazgos">
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

      <Section title="9. Capacitación y vigencia">
        <Rows
          rows={[
            [
              "Capacitación",
              "Fuera del alcance de esta auditoría: los programas de entrenamiento y educación del num. 2 del art. 2.2.2.25.6.2 no son verificables desde el código. Se recomienda documentarlos aparte.",
            ],
            [
              "Vigencia",
              "Válido para el código identificado por el SHA-256 indicado en la sección 2; cualquier despliegue posterior requiere una nueva auditoría.",
            ],
            ...(source.deletedAt
              ? [[
                  "Código fuente",
                  `Borrado del almacén de VIGÍA el ${formatDate(source.deletedAt)}; se conserva su SHA-256.`,
                ]] as Array<[string, ReactNode]>
              : []),
          ]}
        />
      </Section>

      <Section title="10. Calendario de obligaciones">
        <div className="overflow-x-auto print:overflow-x-visible">
          <table className="w-full min-w-[30rem] border-collapse text-[11.5px] print:min-w-0">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-neutral-500">
                <th className="py-1.5 pr-3 font-medium">Fecha</th>
                <th className="py-1.5 font-medium">Obligación o gestión</th>
              </tr>
            </thead>
            <tbody>
              {obligaciones.map((e) => (
                <tr key={e.uid} className="border-b border-neutral-200 align-top">
                  <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-[11px]">{e.date}</td>
                  <td className="py-1.5">
                    <span className="font-medium">{e.summary}</span>
                    <span className="block text-neutral-600">{e.description}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] text-neutral-500">
          Los plazos de remediación son una prioridad de gestión recomendada por VIGÍA, no términos
          legales. Los plazos de ley y los de la Circular Única de la SIC se citan en la obligación
          correspondiente.
        </p>
      </Section>

      <Section title="11. Documentos jurídicos generados">
        {documentFindings.length === 0 ? (
          <p>No se generaron documentos.</p>
        ) : (
          <div className="overflow-x-auto print:overflow-x-visible">
            <table className="w-full min-w-[30rem] border-collapse text-[11.5px] print:min-w-0">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="py-1.5 pr-3 font-medium">Código</th>
                  <th className="py-1.5 pr-3 font-medium">Documento</th>
                  <th className="py-1.5 pr-3 font-medium">Ruta</th>
                  <th className="py-1.5 pr-3 font-medium">Estado</th>
                  <th className="py-1.5 font-medium">Firmante</th>
                </tr>
              </thead>
              <tbody>
                {documentFindings.map((f) => (
                  <tr key={f.id} className="break-inside-avoid border-b border-neutral-200 align-top">
                    <td className="py-1.5 pr-3 font-mono">{f.code}</td>
                    <td className="py-1.5 pr-3">{f.title}</td>
                    <td className="py-1.5 pr-3 font-mono text-[10.5px]">{f.remediation.patch.target}</td>
                    <td className="py-1.5 pr-3">{STATUS[f.remediation.status]}</td>
                    <td className="py-1.5">{f.remediation.signedBy ?? "Sin firmar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11.5px] text-neutral-500">
          Son borradores que VIGÍA generó a partir de lo detectado en el código, no documentos vigentes: solo tienen
          valor si el abogado los revisó y los firmó, lo que consta en la columna «Firmante» y en el estado.
        </p>
      </Section>

      <Section title="12. Inventario de tratamientos">
        {inventory.length === 0 ? (
          <p>No se derivó un inventario de tratamientos del código analizado.</p>
        ) : (
          <div className="overflow-x-auto print:overflow-x-visible">
            <table className="w-full min-w-[36rem] border-collapse text-[11.5px] print:min-w-0">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="py-1.5 pr-3 font-medium">Categoría</th>
                  <th className="py-1.5 pr-3 font-medium">Origen</th>
                  <th className="py-1.5 pr-3 font-medium">Destinatarios</th>
                  <th className="py-1.5 pr-3 font-medium">Transferencia internacional</th>
                  <th className="py-1.5 pr-3 font-medium">Plazo</th>
                  <th className="py-1.5 font-medium">Sensible</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row, i) => (
                  <tr key={i} className="break-inside-avoid border-b border-neutral-200 align-top">
                    <td className="py-1.5 pr-3">{row.category ?? "No especificado"}</td>
                    <td className="py-1.5 pr-3">{row.source ?? "No especificado"}</td>
                    <td className="py-1.5 pr-3">{row.recipients ?? "No especificado"}</td>
                    <td className="py-1.5 pr-3">{row.international ?? "No"}</td>
                    <td className="py-1.5 pr-3">{row.retention ?? "No definido"}</td>
                    <td className="py-1.5">{row.sensitive ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11.5px] text-neutral-500">
          Se deriva del código analizado, no de un levantamiento documental: el abogado debe completar la finalidad y
          la base de legitimación de cada tratamiento antes de usarlo como registro de actividades.
        </p>
      </Section>

      {cert && (
        <Section title="13. Integridad">
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
                    {`${cert.timestamp.tsa}, ${formatDate(cert.timestamp.at, { time: true })} (RFC 3161)`}{" "}
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
            El hash cubre el código auditado, la evidencia y el análisis de cada hallazgo, los firmantes y la puntuación,
            y se encadena con el informe anterior expedido por el mismo abogado: alterar cualquiera de ellos rompe la
            cadena. El sello de tiempo lo emite un tercero sobre el hash del informe y se verifica con{" "}
            <span className="font-mono">openssl ts -verify -data hash.txt -in sello.tsr -CAfile cacert.pem -untrusted tsa.crt</span>.
          </p>
          <p className="mt-2 text-[11.5px] text-neutral-600">
            Verifique este informe en <span className="font-mono">/verificar?q={cert.id}</span> o con su hash completo{" "}
            <span className="break-all font-mono text-[11px]">{cert.hash}</span>.
          </p>
        </Section>
      )}

      <footer className="mt-10 border-t border-neutral-300 pt-3 text-[11px] leading-relaxed text-neutral-500">
        <p>
          Este informe documenta medidas de seguridad para acreditar el principio de responsabilidad demostrada (Decreto
          1074 de 2015, art. 2.2.2.25.6.1, que compila el art. 26 del Decreto 1377 de 2013). No es un certificado de
          conformidad acreditado ante el ONAC.
        </p>
        <p className="mt-2">
          VIGÍA propone el análisis jurídico a partir de patrones detectados en el código; la revisión, la calificación
          normativa y la responsabilidad profesional son del abogado que firma cada hallazgo con su tarjeta profesional,
          en los términos de los arts. 28 y 34 de la Ley 1123 de 2007. Este informe no es un certificado de conformidad
          ni una garantía de resultado ante ninguna autoridad.
        </p>
      </footer>

      <p className="informe-folio" aria-hidden>
        {cert ? cert.id : "BORRADOR"} · {INFORME_TITULO} · {client.name}
      </p>
    </article>
  );
}
