import Link from "next/link";

import {
  expedirCertificado,
  firmarHallazgo,
  retestear,
} from "@/app/actions";
import {
  Card,
  CardHeader,
  Label,
  Mono,
  Panel,
  SeverityBadge,
  Tag,
  buttonClass,
  cx,
} from "@/components/ui";
import { scoreRun, sortFindings } from "@/domain/scoring";
import { requireAnalyzedRun } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function RemediacionPage({
  searchParams,
}: {
  searchParams: Promise<{ hallazgo?: string }>;
}) {
  const { hallazgo } = await searchParams;
  const run = await requireAnalyzedRun();
  const score = scoreRun(run);

  const withPr = sortFindings(run.findings).filter(
    (f) => f.remediation.prNumber !== null,
  );

  const selected =
    withPr.find((f) => f.id === hallazgo) ??
    withPr.find((f) => f.remediation.status !== "firmado") ??
    withPr[0];

  /* El retesteo es la condición que habilita la firma: si no está en verde, la
     acción disponible es ejecutarlo, no firmar. */
  const retestPassed =
    selected !== undefined &&
    selected.remediation.retests.length > 0 &&
    selected.remediation.retests.every((t) => t.passed);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Remediación y verificación final
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Trazabilidad y aprobación segura de cambios
        </p>
      </div>

      {withPr.length === 0 ? (
        <Card>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Todavía no hay pull requests abiertos. Abre el parche de un hallazgo desde su
            detalle para que VIGÍA lo envíe a una rama aislada.
          </p>
          <Link
            href="/auditoria/riesgos"
            className={cx(buttonClass("primary"), "mt-4")}
          >
            Ir al mapa de riesgos
          </Link>
        </Card>
      ) : (
        <>
          {/* Selector de hallazgos en remediación */}
          {withPr.length > 1 ? (
            <Card className="p-4">
              <Label>Hallazgos en remediación</Label>
              <div className="flex flex-wrap gap-1.5">
                {withPr.map((f) => (
                  <Link
                    key={f.id}
                    href={`/auditoria/remediacion?hallazgo=${f.id}`}
                    className={cx(
                      "rounded-[6px] border px-2.5 py-1.5 font-mono text-[10.5px] transition-colors",
                      f.id === selected?.id
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface text-ink-soft hover:bg-canvas",
                      f.remediation.status === "firmado" &&
                        f.id !== selected?.id &&
                        "text-safe",
                    )}
                  >
                    {f.code}
                    {f.remediation.status === "firmado" ? " ✓" : ""}
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          {selected ? (
            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
              {/* 1. Pull request */}
              <Card>
                <CardHeader
                  step="1."
                  title="Pull request y verificación de rama"
                  tag="Trazabilidad"
                  tagTone="brand"
                  description="VIGÍA ha enviado el parche propuesto a una rama aislada para evitar la sobrescritura directa en producción."
                />

                <div className="rounded-[8px] border border-line bg-surface-muted p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink">
                        Pull Request #{selected.remediation.prNumber} — GitHub
                      </p>
                      <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-muted">
                        {selected.remediation.branch} →{" "}
                        {run.scope.repository?.authorizedBranches[0]}
                      </p>
                    </div>
                    <Tag
                      tone={
                        selected.remediation.status === "firmado" ? "safe" : "required"
                      }
                    >
                      {selected.remediation.status === "firmado"
                        ? "Cerrado"
                        : "Abierta"}
                    </Tag>
                  </div>
                  <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-muted">
                    Cambio propuesto sobre{" "}
                    <span className="font-mono">
                      {selected.remediation.patch.target}
                    </span>
                    .
                  </p>
                </div>

                <div className="mt-4">
                  <Label>Verificación de cambios</Label>
                  <Panel tone="neutral">
                    <p className="text-[12px] leading-relaxed text-ink-soft">
                      {selected.remediation.changeNote}
                    </p>
                  </Panel>
                </div>

                <div className="mt-4 flex items-center gap-2.5">
                  <SeverityBadge severity={selected.severity} />
                  <Link
                    href={`/auditoria/hallazgos/${selected.id}`}
                    className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
                  >
                    Ver evidencia de {selected.code} →
                  </Link>
                </div>
              </Card>

              {/* 2. Retesteo y firma */}
              <Card className="flex flex-col">
                <CardHeader
                  step="2."
                  title="Retesteo de inyecciones (adversarial)"
                  tag="Sandbox test"
                  tagTone="brand"
                  description="Ejecución automática de pruebas adversariales controladas sobre la rama parcheada."
                />

                <Panel tone="neutral">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-ink-soft">
                      vgi_test_runner_output
                    </span>
                    <Tag tone={retestPassed ? "safe" : "neutral"}>
                      {retestPassed ? "Pasado" : "Pendiente"}
                    </Tag>
                  </div>
                  {selected.remediation.retests.map((test) => (
                    <Mono
                      key={test.label}
                      tone={test.passed ? "safe" : "neutral"}
                      className={test.passed ? "" : "opacity-60"}
                    >
                      [{test.passed ? "OK" : "··"}] {test.label}
                    </Mono>
                  ))}
                </Panel>

                {selected.remediation.status === "firmado" ? (
                  <Panel tone="safe" className="mt-4">
                    <p className="text-[12.5px] font-semibold text-safe">
                      Hallazgo firmado
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                      Firmado por {selected.remediation.signedBy} el{" "}
                      {new Date(selected.remediation.signedAt!).toLocaleString("es-CO")}
                    </p>
                  </Panel>
                ) : retestPassed ? (
                  <Panel tone="safe" className="mt-4">
                    <p className="text-[12.5px] font-semibold text-safe">
                      Firma de aprobación legal y técnica
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                      Al confirmar la remediación, VIGÍA expide un certificado inmutable
                      de conformidad encadenado por hash al certificado anterior.
                    </p>
                  </Panel>
                ) : (
                  <Panel tone="neutral" className="mt-4">
                    <p className="text-[12.5px] font-semibold text-ink">
                      Retesteo pendiente
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                      La firma solo se habilita cuando las pruebas adversariales vuelven
                      a ejecutarse sobre la rama parcheada y pasan en su totalidad.
                    </p>
                  </Panel>
                )}

                <div className="mt-auto pt-5">
                  {!retestPassed ? (
                    <form
                      action={async () => {
                        "use server";
                        await retestear(selected.id);
                      }}
                    >
                      <button type="submit" className={buttonClass("brand", true)}>
                        Ejecutar retesteo adversarial
                      </button>
                    </form>
                  ) : selected.remediation.status === "firmado" ? (
                    <Link
                      href="/auditoria/riesgos"
                      className={buttonClass("secondary", true)}
                    >
                      Volver al mapa de riesgos
                    </Link>
                  ) : (
                    <form
                      action={async () => {
                        "use server";
                        await firmarHallazgo(selected.id);
                      }}
                    >
                      <button type="submit" className={buttonClass("primary", true)}>
                        Firmar y cerrar hallazgo
                      </button>
                    </form>
                  )}
                </div>
              </Card>
            </div>
          ) : null}

          {/* Certificado */}
          <Card>
            <CardHeader
              step="3."
              title="Certificado de conformidad"
              tag="Inmutable"
              tagTone="safe"
              description="Documento oponible: encadena por hash el resultado de la auditoría, los hallazgos firmados y los marcos evaluados."
            />

            {run.certificate ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Panel tone="safe">
                  <Label>Identificación</Label>
                  <Mono tone="safe">{run.certificate.id}</Mono>
                  <Mono className="mt-1">
                    Expedido: {new Date(run.certificate.issuedAt).toLocaleString("es-CO")}
                  </Mono>
                  <Mono className="mt-1">Cliente: {run.certificate.clientName}</Mono>
                </Panel>
                <Panel tone="neutral">
                  <Label>Encadenamiento</Label>
                  <Mono>hash: {run.certificate.hash}</Mono>
                  <Mono className="mt-1">prev: {run.certificate.previousHash}</Mono>
                  <Mono className="mt-1">
                    Puntuación: {run.certificate.scoreBefore} →{" "}
                    <span className="text-safe">{run.certificate.scoreAfter}</span>
                  </Mono>
                </Panel>
                <Panel tone="neutral" className="sm:col-span-2">
                  <Label>
                    Hallazgos cerrados ({run.certificate.signedFindings.length})
                  </Label>
                  <Mono>{run.certificate.signedFindings.join(" · ")}</Mono>
                </Panel>
              </div>
            ) : (
              <>
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  {score.resolved === 0
                    ? "Firma al menos un hallazgo para poder expedir el certificado."
                    : `${score.resolved} hallazgo(s) firmado(s). Puntuación actual: ${score.score}.`}
                </p>
                <form action={expedirCertificado} className="mt-4">
                  <button
                    type="submit"
                    disabled={score.resolved === 0}
                    className={buttonClass("primary")}
                  >
                    Expedir certificado de conformidad
                  </button>
                </form>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
