"use client";

import { useEffect, useRef } from "react";

/**
 * Secuencia de arranque de la sesión, montada una sola vez en la puerta real
 * de la app (la portada). No es decoración: narra lo que de verdad está por
 * ocurrir (se va a abrir un sandbox autorizado), y solo entonces cede paso al
 * contenido, que entra en cascada vía `.stagger` + `body[data-portal-done]`.
 *
 * Respeta prefers-reduced-motion: el CSS oculta `.portal` por completo y
 * `document.body` recibe el estado final de una vez, sin animar.
 */
const MESSAGES = ["inicializando entorno seguro…", "verificando autorización…", "acceso concedido"];

export function PortalBoot() {
  const ref = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document.body.dataset.portalDone = "true";
      return;
    }

    let i = 0;
    let cancelled = false;

    function step() {
      if (cancelled) return;
      if (i < MESSAGES.length) {
        if (statusRef.current) statusRef.current.textContent = MESSAGES[i];
        if (barRef.current) {
          barRef.current.style.width = `${Math.round(((i + 1) / MESSAGES.length) * 100)}%`;
        }
        i += 1;
        setTimeout(step, 480);
      } else {
        setTimeout(() => {
          ref.current?.setAttribute("data-hide", "true");
          document.body.dataset.portalDone = "true";
        }, 300);
      }
    }
    const t = setTimeout(step, 200);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  return (
    <div ref={ref} className="portal">
      <svg className="portal-mark" width="48" height="48" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1 14.3 4.5V11.5L8 15 1.7 11.5V4.5Z"
          stroke="var(--color-ink)"
          strokeWidth="1"
        />
        <path
          className="chev"
          d="M5.6 5.8 9 8 5.6 10.2"
          stroke="var(--color-brand)"
          strokeWidth="1.1"
          strokeLinecap="square"
        />
      </svg>
      <p ref={statusRef} className="portal-status">
        inicializando…
      </p>
      <div className="portal-bar">
        <div ref={barRef} className="portal-bar-fill" />
      </div>
    </div>
  );
}
