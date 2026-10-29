import Link from "next/link";

/**
 * «Ingresar» da las dos opciones (Sara, 27-oct): si ya tiene cuenta, entra; si
 * no, la crea. Son dos páginas (/ingresar y /registro) con las mismas pestañas
 * arriba, para que se lea como una sola puerta de entrada.
 */
export function AccesoTabs({ actual }: { actual: "ingresar" | "registro" }) {
  const tabs = [
    { id: "ingresar", href: "/ingresar", label: "Ya tengo cuenta" },
    { id: "registro", href: "/registro", label: "Crear cuenta" },
  ] as const;

  return (
    <nav
      aria-label="Acceso"
      className="mb-5 grid grid-cols-2 gap-1 rounded-[10px] border border-line bg-surface-muted p-1"
    >
      {tabs.map((t) => {
        const activo = t.id === actual;
        return (
          <Link
            key={t.id}
            href={t.href}
            aria-current={activo ? "page" : undefined}
            className={
              activo
                ? "rounded-[7px] bg-surface px-3 py-2 text-center text-[12.5px] font-semibold text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                : "rounded-[7px] px-3 py-2 text-center text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
