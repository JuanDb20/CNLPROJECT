import Link from "next/link";
import { notFound } from "next/navigation";

import { abrirPullRequest } from "@/app/actions";
import { DescargasDocumento, Documento } from "@/components/documento";
import { LearningCard } from "@/components/learning-card";
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
import { RedactedLine } from "@/components/redacted";
import { FRAMEWORKS, getRules } from "@/domain/compliance";
import { sortFindings } from "@/domain/scoring";
import type { PatchKind } from "@/domain/types";
import { learningMode } from "@/server/http";
import { requireAnalyzedRun } from "@/server/session";

export const metadata = { title: "Detalle del hallazgo" };

export const dynamic = "force-dynamic";

const PATCH_LABEL: Record<PatchKind, string> = {
  codigo: "Cambio en el código",
  prompt: "Cambio en el prompt del sistema",
  config: "Cambio en la configuración",
  interfaz: "Cambio en la interfaz",
  dependencia: "Cambio en las dependencias",
  documento: "Documento jurídico propuesto",
};

/** Ruta y línea en su propio renglón monoespaciado, separadas del código. */
function splitEvidenceLine(line: string): { location: string; code: string } {
  const match = line.match(/^(\S+:\d+)\s+(.*)$/);
  return match ? { location: match[1], code: match[2] } : { location: "", code: line };
}

