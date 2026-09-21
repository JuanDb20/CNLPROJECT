import { Card, CardHeader, Label, Panel, Tag } from "@/components/ui";
import { FRAMEWORKS } from "@/domain/compliance";
import { providerTerms } from "@/domain/proveedores";
import { sectorPack } from "@/domain/sectores";
import { requireAuthorizedRun } from "@/server/session";

import { ConfigForm } from "./config-form";

export const metadata = { title: "Configuración del análisis" };

export const dynamic = "force-dynamic";
/** Aquí corre el server action que lanza el análisis, que sigue en `after()`. */
export const maxDuration = 300;

const CLASSIFICATION_LABEL = {
  "third-party-llm": "LLM de terceros",
  "self-hosted": "Alojado por el cliente",
  sdk: "SDK",
} as const;

/** Sí/No/No verificado: la misma lectura de un booleano incierto en toda la ficha. */
const yesNo = (v: boolean | null | undefined) => (v === true ? "Sí" : v === false ? "No" : "No verificado");

/**
 * Términos públicos del proveedor.
 *
 * Van plegados: son el dato que el abogado consulta cuando decide si el
 * proveedor es encargado o responsable, no algo que deba leer para avanzar.
 */
function ProviderTermsBlock({ vendor }: { vendor: string }) {
  const terms = providerTerms(vendor);
  return (
    <details className="mt-2.5 border-t border-line pt-2.5">
      <summary className="cursor-pointer list-none text-[11px] text-ink-muted transition-colors hover:text-ink">
        <span aria-hidden className="mr-1.5">›</span>
        Términos del proveedor
      </summary>
      <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-ink-soft">
        <p>
          Entrena con datos de la API por defecto:{" "}
          <span className="font-medium text-ink">{yesNo(terms?.trainsOnApiData)}</span>
        </p>
        <p>
          Retención por defecto: <span className="text-ink">{terms?.retention ?? "No verificado"}</span>
        </p>
        <p>
          Retención cero disponible:{" "}
          <span className="font-medium text-ink">{yesNo(terms?.zeroRetention)}</span>
        </p>
        {terms ? (
          <p>
            <a href={terms.termsUrl} target="_blank" rel="noreferrer" className="underline">
              Términos de la API
            </a>{` · verificado el ${terms.verifiedAt}`}
          </p>
        ) : (
          <p>Sin términos verificados para este proveedor.</p>
        )}
        {terms?.note ? <p className="text-ink-faint italic">{terms.note}</p> : null}
      </div>
    </details>
  );
}

export default async function ConfiguracionPage() {
  const run = await requireAuthorizedRun();
  const pack = sectorPack(run.scope.client.sector);
  /* Los marcos del paquete sectorial quedan preseleccionados; el abogado puede desmarcarlos. */
  const initialSelected = pack
    ? [...new Set([...run.config.frameworks, ...pack.frameworks])]
    : run.config.frameworks;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Configuración del análisis técnico-legal
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Qué proveedores encontró VIGÍA y contra qué normas se evalúa
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
                    {provider.adequateCountry === null && provider.country !== null && (
                      <Tag>Adecuación por determinar</Tag>
                    )}
                  </div>
                </div>
                <ProviderTermsBlock vendor={provider.vendor} />
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-[11.5px] text-safe">
            <span aria-hidden className="size-1.5 rounded-full bg-safe" />
            Llaves y documentos enmascarados antes de entrar a la evidencia
          </p>

          <details className="mt-2.5">
            <summary className="cursor-pointer list-none text-[11.5px] text-ink-muted transition-colors hover:text-ink">
              <span aria-hidden className="mr-1.5">›</span>
              Cómo se lee «país adecuado» y «zona gris»
            </summary>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              Estados Unidos figura en la lista de países con nivel adecuado de la SIC:
              enviar datos a esos proveedores no es un incumplimiento por el país; lo
              exigible es el contrato de transmisión. Un proveedor en un país que no está
              en la lista queda en zona gris y pasa a revisión jurídica.
            </p>
          </details>
        </Card>

        {/* Marcos normativos */}
        <Card className="flex flex-col">
          <CardHeader
            title="Marcos a evaluar"
            tag="Estándares"
            description="Desmarcar un marco retira del informe los hallazgos que dependían solo de él."
          />
          {/* El porqué del paquete sectorial es una nota de fundamentación: se
              consulta si el abogado la necesita, no encabeza la pantalla. */}
          {pack && (
            <Panel tone="brand" className="mb-4">
              <p className="text-[12.5px] font-medium text-ink">
                Paquete sectorial: {pack.name}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                {pack.frameworks.map((id) => FRAMEWORKS[id].shortName).join(", ")} quedan
                preseleccionados.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer list-none text-[11px] text-ink-muted transition-colors hover:text-ink">
                  <span aria-hidden className="mr-1.5">›</span>
                  Por qué este sector
                </summary>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">{pack.note}</p>
              </details>
            </Panel>
          )}
          <ConfigForm
            frameworks={Object.values(FRAMEWORKS)}
            initialSelected={initialSelected}
            initialPiiMask={run.config.piiMaskEnabled}
          />
        </Card>
      </div>
    </div>
  );
}
