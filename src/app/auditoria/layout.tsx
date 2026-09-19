import Link from "next/link";
import type { ReactNode } from "react";

import { AccountChip, Logo, type MarkState } from "@/components/shell";
import { StepNav } from "@/components/step-nav";
import type { AuditRun } from "@/domain/types";
import { requireUser } from "@/server/auth";
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

function SandboxBadge({ sandboxId }: { sandboxId: string }) {
  return (
    <div className="rounded-[8px] border border-line bg-surface-muted p-3">
      <p className="flex items-center gap-2 text-[11px] font-medium text-safe">
        <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-safe" />
        Entorno seguro activo
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
        Pruebas autorizadas en <span className="font-mono">{sandboxId}</span>
      </p>
    </div>
  );
}

export default async function AuditoriaLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const run = await requireRun();

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
          <SandboxBadge sandboxId={run.scope.sandboxId} />
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
            <span className="rounded-[5px] border border-warning-soft bg-warning-soft px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-wider text-warning">
              Equipo rojo autorizado
            </span>
          </div>
          <AccountChip user={user} />
        </header>

        <main className="pb-10" style={{ viewTransitionName: "vigia-step-content" }}>
          {children}
        </main>

        <div className="mb-6 flex flex-col gap-3 lg:hidden">
          <SandboxBadge sandboxId={run.scope.sandboxId} />
        </div>
      </div>
    </div>
  );
}
