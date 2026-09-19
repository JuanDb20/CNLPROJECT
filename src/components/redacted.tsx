"use client";

import { Fragment, useState } from "react";

const MASK = "[ENMASCARADO]";

/**
 * Resalta cada tramo que el motor ya enmascaró antes de enviar la evidencia al
 * navegador. El clic no revela ningún dato real — VIGÍA nunca lo envía — solo
 * retira la barra sobre la etiqueta para ubicar rápido qué campo era cuál.
 */
export function RedactedLine({ text }: { text: string }) {
  const parts = text.split(MASK);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 ? <RedactedToken /> : null}
        </Fragment>
      ))}
    </>
  );
}

function RedactedToken() {
  const [open, setOpen] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={open ? "[ENMASCARADO], ocultar la marca de nuevo" : "[ENMASCARADO], ubicar qué campo era este"}
      className={open ? "redact open" : "redact"}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
    >
      <span className="redact-bar" aria-hidden />
      {MASK}
    </span>
  );
}
