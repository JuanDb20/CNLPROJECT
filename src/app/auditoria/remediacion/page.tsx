import Link from "next/link";

import {
  aplicarCorreccionEjemplo,
  borrarCodigo,
  expedirCertificado,
  firmarHallazgo,
  retestear,
  retestearVersion,
} from "@/app/actions";
import { Paso, Pliegue } from "@/app/auditoria/hallazgos/secuencia";
import { DescargasDocumento, Documento } from "@/components/documento";
import { DownloadPatch } from "@/components/download-patch";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  Label,
  Mono,
  Panel,
  SeverityBadge,
  buttonClass,
  cx,
  fieldClass,
} from "@/components/ui";
import { documentosGenerados } from "@/domain/documentos";
import { formatDate } from "@/domain/format";
import { scoreRun, sortFindings } from "@/domain/scoring";
import type { Finding } from "@/domain/types";
import { requireUser } from "@/server/auth";
import { EXAMPLE_SHA256 } from "@/server/example-repo";
import { requireAnalyzedRun } from "@/server/session";

export const metadata = { title: "Remediación y firma" };

export const dynamic = "force-dynamic";

/*
 * Pantalla 6 como secuencia: corrección → nueva prueba → firma → informe. Solo el
 * paso en curso lleva acción; lo hecho queda en una línea y el detalle (diff,
 * pruebas, fundamento jurídico, hashes) plegado.
 */
