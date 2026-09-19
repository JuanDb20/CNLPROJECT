import Link from "next/link";
import type { ReactNode } from "react";

import { alternarModoAprendizaje } from "@/app/actions";
import { AccountChip, Logo, type MarkState } from "@/components/shell";
import { StepNav } from "@/components/step-nav";
import { cx } from "@/components/ui";
import { executionLabel } from "@/domain/format";
import type { AuditRun } from "@/domain/types";
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

function SandboxBadge({ sandboxId, authorized }: { sandboxId: string; authorized: boolean }) {
  return (
    <div className="rounded-[8px] border border-line bg-surface-muted p-3">
      <p
        className={cx(
          "flex items-center gap-2 text-[11px] font-medium",
          authorized ? "text-safe" : "text-ink-muted",
        )}
      >
        <span
          aria-hidden
          className={cx("size-1.5 rounded-full", authorized ? "pulse-dot bg-safe" : "bg-line-strong")}
        />
        {authorized ? "Entorno seguro activo" : "Entorno en preparación"}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
        {authorized ? (
          <>Pruebas autorizadas en <span className="font-mono">{executionLabel(sandboxId)}</span></>
        ) : (
          <>Pendiente de autorización · <span className="font-mono">{executionLabel(sandboxId)}</span></>
        )}
      </p>
    </div>
  );
}

export default async function AuditoriaLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const run = await requireRun();
  const authorized = run.scope.authorizedAt !== null;
  const aprendizaje = await learningMode();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1320px] flex-col gap-0 px-4 py-4 sm:px-6 lg:flex-row lg:gap-7 lg:py-6">
      {/* Columna de navegación */}
      <aside className="flex shrink-0 flex-col gap-4 lg:w-[252px]">
        <div className="rounded-[12px] border border-line bg-surface p-4">
          <Logo state={markState(run)} />
          <div className="mt-4 border-t border-line pt-3">
            <StepNav />
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          <SandboxBadge sandboxId={run.scope.sandboxId} authorized={authorized} />
          <p className="px-1 text-[10px] leading-relaxed text-ink-faint">
            Marco: Ley 1581 de 2012 y su reglamentación, Ley 1266 de 2008 y Ley 1480 de
            2011. RGPD y AI Act solo como referencia comparada.
          </p>
        </div>
      </aside>

      {/* Columna de contenido */}
      <div className="mt-4 min-w-0 flex-1 lg:mt-0">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/panel"
              className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
            >
              <span aria-hidden>←</span> Mis auditorías
            </Link>
            <span className="text-[12.5px] font-medium text-ink">
              {run.scope.client.name}
            </span>
            {authorized ? (
              <span className="rounded-[5px] border border-warning-soft bg-warning-soft px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-wider text-warning">
                Equipo rojo autorizado
              </span>
            ) : (
              <span className="rounded-[5px] border border-line bg-canvas px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                Pendiente de autorización
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <form action={alternarModoAprendizaje}>
              <button
                type="submit"
                aria-pressed={aprendizaje}
                className={cx(
                  "rounded-[6px] border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  aprendizaje
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-surface text-ink-soft hover:bg-surface-muted",
                )}
              >
                Modo aprendizaje
              </button>
            </form>
            <AccountChip user={user} />
          </div>
        </header>

        <main id="contenido" className="pb-10" style={{ viewTransitionName: "vigia-step-content" }}>
          {children}
        </main>

        <div className="mb-6 flex flex-col gap-3 lg:hidden">
          <SandboxBadge sandboxId={run.scope.sandboxId} authorized={authorized} />
        </div>
      </div>
    </div>
  );
}
