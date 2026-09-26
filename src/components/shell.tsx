import { salir } from "@/app/actions";
import type { User } from "@/domain/types";

import { MarkIcon } from "./ui";

/** Estado real de la auditoría abierta, si la hay. Sin `state`, la marca queda estática. */
export type MarkState = "reposo" | "ejecutando" | "critico" | "seguro";

const MARK_TITLE: Record<MarkState, string> = {
  reposo: "Sin ejecución activa",
  ejecutando: "Pruebas corriendo en el entorno seguro",
  critico: "Hay un hallazgo crítico sin firmar",
  seguro: "Todos los hallazgos están firmados",
};

export function Logo({ state, compact = false }: { state?: MarkState; compact?: boolean }) {
  const mark = (
    <span
      aria-hidden
      title={state ? MARK_TITLE[state] : undefined}
      data-state={state}
      className={
        state
          ? "mark size-7 rounded-[7px] border border-line-strong"
          : "grid size-7 place-items-center rounded-[7px] border border-line-strong text-ink"
      }
    >
      {state ? <span className="mark-ring" aria-hidden /> : null}
      <MarkIcon className="size-[15px]" />
    </span>
  );

  // Versión compacta: solo el ícono con su color de estado, para el header de una
  // auditoría abierta (ya hay un "Mis auditorías" para volver, no hace falta el wordmark).
  if (compact) return mark;

  return (
    <div className="flex items-center gap-2.5">
      {mark}
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-[0.14em] text-ink">
          VIGÍA
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
          Auditoría de cumplimiento
        </span>
      </span>
    </div>
  );
}

/** Abogado de la sesión y botón de salida. */
export function AccountChip({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3 text-[12px] text-ink-muted">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-full bg-ink text-[10px] font-semibold text-canvas"
        >
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span>
          {user.name}
          {user.professionalCard ? (
            <span className="text-ink-faint"> · T.P. {user.professionalCard}</span>
          ) : null}
        </span>
      </span>
      <form action={salir}>
        <button
          type="submit"
          className="rounded-[6px] px-2 py-1 text-[12px] text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
