import { Card, cx } from "@/components/ui";
import { FRAMEWORKS, getRules } from "@/domain/compliance";
import { isResolved, scoreRun, sortFindings } from "@/domain/scoring";
import type { FrameworkId } from "@/domain/types";
import { requireAnalyzedRun } from "@/server/session";

import { RiskList, type FilterOption, type RiskRow } from "./risk-list";

export const dynamic = "force-dynamic";

const KIND_LABEL = {
  juridico: "Jurídica",
  tecnico: "Técnica",
  interfaz: "Interfaz",
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
    return {
      id: finding.id,
      code: finding.code,
      severity: finding.severity,
      title: finding.title,
      summary: finding.summary,
      signed: isResolved(finding),
      frameworks: [...new Set(rules.map((r) => r.framework))],
      chips: rules.slice(0, 3).map((rule) => ({
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-baseline gap-2.5">
            <p className="text-[34px] font-semibold leading-none text-ink">
              {score.score}
            </p>
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
              {score.resolved} hallazgo(s) firmado(s)
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

      <Card>
        <RiskList rows={rows} filters={filters} />
      </Card>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        La puntuación penaliza cada hallazgo abierto según su severidad (crítico 9,
        advertencia 3,5, informativo 0,5 sobre 100) y sube únicamente cuando la
        remediación queda firmada tras un retesteo en verde.
      </p>
    </div>
  );
}
