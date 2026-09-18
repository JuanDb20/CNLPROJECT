import { Card, CardHeader, Label, Tag } from "@/components/ui";
import { FRAMEWORKS } from "@/domain/compliance";
import { requireAuthorizedRun } from "@/server/session";

import { ConfigForm } from "./config-form";

export const dynamic = "force-dynamic";

const CLASSIFICATION_LABEL = {
  "third-party-llm": "Third-party LLM",
  "self-hosted": "Self-hosted",
  sdk: "SDK",
} as const;

export default async function ConfiguracionPage() {
  const run = await requireAuthorizedRun();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Configuración del análisis técnico-legal
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Configura vectores de prueba, proveedores de IA y marcos de cumplimiento
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Arquitectura detectada */}
        <Card>
          <CardHeader
            title="Arquitectura y flujos de datos"
            tag="Vibecoding scan"
            tagTone="brand"
          />

          <Label>Proveedores y LLM detectados</Label>
          <ul className="space-y-2.5">
            {run.config.providers.map((provider) => (
              <li
                key={provider.id}
                className="rounded-[8px] border border-line bg-surface-muted p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-ink">
                      {provider.vendor} {provider.model}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {provider.surface}
                    </p>
                  </div>
                  <Tag>{CLASSIFICATION_LABEL[provider.classification]}</Tag>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <Label>Control de acceso y minimización</Label>
            <div className="rounded-[8px] border border-safe-soft bg-safe-soft p-3.5">
              <p className="text-[12.5px] font-semibold text-safe">
                Máscara de datos personales (PII)
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                VIGÍA inyectará simulaciones en lugar de consultar registros reales de
                usuarios de {run.scope.clientName}, para mantener el cumplimiento
                estricto del principio de minimización de datos.
              </p>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
            Intensidad del equipo rojo:{" "}
            <span className="font-medium text-ink-soft">{run.config.intensity}</span>.
            Determina cuántos payloads adversariales envía cada módulo.
          </p>
        </Card>

        {/* Marcos normativos */}
        <Card className="flex flex-col">
          <CardHeader
            title="Parámetros de auditoría normativa"
            tag="Estándares"
            description="Selecciona las normativas y marcos metodológicos para evaluar los riesgos de IA en código y diseño de interfaz."
          />
          <ConfigForm
            frameworks={Object.values(FRAMEWORKS)}
            initialSelected={run.config.frameworks}
            initialPiiMask={run.config.piiMaskEnabled}
          />
        </Card>
      </div>
    </div>
  );
}
