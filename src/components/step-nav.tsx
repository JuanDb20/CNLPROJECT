"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { CheckIcon, cx } from "./ui";

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

/** Los 6 pasos como secuencia horizontal: el actual lleva su nombre, los demás
 * solo el número (o un check si ya se pasaron) — para que se lea de un vistazo
 * cuál es el único que importa ahora mismo. */
export function StepNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const currentIndex = STEPS.findIndex((step) => isActive(step.href));

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
    <nav aria-label="Fases de la auditoría">
      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const done = currentIndex >= 0 && i < currentIndex;
          const current = i === currentIndex;
          return (
            <li key={step.href} className={cx("flex min-w-0 items-center", !current && "shrink-0")}>
              <Link
                href={step.href}
                onClick={go(step.href)}
                aria-current={current ? "step" : undefined}
                aria-label={`${step.n}. ${step.label}`}
                title={`${step.n}. ${step.label}`}
                style={current ? { viewTransitionName: "vigia-step-pill" } : undefined}
                className={cx(
                  "flex min-w-0 items-center gap-2 rounded-full py-1",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-medium transition-colors",
                    current && "bg-ink text-canvas",
                    done && "bg-brand-soft text-brand",
                    !current && !done && "border border-line text-ink-faint",
                  )}
                >
                  {done ? <CheckIcon className="size-3.5" /> : step.n}
                </span>
                <span
                  aria-hidden
                  className={cx(
                    "truncate text-[13px] font-medium text-ink",
                    current ? "hidden sm:inline" : "hidden",
                  )}
                >
                  {step.label}
                </span>
              </Link>
              {i < STEPS.length - 1 ? (
                <span aria-hidden className="mx-2 h-px w-4 shrink-0 bg-line sm:w-auto sm:flex-1" />
              ) : null}
            </li>
          );
        })}
      </ol>
      {/* En teléfono el nombre del paso no cabe en la fila: va completo debajo. */}
      {currentIndex >= 0 ? (
        <p aria-hidden className="mt-2 text-[13px] font-medium text-ink sm:hidden">
          {STEPS[currentIndex].n}. {STEPS[currentIndex].label}
        </p>
      ) : null}
    </nav>
  );
}
