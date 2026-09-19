import Link from "next/link";

import { Card, CardHeader, SeverityBadge, cx } from "@/components/ui";
import { sortFindings } from "@/domain/scoring";
import type { RemediationStatus } from "@/domain/types";
import { requireAnalyzedRun } from "@/server/session";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<RemediationStatus, string> = {
  propuesta: "Parche propuesto",
  "pr-abierto": "Parche generado",
  retesteado: "Retesteado",
  firmado: "Firmado",
};

const STATUS_STYLE: Record<RemediationStatus, string> = {
  propuesta: "bg-canvas text-ink-muted",
  "pr-abierto": "bg-warning-soft text-warning",
  retesteado: "bg-info-soft text-info",
  firmado: "bg-safe-soft text-safe",
};

export default async function HallazgosPage() {
  const run = await requireAnalyzedRun();
  const findings = sortFindings(run.findings);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Detalle de hallazgos
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Evidencia forense y parche propuesto por hallazgo
        </p>
      </div>

      <Card>
        <CardHeader
          title={`${findings.length} hallazgos en la auditoría ${run.id}`}
          description="Abre un hallazgo para revisar la prueba y la evidencia en el código, la trazabilidad normativa y el parche que VIGÍA propone."
        />
        <ul className="divide-y divide-line">
          {findings.map((finding) => (
            <li key={finding.id}>
              <Link
                href={`/auditoria/hallazgos/${finding.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[6px] py-3.5 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="w-full sm:w-[108px] sm:shrink-0">
                  <SeverityBadge severity={finding.severity} />
                  <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
                    {finding.code}
                  </p>
                </div>
                <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-ink">
                  {finding.title}
                </p>
                <span
                  className={cx(
                    "shrink-0 rounded-[5px] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
                    STATUS_STYLE[finding.remediation.status],
                  )}
                >
                  {STATUS_LABEL[finding.remediation.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
