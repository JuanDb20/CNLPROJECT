"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RESPONSABLE } from "@/app/privacidad/datos";

/** Clave de localStorage: el aviso se muestra una vez por navegador. */
const AVISO_KEY = "vigia-aviso-datos";

/**
 * Aviso de tratamiento de datos al entrar (pedido de Sara, 27-oct): el apartado
 * general que trae toda página, con el enlace a la política completa. Lo que
 * dice tiene que coincidir con /privacidad: solo cookies técnicas (sesión y
 * auditoría abierta), sin analítica ni publicidad.
 */
export function AvisoDatos() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let visto = false;
    try {
      visto = localStorage.getItem(AVISO_KEY) === "1";
    } catch {
      /* almacenamiento bloqueado: se muestra el aviso en cada visita */
    }
    if (visto) return;
    const t = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const cerrar = () => {
    try {
      localStorage.setItem(AVISO_KEY, "1");
    } catch {
      /* sin almacenamiento el aviso vuelve a salir la próxima vez; no es un error */
    }
    setVisible(false);
  };

  return (
    <aside
      role="region"
      aria-label="Aviso de tratamiento de datos personales"
      className="aviso-datos fixed inset-x-3 bottom-3 z-[150] mx-auto max-w-[460px] rounded-[14px] border border-line-strong bg-surface p-4 text-ink shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] sm:inset-x-auto sm:left-6 sm:bottom-6 sm:mx-0 print:hidden"
    >
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-brand">
        Tratamiento de datos personales
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
        {RESPONSABLE}, trata los datos que registras —tu cuenta y los datos de la empresa y de
        su representante legal— solo para prestar el servicio y dejar constancia de lo
        realizado. Usamos únicamente las cookies técnicas que necesita tu sesión: nada de
        analítica ni publicidad. Puedes conocer, actualizar, rectificar o suprimir tus datos
        (Ley 1581 de 2012).
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={cerrar}
          className="rounded-[8px] bg-brand px-4 py-2 text-[12.5px] font-semibold text-canvas transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Entendido
        </button>
        <Link
          href="/privacidad"
          onClick={cerrar}
          className="text-[12.5px] font-medium text-ink underline underline-offset-2 hover:text-brand"
        >
          Leer la política de tratamiento
        </Link>
      </div>
    </aside>
  );
}
