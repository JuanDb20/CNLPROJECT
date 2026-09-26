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
    claro (Juan lo eligió el 23-sep). */
export function TemaToggle({ className }: { className?: string }) {
  const actual = useSyncExternalStore(
    subscribe,
    () => tema,
    () => "light" as Tema, // snapshot del servidor: igual al tema por defecto del documento
  );

  return (
    <button
      type="button"
      onClick={() => set(actual === "dark" ? "light" : "dark")}
      aria-pressed={actual === "dark"}
      aria-label={actual === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={`tema-toggle ${className ?? ""}`}
    >
      {actual === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
