import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { MarkIcon } from "@/components/ui";
import { CHECK_CODES } from "@/domain/checks";
import { ALL_FRAMEWORK_IDS, RULES } from "@/domain/compliance";

import { MenuExpandido } from "./sitio-menu";
import "./sitio.css";

/* Las cifras salen del catálogo, no se escriben a mano: así no quedan viejas. */
export const CIFRAS = [
  { n: CHECK_CODES.length, label: "Pruebas" },
  { n: RULES.length, label: "Obligaciones" },
  { n: ALL_FRAMEWORK_IDS.length, label: "Marcos" },
];

const NAV = [
  { href: "/mapa", label: "Cómo funciona" },
  { href: "/verificar", label: "Verificar informe" },
  { href: "/transparencia", label: "Transparencia" },
  { href: "/registro", label: "Crear cuenta" },
];

export const escalon = (n: number) => ({ "--i": n }) as CSSProperties;

export function Flecha() {
  return (
    <svg className="arrow" viewBox="0 0 21.5 18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M0 9H20.1M12.1 1 20.1 9 12.1 17" />
    </svg>
  );
}

const actualSi = (href: string, actual?: string) => (href === actual ? "page" : undefined);

/**
 * Encabezado común de la portada y las páginas públicas: mismo logo, misma
 * navegación y mismo acceso, en el mismo sitio de la pantalla. Pasar de una
 * página a otra solo cambia el contenido.
 */
export function SiteHeader({ actual }: { actual?: string }) {
  return (
    <header className="sitio-header">
      <Link href="/" className="logo">
        <MarkIcon />
        VIGÍA
      </Link>
      <nav className="nav" aria-label="Principal">
        {NAV.map((l, n) => (
          <Link key={l.href} href={l.href} style={escalon(n)} aria-current={actualSi(l.href, actual)}>
            {l.label}
          </Link>
        ))}
      </nav>
      <Link href="/ingresar" className="btn btn-top" aria-current={actualSi("/ingresar", actual)}>
        <span>Ingresar</span>
        <Flecha />
      </Link>
      <button
        type="button"
        className="burger"
        popoverTarget="menu"
        aria-label="Menú"
        aria-expanded="false"
      >
        <i />
        <i />
        <i />
      </button>

      <div id="menu" popover="auto" className="menu">
        <div className="menu-rule" aria-hidden />
        <p className="menu-eyebrow">Menú</p>
        <nav aria-label="Menú">
          {NAV.map((l, n) => (
            <Link
              key={l.href}
              href={l.href}
              className="mrow"
              style={escalon(n)}
              aria-current={actualSi(l.href, actual)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="menu-foot">
          <Link href="/ingresar" className="btn btn-menu">
            <span>Ingresar</span>
            <Flecha />
          </Link>
          <p className="menu-note">
            {CIFRAS[0].n} pruebas &nbsp;/&nbsp; {CIFRAS[1].n} obligaciones
          </p>
        </div>
      </div>
      <MenuExpandido />
    </header>
  );
}

/** Página pública: el encabezado común arriba y el contenido, que entra suave al navegar. */
export function SitePage({
  actual,
  className,
  children,
}: {
  actual: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="sitio">
      <SiteHeader actual={actual} />
      <main id="contenido" className={`sitio-main ${className ?? ""}`}>
        {children}
      </main>
    </div>
  );
}
