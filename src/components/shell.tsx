import { salir } from "@/app/actions";
import type { User } from "@/domain/types";

import { MarkIcon } from "./ui";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-[7px] border border-line-strong text-brand"
      >
        <MarkIcon className="size-[15px]" />
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-[0.14em] text-ink">
          VIGÍA
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
          Equipo rojo legal
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
          {user.name} <span className="text-ink-faint">· T.P. {user.professionalCard}</span>
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
