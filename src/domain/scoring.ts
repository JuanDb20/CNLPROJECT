import type { AuditRun, Finding, ModuleId, RunScore, Severity } from "./types";

/**
 * Puntuación de cumplimiento.
 *
 * Es una función pura sobre los hallazgos: la misma auditoría siempre produce
 * la misma cifra, y firmar una remediación la sube de forma trazable. El peso
 * de cada severidad está aquí y no disperso en la UI para que el manual técnico
 * pueda citar la fórmula exacta.
 *
 * Los pesos 9 / 3,5 / 0,5 son una convención interna de priorización, calibrada
 * para que tres hallazgos críticos abiertos lleven la auditoría al nivel de
 * riesgo alto. No derivan de ninguna norma: la Ley 1581 no fija puntajes y las
 * sanciones las gradúa la SIC con los criterios del art. 24. La cifra ordena el
 * trabajo de remediación; no mide cumplimiento.
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

/**
 * Clasificación de riesgos: probabilidad x impacto.
 *
 * Derivada, no almacenada. La severidad ya codifica el impacto y el módulo ya
 * codifica qué tan al alcance de cualquiera está la falla. Sirve para la rejilla
 * 3x3 del informe, que es la "identificación y clasificación de riesgos" que la
 * Circular Externa 002 de 2024 de la SIC (num. III) considera elemento esencial
 * del principio de responsabilidad demostrada.
 */
export const IMPACT: Record<Severity, 1 | 2 | 3> = {
  informativo: 1,
  advertencia: 2,
  critico: 3,
};

/** Probabilidad de explotación: explotable sin autenticación y desde internet = alta. */
export const LIKELIHOOD: Record<ModuleId, 1 | 2 | 3> = {
  "static-scan": 3, // el patrón está en el código desplegado
  "prompt-injection": 3, // basta escribir en el chat
  "consent-ux": 2,
  transparency: 2,
};

/** Celda [probabilidad, impacto] del hallazgo en la rejilla 3x3. */
export function riskCell(f: Finding): readonly [number, number] {
  return [LIKELIHOOD[f.module], IMPACT[f.severity]] as const;
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
