import Link from "next/link";

import {
  borrarCodigo,
  expedirCertificado,
  firmarHallazgo,
  retestear,
  retestearVersion,
} from "@/app/actions";
import { DescargasDocumento, Documento } from "@/components/documento";
import { DownloadPatch } from "@/components/download-patch";
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
import { documentosGenerados } from "@/domain/documentos";
import { formatDate } from "@/domain/format";
import { scoreRun, sortFindings } from "@/domain/scoring";
import { requireUser } from "@/server/auth";
import { requireAnalyzedRun } from "@/server/session";

export const metadata = { title: "Remediación y firma" };

export const dynamic = "force-dynamic";


export default async function RemediacionPage({
  searchParams,
}: {
  searchParams: Promise<{ hallazgo?: string; error?: string }>;
}) {
  const { hallazgo, error } = await searchParams;
  const [run, user] = await Promise.all([requireAnalyzedRun(), requireUser()]);
  const score = scoreRun(run);

  const withPr = sortFindings(run.findings).filter(
    (f) => f.remediation.prNumber !== null,
  );
  const documentos = documentosGenerados(run);

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
        {documentos.length > 0 ? (
          <Link
            href="/auditoria/documentos"
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-brand transition-colors hover:text-ink"
          >
            Documentos jurídicos generados ({documentos.length}) <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>

      {withPr.length === 0 ? (
        <Card>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Todavía no hay parches generados. Genera el parche de un hallazgo desde su
            detalle para que el equipo del cliente lo aplique.
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
                  title="Parche propuesto"
                  tag="Trazabilidad"
                  tagTone="brand"
                  description="Parche propuesto para que el equipo del cliente lo aplique."
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
                        : "Abierto"}
                    </Tag>
                  </div>
                  <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-muted">
                    {selected.remediation.patch.kind === "documento"
                      ? "Documento propuesto para publicar en "
                      : "Cambio propuesto sobre "}
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

                <div className="mt-4">
                  {selected.remediation.patch.kind === "documento" ? (
                    <>
                      <Label>Documento jurídico propuesto</Label>
                      <Panel tone="neutral" className="max-h-[420px] overflow-y-auto">
                        <Documento lines={selected.remediation.patch.added} />
                      </Panel>
                      <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-faint">
                        Borrador generado desde el código: el abogado lo revisa, ajusta y
                        firma.
                      </p>
                      <DescargasDocumento
                        code={selected.code}
                        lines={selected.remediation.patch.added}
                        runId={run.id}
                        findingId={selected.id}
                        className="mt-2"
                      />
                    </>
                  ) : (
                    <>
                      <Label>Cambios propuestos</Label>
                      <Panel tone="neutral" className="overflow-x-auto">
                        {selected.remediation.patch.removed.map((line, i) => (
                          <Mono key={`r-${i}`} tone="removed">
                            {"- "}
                            {line}
                          </Mono>
                        ))}
                        {selected.remediation.patch.added.map((line, i) => (
                          <Mono key={`a-${i}`} tone="added">
                            {"+ "}
                            {line}
                          </Mono>
                        ))}
                      </Panel>
                      <DownloadPatch
                        code={selected.code}
                        target={selected.remediation.patch.target}
                        removed={selected.remediation.patch.removed}
                        added={selected.remediation.patch.added}
                        className="mt-2"
                      />
                    </>
                  )}
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
                  title="Retesteo sobre el código corregido"
                  tag="Entorno aislado"
                  tagTone="brand"
                  description={
                    run.retestSource
                      ? `Versión corregida: ${run.retestSource.fileName} · SHA-256 ${run.retestSource.sha256.slice(0, 12)}…`
                      : "VIGÍA vuelve a correr la misma prueba sobre el código con el parche aplicado."
                  }
                />

                <Panel tone="neutral">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-ink-soft">
                      resultado_del_retesteo
                    </span>
                    <Tag
                      tone={
                        retestPassed
                          ? "safe"
                          : selected.remediation.retestEvidence
                            ? "critical"
                            : "neutral"
                      }
                    >
                      {retestPassed
                        ? "Pasado"
                        : selected.remediation.retestEvidence
                          ? "No corregido"
                          : "Pendiente"}
                    </Tag>
                  </div>
                  {selected.remediation.retests.map((test) => {
                    const attempted = test.passed || Boolean(selected.remediation.retestEvidence);
                    return (
                      <Mono
                        key={test.label}
                        tone={test.passed ? "safe" : attempted ? "critical" : "neutral"}
                        className={test.passed ? "" : attempted ? "" : "opacity-60"}
                      >
                        [{test.passed ? "✓" : attempted ? "✗" : "··"}] {test.label}
                      </Mono>
                    );
                  })}
                </Panel>

                {selected.remediation.status === "firmado" ? (
                  <Panel tone="safe" className="mt-4">
                    <p className="text-[12.5px] font-semibold text-safe">
                      Hallazgo firmado
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                      Firmado por {selected.remediation.signedBy} el{" "}
                      {formatDate(selected.remediation.signedAt!, { time: true })}
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
                      auditoría técnico-jurídica con su nombre y tarjeta profesional.
                    </p>
                  </Panel>
                ) : (
                  <Panel tone="neutral" className="mt-4">
                    <p className="text-[12.5px] font-semibold text-ink">
                      Retesteo pendiente
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                      Carga el código con el parche aplicado. La firma solo se habilita si
                      la misma prueba ya no encuentra la falla.
                    </p>
                    {selected.remediation.retestEvidence ? (
                      <p className="mt-1.5 font-mono text-[11px] text-critical">
                        {selected.remediation.retestEvidence}
                      </p>
                    ) : null}
                    {error ? (
                      <p role="alert" className="mt-1.5 text-[11.5px] text-critical">
                        {error}
                      </p>
                    ) : null}
                  </Panel>
                )}

                <div className="mt-auto pt-5">
                  {!retestPassed ? (
                    <div className="space-y-3">
                      {run.retestSource && !selected.remediation.retestEvidence ? (
                        <form
                          action={async () => {
                            "use server";
                            await retestear(selected.id);
                          }}
                        >
                          <button type="submit" className={buttonClass("brand", true)}>
                            Retestear contra {run.retestSource.fileName}
                          </button>
                        </form>
                      ) : null}
                      <form action={retestearVersion} className="space-y-2">
                        <input type="hidden" name="hallazgo" value={selected.id} />
                        <label className="block text-[11.5px] text-ink-muted">
                          {run.retestSource ? "Otra versión corregida (.zip)" : "Versión corregida del código (.zip)"}
                          <input type="file" name="codigo" accept=".zip,application/zip" className={fieldClass} />
                        </label>
                        <input
                          type="url"
                          name="repositorio"
                          placeholder="o https://github.com/organizacion/repositorio"
                          aria-label="Repositorio público de GitHub con la versión corregida"
                          className={fieldClass}
                        />
                        <button type="submit" className={buttonClass(run.retestSource ? "secondary" : "brand", true)}>
                          Cargar y retestear
                        </button>
                      </form>
                    </div>
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
                        <p className="text-[11.5px] text-ink-muted">
                          Abogado revisor
                          <span className="mt-1 block text-[12.5px] text-ink">{user.name}</span>
                        </p>
                        <label className="text-[11.5px] text-ink-muted">
                          Tarjeta profesional
                          <input
                            name="tarjeta"
                            required
                            inputMode="numeric"
                            pattern="[0-9]{3,7}"
                            title="Solo números, de 3 a 7 dígitos"
                            defaultValue={user.professionalCard ?? ""}
                            className={fieldClass}
                          />
                        </label>
                      </div>
                      <p className="text-[10.5px] leading-relaxed text-ink-faint">
                        Dato autodeclarado: VIGÍA no la verifica contra el Registro Nacional
                        de Abogados.{" "}
                        <a
                          href="https://vigenciaspublicas.ramajudicial.gov.co/Certificados.aspx"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-muted underline underline-offset-2 hover:text-brand"
                        >
                          Verificar vigencia en el registro oficial ↗
                        </a>
                      </p>
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

          {/* Informe de auditoría técnico-jurídica */}
          <Card>
            <CardHeader
              step="3."
              title="Informe de auditoría técnico-jurídica"
              tag="Encadenado por hash"
              tagTone="safe"
              description="Evidencia para demostrar ante la SIC las medidas adoptadas (art. 26 del Decreto 1377 de 2013), que la SIC tiene en cuenta al evaluar sanciones (art. 27). Encadena por hash el resultado, los hallazgos firmados por el abogado y los marcos evaluados. No equivale a una acreditación de conformidad ante ONAC."
            />

            {run.certificate ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Panel tone="safe">
                  <Label>Identificación</Label>
                  <Mono tone="safe">{run.certificate.id}</Mono>
                  <Mono className="mt-1">
                    Expedido: {formatDate(run.certificate.issuedAt, { time: true })}
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
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <Link href={`/informe/${run.id}`} className={buttonClass("primary")}>
                    Ver informe y guardar en PDF
                  </Link>
                  <p className="text-[11.5px] text-ink-muted">
                    El representante legal también lo ve en su portal.
                  </p>
                </div>
                {run.status === "certificado" && !run.scope.source.deletedAt ? (
                  <div className="sm:col-span-2">
                    <form action={borrarCodigo}>
                      <button type="submit" className={buttonClass("secondary")}>
                        Borrar el código ahora
                      </button>
                    </form>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                      Acción irreversible: borra el .zip cargado y conserva solo su SHA-256,
                      que ya queda en el informe.
                    </p>
                  </div>
                ) : run.scope.source.deletedAt ? (
                  <p className="text-[11.5px] text-ink-muted sm:col-span-2">
                    Código borrado el {formatDate(run.scope.source.deletedAt, { time: true })}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  {score.resolved === 0
                    ? "Firma al menos un hallazgo para poder expedir el informe."
                    : `${score.resolved} hallazgo${score.resolved === 1 ? "" : "s"} firmado${score.resolved === 1 ? "" : "s"}. Puntuación actual: ${score.score}.`}
                </p>
                <form action={expedirCertificado} className="mt-4">
                  <button
                    type="submit"
                    disabled={score.resolved === 0}
                    className={buttonClass("primary")}
                  >
                    Expedir informe de auditoría
                  </button>
                  <Link href={`/informe/${run.id}`} className={cx(buttonClass("ghost"), "ml-2")}>
                    Ver borrador
                  </Link>
                </form>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
