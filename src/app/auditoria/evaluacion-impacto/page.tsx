import { PrintButton } from "@/components/print-button";
import { dataCategories } from "@/components/informe";
import { Card, CardHeader, Label, Panel, SeverityBadge, Tag } from "@/components/ui";
import { getRules } from "@/domain/compliance";
import { isResolved, riskCell, sortFindings } from "@/domain/scoring";
import type { RemediationStatus } from "@/domain/types";
import { requireRun } from "@/server/session";

export const dynamic = "force-dynamic";

/* Borrador de evaluación de impacto de privacidad (CE 002/2024 de la SIC, num. IV).
   Todo sale de lo que la auditoría ya sabe: proveedores, hallazgos y parches. */

const LIKELIHOOD_LABEL = ["baja", "media", "alta"];
const IMPACT_LABEL = ["bajo", "medio", "alto"];

const MEDIDA_ESTADO: Record<RemediationStatus, string> = {
  propuesta: "Propuesta",
  "pr-abierto": "Propuesta",
  retesteado: "Retesteado",
  firmado: "Firmado",
};

export default async function EvaluacionImpactoPage() {
  const run = await requireRun();
  const { client } = run.scope;
  const providers = run.config.providers;
  const categories = dataCategories(run.findings);
  const open = sortFindings(run.findings.filter((f) => !isResolved(f)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Evaluación de impacto de privacidad
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Borrador generado desde los hallazgos de {client.name}
          </p>
        </div>
        <PrintButton />
      </div>

      <Panel tone="brand">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Borrador de evaluación de impacto de privacidad para revisión del abogado (Circular Externa 002 de 2024 de la
          SIC, num. IV; el PL 025 de 2026 Cámara, art. 6, la propone para sistemas de alto riesgo: se cita como proyecto
          en trámite).
        </p>
      </Panel>

      <Card>
        <CardHeader
          step="a."
          title="Descripción de las operaciones de tratamiento"
          description="Qué hace el sistema auditado, con qué datos y hacia dónde salen."
        />
        <div className="space-y-4">
          <div>
            <Label>Sistema</Label>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              {client.system || "El abogado no registró la descripción del sistema."}{" "}
              {client.sector ? `Sector: ${client.sector}.` : ""} Responsable: {client.name} (NIT {client.nit}).
            </p>
          </div>

          <div>
            <Label>Categorías de datos inferidas de los hallazgos</Label>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              {categories.length > 0
                ? `${categories.join("; ")}. La inferencia proviene de las pruebas que dieron hallazgo, no de una revisión documental del inventario de datos.`
                : "Las pruebas no identificaron categorías especiales de datos en el código analizado."}
            </p>
          </div>

          <div>
            <Label>Flujos hacia proveedores</Label>
            {providers.length === 0 ? (
              <p className="text-[12.5px] text-ink-soft">
                No se detectaron proveedores de inteligencia artificial de terceros en el código.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {providers.map((p) => (
                  <li key={p.id} className="text-[12.5px] leading-relaxed text-ink-soft">
                    <span className="text-ink">{p.vendor}</span>
                    {p.model ? ` · ${p.model}` : ""} · {p.surface} · {p.country ?? "país no declarado"}
                    {p.adequateCountry === false ? " (sin nivel adecuado según la SIC)" : ""} · rol{" "}
                    {p.role ?? "por determinar (verificar términos del proveedor)"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          step="b."
          title="Evaluación de riesgos específicos"
          description="Identificación y clasificación de cada riesgo abierto: probabilidad de explotación por impacto sobre los derechos del titular."
        />
        {open.length === 0 ? (
          <p className="text-[12.5px] text-ink-soft">No quedan hallazgos abiertos en esta auditoría.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((f) => {
              const [likelihood, impact] = riskCell(f);
              return (
                <li key={f.id} className="rounded-[8px] border border-line p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-muted">{f.code}</span>
                    <SeverityBadge severity={f.severity} />
                    <Tag>
                      Probabilidad {LIKELIHOOD_LABEL[likelihood - 1]} · impacto {IMPACT_LABEL[impact - 1]}
                    </Tag>
                  </div>
                  <p className="mt-2 text-[12.5px] text-ink">{f.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{f.summary}</p>
                  <p className="mt-1.5 font-mono text-[10.5px] text-ink-faint">
                    {getRules(f.ruleIds).map((r) => r.label).join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          step="c."
          title="Medidas previstas"
          description="Parches propuestos por VIGÍA y su estado en el flujo de revisión del abogado."
        />
        {run.findings.length === 0 ? (
          <p className="text-[12.5px] text-ink-soft">Sin hallazgos, no hay medidas que adoptar.</p>
        ) : (
          <ul className="space-y-3">
            {sortFindings(run.findings).map((f) => (
              <li key={f.id} className="rounded-[8px] border border-line p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-muted">{f.code}</span>
                  <Tag tone={f.remediation.status === "firmado" ? "safe" : "neutral"}>
                    {MEDIDA_ESTADO[f.remediation.status]}
                  </Tag>
                  <span className="font-mono text-[10.5px] text-ink-faint">{f.remediation.patch.target}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
                  {f.remediation.patch.expectedImpact}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Firma y responsabilidad" />
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Este borrador lo revisa y adopta el abogado revisor. VIGÍA lo construye a partir de los patrones detectados en
          el código; la calificación normativa, la valoración de necesidad y proporcionalidad y la decisión de adoptarlo
          son suyas.
        </p>
      </Card>
    </div>
  );
}
