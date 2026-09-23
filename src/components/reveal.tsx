"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Aparición al entrar en pantalla.
 *
 * Se resuelve con IntersectionObserver y una clase CSS en vez de una librería
 * de animación: la landing es lo primero que carga un visitante que no conoce
 * VIGÍA, y no compensa gastar kilobytes de JavaScript en moverla.
 *
 * Si el observador no existe (navegador antiguo) o el usuario pidió menos
 * movimiento, el contenido queda visible de inmediato: nunca se oculta algo
 * que luego no pueda aparecer.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: ReactNode;
  /** Retraso en segundos, para escalonar hermanos. */
  delay?: number;
  as?: "div" | "section" | "li" | "article" | "header";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.dataset.visible = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.visible = "true";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={className ? `reveal ${className}` : "reveal"}
      style={{ "--d": `${delay}s` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
