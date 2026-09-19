import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

import { ingresarPrueba } from "@/app/actions";
import { PortalBoot } from "@/components/portal-boot";
import { MarkIcon, buttonClass } from "@/components/ui";
import { currentUser } from "@/server/auth";

export default async function Home() {
  if (await currentUser()) redirect("/panel");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center px-5 py-14 text-center">
      <PortalBoot />

      <div
        className="stagger flex flex-col items-center gap-3"
        style={{ "--d": "0s" } as CSSProperties}
      >
        <span
          aria-hidden
          className="grid size-11 place-items-center rounded-[9px] border border-line-strong text-brand"
        >
          <MarkIcon className="size-5" />
        </span>
        <span className="leading-none">
          <span className="block text-[18px] font-semibold tracking-[0.14em] text-ink">
            VIGÍA
          </span>
          <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
            Equipo rojo legal
          </span>
        </span>
      </div>

      <h1
        className="stagger mt-5 text-[13.5px] font-normal leading-relaxed text-ink-muted"
        style={{ "--d": ".18s" } as CSSProperties}
      >
        Auditoría adversarial de IA, con evidencia que un abogado puede firmar.
      </h1>
      <p
        className="stagger mt-2 text-[12px] leading-relaxed text-ink-faint"
        style={{ "--d": ".24s" } as CSSProperties}
      >
        Carga el código de una app en .zip o desde GitHub, revisa cada hallazgo con su norma y expide el informe firmado.
      </p>

      <div
        className="stagger mt-7 flex flex-wrap justify-center gap-3"
        style={{ "--d": ".32s" } as CSSProperties}
      >
        <Link href="/ingresar" className={buttonClass("brand")}>
          Ingresar
        </Link>
        <Link href="/registro" className={buttonClass("secondary")}>
          Crear cuenta
        </Link>
        <form action={ingresarPrueba}>
          <button type="submit" className={buttonClass("secondary")}>
            Probar sin registrarse
          </button>
        </form>
      </div>

      <p
        className="stagger fixed inset-x-0 bottom-5 px-5 text-[10.5px] leading-relaxed text-ink-faint"
        style={{ "--d": ".5s" } as CSSProperties}
      >
        VIGÍA propone el análisis jurídico; cada hallazgo lo firma un abogado ·{" "}
        <a href="/privacidad" className="underline">Política de tratamiento de datos</a>
      </p>
    </div>
  );
}
