import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "VIGÍA — Equipo rojo legal y técnico para IA",
  description:
    "Auditoría adversarial de aplicaciones de IA con trazabilidad jurídica: " +
    "Ley 1581, Ley 1266, EU AI Act, RGPD y OWASP LLM.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body className="font-sans antialiased">
        <a
          href="#contenido"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-[200] focus-visible:rounded-[6px] focus-visible:bg-ink focus-visible:px-3 focus-visible:py-2 focus-visible:text-[12.5px] focus-visible:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
