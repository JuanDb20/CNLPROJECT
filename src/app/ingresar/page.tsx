import Link from "next/link";
import { redirect } from "next/navigation";

import { ingresar, ingresarPrueba } from "@/app/actions";
import { Logo } from "@/components/shell";
import { Card, Panel, buttonClass, fieldClass } from "@/components/ui";
import { currentUser } from "@/server/auth";

export const metadata = { title: "Ingresar" };

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect("/panel");
  const { error } = await searchParams;

  return (
    <div id="contenido" role="main" className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center gap-6 px-5 py-12">
      <Link href="/" aria-label="VIGÍA, inicio" className="self-center">
        <Logo />
      </Link>
      <Card>
        <h1 className="text-[18px] font-semibold tracking-tight text-ink">Ingresar</h1>
        <p className="mt-1 text-[12.5px] text-ink-muted">Accede a las auditorías de tus clientes.</p>

        {error ? (
          <Panel tone="critical" className="mt-4">
            <p className="text-[12.5px] text-critical">
              {error === "bloqueado"
                ? "Demasiados intentos; espera 15 minutos."
                : "Correo o contraseña incorrectos."}
            </p>
          </Panel>
        ) : null}

        <form action={ingresar} className="mt-5 space-y-4">
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
              autoComplete="current-password"
              className={fieldClass}
            />
          </label>
          <button type="submit" className={buttonClass("primary", true)}>
            Ingresar
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] text-ink-faint">o</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form action={ingresarPrueba} className="mt-5">
          <button type="submit" className={buttonClass("secondary", true)}>
            Entrar con usuario de prueba
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-faint">
            Sin registro. Para probar el flujo, no para uso real.
          </p>
        </form>
      </Card>
      <p className="text-center text-[12.5px] text-ink-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-ink underline-offset-2 hover:underline">
          Crear cuenta de abogado
        </Link>
      </p>
    </div>
  );
}
