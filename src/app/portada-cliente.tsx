"use client";

import { useEffect } from "react";

/**
 * Lo poco de la portada que no resuelve el HTML/CSS:
 * - Las dos capas de video (plano principal y realce) son el mismo archivo: si
 *   una se atrasa, el realce "fantasmea". El primero manda y el otro se corrige
 *   cuando se desvía más de 0,12 s. Con movimiento reducido, quietos.
 * - El menú es un popover nativo; aria-expanded se refleja a mano en la
 *   hamburguesa para no depender de cada navegador.
 */
export function PortadaCliente() {
  useEffect(() => {
    const [master, ...rest] = document.querySelectorAll<HTMLVideoElement>(".portada video");
    if (!master) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      [master, ...rest].forEach((v) => v.pause());
      return;
    }
    const sync = () => {
      for (const v of rest) {
        if (Math.abs(v.currentTime - master.currentTime) > 0.12) v.currentTime = master.currentTime;
      }
    };
    master.addEventListener("timeupdate", sync);
    return () => master.removeEventListener("timeupdate", sync);
  }, []);

  useEffect(() => {
    const menu = document.getElementById("menu");
    const burger = document.querySelector(".portada .burger");
    if (!menu || !burger) return;
    const onToggle = (e: Event) =>
      burger.setAttribute("aria-expanded", String((e as ToggleEvent).newState === "open"));
    menu.addEventListener("toggle", onToggle);
    return () => menu.removeEventListener("toggle", onToggle);
  }, []);

  return null;
}
