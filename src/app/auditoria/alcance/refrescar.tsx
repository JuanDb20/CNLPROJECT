"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Trae el estado nuevo al volver a esta pestaña: el representante legal acepta
 * en su portal, casi siempre en otra pestaña, y el abogado no tiene que recargar.
 */
export function RefrescarAlVolver() {
  const router = useRouter();
  useEffect(() => {
    const refrescar = () => router.refresh();
    window.addEventListener("focus", refrescar);
    return () => window.removeEventListener("focus", refrescar);
  }, [router]);
  return null;
}
