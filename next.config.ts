import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El MVP corre como un único servicio. La capa de datos y el bus de eventos
  // están detrás de interfaces (src/server) para poder externalizarlos
  // (Postgres + Redis + workers) sin tocar la UI ni el dominio.
  experimental: {
    // El formulario de nueva auditoría sube el código en .zip (hasta 4 MB; Vercel admite 4,5 MB por petición).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  /* Cabeceras de seguridad. La CSP se limita a lo que no rompe a Next: sin
     `default-src`/`script-src`, que exigirían nonces en cada script inyectado. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