export default async function HallazgoPage({
  params,
}: {
  params: Promise<{ findingId: string }>;
}) {
  const { findingId } = await params;
  const run = await requireAnalyzedRun();
  const finding = run.findings.find((f) => f.id === findingId);
  if (!finding) notFound();

  const rules = getRules(finding.ruleIds);
  const { remediation } = finding;
  const prOpen = remediation.prNumber !== null;
  /* Un documento jurídico no se lee como diff: se lee como documento. */
  const esDocumento = remediation.patch.kind === "documento";

  const ordered = sortFindings(run.findings);
  const idx = ordered.findIndex((f) => f.id === finding.id);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx < ordered.length - 1 ? ordered[idx + 1] : null;

  const aprendizaje = await learningMode();

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[11px] text-ink-faint">
          Informe de vulnerabilidad VIGÍA #{finding.code}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-ink">
          {finding.title}
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">{finding.summary}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/auditoria/riesgos"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
        >
          <span aria-hidden>←</span> Volver al mapa de riesgos
        </Link>
        <nav aria-label="Navegación entre hallazgos" className="flex items-center gap-2 text-[12.5px]">
          {prev ? (
            <Link href={`/auditoria/hallazgos/${prev.id}`} className="text-ink-muted transition-colors hover:text-ink">
              ← Anterior
            </Link>
          ) : (
            <span className="text-ink-faint">← Anterior</span>
          )}
          <span aria-hidden className="text-ink-faint">·</span>
          {next ? (
            <Link href={`/auditoria/hallazgos/${next.id}`} className="text-ink-muted transition-colors hover:text-ink">
              Siguiente →
            </Link>
          ) : (
            <span className="text-ink-faint">Siguiente →</span>
          )}
        </nav>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Evidencia */}
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              Vulnerabilidad de entrada y evidencia
            </h2>
            <SeverityBadge severity={finding.severity} />
          </div>

          <Panel tone="neutral">
            <Label>Trazabilidad normativa del riesgo</Label>
            <ul className="space-y-2">
              {rules.map((rule) => (
                <li key={rule.id} className="text-[12px] leading-relaxed">
                  <span className="font-mono text-[11px] font-medium text-ink">
                    {rule.label}
                  </span>{" "}
                  <span className="text-ink-faint">
                    · {FRAMEWORKS[rule.framework].shortName}
                  </span>
                  <br />
                  <span className="font-medium text-ink-soft">{rule.title}.</span>{" "}
                  <span className="text-ink-muted">{rule.obligation}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="mt-4">
            <Label>Análisis jurídico</Label>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              {finding.legalAnalysis}
            </p>
          </div>

          <div className="mt-4">
            <Label>Evidencia en el código</Label>
            <Panel tone="critical" className="space-y-3 overflow-x-auto">
              {finding.evidence.response.split("\n").map((line, i) => {
                const { location, code } = splitEvidenceLine(line);
                return (
                  <div key={`${i}-${line}`}>
                    {location ? (
                      <p className="font-mono text-[10.5px] text-ink-faint">{location}</p>
                    ) : null}
                    <Mono tone="critical" className="mt-0.5 whitespace-pre">
                      {code.includes("[ENMASCARADO]") ? <RedactedLine text={code} /> : code}
                    </Mono>
                  </div>
                );
              })}
            </Panel>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-faint">
              Clic o Enter sobre un dato enmascarado lo ubica. VIGÍA nunca envía el dato real
              al navegador: el motor lo enmascara antes de mostrar la evidencia.
            </p>
          </div>
        </Card>

        {/* Mitigación */}
        <Card className="flex flex-col">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              Mitigación y parche
            </h2>
            <Tag tone={prOpen ? "safe" : "required"}>
              {prOpen ? "Parche generado" : "Propuesta revisable"}
            </Tag>
          </div>

          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            {esDocumento ? (
              <>
                VIGÍA redacta el documento que falta y lo deja listo en{" "}
                <span className="font-mono text-[11.5px] text-ink-soft">
                  {remediation.patch.target}
                </span>
                , prellenado con lo que leyó del código. El abogado lo revisa, ajusta y
                firma: VIGÍA propone, el abogado firma.
              </>
            ) : (
              <>
                VIGÍA modifica{" "}
                <span className="font-mono text-[11.5px] text-ink-soft">
                  {remediation.patch.target}
                </span>{" "}
                para aplicar la mitigación identificada, sin tocar el código central de la
                aplicación del cliente, hecha con vibecoding (código generado con IA).
              </>
            )}
          </p>

          <div className="mt-4">
            <Label>{PATCH_LABEL[remediation.patch.kind]}</Label>
            {esDocumento ? (
              <>
                <Panel tone="neutral" className="max-h-[420px] overflow-y-auto">
                  <Documento lines={remediation.patch.added} />
                </Panel>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-faint">
                  Borrador generado desde el código: el abogado lo revisa, ajusta y firma.
                  Lo resaltado son los datos que solo él puede diligenciar.
                </p>
                <DescargasDocumento
                  code={finding.code}
                  lines={remediation.patch.added}
                  runId={run.id}
                  findingId={finding.id}
                  className="mt-2"
                />
              </>
            ) : (
              <Panel tone="neutral">
                {remediation.patch.removed.map((line, i) => (
                  <Mono key={`r-${i}`} tone="removed">
                    {"- "}
                    {line}
                  </Mono>
                ))}
                {remediation.patch.added.map((line, i) => (
                  <Mono key={`a-${i}`} tone="added">
                    {"+ "}
                    {line}
                  </Mono>
                ))}
              </Panel>
            )}
          </div>

          <div className="mt-4">
            <Label>Validación de impacto esperado</Label>
            <Panel tone="neutral">
              <p className="text-[12px] leading-relaxed text-ink-soft">
                {remediation.patch.expectedImpact}
              </p>
            </Panel>
          </div>

          <div className="mt-4">
            <Label>Retesteo previsto</Label>
            <ul className="space-y-1.5">
              {remediation.retests.map((test) => (
                <li
                  key={test.label}
                  className="flex items-start gap-2 text-[12px] leading-relaxed"
                >
                  <span
                    aria-hidden
                    className={cx(
                      "mt-1 size-1.5 shrink-0 rounded-full",
                      test.passed ? "bg-safe" : "bg-line-strong",
                    )}
                  />
                  <span className={test.passed ? "text-safe" : "text-ink-muted"}>
                    {test.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-col gap-2.5 pt-5 sm:flex-row">
            <Link href="/auditoria/hallazgos" className={buttonClass("secondary")}>
              Otros hallazgos
            </Link>
            {prOpen ? (
              <Link
                href="/auditoria/remediacion"
                className={cx(buttonClass("primary"), "flex-1")}
              >
                Ir a remediación y firma
              </Link>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await abrirPullRequest(finding.id);
                }}
                className="flex-1"
              >
                <button type="submit" className={buttonClass("primary", true)}>
                  Generar parche
                </button>
              </form>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <Label>Escenario (ilustrativo, no ejecutado en esta versión)</Label>
        <Panel tone="neutral">
          <Mono>&quot;{finding.evidence.probe}&quot;</Mono>
        </Panel>
      </Card>

      {aprendizaje ? (
        <LearningCard
          hecho={finding.evidence.locations.join(" · ")}
          norma={rules.map((r) => r.label).join(" · ") || "Sin norma asociada"}
          riesgo={finding.summary}
          remedio={remediation.patch.expectedImpact}
        />
      ) : null}
    </div>
  );
}
