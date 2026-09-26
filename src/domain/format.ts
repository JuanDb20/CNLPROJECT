// Formato compartido por informe, portal del cliente y pantallas internas.
// Estaba duplicado en dos archivos y por eso un cambio de texto rompió los dos a la vez.

/**
 * Extrae el nombre del abogado del rol del firmante ("Abogado revisor: X. Firma el concepto jurídico de
 * cada hallazgo…"). Acepta también el rol anterior ("X. Firma cada hallazgo…") de las auditorías guardadas.
 */
export function lawyerName(role?: string): string {
  return (role ?? "")
    .replace(/^Abogado revisor: /, "")
    .replace(/\. Firma (?:el concepto jurídico de )?cada hallazgo.*$/, "");
}

/** Fecha en es-CO y hora de Bogotá; con `time` incluye la hora. */
export function formatDate(iso: string, opts?: { time?: boolean }): string {
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "long",
    ...(opts?.time ? { timeStyle: "short" as const } : {}),
    timeZone: "America/Bogota",
  });
}

/** Rótulo visible del entorno de ejecución. El id interno "sandbox-…" no cambia. */
export function executionLabel(sandboxId: string): string {
  return sandboxId.replace(/^sandbox-/, "Ejecución ");
}
