import Link from "next/link";
import { redirect } from "next/navigation";

import { registrarse } from "@/app/actions";
import { Logo } from "@/components/shell";
import { Card, Panel, buttonClass, fieldClass } from "@/components/ui";
import { currentUser } from "@/server/auth";

const ERRORS: Record<string, string> = {
  nombre: "Escribe tu nombre completo.",
  correo: "Escribe un correo válido.",
  tarjeta: "La tarjeta profesional debe tener entre 3 y 7 dígitos.",
  clave: "La contraseña debe tener al menos 8 caracteres.",
  existe: "Ya existe una cuenta con ese correo. Ingresa con ella.",
};

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
          Tu nombre y tu tarjeta profesional identifican cada hallazgo que firmes en el
          informe.
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[12px] text-ink-soft">
              Tarjeta profesional
              <input
                name="tarjeta"
                required
                pattern="[0-9]{3,7}"
                inputMode="numeric"
                title="Entre 3 y 7 dígitos"
                className={fieldClass}
              />
            </label>
            <label className="block text-[12px] text-ink-soft">
              Firma o despacho <span className="text-ink-faint">(opcional)</span>
              <input name="firma" maxLength={120} autoComplete="organization" className={fieldClass} />
            </label>
          </div>
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
