import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { aceptarAlcanceCliente } from "@/app/actions";
import { Informe } from "@/components/informe";
import { PrintButton } from "@/components/print-button";
import { Logo } from "@/components/shell";
import { Card, CardHeader, Label, Panel, Tag, buttonClass, fieldClass } from "@/components/ui";
import type { RunStatus } from "@/domain/types";
import { clientRun } from "@/server/http";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_TEXT: Record<RunStatus, string> = {
  borrador: "Pendiente de tu autorización.",
  configurado: "Autorizada. El abogado está preparando el análisis.",
  ejecutando: "Análisis en curso.",
  analizado: "El abogado está revisando los hallazgos.",
  remediando: "El abogado está revisando las correcciones.",
  certificado: "Informe expedido.",
};

const date = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short", timeZone: "America/Bogota" });

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
  const lawyer = signatories.find((s) => s.id === "sig-abogado")?.role.replace(/^Abogado revisor: |\. Firma cada hallazgo$/g, "");
  const canAccept = !clientAcceptance && run.status === "borrador";

  return (
    <div className="min-h-screen print:bg-white">
      <header className="border-b border-line print:hidden">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-3 px-5 py-4">
          <Logo />
          <Tag tone="brand">Portal del cliente</Tag>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] space-y-5 px-5 py-8 print:max-w-none print:p-0">
        <div className="print:hidden">
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Auditoría de {client.name}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Aquí autorizas las pruebas y consultas el informe cuando el abogado lo expida.
            Estado: <span className="text-ink">{STATUS_TEXT[run.status]}</span>
          </p>
        </div>

        <Card className="print:hidden">
          <CardHeader
            title="Acuerdo de alcance"
            tag={canAccept ? "Requiere tu firma" : "Aceptado"}
            tagTone={canAccept ? "required" : "safe"}
            description={`Solicitado por ${lawyer ?? "el abogado revisor"}. Las pruebas corren en un entorno aislado sobre el código identificado abajo; nunca sobre producción ni sobre datos reales.`}
          />

          <Panel>
            <Label>Código que se auditará</Label>
            <p className="font-mono text-[12px] text-ink">{source.fileName}</p>
            <p className="mt-1 text-[11px] text-ink-muted">
              {source.fileCount} archivos · cargado el {date(source.uploadedAt)}
            </p>
            <p className="mt-1 break-all font-mono text-[10.5px] text-ink-faint">SHA-256 {source.sha256}</p>
          </Panel>

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
                  <input name="cedula" required inputMode="numeric" pattern="[0-9.\s]{5,15}" className={fieldClass} />
                </label>
              </div>
              <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-ink-soft">
                <input type="checkbox" name="acepto" required className="mt-0.5 accent-[var(--color-brand)]" />
                Soy representante legal de {client.name} (NIT {client.nit}) y, en su nombre, acepto
                estas cláusulas y autorizo las pruebas sobre el código identificado arriba. Mi nombre y
                cédula se usan solo para acreditar esta autorización (
                <a href="/privacidad" className="underline">política de tratamiento</a>).
              </label>
              <button type="submit" className={buttonClass("brand")}>
                Aceptar y autorizar
              </button>
            </form>
          ) : (
            <Panel tone="safe" className="mt-5">
              <p className="text-[12px] text-safe">
                {clientAcceptance
                  ? `Aceptado por ${clientAcceptance.name} (C.C. ${clientAcceptance.idNumber}) el ${date(clientAcceptance.at)}`
                  : `El abogado registró el acuerdo firmado por fuera de VIGÍA${authorizedAt ? ` el ${date(authorizedAt)}` : ""}`}
              </p>
            </Panel>
          )}
        </Card>

        {run.certificate ? (
          <>
            <div className="flex justify-end print:hidden">
              <PrintButton />
            </div>
            <Informe run={run} />
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
