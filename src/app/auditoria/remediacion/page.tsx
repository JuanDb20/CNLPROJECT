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
  fieldClass,
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
            Todavía no hay parches generados. Genera el parche de un hallazgo desde su
            detalle para que VIGÍA lo prepare en una rama aislada.
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
                        ? "border-ink bg-ink text-canvas"
                        : "border-line bg-surface text-ink-soft hover:bg-surface-muted",
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
              {/* 1. Parche */}
              <Card>
                <CardHeader
                  step="1."
                  title="Parche en rama aislada"
                  tag="Trazabilidad"
                  tagTone="brand"
                  description="VIGÍA preparó el parche en una rama aislada, separada de producción, para que el equipo del cliente lo revise y lo aplique."
                />

                <div className="rounded-[8px] border border-line bg-surface-muted p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink">
                        Parche #{selected.remediation.prNumber}
                      </p>
                      <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-muted">
                        rama {selected.remediation.branch}
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
                  tag="Entorno aislado"
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
                    {selected.remediation.signatureNote ? (
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                        Salvedad: {selected.remediation.signatureNote}
                      </p>
                    ) : null}
                  </Panel>
                ) : retestPassed ? (
                  <Panel tone="safe" className="mt-4">
                    <p className="text-[12.5px] font-semibold text-safe">
                      Firma del abogado revisor
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                      VIGÍA propone el análisis jurídico; la decisión es del abogado. Al
                      firmar, lo asume como propio y el hallazgo entra en el informe de
                      responsabilidad demostrada con su nombre y tarjeta profesional.
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
                    <form action={firmarHallazgo.bind(null, selected.id)} className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                        <label className="text-[11.5px] text-ink-muted">
                          Abogado revisor
                          <input
                            name="abogado"
                            required
                            minLength={3}
                            maxLength={120}
                            autoComplete="name"
                            className={fieldClass}
                          />
                        </label>
                        <label className="text-[11.5px] text-ink-muted">
                          Tarjeta profesional
                          <input
                            name="tarjeta"
                            required
                            inputMode="numeric"
                            pattern="[0-9]{3,7}"
                            title="Solo números, de 3 a 7 dígitos"
                            className={fieldClass}
                          />
                        </label>
                      </div>
                      <label className="block text-[11.5px] text-ink-muted">
                        Salvedad o ajuste al análisis (opcional)
                        <textarea name="salvedad" rows={2} maxLength={500} className={fieldClass} />
                      </label>
                      <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
                        <input type="checkbox" required className="mt-0.5" />
                        Revisé la evidencia y el análisis jurídico de {selected.code} y los
                        asumo como propios.
                      </label>
                      <button type="submit" className={buttonClass("primary", true)}>
                        Firmar y cerrar hallazgo
                      </button>
                    </form>
                  )}
                </div>
              </Card>
            </div>
          ) : null}

          {/* Informe de responsabilidad demostrada */}
          <Card>
            <CardHeader
              step="3."
              title="Informe de responsabilidad demostrada"
              tag="Encadenado por hash"
              tagTone="safe"
              description="Evidencia para demostrar ante la SIC las medidas adoptadas (art. 26 del Decreto 1377 de 2013), que la SIC tiene en cuenta al evaluar sanciones (art. 27). Encadena por hash el resultado, los hallazgos firmados por el abogado y los marcos evaluados. No es un certificado de conformidad acreditado."
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
                    Hallazgos firmados ({run.certificate.signedFindings.length})
                  </Label>
                  {run.certificate.signedFindings.map((line) => (
                    <Mono key={line}>{line}</Mono>
                  ))}
                </Panel>
              </div>
            ) : (
              <>
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  {score.resolved === 0
                    ? "Firma al menos un hallazgo para poder expedir el informe."
                    : `${score.resolved} hallazgo(s) firmado(s). Puntuación actual: ${score.score}.`}
                </p>
                <form action={expedirCertificado} className="mt-4">
                  <button
                    type="submit"
                    disabled={score.resolved === 0}
                    className={buttonClass("primary")}
                  >
                    Expedir informe de responsabilidad demostrada
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
