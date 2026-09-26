"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { iniciarEscaneo } from "@/app/actions";
import { CheckIcon, buttonClass, cx } from "@/components/ui";
import type { Framework, FrameworkId } from "@/domain/types";

/**
 * Selección de normas y arranque del análisis.
 *
 * Es cliente porque la selección debe responder sin recargar, pero no guarda
 * nada por su cuenta: al iniciar el análisis envía el conjunto completo al
 * servidor, que es el único que decide qué módulos corren.
 *
 * El enmascaramiento no es una opción: VIGÍA lo aplica siempre a la evidencia,
 * así que aquí se informa y no se ofrece un interruptor que no controlaría nada.
 */
export function ConfigForm({
  frameworks,
  initialSelected,
}: {
  frameworks: Framework[];
  initialSelected: FrameworkId[];
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
      await iniciarEscaneo({ frameworks: selected });
    });

  return (
    <div>
      <ul className="divide-y divide-line rounded-[12px] border border-line bg-surface px-5">
        {frameworks.map((framework) => {
          const checked = selected.includes(framework.id);
          const detalle = abierto === framework.id;
          return (
            <li key={framework.id}>
              <div className="flex items-start gap-2.5 py-2">
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
                  {/* La norma principal basta para reconocer el marco; el listado
                      completo de circulares y decretos vive en el detalle, detrás del «?». */}
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 leading-snug">
                    <span className="text-[13px] font-medium text-ink">{framework.name}</span>
                    <span className="text-[12px] text-ink-muted">
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
                  className="mt-px grid size-[20px] shrink-0 place-items-center rounded-full border border-line text-[11px] text-ink-faint transition-colors hover:border-ink-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  ?
                </button>
              </div>

              {detalle ? (
                <div className="pb-3 pl-[27px]">
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    {framework.description}
                  </p>
                  {framework.citation.includes(";") ? (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">
                      {framework.citation}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-muted">
        <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-safe" />
        En la evidencia que guarda, VIGÍA oculta contraseñas, llaves de acceso, correos y
        números de documento.
      </p>

      <div className="mt-4 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
        <Link href="/auditoria/configuracion?paso=1" className={buttonClass("secondary")}>
          Volver
        </Link>
        <button
          type="button"
          onClick={start}
          disabled={selected.length === 0 || pending}
          className={buttonClass("brand")}
        >
          {pending ? "Iniciando…" : "Iniciar el análisis"}
        </button>
      </div>
      {selected.length === 0 ? (
        <p className="mt-2 text-right text-[12px] text-ink-muted">Marca al menos una norma.</p>
      ) : null}
    </div>
  );
}
