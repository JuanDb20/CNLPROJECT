import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center gap-4 px-5 py-12 text-center">
      <h1 className="text-[18px] font-semibold tracking-tight text-ink">
        Ese enlace no existe o ya no es válido
      </h1>
      <p className="text-[13px] leading-relaxed text-ink-muted">
        Revisa la dirección: el enlace del portal del cliente y el del informe se
        copian completos, con el identificador de la auditoría.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a href="/" className={buttonClass("brand")}>
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
