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
  /* Qué es cada marco es consulta, no decisión: se muestra a petición y de a uno,
     en vez de apilar siete descripciones que nadie lee para marcar una casilla. */
  const [abierto, setAbierto] = useState<FrameworkId | null>(null);

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
      <ul className="divide-y divide-line border-y border-line">
        {frameworks.map((framework) => {
          const checked = selected.includes(framework.id);
          const detalle = abierto === framework.id;
          return (
            <li key={framework.id}>
              <div className="flex items-start gap-2.5 py-2.5">
                <button
                  type="button"
                  onClick={() => toggle(framework.id)}
                  aria-pressed={checked}
                  className="group flex min-w-0 flex-1 items-start gap-2.5 rounded-[6px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span
                    aria-hidden
                    className={cx(
                      "mt-px grid size-[17px] shrink-0 place-items-center rounded-[4px] border transition-colors",
                      checked
                        ? "border-brand bg-brand text-canvas"
                        : "border-line-strong bg-surface text-transparent group-hover:border-ink-faint",
                    )}
                  >
                    <CheckIcon className="size-3" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium leading-snug text-ink">
                      {framework.name}
                    </span>
                    {/* La norma principal basta para reconocer el marco; el
                        listado completo de circulares y decretos vive en el
                        detalle, detrás del «?». */}
                    <span className="mt-0.5 block font-mono text-[10.5px] leading-relaxed text-ink-faint">
                      {framework.citation.split(";")[0]}
                      {framework.citation.includes(";") ? " …" : ""}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbierto(detalle ? null : framework.id)}
                  aria-expanded={detalle}
                  aria-label={`Qué evalúa ${framework.name}`}
                  className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full border border-line text-[10px] text-ink-faint transition-colors hover:border-ink-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  ?
                </button>
              </div>

              {detalle ? (
                <div className="pb-3 pl-[27px]">
                  <p className="text-[11.5px] leading-relaxed text-ink-muted">
                    {framework.description}
                  </p>
                  {framework.citation.includes(";") ? (
                    <p className="mt-1.5 font-mono text-[10.5px] leading-relaxed text-ink-faint">
                      {framework.citation}
                    </p>
                  ) : null}
                </div>
              ) : null}
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
