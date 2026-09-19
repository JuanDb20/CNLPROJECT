import { Card, CardHeader, Label, Tag } from "@/components/ui";
import { FRAMEWORKS } from "@/domain/compliance";
import { requireAuthorizedRun } from "@/server/session";

import { ConfigForm } from "./config-form";

export const dynamic = "force-dynamic";
/** Aquí corre el server action que lanza el análisis, que sigue en `after()`. */
export const maxDuration = 300;

const CLASSIFICATION_LABEL = {
  "third-party-llm": "LLM de terceros",
  "self-hosted": "Alojado por el cliente",
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
          Proveedores de IA detectados en el código y marcos normativos a evaluar
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Arquitectura detectada */}
        <Card>
          <CardHeader
            title="Arquitectura y flujos de datos"
            tag="Análisis del código"
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
                    {provider.country && (
                      <p className="mt-1 text-[11px] text-ink-soft">
                        {provider.country} ·{" "}
                        {provider.role === "responsable"
                          ? "Responsable → transferencia (art. 26)"
                          : provider.role === "encargado"
                            ? "Encargado → transmisión (contrato)"
                            : "Por determinar (verificar términos del proveedor)"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Tag>{CLASSIFICATION_LABEL[provider.classification]}</Tag>
                    {provider.adequateCountry === true && (
                      <Tag tone="safe">País adecuado SIC</Tag>
                    )}
                    {provider.adequateCountry === false && (
                      <Tag tone="required">Zona gris</Tag>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] leading-relaxed text-ink-muted">
            Estados Unidos figura en la lista de países con nivel adecuado de la SIC:
            enviar datos a esos proveedores no es un incumplimiento por el país; lo
            exigible es el contrato de transmisión. Un proveedor en un país que no está en
            la lista queda en zona gris y pasa a revisión jurídica.
          </p>

          <div className="mt-5">
            <Label>Control de acceso y minimización</Label>
            <div className="rounded-[8px] border border-safe-soft bg-safe-soft p-3.5">
              <p className="text-[12.5px] font-semibold text-safe">
                Enmascaramiento de datos personales
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                Las llaves y los números de documento que aparezcan en el código de{" "}
                {run.scope.client.name} se enmascaran antes de entrar a la evidencia, en
                cumplimiento estricto del principio de minimización de datos.
              </p>
            </div>
          </div>

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