export default async function RemediacionPage({
  searchParams,
}: {
  searchParams: Promise<{ hallazgo?: string; error?: string }>;
}) {
  const { hallazgo, error } = await searchParams;
  const [run, user] = await Promise.all([requireAnalyzedRun(), requireUser()]);
  const score = scoreRun(run);
  /* El ejemplo no tiene un cliente que corrija: VIGÍA aplica su propia corrección. */
  const esEjemplo = run.scope.source.sha256 === EXAMPLE_SHA256;

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
  const superado = (f: Finding) =>
    f.remediation.retests.length > 0 && f.remediation.retests.every((t) => t.passed);
  const retestPassed = selected !== undefined && superado(selected);
  const signed = selected?.remediation.status === "firmado";
  /* Retesteados sin firmar: si el informe se expide antes, quedan fuera para siempre. */
  const listos = withPr.filter((f) => f.remediation.status !== "firmado" && superado(f));
  const siguiente = signed ? listos[0] : undefined;

  const uploadForm = selected ? (
    <form action={retestearVersion} className="space-y-2">
      <input type="hidden" name="hallazgo" value={selected.id} />
      <label className="block text-[12px] text-ink-muted">
        Versión corregida del código (.zip)
        <input type="file" name="codigo" accept=".zip,application/zip" className={fieldClass} />
      </label>
      <input
        type="url"
        name="repositorio"
        placeholder="o https://github.com/organizacion/repositorio"
        aria-label="Repositorio público de GitHub con la versión corregida"
        className={fieldClass}
      />
      {error ? (
        <p role="alert" className="text-[12px] text-critical">
          {error}
        </p>
      ) : null}
      <SubmitButton
        variant={run.retestSource && !selected.remediation.retestEvidence ? "secondary" : "brand"}
        pendingText="Cargando y probando…"
        className="w-full"
      >
        Cargar y volver a probar
      </SubmitButton>
    </form>
  ) : null;

  return (
    <div className="max-w-[780px] space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Remediación y firma
        </h1>
        {selected ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px]">
            <SeverityBadge severity={selected.severity} />
            <span className="font-mono text-[11px] text-ink-faint">{selected.code}</span>
            <Link
              href={`/auditoria/hallazgos/${selected.id}`}
              className="text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              {selected.title}
            </Link>
          </p>
        ) : null}
      </div>

      {withPr.length > 1 ? (
        <nav aria-label="Hallazgos en corrección" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] text-ink-muted">En corrección:</span>
          {withPr.map((f) => (
            <Link
              key={f.id}
              href={`/auditoria/remediacion?hallazgo=${f.id}`}
              title={f.title}
              aria-current={f.id === selected?.id ? "page" : undefined}
              className={cx(
                "rounded-[6px] border px-2.5 py-1 font-mono text-[10.5px] transition-colors",
                f.id === selected?.id
                  ? "border-ink bg-ink text-canvas"
                  : "border-line bg-surface text-ink-soft hover:bg-surface-muted",
                f.remediation.status === "firmado" && f.id !== selected?.id && "text-safe",
              )}
            >
              {f.code}
              {f.remediation.status === "firmado" ? " ✓" : ""}
            </Link>
          ))}
        </nav>
      ) : null}

      {!selected ? (
        <Card>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Aún no hay hallazgos en corrección. Abre uno y pulsa «Corregir este hallazgo».
          </p>
          <Link href="/auditoria/hallazgos" className={cx(buttonClass("primary"), "mt-4")}>
            Ver los hallazgos
          </Link>
        </Card>
      ) : (
        <Card>
          <ol>
            {/* 1. La corrección que propone VIGÍA */}
            <Paso n={1} titulo="Corrección propuesta" estado="hecho">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                {selected.remediation.changeNote}
              </p>
              {selected.remediation.patch.kind === "documento" ? (
                <Pliegue titulo="Ver el documento">
                  <Panel tone="neutral" className="max-h-[420px] overflow-y-auto">
                    <Documento lines={selected.remediation.patch.added} />
                  </Panel>
                  <p className="text-[11px] leading-relaxed text-ink-faint">
                    Borrador generado desde el código: el abogado lo revisa, ajusta y firma.
                  </p>
                  <DescargasDocumento
                    code={selected.code}
                    lines={selected.remediation.patch.added}
                    runId={run.id}
                    findingId={selected.id}
                  />
                </Pliegue>
              ) : (
                <Pliegue titulo="Ver el cambio en el código">
                  <p className="font-mono text-[11px] text-ink-muted">
                    {selected.remediation.patch.target}
                  </p>
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
                  />
                </Pliegue>
              )}
            </Paso>

            {/* 2. La misma prueba, sobre el código corregido */}
            <Paso n={2} titulo="Nueva prueba" estado={retestPassed ? "hecho" : "actual"}>
              {retestPassed ? (
                <>
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    La misma prueba ya no encuentra la falla en la versión corregida.
                  </p>
                  <Pliegue titulo="Ver qué se comprobó">
                    <ul className="space-y-1">
                      {selected.remediation.retests.map((test) => (
                        <li key={test.label}>
                          <Mono tone="safe">✓ {test.label}</Mono>
                        </li>
                      ))}
                    </ul>
                    {run.retestSource ? (
                      <p className="font-mono text-[11px] text-ink-faint">
                        {run.retestSource.fileName} · SHA-256{" "}
                        {run.retestSource.sha256.slice(0, 12)}…
                      </p>
                    ) : null}
                  </Pliegue>
                </>
              ) : (
                <div className="space-y-3">
                  {selected.remediation.retestEvidence ? (
                    <Panel tone="critical">
                      <p className="text-[12.5px] font-medium text-critical">La falla sigue.</p>
                      <p className="mt-1 font-mono text-[11px] text-critical">
                        {selected.remediation.retestEvidence}
                      </p>
                    </Panel>
                  ) : null}

                  {esEjemplo ? (
                    <>
                      <form action={aplicarCorreccionEjemplo.bind(null, selected.id)}>
                        <SubmitButton pendingText="Aplicando la corrección y probando…" className="w-full">
                          Aplicar la corrección que propone VIGÍA y volver a probar
                        </SubmitButton>
                      </form>
                      <p className="text-[12px] leading-relaxed text-ink-muted">
                        Como es un ejemplo, VIGÍA aplica su propia corrección. En un caso
                        real, el desarrollador del cliente la aplica y carga aquí la nueva
                        versión del código.
                      </p>
                    </>
                  ) : run.retestSource && !selected.remediation.retestEvidence ? (
                    <>
                      <form action={retestear.bind(null, selected.id)}>
                        <SubmitButton pendingText="Probando…" className="w-full">
                          Volver a probar con {run.retestSource.fileName}
                        </SubmitButton>
                      </form>
                      <Pliegue titulo="Cargar otra versión corregida" abierto={Boolean(error)}>
                        {uploadForm}
                      </Pliegue>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] leading-relaxed text-ink-soft">
                        El desarrollador del cliente aplica la corrección; carga aquí la nueva
                        versión del código.
                      </p>
                      {uploadForm}
                    </>
                  )}
                </div>
              )}
            </Paso>

            {/* 3. Firma del concepto jurídico: solo con la nueva prueba en verde */}
            <Paso
              n={3}
              titulo="Firma de tu concepto jurídico"
              estado={signed ? "hecho" : retestPassed ? "actual" : "pendiente"}
            >
              {signed ? (
                <>
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    Retesteo superado; concepto jurídico firmado el{" "}
                    {formatDate(selected.remediation.signedAt!, { time: true })} por{" "}
                    {selected.remediation.signedBy}.
                  </p>
                  {selected.remediation.signatureNote ? (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                      Salvedad: {selected.remediation.signatureNote}
                    </p>
                  ) : null}
                </>
              ) : run.certificate ? (
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  El informe ya fue expedido: este hallazgo quedó fuera de él y ya no admite firma.
                </p>
              ) : retestPassed ? (
                <form action={firmarHallazgo.bind(null, run.id, selected.id)} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                    <p className="text-[12px] text-ink-muted">
                      Abogado revisor
                      <span className="mt-1 block text-[13px] text-ink">{user.name}</span>
                    </p>
                    <label className="text-[12px] text-ink-muted">
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
                  <p className="text-[11px] leading-relaxed text-ink-faint">
                    Dato autodeclarado: VIGÍA no la verifica contra el Registro Nacional de
                    Abogados.{" "}
                    <a
                      href="https://vigenciaspublicas.ramajudicial.gov.co/Certificados.aspx"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-muted underline underline-offset-2 hover:text-brand"
                    >
                      Verificar vigencia ↗
                    </a>
                  </p>
                  <label className="block text-[12px] text-ink-muted">
                    Salvedad (opcional)
                    <textarea
                      name="salvedad"
                      rows={2}
                      maxLength={500}
                      placeholder="Ej.: no se validó técnicamente; se recomienda verificación por un especialista."
                      className={fieldClass}
                    />
                  </label>
                  <Pliegue titulo="Qué cubre tu firma">
                    <p className="text-[12px] leading-relaxed text-ink-muted">
                      El retesteo lo certifica VIGÍA: la misma prueba ya no detecta la falla en
                      la versión corregida. Tu firma cubre el concepto jurídico —la
                      calificación del hallazgo y de su corrección a la luz de esa evidencia—,
                      no la seguridad del código ni la ausencia de otras fallas. Entra al
                      informe con tu nombre y tu tarjeta profesional.
                    </p>
                  </Pliegue>
                  <label className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
                    <input type="checkbox" required className="mt-0.5" />
                    <span>
                      Revisé la evidencia técnica y el retesteo que reporta VIGÍA para{" "}
                      {selected.code} y, con base en ellos, adopto como propio el análisis
                      jurídico, con las salvedades que anoto. No certifico la seguridad del
                      código ni la ausencia de fallas que las pruebas no cubren.
                    </span>
                  </label>
                  <SubmitButton variant="primary" pendingText="Firmando…" className="w-full">
                    Firmar concepto jurídico
                  </SubmitButton>
                </form>
              ) : (
                <p className="text-[12.5px] text-ink-faint">
                  Se habilita cuando la nueva prueba ya no encuentre la falla.
                </p>
              )}
            </Paso>

            {/* 4. Informe: reúne todos los hallazgos firmados de la auditoría */}
            <Paso
              n={4}
              titulo="Informe de auditoría"
              estado={run.certificate ? "hecho" : score.resolved > 0 && signed ? "actual" : "pendiente"}
            >
              {run.certificate ? (
                <>
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    Expedido el {formatDate(run.certificate.issuedAt, { time: true })} con el
                    código <span className="font-mono text-[12px]">{run.certificate.id}</span>.
                    El representante legal también lo ve en su portal.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link href={`/informe/${run.id}`} className={buttonClass("primary")}>
                      Ver informe y guardar en PDF
                    </Link>
                    <Link
                      href={`/verificar?q=${run.certificate.id}`}
                      className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
                    >
                      Comprobar su autenticidad <span aria-hidden>→</span>
                    </Link>
                  </div>
                  <Pliegue titulo="Datos de verificación">
                    <Panel tone="neutral">
                      <Mono>hash: {run.certificate.hash}</Mono>
                      <Mono className="mt-1">anterior: {run.certificate.previousHash}</Mono>
                      <Mono className="mt-1">
                        Puntuación: {run.certificate.scoreBefore} →{" "}
                        <span className="text-safe">{run.certificate.scoreAfter}</span>
                      </Mono>
                    </Panel>
                    <div>
                      <Label>Hallazgos firmados ({run.certificate.signedFindings.length})</Label>
                      {run.certificate.signedFindings.map((line) => (
                        <Mono key={line}>{line}</Mono>
                      ))}
                    </div>
                  </Pliegue>
                  {run.scope.source.deletedAt ? (
                    <p className="mt-3 text-[12px] text-ink-muted">
                      Código del cliente borrado el{" "}
                      {formatDate(run.scope.source.deletedAt, { time: true })}.
                    </p>
                  ) : (
                    <Pliegue titulo="Borrar el código del cliente">
                      <p className="text-[12px] leading-relaxed text-ink-muted">
                        Acción irreversible: borra el .zip cargado y conserva solo su SHA-256,
                        que ya queda en el informe.
                      </p>
                      <form action={borrarCodigo.bind(null, run.id)}>
                        <button type="submit" className={buttonClass("secondary")}>
                          Borrar el código ahora
                        </button>
                      </form>
                    </Pliegue>
                  )}
                </>
              ) : score.resolved > 0 ? (
                <>
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    {score.resolved === 1
                      ? "Reúne el hallazgo firmado"
                      : `Reúne los ${score.resolved} hallazgos firmados`}{" "}
                    en un documento que cualquiera puede comprobar en línea.
                  </p>
                  {listos.length > 0 ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-warning">
                      {listos.length === 1
                        ? "Queda 1 hallazgo listo para firmar: si expides ahora, queda fuera del informe."
                        : `Quedan ${listos.length} hallazgos listos para firmar: si expides ahora, quedan fuera del informe.`}
                    </p>
                  ) : null}
                  <form action={expedirCertificado.bind(null, run.id)} className="mt-4 flex flex-wrap items-center gap-2">
                    {siguiente ? (
                      <Link
                        href={`/auditoria/remediacion?hallazgo=${siguiente.id}`}
                        className={buttonClass("primary")}
                      >
                        Firmar el siguiente: {siguiente.code} <span aria-hidden>→</span>
                      </Link>
                    ) : null}
                    <SubmitButton
                      variant={signed && !siguiente ? "primary" : "secondary"}
                      pendingText="Expidiendo el informe…"
                    >
                      Expedir informe de auditoría
                    </SubmitButton>
                    <Link href={`/informe/${run.id}`} className={buttonClass("ghost")}>
                      Ver borrador
                    </Link>
                  </form>
                  <Pliegue titulo="Ver fundamento jurídico">
                    <p className="text-[12px] leading-relaxed text-ink-muted">
                      Evidencia para demostrar ante la SIC las medidas adoptadas (art. 26 del
                      Decreto 1377 de 2013), que la SIC tiene en cuenta al evaluar sanciones
                      (art. 27). Encadena por hash el resultado, los hallazgos firmados por el
                      abogado y los marcos evaluados. No equivale a una acreditación de
                      conformidad ante ONAC.
                    </p>
                  </Pliegue>
                </>
              ) : (
                <p className="text-[12.5px] text-ink-faint">
                  Se expide cuando firmes al menos un hallazgo.
                </p>
              )}
            </Paso>
          </ol>
        </Card>
      )}

      {documentos.length > 0 ? (
        <Link
          href="/auditoria/documentos"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
        >
          Documentos jurídicos que redactó VIGÍA ({documentos.length}) <span aria-hidden>→</span>
        </Link>
      ) : null}
    </div>
  );
}
