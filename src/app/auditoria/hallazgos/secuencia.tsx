import type { ReactNode } from "react";

import { CheckIcon, cx } from "@/components/ui";
import type { RemediationStatus } from "@/domain/types";

/* Piezas de las pantallas 5 y 6: una secuencia en la que solo el paso actual
   lleva acción, y pliegues para lo que se consulta pero no hace falta leer
   para avanzar (fundamento jurídico, evidencia técnica, diff). */

export type EstadoPaso = "hecho" | "actual" | "pendiente";

/** Estado del hallazgo en palabras. Solo se marca lo que ya avanzó: diez veces «parche propuesto» no dice nada. */
export const AVANCE: Record<Exclude<RemediationStatus, "propuesta">, { label: string; tone: string }> = {
  "pr-abierto": { label: "En corrección", tone: "text-warning" },
  retesteado: { label: "Retesteo superado", tone: "text-info" },
  firmado: { label: "Concepto firmado", tone: "text-safe" },
};

export function Paso({
  n,
  titulo,
  estado,
  nota,
  children,
}: {
  n: number;
  titulo: string;
  estado: EstadoPaso;
  /** Estado en palabras, a la derecha del título. */
  nota?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li
      aria-current={estado === "actual" ? "step" : undefined}
      className="relative flex gap-3.5 pb-7 before:absolute before:bottom-1 before:left-[13px] before:top-9 before:w-px before:bg-line last:pb-0 last:before:hidden"
    >
      <span
        aria-hidden
        className={cx(
          "grid size-7 shrink-0 place-items-center rounded-full font-mono text-[12px] font-medium",
          estado === "hecho" && "bg-safe-soft text-safe",
          estado === "actual" && "bg-ink text-canvas",
          estado === "pendiente" && "border border-line bg-surface text-ink-faint",
        )}
      >
        {estado === "hecho" ? <CheckIcon /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-[3px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2
            className={cx(
              "text-[15px] font-semibold tracking-tight",
              estado === "pendiente" ? "text-ink-faint" : "text-ink",
            )}
          >
            <span className="sr-only">
              Paso {n}
              {estado === "hecho" ? " (hecho)" : ""}:{" "}
            </span>
            {titulo}
          </h2>
          {nota}
        </div>
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </li>
  );
}

export function Pliegue({
  titulo,
  abierto,
  children,
}: {
  titulo: string;
  /** Para abrirlo cuando adentro hay algo que el usuario debe ver (un error). */
  abierto?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={abierto} className="group mt-3">
      <summary className="inline-block cursor-pointer list-none text-[12.5px] text-ink-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="mr-1.5 inline-block transition-transform group-open:rotate-90">
          ›
        </span>
        {titulo}
      </summary>
      <div className="mt-2.5 space-y-3">{children}</div>
    </details>
  );
}
