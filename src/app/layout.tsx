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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
