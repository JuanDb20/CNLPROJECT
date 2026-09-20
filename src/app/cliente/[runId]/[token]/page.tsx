import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { aceptarAlcanceCliente } from "@/app/actions";
import { CONTACTO } from "@/app/privacidad/datos";
import { Informe } from "@/components/informe";
import { PrintButton } from "@/components/print-button";
import { Logo } from "@/components/shell";
import { Card, CardHeader, Label, Panel, Tag, buttonClass, fieldClass } from "@/components/ui";
import { formatDate, lawyerName } from "@/domain/format";
import type { RunStatus } from "@/domain/types";
import { clientRun } from "@/server/http";

import "../../../informe/print.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Portal del cliente",
  robots: { index: false, follow: false },
};

const STATUS_TEXT: Record<RunStatus, string> = {
  borrador: "Pendiente de tu autorización.",
  configurado: "Autorizada. El abogado está preparando el análisis.",
  ejecutando: "Análisis en curso.",
  analizado: "El abogado está revisando los hallazgos.",
  remediando: "El abogado está revisando las correcciones.",
  certificado: "Informe expedido.",
};

/** Qué autoriza la representante legal, en una frase por punto (antes de las cláusulas). */
const RESUMEN = [
  "Autorizas el análisis de la copia del código que el abogado entregó: las pruebas corren sobre esa copia en un entorno aislado, nunca sobre tu aplicación en producción ni sobre datos reales.",
  "VIGÍA guarda el código 90 días y enmascara las llaves y los documentos que aparezcan en él antes de mostrarlos.",
  "Todo queda registrado con sello de tiempo: qué texto aceptaste, cuándo y con qué huella SHA-256.",
  "Puedes revocar esta autorización en cualquier momento escribiéndole al abogado que te envió el enlace.",
];

/**
 * Portal del representante legal. No tiene cuenta: entra con el enlace secreto
 * que le envía el abogado, acepta el acuerdo con nombre y cédula, y consulta el
 * informe cuando se expide.
 */
