import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

/* next/font las sirve desde el propio dominio: ninguna petición del visitante
   sale a Google. Las consumen --font-sans y --font-mono (globals.css). */
const sg = Space_Grotesk({ subsets: ["latin"], variable: "--font-sg" });
const jb = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb" });

export const metadata: Metadata = {
  title: {
    default: "VIGÍA — Equipo rojo legal y técnico para IA",
    template: "%s · VIGÍA",
  },
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
    <html lang="es-CO" className={`${sg.variable} ${jb.variable}`}>
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
