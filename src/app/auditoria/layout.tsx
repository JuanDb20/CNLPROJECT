import Link from "next/link";
import type { ReactNode } from "react";

import { alternarModoAprendizaje } from "@/app/actions";
import { AccountChip, Logo, type MarkState } from "@/components/shell";
import { StepNav } from "@/components/step-nav";
import { TemaToggle } from "@/components/tema";
import { Tag, cx } from "@/components/ui";
import type { AuditRun, RunStatus } from "@/domain/types";
import { requireUser } from "@/server/auth";
import { learningMode } from "@/server/http";
import { requireRun } from "@/server/session";

/** Lo que la marca del header comunica de un vistazo, sin texto nuevo. */
function markState(run: AuditRun): MarkState {
  if (run.status === "ejecutando") return "ejecutando";
  if (run.findings.some((f) => f.severity === "critico" && f.remediation.status !== "firmado")) {
    return "critico";
  }
  if (run.status === "certificado") return "seguro";
  return "reposo";
}

/** El estado de la auditoría, en la misma palabra para el abogado en cualquier
 * pantalla: qué falta y quién lo tiene que hacer. Los tonos son los mismos que
 * usa la lista de "Mis auditorías" (panel/page.tsx). */
const STATUS_LABEL: Record<RunStatus, string> = {
  borrador: "Falta que el cliente autorice",
  configurado: "Autorizada, falta iniciar el análisis",
  ejecutando: "Análisis en curso",
  analizado: "Hallazgos listos para revisar",
  remediando: "Revisando las correcciones",
  certificado: "Informe expedido",
};

const STATUS_TONE: Record<RunStatus, "required" | "brand" | "safe"> = {
  borrador: "required",
  configurado: "brand",
  ejecutando: "brand",
  analizado: "brand",
  remediando: "brand",
  certificado: "safe",
};

export default async function AuditoriaLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const run = await requireRun();
  const aprendizaje = await learningMode();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1320px] flex-col px-4 py-4 sm:px-6 lg:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/panel"
            className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
          >
            <span aria-hidden>←</span> Mis auditorías
          </Link>
          <span aria-hidden className="text-line-strong">
            /
          </span>
          <Logo state={markState(run)} compact />
          <span className="text-[13px] font-medium text-ink">
            Auditoría de {run.scope.client.name}
          </span>
          <Tag tone={STATUS_TONE[run.status]}>{STATUS_LABEL[run.status]}</Tag>
        </div>
        <div className="flex items-center gap-2">
          <form action={alternarModoAprendizaje}>
            <button
              type="submit"
              aria-pressed={aprendizaje}
              title="Explica cada hallazgo en lenguaje sencillo, sin tecnicismos."
              className={cx(
                "rounded-[6px] border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                aprendizaje
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line bg-surface text-ink-soft hover:bg-surface-muted",
              )}
            >
              Explicar hallazgos
            </button>
          </form>
          <TemaToggle className="rounded-[6px] border border-line bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-ink-soft transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
          <AccountChip user={user} />
        </div>
      </header>

      <div className="border-b border-line py-4">
        <StepNav />
      </div>

      <main id="contenido" className="py-6" style={{ viewTransitionName: "vigia-step-content" }}>
        {children}
      </main>
    </div>
  );
}
