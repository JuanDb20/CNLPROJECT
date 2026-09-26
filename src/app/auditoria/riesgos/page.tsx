import Link from "next/link";

import { RiskGauge } from "@/components/risk-gauge";
import { Card, cx } from "@/components/ui";
import { FRAMEWORKS, getRules } from "@/domain/compliance";
import { WEIGHT, isResolved, scoreRun, sortFindings } from "@/domain/scoring";
import type { FrameworkId } from "@/domain/types";
import { requireAnalyzedRun } from "@/server/session";

import { RiskList, type FilterOption, type RiskRow, type RiskState } from "./risk-list";

const fmt = (n: number) => n.toLocaleString("es-CO");

export const metadata = { title: "Mapa de riesgos" };

export const dynamic = "force-dynamic";

const KIND_LABEL = {
  juridico: "Jurídica",
  tecnico: "Técnica",
  interfaz: "Interfaz",
  comparado: "Comparada",
} as const;

const LEVEL_LABEL = { bajo: "Bajo", medio: "Medio", alto: "Alto" } as const;

function Stat({
  value,
  label,
  hint,
  tone,
}: {
  value: number | string;
  label: string;
  hint: string;
  tone: "critical" | "warning" | "info";
}) {
  const tones = {
    critical: "text-critical",
    warning: "text-warning",
    info: "text-info",
  } as const;
  return (
    <Card className="p-4 sm:p-5">
      <p className={cx("text-[26px] font-semibold leading-none", tones[tone])}>
        {value}
      </p>
      <p className="mt-2 text-[12.5px] font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>
    </Card>
  );
}

export default async function RiesgosPage() {
  const run = await requireAnalyzedRun();
  const score = scoreRun(run);

  const rows: RiskRow[] = sortFindings(run.findings).map((finding) => {
    const rules = getRules(finding.ruleIds);
    const state: RiskState =
      finding.remediation.status === "firmado"
        ? "firmado"
        : finding.remediation.status === "retesteado"
          ? "retesteado"
          : "abierto";
    return {
      id: finding.id,
      code: finding.code,
      severity: finding.severity,
      title: finding.title,
      summary: finding.summary,
      signed: isResolved(finding),
      state,
      frameworks: [...new Set(rules.map((r) => r.framework))],
      chips: rules.slice(0, 2).map((rule) => ({
        kind: KIND_LABEL[FRAMEWORKS[rule.framework].kind],
        label: rule.label,
      })),
    };
  });

  /* Solo se ofrecen filtros de marcos que produjeron al menos un hallazgo. */
  const present = new Set(rows.flatMap((r) => r.frameworks));
  const filters: FilterOption[] = [
    { id: "todos", label: "Todos los marcos" },
    ...(Object.keys(FRAMEWORKS) as FrameworkId[])
      .filter((id) => present.has(id))
      .map((id) => ({ id, label: FRAMEWORKS[id].shortName })),
  ];

  const levelTone =
    score.level === "alto"
      ? "text-critical"
      : score.level === "medio"
        ? "text-warning"
        : "text-safe";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Mapa integral de riesgos de IA
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Clasificación jurídica y técnica consolidada
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="col-span-2 p-4 sm:p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <RiskGauge score={score.score} level={score.level} />
            <p className="text-[11px] leading-tight text-ink-muted">
              Puntuación de
              <br />
              cumplimiento
            </p>
          </div>
          <p className={cx("mt-3 text-[12.5px] font-medium", levelTone)}>
            Nivel de riesgo: {LEVEL_LABEL[score.level]}
          </p>
          {score.resolved > 0 ? (
            <p className="mt-0.5 text-[11px] text-safe">
              {score.resolved} hallazgo{score.resolved === 1 ? "" : "s"} firmado
              {score.resolved === 1 ? "" : "s"}
            </p>
          ) : null}
        </Card>

        <Stat
          value={score.critical}
          label="Críticos"
          hint="Mitigación inmediata"
          tone="critical"
        />
        <Stat
          value={score.warning}
          label="Advertencias"
          hint="Cumplimiento regulatorio"
          tone="warning"
        />
        <Stat
          value={score.informative}
          label="Informativos"
          hint="Mejores prácticas"
          tone="info"
        />
      </div>

      {/* La fórmula es consulta, no decisión: se pliega para no competir con la
          lista de hallazgos, que es lo que el abogado viene a leer. */}
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <details className="text-[12px]">
          <summary className="cursor-pointer list-none text-ink-muted transition-colors hover:text-ink">
            <span aria-hidden className="mr-1.5">›</span>
            Cómo se calcula la puntuación
          </summary>
          <p className="mt-2 max-w-[78ch] text-[11.5px] leading-relaxed text-ink-muted">
            100 menos {fmt(WEIGHT.critico)} por cada crítico, {fmt(WEIGHT.advertencia)} por
            cada advertencia y {fmt(WEIGHT.informativo)} por cada informativo sin firmar;
            sube solo cuando el abogado firma la remediación tras un retesteo en verde. Es
            un índice para priorizar, no una estimación de la multa: la SIC gradúa las
            sanciones con los criterios del art. 24 de la Ley 1581 (daño o peligro causado,
            beneficio económico, reincidencia, obstrucción, renuencia y reconocimiento de la
            infracción).
          </p>
        </details>

        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Link
            href="/auditoria/evaluacion-impacto"
            className="text-[12px] text-brand hover:underline"
          >
            Evaluación de impacto →
          </Link>
          <Link
            href="/auditoria/inventario"
            className="text-[12px] text-brand hover:underline"
          >
            Inventario de tratamientos →
          </Link>
        </div>
      </div>

      <Card>
        <RiskList rows={rows} filters={filters} />
      </Card>
    </div>
  );
}
