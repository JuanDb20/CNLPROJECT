"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "./ui";

export const STEPS = [
  { n: 1, label: "Onboarding & Alcance", href: "/auditoria/alcance" },
  { n: 2, label: "Configuración", href: "/auditoria/configuracion" },
  { n: 3, label: "Ejecución en Vivo", href: "/auditoria/ejecucion" },
  { n: 4, label: "Mapa de Riesgos", href: "/auditoria/riesgos" },
  { n: 5, label: "Detalle de Hallazgos", href: "/auditoria/hallazgos" },
  { n: 6, label: "Remediación & Firma", href: "/auditoria/remediacion" },
] as const;

function StepIcon({ n, active }: { n: number; active: boolean }) {
  const color = active ? "currentColor" : "currentColor";
  const common = { fill: "none", stroke: color, strokeWidth: 1.4 };
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-[15px] shrink-0">
      {n === 1 && (
        <>
          <circle cx="8" cy="8" r="6" {...common} />
          <path d="M8 5v3.5" {...common} strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.7" fill={color} stroke="none" />
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
          <circle cx="8" cy="8" r="2" fill={color} stroke="none" />
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Fases de la auditoría" className="lg:px-0">
      <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {STEPS.map((step) => {
          const active = isActive(step.href);
          return (
            <li key={step.href} className="shrink-0 lg:shrink">
              <Link
                href={step.href}
                aria-current={active ? "step" : undefined}
                className={cx(
                  "flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  active
                    ? "bg-ink font-medium text-canvas"
                    : "text-ink-soft hover:bg-surface-muted",
                )}
              >
                <StepIcon n={step.n} active={active} />
                <span className="whitespace-nowrap">
                  {step.n}. {step.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
