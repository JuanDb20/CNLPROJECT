"use client";

import { useRef, useState, useTransition } from "react";

import { alternarClausula } from "@/app/actions";
import { CheckIcon, cx } from "@/components/ui";
import type { ScopeClause } from "@/domain/types";

/**
 * Aceptación de cláusulas con lectura exigida.
 *
 * El consentimiento solo es válido si es informado: aceptar sin haber podido
 * leer el texto lo vicia. Por eso aquí no existe un botón de «aceptar todo» y
 * cada cláusula se acepta por separado, con el texto desplegado y desplazado
 * hasta el final.
 *
 * La comprobación es honesta sobre lo que puede y no puede acreditar: demuestra
 * que el texto completo pasó por la pantalla, no que la persona lo leyera. Esa
 * distinción se le dice al usuario en la propia interfaz en vez de vender la
 * casilla como prueba de lectura.
 *
 * El servidor sigue siendo la autoridad: marca una cláusula con la misma acción
 * de siempre y valida las obligatorias antes de dejar continuar. Esta pantalla
 * solo evita que se acepte a ciegas.
 */

function Estado({ aceptada }: { aceptada: boolean }) {
  return (
    <span
      className={cx(
        "shrink-0 rounded-[5px] px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider",
        aceptada ? "bg-safe-soft text-safe" : "bg-surface-muted text-ink-faint",
      )}
    >
      {aceptada ? "Aceptada" : "Pendiente"}
    </span>
  );
}

function Clausula({
  clause,
  indice,
  bloqueada,
}: {
  clause: ScopeClause;
  indice: number;
  bloqueada: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  const [leida, setLeida] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const caja = useRef<HTMLDivElement>(null);

  /** Marca el texto como recorrido al llegar al final, o si no hay nada que desplazar. */
  const comprobarRecorrido = (el: HTMLDivElement | null) => {
    if (!el) return;
    const sinDesplazamiento = el.scrollHeight <= el.clientHeight + 4;
    const alFinal = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    if (sinDesplazamiento || alFinal) setLeida(true);
  };

  const abrir = () => {
    const siguiente = !abierta;
    setAbierta(siguiente);
    /* Un texto corto no exige desplazamiento: se da por recorrido al abrirlo. */
    if (siguiente) requestAnimationFrame(() => comprobarRecorrido(caja.current));
  };

  const aceptar = () =>
    iniciar(async () => {
      await alternarClausula(clause.id, !clause.accepted);
    });

  const idTexto = `clausula-${clause.id}-texto`;

  return (
    <li className="border-b border-line last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={abrir}
          aria-expanded={abierta}
          aria-controls={idTexto}
          className="flex w-full items-start gap-3 py-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span
            aria-hidden
            className={cx(
              "mt-px grid size-[18px] shrink-0 place-items-center rounded-[4px] border transition-colors",
              clause.accepted
                ? "border-safe bg-safe text-canvas"
                : "border-line-strong bg-surface text-transparent",
            )}
          >
            <CheckIcon className="size-3" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] leading-snug text-ink">
              <span className="text-ink-faint">{indice}. </span>
              {clause.label}
              {clause.required ? <span className="text-critical"> *</span> : null}
            </span>
            {!abierta ? (
              <span className="mt-1 block text-[11px] text-ink-faint">
                {clause.accepted ? "Texto aceptado" : "Abre para leer el texto completo"}
              </span>
            ) : null}
          </span>

          <Estado aceptada={clause.accepted} />
          <span
            aria-hidden
            className={cx(
              "mt-0.5 shrink-0 text-ink-faint transition-transform",
              abierta && "rotate-90",
            )}
          >
            <svg viewBox="0 0 16 16" className="size-3.5">
              <path
                d="M6 3.5 10.5 8 6 12.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </h3>

      {abierta ? (
        <div className="pb-4 pl-[30px]">
          <div
            id={idTexto}
            ref={caja}
            onScroll={(e) => comprobarRecorrido(e.currentTarget)}
            tabIndex={0}
            className="scroll-slim max-h-[190px] overflow-y-auto rounded-[8px] border border-line bg-surface-muted p-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <p className="text-[11.5px] leading-relaxed text-ink-soft">{clause.detail}</p>
          </div>

          {bloqueada ? (
            <p className="mt-2.5 text-[11px] text-ink-faint">
              El representante legal ya aceptó el acuerdo desde su portal; el texto queda
              como constancia y no puede modificarse.
            </p>
          ) : clause.accepted ? (
            <button
              type="button"
              onClick={aceptar}
              disabled={pendiente}
              className="mt-2.5 text-[11.5px] text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-50"
            >
              Retirar la aceptación de esta cláusula
            </button>
          ) : (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={aceptar}
                disabled={!leida || pendiente}
                className={cx(
                  "inline-flex items-center justify-center rounded-[7px] px-3.5 py-2 text-[12px] font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  leida
                    ? "bg-ink text-canvas hover:bg-ink-soft"
                    : "cursor-not-allowed bg-line-strong text-canvas",
                )}
              >
                {pendiente ? "Registrando…" : "Acepto esta cláusula"}
              </button>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                {leida
                  ? "El texto completo pasó por pantalla. Aceptar no acredita que se haya leído: lo acredita quien acepta."
                  : "Desplázate hasta el final del texto para poder aceptarlo."}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function Clausulas({
  clauses,
  bloqueadas,
}: {
  clauses: ScopeClause[];
  /** El cliente ya firmó desde su portal: el acuerdo queda congelado. */
  bloqueadas: boolean;
}) {
  const aceptadas = clauses.filter((c) => c.accepted).length;
  const faltan = clauses.filter((c) => c.required && !c.accepted).length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2.5">
        <p className="text-[12px] text-ink-muted">
          {aceptadas} de {clauses.length} cláusulas aceptadas
        </p>
        {faltan > 0 ? (
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-warning">
            Faltan {faltan} obligatoria{faltan === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-safe">
            Obligatorias completas
          </p>
        )}
      </div>

      <ul>
        {clauses.map((clause, i) => (
          <Clausula
            key={clause.id}
            clause={clause}
            indice={i + 1}
            bloqueada={bloqueadas}
          />
        ))}
      </ul>
    </div>
  );
}
