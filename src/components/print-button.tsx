"use client";

/** El navegador genera el PDF: «Imprimir» → «Guardar como PDF». */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-[8px] bg-neutral-900 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-neutral-700 print:hidden"
    >
      Imprimir o guardar en PDF
    </button>
  );
}
