"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { alternarClausula } from "@/app/actions";
import { CheckIcon, buttonClass, cx } from "@/components/ui";
import type { ScopeClause } from "@/domain/types";

/**
 * Aceptación de cláusulas con lectura exigida, de a una.
 *
 * El consentimiento solo es válido si es informado: aceptar sin haber podido
 * leer el texto lo vicia. Por eso aquí no existe un botón de «aceptar todo»:
 * las cláusulas se muestran una por una, con el texto a la vista, y cada una se
 * acepta por separado después de recorrerlo hasta el final. Al aceptar, la
 * pantalla pasa sola a la siguiente pendiente.
 *
 * La comprobación es honesta sobre lo que puede y no puede acreditar: demuestra
 * que el texto completo pasó por la pantalla, no que la persona lo leyera. Por
 * eso la interfaz dice que quien acepta declara haberlo leído, en vez de vender
 * la casilla como prueba de lectura.
 *
 * El servidor sigue siendo la autoridad: marca una cláusula con la misma acción
 * de siempre y valida las obligatorias antes de dejar continuar. Esta pantalla
 * solo evita que se acepte a ciegas.
 */

function Clausula({
  clause,
  bloqueada,
  onAceptada,
}: {
  clause: ScopeClause;
  bloqueada: boolean;
  onAceptada: () => void;
}) {
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

  /* Un texto corto no exige desplazamiento: se da por recorrido al mostrarlo. */
  useEffect(() => comprobarRecorrido(caja.current), []);

  const alternar = () =>
    iniciar(async () => {
      await alternarClausula(clause.id, !clause.accepted);
      if (!clause.accepted) onAceptada();
    });

  return (
    <div className="mt-4">
      <h2 className="text-[15px] font-semibold leading-snug text-ink">{clause.label}</h2>

      <div
        ref={caja}
        onScroll={(e) => comprobarRecorrido(e.currentTarget)}
        tabIndex={0}
        role="region"
        aria-label={`Texto de la cláusula: ${clause.label}`}
        className="scroll-slim mt-3 max-h-[240px] overflow-y-auto rounded-[8px] border border-line bg-surface-muted p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <p className="text-[13px] leading-relaxed text-ink-soft">{clause.detail}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {clause.accepted ? (
          <>
            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-safe">
              <CheckIcon className="size-3.5" />
              Aceptada
            </p>
            {bloqueada ? null : (
              <button
                type="button"
                onClick={alternar}
                disabled={pendiente}
                className="text-[12px] text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-50"
              >
                Retirar la aceptación
              </button>
            )}
          </>
        ) : bloqueada ? null : (
          <>
            <button
              type="button"
              onClick={alternar}
              disabled={!leida || pendiente}
              className={buttonClass("primary")}
            >
              {pendiente ? "Registrando…" : "Acepto esta cláusula"}
            </button>
            <p className="text-[12px] text-ink-muted">
              {leida
                ? "Al aceptar, declaras haberla leído."
                : "Llega al final del texto para poder aceptarla."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function Clausulas({
  clauses,
  bloqueadas,
}: {
  clauses: ScopeClause[];
  /** El cliente ya firmó desde su portal, o el alcance ya se autorizó: el acuerdo queda congelado. */
  bloqueadas: boolean;
}) {
  /* La cláusula a la vista; null es el resumen, cuando ya no queda ninguna pendiente. */
  const [actual, setActual] = useState<number | null>(() => {
    const i = clauses.findIndex((c) => !c.accepted);
    return i === -1 ? null : i;
  });

  /** La siguiente pendiente después de `desde`, dando la vuelta; null si no queda ninguna. */
  const siguientePendiente = (desde: number) => {
    for (let salto = 1; salto < clauses.length; salto++) {
      const i = (desde + salto) % clauses.length;
      if (!clauses[i].accepted) return i;
    }
    return null;
  };

  if (actual === null) {
    return (
      <div>
        <p className="flex items-center gap-2 text-[13px] font-medium text-safe">
          <CheckIcon className="size-4" />
          Las {clauses.length} cláusulas están aceptadas
        </p>
        <ol className="mt-3 divide-y divide-line border-y border-line">
          {clauses.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActual(i)}
                className="flex w-full items-baseline gap-3 py-3 text-left text-[12.5px] leading-snug text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="w-4 shrink-0 text-ink-faint">{i + 1}.</span>
                <span className="min-w-0 flex-1">{c.label}</span>
                <span className="shrink-0 text-[12px] text-ink-muted">Leer</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const clause = clauses[actual];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-muted">
          Cláusula {actual + 1} de {clauses.length}
        </p>
        <ol className="flex gap-1.5">
          {clauses.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActual(i)}
                aria-current={i === actual ? "step" : undefined}
                aria-label={`Cláusula ${i + 1}${c.accepted ? ", aceptada" : ""}`}
                className={cx(
                  "grid size-7 place-items-center rounded-full border text-[11.5px] font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  i === actual
                    ? "border-ink bg-ink text-canvas"
                    : c.accepted
                      ? "border-safe bg-safe-soft text-safe"
                      : "border-line-strong text-ink-faint hover:border-ink-faint hover:text-ink",
                )}
              >
                {c.accepted ? <CheckIcon className="size-3.5" /> : i + 1}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <Clausula
        key={clause.id}
        clause={clause}
        bloqueada={bloqueadas}
        onAceptada={() => setActual(siguientePendiente(actual))}
      />
    </div>
  );
}
