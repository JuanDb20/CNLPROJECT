import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { registrarse } from "@/app/actions";
import { RESPONSABLE } from "@/app/privacidad/datos";
import { ValidacionRegistro } from "@/app/registro/validacion";
import { SitePage } from "@/components/sitio";
import { SubmitButton } from "@/components/submit-button";
import { Card, Panel, fieldClass } from "@/components/ui";
import { currentUser } from "@/server/auth";

/* `existe` sí tiene mensaje: /ingresar ya resiste enumeración (verificación a tiempo
   constante con hash señuelo, ver login() en auth.ts). Ocultar aquí que el correo ya
   tiene cuenta solo confunde a quien se re-registra por error, a cambio de una
   protección marginal contra enumeración. */
const ERRORS: Record<string, ReactNode> = {
  nombre: "Escribe tu nombre completo.",
  correo: "Escribe un correo válido.",
  clave: "La contraseña debe tener al menos 8 caracteres.",
  confirmacion: "Las contraseñas no coinciden. Vuelve a escribirlas.",
  politica: "Para crear la cuenta debes autorizar el tratamiento de tus datos.",
  existe: (
    <>
      Ese correo ya tiene una cuenta.{" "}
      <Link href="/ingresar" className="font-medium underline underline-offset-2">
        Ingresa aquí
      </Link>
      .
    </>
  ),
};

export const metadata = { title: "Crear cuenta" };

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect("/panel");
  const { error } = await searchParams;

  return (
    <SitePage actual="/registro" className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-5 pb-16 pt-10">
      <Card>
        <h1 className="text-[18px] font-semibold tracking-tight text-ink">
          Crear cuenta de abogado
        </h1>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
          Tu nombre identifica la cuenta. La tarjeta profesional se pide después, al
          firmar tu primer hallazgo.
        </p>

        {error ? (
          <Panel tone="critical" className="mt-4">
            <p className="text-[12.5px] text-critical">
              {ERRORS[error] ?? "No se pudo crear la cuenta por un error inesperado. Intenta de nuevo en un momento."}
            </p>
          </Panel>
        ) : null}

        <ValidacionRegistro />
        <form id="form-registro" action={registrarse} className="mt-5 space-y-4">
          <label className="block text-[12px] text-ink-soft">
            Nombre completo
            <input
              name="nombre"
              required
              minLength={3}
              maxLength={120}
              autoComplete="name"
              className={fieldClass}
            />
          </label>
          <label className="block text-[12px] text-ink-soft">
            Firma o despacho <span className="text-ink-faint">(opcional)</span>
            <input name="firma" maxLength={120} autoComplete="organization" className={fieldClass} />
          </label>
          <label className="block text-[12px] text-ink-soft">
            Correo
            <input name="correo" type="email" required autoComplete="email" className={fieldClass} />
          </label>
          <label className="block text-[12px] text-ink-soft">
            Contraseña
            <input
              name="clave"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={fieldClass}
            />
          </label>
          <label className="block text-[12px] text-ink-soft">
            Repetir contraseña
            <input
              name="confirmarClave"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={fieldClass}
            />
          </label>
          <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
            <input type="checkbox" name="politica" required className="mt-0.5" />
            <span>
              Autorizo a {RESPONSABLE} a tratar mis datos para crear y administrar mi cuenta.
              Puedo conocer, actualizar, rectificar y suprimir mis datos, y revocar esta
              autorización, según la{" "}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">
                política de tratamiento
              </a>
              .
            </span>
          </label>
          <SubmitButton variant="primary" className="w-full">
            Crear cuenta
          </SubmitButton>
        </form>
      </Card>
      <p className="text-center text-[12.5px] text-ink-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-ink underline-offset-2 hover:underline">
          Ingresar
        </Link>
      </p>
    </SitePage>
  );
}
