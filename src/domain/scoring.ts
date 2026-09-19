import type { AuditRun, Finding, RunScore, Severity } from "./types";

/**
 * Puntuación de cumplimiento.
 *
 * Es una función pura sobre los hallazgos: la misma auditoría siempre produce
 * la misma cifra, y firmar una remediación la sube de forma trazable. El peso
 * de cada severidad está aquí y no disperso en la UI para que el manual técnico
 * pueda citar la fórmula exacta.
 */

export const WEIGHT: Record<Severity, number> = {
  critico: 9,
  advertencia: 3.5,
  informativo: 0.5,
};

export function isResolved(finding: Finding): boolean {
  return finding.remediation.status === "firmado";
}

export function scoreRun(run: AuditRun): RunScore {
  const open = run.findings.filter((f) => !isResolved(f));

  const penalty = open.reduce((acc, f) => acc + WEIGHT[f.severity], 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  const count = (s: Severity) => open.filter((f) => f.severity === s).length;

  return {
    score,
    level: score >= 85 ? "bajo" : score >= 60 ? "medio" : "alto",
    critical: count("critico"),
    warning: count("advertencia"),
    informative: count("informativo"),
    resolved: run.findings.filter(isResolved).length,
  };
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critico: "Crítico",
  advertencia: "Advertencia",
  informativo: "Informativo",
};

export const SEVERITY_ORDER: Severity[] = ["critico", "advertencia", "informativo"];

/** Alta severidad y riesgo jurídico primero, como exige el flujo de revisión legal. */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const bySeverity =
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (bySeverity !== 0) return bySeverity;
    return a.code.localeCompare(b.code);
  });
}
