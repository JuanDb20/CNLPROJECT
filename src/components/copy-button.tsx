"use client";

import { useState } from "react";

import { buttonClass, cx } from "./ui";

/** Copia un valor al portapapeles con confirmación visual breve. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // ponytail: sin portapapeles disponible no hay nada más que ofrecer;
          // el enlace sigue seleccionable a mano en el campo de texto.
        }
      }}
      className={cx(buttonClass("secondary"), "shrink-0", className)}
    >
      {copied ? "Copiado" : "Copiar enlace"}
    </button>
  );
}
