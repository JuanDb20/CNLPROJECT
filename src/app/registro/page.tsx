import Link from "next/link";
import { redirect } from "next/navigation";

import { registrarse } from "@/app/actions";
import { Logo } from "@/components/shell";
import { Card, Panel, buttonClass, fieldClass } from "@/components/ui";
import { currentUser } from "@/server/auth";

/* `existe` no tiene entrada a propósito: decir «ese correo ya tiene cuenta»
   convierte el formulario en un oráculo para saber quién está registrado. */
const ERRORS: Record<string, string> = {
  nombre: "Escribe tu nombre completo.",
  correo: "Escribe un correo válido.",
  clave: "La contraseña debe tener al menos 8 caracteres.",
  politica: "Para crear la cuenta debes autorizar el tratamiento de tus datos.",
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
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center gap-6 px-5 py-12">
      <Link href="/" aria-label="VIGÍA, inicio" className="self-center">
        <Logo />
      </Link>
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
              {ERRORS[error] ?? "Revisa los datos del formulario."}
            </p>
          </Panel>
        ) : null}

        <form action={registrarse} className="mt-5 space-y-4">
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
          <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
            <input type="checkbox" name="politica" required className="mt-0.5" />
            <span>
              Autorizo el tratamiento de mis datos para gestionar mi cuenta e identificarme como firmante, según la{" "}
              <a href="/privacidad" className="underline">política de tratamiento</a>.
            </span>
          </label>
          <button type="submit" className={buttonClass("primary", true)}>
            Crear cuenta
          </button>
        </form>
      </Card>
      <p className="text-center text-[12.5px] text-ink-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-ink underline-offset-2 hover:underline">
          Ingresar
        </Link>
      </p>
    </div>
  );
}
