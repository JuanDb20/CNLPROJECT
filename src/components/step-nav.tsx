"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { cx } from "./ui";

// ponytail: startViewTransition espera a que su callback resuelva antes de
// capturar el estado "después"; el router de Next no expone cuándo terminó
// de pintar la nueva ruta, así que se aproxima con dos frames. Si Next
// adopta su integración nativa de View Transitions, esto se reemplaza por esa.
function afterNextPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

export const STEPS = [
  { n: 1, label: "Alcance y autorización", href: "/auditoria/alcance" },
  { n: 2, label: "Configuración", href: "/auditoria/configuracion" },
  { n: 3, label: "Ejecución", href: "/auditoria/ejecucion" },
  { n: 4, label: "Mapa de riesgos", href: "/auditoria/riesgos" },
  { n: 5, label: "Detalle de hallazgos", href: "/auditoria/hallazgos" },
  { n: 6, label: "Remediación y firma", href: "/auditoria/remediacion" },
] as const;

function StepIcon({ n }: { n: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4 };
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-[15px] shrink-0">
      {n === 1 && (
        <>
          <circle cx="8" cy="8" r="6" {...common} />
          <path d="M8 5v3.5" {...common} strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.7" fill="currentColor" stroke="none" />
        </>
      )}
      {n === 2 && (
        <>
          <path d="M3 12V6M8 12V4M13 12V8" {...common} strokeLinecap="round" />
        </>
      )}
      {n === 3 && (
        <>
          <circle cx="8" cy="8" r="6" {...common} />
          <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
        </>
      )}
      {n === 4 && (
        <path
          d="M2 10l3-4 3 3 3-6 3 7"
          {...common}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {n === 5 && (
        <>
          <circle cx="7" cy="7" r="4.2" {...common} />
          <path d="M10.2 10.2L14 14" {...common} strokeLinecap="round" />
        </>
      )}
      {n === 6 && (
        <>
          <circle cx="8" cy="8" r="6" {...common} />
          <path
            d="M5.5 8.2l1.8 1.8L11 6.3"
            {...common}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

export function StepNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const go = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof document === "undefined" || !document.startViewTransition) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    document.startViewTransition(async () => {
      router.push(href);
      await afterNextPaint();
    });
  };

  return (
    <nav aria-label="Fases de la auditoría" className="lg:px-0">
      <div className="relative">
        <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {STEPS.map((step) => {
            const active = isActive(step.href);
            return (
              <li key={step.href} className="shrink-0 lg:shrink">
                <Link
                  href={step.href}
                  onClick={go(step.href)}
                  aria-current={active ? "step" : undefined}
                  style={active ? { viewTransitionName: "vigia-step-pill" } : undefined}
                  className={cx(
                    "flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    active
                      ? "bg-ink font-medium text-canvas"
                      : "text-ink-soft hover:bg-surface-muted",
                  )}
                >
                  <StepIcon n={step.n} />
                  <span className="whitespace-nowrap">
                    {step.n}. {step.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {/* Indicio de que hay más pasos al desplazar, solo en el carrusel móvil. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 lg:hidden"
          style={{ background: "linear-gradient(to left, var(--color-surface), transparent)" }}
        />
      </div>
    </nav>
  );
}
