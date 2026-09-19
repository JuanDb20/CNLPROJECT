"use client";

import { buttonClass } from "@/components/ui";

/**
 * Pantalla de error de la aplicación. Existe para que un fallo del almacén no
 * salga como la página por defecto de Next, en inglés y sin marca.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center gap-4 px-5 py-12 text-center">
      <h1 className="text-[18px] font-semibold tracking-tight text-ink">
        No pudimos cargar esta pantalla
      </h1>
      <p className="text-[13px] leading-relaxed text-ink-muted">
        El almacenamiento de VIGÍA no respondió. Los datos de la auditoría están intactos.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClass("brand")}>
          Reintentar
        </button>
        <a href="/panel" className={buttonClass("secondary")}>
          Volver a mis auditorías
        </a>
      </div>
    </main>
  );
}