export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string; token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { runId, token } = await params;
  const { error } = await searchParams;
  const run = await clientRun(runId, token);
  if (!run) notFound();

  const { client, source, clauses, signatories, clientAcceptance, authorizedAt } = run.scope;
  const lawyer = lawyerName(signatories.find((s) => s.id === "sig-abogado")?.role);
  const canAccept = !clientAcceptance && run.status === "borrador";

  /* El estado que ve la clienta es el de SU autorización, no el del flujo del abogado. */
  const estado = clientAcceptance
    ? `Autorización registrada el ${formatDate(clientAcceptance.at, { time: true })}` +
      (run.certificate ? " Informe expedido." : "")
    : STATUS_TEXT[run.status];

  return (
    <div className="min-h-screen print:bg-white">
      <header className="border-b border-line print:hidden">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-3 px-5 py-4">
          <Logo />
          <Tag tone="brand">Portal del cliente</Tag>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-[860px] space-y-5 px-5 py-8 print:max-w-none print:p-0">
        <div className="print:hidden">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Auditoría de {client.name}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Aquí autorizas las pruebas y consultas el informe cuando el abogado lo expida.
            Estado: <span className="text-ink">{estado}</span>
          </p>
        </div>

        <Card className="print:hidden">
          <CardHeader
            title="Acuerdo de alcance"
            tag={canAccept ? "Requiere tu firma" : "Aceptado"}
            tagTone={canAccept ? "required" : "safe"}
            description={`Solicitado por ${lawyer || "el abogado revisor"}. Las pruebas corren en un entorno aislado sobre el código identificado abajo; nunca sobre producción ni sobre datos reales.`}
          />

          <Panel>
            <Label>Código que se auditará</Label>
            <p className="font-mono text-[12px] text-ink">{source.fileName}</p>
            <p className="mt-1 text-[11px] text-ink-muted">
              {source.fileCount} archivos · cargado el {formatDate(source.uploadedAt, { time: true })}
            </p>
            <p className="mt-1 break-all font-mono text-[10.5px] text-ink-faint">SHA-256 {source.sha256}</p>
          </Panel>

          <div className="mt-4">
            <Label>En pocas palabras</Label>
            <ul className="space-y-1.5">
              {RESUMEN.map((linea) => (
                <li key={linea} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft">
                  <span aria-hidden className="text-brand">·</span>
                  {linea}
                </li>
              ))}
            </ul>
          </div>

          <ol className="mt-4 space-y-3">
            {clauses.map((clause, i) => (
              <li key={clause.id} className="text-[12.5px] leading-snug">
                <p className="text-ink">
                  {i + 1}. {clause.label}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{clause.detail}</p>
              </li>
            ))}
          </ol>

          {canAccept ? (
            <form action={aceptarAlcanceCliente} className="mt-5 space-y-3 border-t border-line pt-5">
              <input type="hidden" name="runId" value={run.id} />
              <input type="hidden" name="token" value={run.scope.clientToken} />
              {error && (
                <Panel tone="critical">
                  <p className="text-[12px] text-critical">
                    Escribe tu nombre completo y tu cédula, y marca la casilla de aceptación.
                  </p>
                </Panel>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[12px] text-ink-muted">
                  Nombre completo
                  <input name="nombre" required minLength={3} defaultValue={client.legalRepresentative} className={fieldClass} />
                </label>
                <label className="text-[12px] text-ink-muted">
                  Cédula de ciudadanía
                  <input
                    name="cedula"
                    required
                    inputMode="numeric"
                    pattern="[0-9.\s]{5,15}"
                    placeholder="52.123.456"
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-ink-soft">
                <input type="checkbox" name="acepto" required className="mt-0.5 accent-[var(--color-brand)]" />
                <span>
                  Soy representante legal de {client.name} (NIT {client.nit}) y, en su nombre, acepto estas cláusulas y
                  autorizo las pruebas sobre el código identificado arriba. Mi nombre y mi cédula los trata VIGÍA como
                  responsable, con la finalidad única de acreditar esta autorización y con el período de conservación
                  indicado en su <a href="/privacidad" className="underline">política de tratamiento</a>. Como titular
                  puedo conocer, actualizar, rectificar y suprimir mis datos, revocar esta autorización y presentar
                  quejas ante la Superintendencia de Industria y Comercio, escribiendo a{" "}
                  <a href={`mailto:${CONTACTO}`} className="underline">{CONTACTO}</a> (art. 8 de la Ley 1581 de 2012).
                </span>
              </label>
              <button type="submit" className={buttonClass("brand")}>
                Aceptar y autorizar
              </button>
            </form>
          ) : (
            <>
              <Panel tone="safe" className="mt-5">
                <p className="text-[12px] text-safe">
                  {clientAcceptance
                    ? `Aceptado por ${clientAcceptance.name} (C.C. ${clientAcceptance.idNumber}) el ${formatDate(clientAcceptance.at, { time: true })}`
                    : `El abogado registró el acuerdo firmado por fuera de VIGÍA${authorizedAt ? ` el ${formatDate(authorizedAt, { time: true })}` : ""}`}
                </p>
              </Panel>
              {clientAcceptance && (
                <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
                  La aceptación se perfecciona como firma electrónica: el mecanismo de identificación —enlace de un solo
                  uso, nombre, número de documento y marca de tiempo— está pactado entre las partes en el encargo
                  profesional, por lo que se presume que satisface el requisito de firma (Decreto 2364 de 2012, arts. 3 y
                  7, que reglamentan el art. 7 de la Ley 527 de 1999). La integridad del texto aceptado se acredita con
                  su huella SHA-256 y el sello de tiempo de un tercero, de modo que cualquier alteración posterior es
                  detectable (Decreto 2364 de 2012, art. 4 num. 2). No se trata de una firma digital certificada en los
                  términos del art. 28 de la Ley 527 de 1999.
                </p>
              )}
            </>
          )}
        </Card>

        {run.certificate ? (
          <>
            <div className="flex justify-end print:hidden">
              <PrintButton />
            </div>
            <Informe run={run} embedded />
          </>
        ) : (
          <Card className="print:hidden">
            <CardHeader
              title="Informe"
              tag="Pendiente"
              description="El informe con los hallazgos, las correcciones y la firma del abogado aparecerá aquí cuando se expida. Podrás imprimirlo o guardarlo en PDF."
            />
          </Card>
        )}
      </main>
    </div>
  );
}
