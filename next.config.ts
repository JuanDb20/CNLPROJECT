import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El MVP corre como un único servicio. La capa de datos y el bus de eventos
  // están detrás de interfaces (src/server) para poder externalizarlos
  // (Postgres + Redis + workers) sin tocar la UI ni el dominio.
  experimental: {
    // El formulario de nueva auditoría sube el código en .zip (hasta 10 MB).
    serverActions: { bodySizeLimit: "11mb" },
  },
};

export default nextConfig;
