"use client";

import { useSyncExternalStore } from "react";

/** Clave de localStorage; el <head> del layout raíz la lee para aplicar el
    tema antes de pintar (mismo valor, ver TEMA_SCRIPT en layout.tsx). */
export const TEMA_KEY = "vigia-tema";
type Tema = "light" | "dark";

/* Estado compartido a nivel de módulo: el header y el menú móvil montan cada
   uno su propio <TemaToggle>, y los dos deben reflejar el mismo tema. Con
   useState local cada instancia queda desincronizada si se cambia desde la
   otra; useSyncExternalStore las mantiene en el mismo valor sin depender de
   next-themes ni de un Context. */
let tema: Tema =
  typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
const listeners = new Set<() => void>();

function set(siguiente: Tema) {
  tema = siguiente;
  document.documentElement.setAttribute("data-theme", siguiente);
  try {
    localStorage.setItem(TEMA_KEY, siguiente);
  } catch {
    /* privado o bloqueado: el tema no persiste entre visitas, pero sigue funcionando */
  }
  listeners.forEach((f) => f());
}

function subscribe(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** Botón claro/oscuro. Recuerda la elección en localStorage; por defecto,
    claro (Juan lo eligió el 23-sep). Desde el 28-oct es un ícono (sol/luna),
    como en el prototipo de Sara, en vez del texto «Modo oscuro». */
export function TemaToggle({ className }: { className?: string }) {
  const actual = useSyncExternalStore(
    subscribe,
    () => tema,
    () => "light" as Tema, // snapshot del servidor: igual al tema por defecto del documento
  );
  const etiqueta = actual === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={() => set(actual === "dark" ? "light" : "dark")}
      className={`tema-toggle ${className ?? ""}`}
      aria-label={etiqueta}
      title={etiqueta}
      data-tema={actual}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="tema-icono">
        {/* Sol: se ve en modo claro (lleva a oscuro con la luna). */}
        <g className="tema-sol" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M5.3 18.7l1.55-1.55M17.15 6.85l1.55-1.55" />
        </g>
        <path
          className="tema-luna"
          d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
