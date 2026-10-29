"use client";

import { useEffect } from "react";

/**
 * Hace entrar suave cada bloque marcado con `data-revelar` cuando llega a la
 * pantalla. Sin JavaScript o con movimiento reducido todo se ve desde el
 * principio: el CSS solo oculta cuando este componente marcó el documento.
 */
export function Revelar() {
  useEffect(() => {
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bloques = document.querySelectorAll<HTMLElement>("[data-revelar]");
    if (reducido || !("IntersectionObserver" in window)) return;
    document.documentElement.dataset.revelar = "";
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.visto = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    bloques.forEach((b) => io.observe(b));
    return () => {
      io.disconnect();
      delete document.documentElement.dataset.revelar;
    };
  }, []);
  return null;
}
