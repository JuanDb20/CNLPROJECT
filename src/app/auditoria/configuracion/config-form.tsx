"use client";

import { useState, useTransition } from "react";

import { iniciarEscaneo } from "@/app/actions";
import { CheckIcon, buttonClass, cx } from "@/components/ui";
import type { Framework, FrameworkId } from "@/domain/types";

/**
 * Selección de marcos normativos.
 *
 * Es cliente porque la selección debe responder sin recargar, pero no guarda
 * nada por su cuenta: al iniciar el escaneo envía el conjunto completo al
 * servidor, que es el único que decide qué módulos corren.
 */
export function ConfigForm({
  frameworks,
  initialSelected,
  initialPiiMask,
}: {
  frameworks: Framework[];
  initialSelected: FrameworkId[];
  initialPiiMask: boolean;
}) {
  const [selected, setSelected] = useState<FrameworkId[]>(initialSelected);
  const [pending, startTransition] = useTransition();

  const toggle = (id: FrameworkId) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );

  const start = () =>
    startTransition(async () => {
      await iniciarEscaneo({
        frameworks: selected,
        piiMaskEnabled: initialPiiMask,
      });
    });

  return (
    <div className="flex h-full flex-col">
      <ul className="space-y-2.5">
        {frameworks.map((framework) => {
          const checked = selected.includes(framework.id);
          return (
            <li key={framework.id}>
              <button
                type="button"
                onClick={() => toggle(framework.id)}
                aria-pressed={checked}
                className={cx(
                  "group flex w-full items-start gap-2.5 rounded-[8px] border p-3 text-left transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  checked
                    ? "border-line bg-surface-muted"
                    : "border-line bg-surface hover:bg-canvas",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "mt-px grid size-[17px] shrink-0 place-items-center rounded-[4px] border transition-colors",
                    checked
                      ? "border-brand bg-brand text-white"
                      : "border-line-strong bg-surface text-transparent group-hover:border-ink-faint",
                  )}
                >
                  <CheckIcon className="size-3" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium leading-snug text-ink">
                    {framework.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10.5px] text-brand">
                    {framework.citation}
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">
                    {framework.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-2.5 pt-5 sm:flex-row">
        <a href="/auditoria/alcance" className={buttonClass("secondary")}>
          Volver
        </a>
        <button
          type="button"
          onClick={start}
          disabled={selected.length === 0 || pending}
          className={cx(buttonClass("brand"), "flex-1")}
        >
          {pending ? "Iniciando…" : "Iniciar escaneo seguro"}
        </button>
      </div>
      {selected.length === 0 ? (
        <p className="mt-2 text-[11px] text-ink-muted">
          Selecciona al menos un marco normativo.
        </p>
      ) : null}
    </div>
  );
}
