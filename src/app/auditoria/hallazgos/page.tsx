import Link from "next/link";

import { corregirTodos } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, SeverityBadge, buttonClass, cx } from "@/components/ui";
import { sortFindings } from "@/domain/scoring";
import { requireAnalyzedRun } from "@/server/session";

import { AVANCE } from "./secuencia";

export const metadata = { title: "Hallazgos" };

export const dynamic = "force-dynamic";

export default async function HallazgosPage() {
  const run = await requireAnalyzedRun();
  const findings = sortFindings(run.findings);
  const pendientes = findings.filter((f) => f.remediation.status === "propuesta").length;

  return (
    <div className="max-w-[780px] space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Detalle de hallazgos
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Del más grave al menos grave. Abre uno para ver qué pasa, qué norma incumple y cómo
          se corrige.
        </p>
      </div>

      {pendientes > 0 ? (
        <Card>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Puedes aceptar de una vez la corrección que VIGÍA propone para cada hallazgo y
            probarlas todas juntas con la versión corregida, o revisar los hallazgos uno por uno.
          </p>
          <form action={corregirTodos} className="mt-3">
            <SubmitButton variant="primary" pendingText="Preparando las correcciones…">
              {pendientes === 1
                ? "Aceptar la corrección propuesta y continuar"
                : `Aceptar las ${pendientes} correcciones propuestas y continuar`}{" "}
              <span aria-hidden>→</span>
            </SubmitButton>
          </form>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
            Aceptar no firma nada: en el paso 6 se prueba la versión corregida y firmas cada
            hallazgo.
          </p>
        </Card>
      ) : findings.length > 0 ? (
        <Link
          href={run.certificate ? `/informe/${run.id}` : "/auditoria/remediacion"}
          className={buttonClass("primary")}
        >
          {run.certificate ? "Ver el informe" : "Continuar con la remediación y firma"}{" "}
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      <Card className="py-2 sm:py-2">
        <ul className="divide-y divide-line">
          {findings.map((finding) => {
            const status =
              finding.remediation.status === "propuesta" ? null : AVANCE[finding.remediation.status];
            return (
              <li key={finding.id}>
                <Link
                  href={`/auditoria/hallazgos/${finding.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[6px] py-3.5 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <div className="w-full sm:w-[108px] sm:shrink-0">
                    <SeverityBadge severity={finding.severity} />
                    <p className="mt-1.5 font-mono text-[10px] text-ink-faint">{finding.code}</p>
                  </div>
                  <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-ink">
                    {finding.title}
                  </p>
                  {status ? (
                    <span className={cx("shrink-0 text-[12px] font-medium", status.tone)}>
                      {status.label}
                    </span>
                  ) : null}
                  <span aria-hidden className="shrink-0 text-ink-faint">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
