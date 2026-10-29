"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** SHA-256 en hexadecimal, con la API del navegador (la misma función que usa VIGÍA). */
export async function sha256(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const resumen = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Tarjeta de demostración de la portada (idea del prototipo de Sara): las
 * etapas se van marcando una a una cuando la tarjeta entra en pantalla y al
 * final aparece la huella. Es ilustrativa —lo dice el rótulo— pero la huella sí
 * es un SHA-256 real del nombre del archivo de ejemplo.
 */
export function Demostracion({ pruebas }: { pruebas: number }) {
  const etapas = [
    { titulo: "Proyecto recibido", detalle: "repositorio público o .zip" },
    { titulo: "Versión preparada", detalle: "sin node_modules, .git ni binarios" },
    { titulo: "Huella generada", detalle: "SHA-256 del archivo" },
    { titulo: "Pruebas ejecutadas", detalle: `${pruebas} pruebas en un entorno aislado` },
    { titulo: "Informe listo", detalle: "lo encontrado y lo realizado" },
  ];
  const [paso, setPaso] = useState(-1); // última etapa terminada
  const [huella, setHuella] = useState("");
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sha256("proyecto-ejemplo.zip").then(setHuella);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaso(etapas.length - 1);
      return;
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible || paso >= etapas.length - 1) return;
    const t = window.setTimeout(() => setPaso((p) => p + 1), paso < 0 ? 500 : 850);
    return () => window.clearTimeout(t);
  }, [visible, paso, etapas.length]);

  const repetir = useCallback(() => setPaso(-1), []);
  const terminado = paso >= etapas.length - 1;

  return (
    <div ref={ref} className="demo" aria-label="Demostración del recorrido de VIGÍA">
      <div className="demo-barra">
        <span className="demo-puntos" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="demo-rotulo">Demostración · no es una verificación real</span>
      </div>
      <ol className="demo-etapas">
        {etapas.map((e, i) => {
          const estado = i <= paso ? "listo" : i === paso + 1 && visible ? "corriendo" : "espera";
          return (
            <li key={e.titulo} className="demo-etapa" data-estado={estado}>
              <span className="demo-icono" aria-hidden>
                <svg viewBox="0 0 20 20">
                  <path d="M5 10.5 8.4 14 15 6.5" />
                </svg>
              </span>
              <span className="demo-texto">
                <span className="demo-titulo">{e.titulo}</span>
                <span className="demo-detalle">{e.detalle}</span>
              </span>
              <span className="demo-estado">
                {estado === "listo" ? "listo" : estado === "corriendo" ? "en curso…" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="demo-huella" data-visible={terminado || undefined}>
        <span className="demo-huella-rotulo">SHA-256 · proyecto-ejemplo.zip</span>
        <code>{huella}</code>
      </div>
      <button type="button" className="demo-repetir" onClick={repetir} disabled={!terminado}>
        Ver de nuevo
      </button>
    </div>
  );
}
