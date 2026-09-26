import Link from "next/link";
import { notFound } from "next/navigation";

import { abrirPullRequest } from "@/app/actions";
import { LearningCard } from "@/components/learning-card";
import { SubmitButton } from "@/components/submit-button";
import { Card, Label, Mono, Panel, SeverityBadge, buttonClass, cx } from "@/components/ui";
import { RedactedLine } from "@/components/redacted";
import { FRAMEWORKS, getRules } from "@/domain/compliance";
import { sortFindings } from "@/domain/scoring";
import { learningMode } from "@/server/http";
import { requireAnalyzedRun } from "@/server/session";

import { AVANCE, Paso, Pliegue } from "../secuencia";

export const metadata = { title: "Detalle del hallazgo" };

export const dynamic = "force-dynamic";

/** Ruta y línea en su propio renglón monoespaciado, separadas del código. */
function splitEvidenceLine(line: string): { location: string; code: string } {
  const match = line.match(/^(\S+:\d+)\s+(.*)$/);
  return match ? { location: match[1], code: match[2] } : { location: "", code: line };
}

/*
 * Pantalla 5 en dos pasos: primero el problema en pocas líneas (qué pasa y qué
 * norma incumple), con el fundamento completo y la evidencia plegados; después
 * una sola acción, que lleva a la corrección (pantalla 6).
 */
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
  /* La norma que se muestra es la primera colombiana: OWASP orienta y el derecho
     comparado se cita como referencia, pero no se «incumplen». */
  const norma =
    rules.find((r) => ["juridico", "interfaz"].includes(FRAMEWORKS[r.framework].kind)) ?? rules[0];
  const { remediation } = finding;
  const prOpen = remediation.prNumber !== null;
  const estado = remediation.status === "propuesta" ? null : AVANCE[remediation.status];

  const ordered = sortFindings(run.findings);
  const idx = ordered.findIndex((f) => f.id === finding.id);
  const next = ordered[idx + 1];

  const aprendizaje = await learningMode();
  /* Para la explicación basta el archivo; las líneas exactas están en la evidencia técnica. */
  const archivos = [...new Set(finding.evidence.locations.map((l) => l.replace(/:\d+$/, "")))].join(", ");

  return (
    <div className="max-w-[780px] space-y-5">
      <nav
        aria-label="Navegación entre hallazgos"
        className="flex flex-wrap items-center justify-between gap-3 text-[12.5px]"
      >
        <Link href="/auditoria/hallazgos" className="text-ink-muted transition-colors hover:text-ink">
          <span aria-hidden>←</span> Todos los hallazgos
        </Link>
        <p className="text-ink-muted">
          Hallazgo {idx + 1} de {ordered.length}
          {next ? (
            <>
              {" · "}
              <Link
                href={`/auditoria/hallazgos/${next.id}`}
                className="text-ink-soft transition-colors hover:text-ink"
              >
                Siguiente hallazgo <span aria-hidden>→</span>
              </Link>
            </>
          ) : null}
        </p>
      </nav>

      <header>
        <div className="flex items-center gap-2.5">
          <SeverityBadge severity={finding.severity} />
          <span className="font-mono text-[11px] text-ink-faint">{finding.code}</span>
        </div>
        <h1 className="mt-2.5 text-[22px] font-semibold leading-tight tracking-tight text-ink">
          {finding.title}
        </h1>
      </header>

      <Card>
        <ol>
          <Paso n={1} titulo="El problema" estado="actual">
            {aprendizaje ? (
              <LearningCard
                hecho={`VIGÍA lo encontró en ${archivos}.`}
                norma={norma ? `${norma.title} (${norma.label}): ${norma.obligation}` : "Sin norma asociada."}
                riesgo={finding.summary}
                remedio={remediation.patch.expectedImpact}
              />
            ) : (
              <>
                <p className="text-[13.5px] leading-relaxed text-ink-soft">{finding.summary}</p>
                {norma ? (
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                    Norma que incumple:{" "}
                    <span className="font-medium text-ink">{norma.label}</span> · {norma.title}
                  </p>
                ) : null}
              </>
            )}

            <Pliegue titulo="Ver fundamento jurídico">
              <ul className="space-y-2.5">
                {rules.map((rule) => (
                  <li key={rule.id} className="text-[12px] leading-relaxed">
                    <span className="font-mono text-[11px] font-medium text-ink">{rule.label}</span>{" "}
                    <span className="text-ink-faint">· {FRAMEWORKS[rule.framework].shortName}</span>
                    <br />
                    <span className="font-medium text-ink-soft">{rule.title}.</span>{" "}
                    <span className="text-ink-muted">{rule.obligation}</span>
                  </li>
                ))}
              </ul>
              <div>
                <Label>Análisis jurídico propuesto</Label>
                <p className="text-[12.5px] leading-relaxed text-ink-soft">{finding.legalAnalysis}</p>
              </div>
            </Pliegue>

            <Pliegue titulo="Ver evidencia técnica">
              <div>
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
              <div>
                <Label>Escenario (ilustrativo, no ejecutado en esta versión)</Label>
                <Mono>&quot;{finding.evidence.probe}&quot;</Mono>
              </div>
            </Pliegue>
          </Paso>

          <Paso
            n={2}
            titulo="La corrección"
            estado={remediation.status === "firmado" ? "hecho" : "actual"}
            nota={
              estado ? <span className={cx("text-[12px] font-medium", estado.tone)}>{estado.label}</span> : null
            }
          >
            {/* Con las explicaciones activas, el remedio ya se leyó en la cadena del paso 1. */}
            {aprendizaje ? null : (
              <p className="text-[13.5px] leading-relaxed text-ink-soft">
                {remediation.patch.expectedImpact}
              </p>
            )}
            {prOpen ? (
              <Link
                href={`/auditoria/remediacion?hallazgo=${finding.id}`}
                className={cx(buttonClass("primary"), "mt-4")}
              >
                {remediation.status === "firmado" ? "Ver la corrección y la firma" : "Continuar con la corrección"}{" "}
                <span aria-hidden>→</span>
              </Link>
            ) : (
              <>
                <form action={abrirPullRequest.bind(null, finding.id)} className="mt-4">
                  <SubmitButton variant="primary" pendingText="Preparando la corrección…">
                    Corregir este hallazgo <span aria-hidden>→</span>
                  </SubmitButton>
                </form>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
                  No toca el sistema del cliente: VIGÍA prepara el cambio para que su desarrollador
                  lo aplique.
                </p>
              </>
            )}
          </Paso>
        </ol>
      </Card>
    </div>
  );
}
