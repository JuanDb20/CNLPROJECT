import type { ReactNode } from "react";

import { StepNav } from "@/components/step-nav";
import { ShieldIcon } from "@/components/ui";
import { SANDBOX_ID } from "@/domain/scenarios";

const OPERATOR = "legal.ops@fintrex.ai";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-full border border-line-strong text-ink"
      >
        <ShieldIcon className="size-[15px]" />
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-[0.14em] text-ink">
          VIGÍA
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
          Red Team IA
        </span>
      </span>
    </div>
  );
}

function SandboxBadge() {
  return (
    <div className="rounded-[8px] border border-line bg-surface-muted p-3">
      <p className="flex items-center gap-2 text-[11px] font-medium text-safe">
        <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-safe" />
        Entorno seguro activo
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
        Pruebas autorizadas en <span className="font-mono">{SANDBOX_ID}</span>
      </p>
    </div>
  );
}

export default function AuditoriaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1320px] flex-col gap-0 px-4 py-4 sm:px-6 lg:flex-row lg:gap-7 lg:py-6">
      {/* Columna de navegación */}
      <aside className="flex shrink-0 flex-col gap-4 lg:w-[252px]">
        <div className="rounded-[12px] border border-line bg-surface p-4">
          <Logo />
          <div className="mt-4 border-t border-line pt-3">
            <StepNav />
          </div>
        </div>

        <div className="hidden flex-col gap-3 lg:flex">
          <SandboxBadge />
          <p className="px-1 text-[10px] leading-relaxed text-ink-faint">
            Conforme a Ley 1581 de 2012, Ley 1266 de 2008, RGPD y EU AI Act Art. 50.
            Acceso restringido.
          </p>
        </div>
      </aside>

      {/* Columna de contenido */}
      <div className="mt-4 min-w-0 flex-1 lg:mt-0">
        <header className="mb-5 flex flex-wrap items-center justify-end gap-3">
          <span className="rounded-[5px] border border-warning-soft bg-warning-soft px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-wider text-warning">
            Red team autorizado
          </span>
          <span className="flex items-center gap-2 text-[12px] text-ink-muted">
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-full bg-ink text-[10px] font-semibold text-white"
            >
              J
            </span>
            {OPERATOR}
          </span>
        </header>

        <main className="pb-10">{children}</main>

        <div className="mb-6 flex flex-col gap-3 lg:hidden">
          <SandboxBadge />
        </div>
      </div>
    </div>
  );
}
