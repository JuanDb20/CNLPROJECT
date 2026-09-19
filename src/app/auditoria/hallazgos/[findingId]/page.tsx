import Link from "next/link";
import { notFound } from "next/navigation";

import { abrirPullRequest } from "@/app/actions";
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
import { FRAMEWORKS, getRules } from "@/domain/compliance";
import { requireAnalyzedRun } from "@/server/session";

export const dynamic = "force-dynamic";

const PATCH_LABEL = {
  codigo: "Diferencia de código",
  prompt: "Diferencia de prompt (system prompt patch)",
  config: "Diferencia de configuración",
  interfaz: "Diferencia de interfaz",
  dependencia: "Diferencia de dependencias",
} as const;

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

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[11px] text-ink-faint">
          VIGÍA Vulnerability Report #{finding.code}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-ink">
          {finding.title}
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">{finding.summary}</p>
      </div>

      <Link
        href="/auditoria/riesgos"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
      >
        <span aria-hidden>←</span> Volver al mapa de riesgos
      </Link>

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
            <Label>Prueba</Label>
            <Panel tone="neutral">
              <Mono>&quot;{finding.evidence.probe}&quot;</Mono>
            </Panel>
          </div>

          <div className="mt-4">
            <Label>Evidencia en el código</Label>
            <Panel tone="critical" className="space-y-1.5 overflow-x-auto">
              {finding.evidence.response.split("\n").map((line) => (
                <Mono key={line} tone="critical" className="whitespace-pre">
                  {line}
                </Mono>
              ))}
            </Panel>
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
            VIGÍA modifica{" "}
            <span className="font-mono text-[11.5px] text-ink-soft">
              {remediation.patch.target}
            </span>{" "}
            para aplicar la mitigación identificada, sin tocar el código central de tu
            aplicación de vibecoding.
          </p>

          <div className="mt-4">
            <Label>{PATCH_LABEL[remediation.patch.kind]}</Label>
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
    </div>
  );
}
