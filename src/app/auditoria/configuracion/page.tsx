import Link from "next/link";

import { Tag, buttonClass } from "@/components/ui";
import { FRAMEWORKS } from "@/domain/compliance";
import { providerTerms } from "@/domain/proveedores";
import { sectorPack } from "@/domain/sectores";
import { requireAuthorizedRun } from "@/server/session";

import { Pasos } from "../alcance/pasos";
import { ConfigForm } from "./config-form";

export const metadata = { title: "Configuración del análisis" };

export const dynamic = "force-dynamic";
/** Aquí corre el server action que lanza el análisis, que sigue en `after()`. */
export const maxDuration = 300;

/* Sin siglas: «LLM» o «SDK» no le dicen nada a quien decide. */
const CLASSIFICATION_LABEL = {
  "third-party-llm": "IA de un tercero",
  "self-hosted": "Alojado por el cliente",
  sdk: "Librería de IA",
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
    <details className="mt-3 border-t border-line pt-3">
      <summary className="cursor-pointer list-none text-[12px] text-ink-muted transition-colors hover:text-ink">
        <span aria-hidden className="mr-1.5">›</span>
        Términos del proveedor
      </summary>
      <div className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink-soft">
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

/**
 * Paso 2: configuración, en dos pantallas (?paso=1 y 2): a qué proveedores de IA
 * envía datos la aplicación y contra qué normas se evalúa. La segunda lanza el
 * análisis.
 */
export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ paso?: string }>;
}) {
  const run = await requireAuthorizedRun();
  const { paso } = await searchParams;
  const actual = paso === "2" ? 2 : 1;
  const { providers } = run.config;
  const pack = sectorPack(run.scope.client.sector);
  /* Los marcos del paquete sectorial quedan preseleccionados; el abogado puede desmarcarlos. */
  const initialSelected = pack
    ? [...new Set([...run.config.frameworks, ...pack.frameworks])]
    : run.config.frameworks;

  return (
    <div className="max-w-[780px] space-y-6">
      <Pasos
        base="/auditoria/configuracion"
        nombres={["Proveedores de IA", "Normas a evaluar"]}
        actual={actual}
      />

      {actual === 1 ? (
        <>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink">Proveedores de IA</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              {providers.length > 0
                ? "VIGÍA encontró en el código que la aplicación envía datos a estos proveedores."
                : "VIGÍA no encontró en el código llamadas a proveedores de inteligencia artificial."}
            </p>
          </div>

          {providers.length > 0 ? (
            <>
              <ul className="space-y-3">
                {providers.map((provider) => (
                  <li key={provider.id} className="rounded-[12px] border border-line bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-ink">
                          {provider.vendor} {provider.model}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                          {provider.surface}
                        </p>
                        {provider.country && (
                          <p className="mt-1.5 text-[12.5px] text-ink-soft">
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

              <details>
                <summary className="cursor-pointer list-none text-[12.5px] text-ink-muted transition-colors hover:text-ink">
                  <span aria-hidden className="mr-1.5">›</span>
                  Cómo se lee «país adecuado» y «zona gris»
                </summary>
                <p className="mt-2 max-w-[68ch] text-[12px] leading-relaxed text-ink-muted">
                  Estados Unidos figura en la lista de países con nivel adecuado de la SIC:
                  enviar datos a esos proveedores no es un incumplimiento por el país; lo
                  exigible es el contrato de transmisión. Un proveedor en un país que no está
                  en la lista queda en zona gris y pasa a revisión jurídica.
                </p>
              </details>
            </>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:justify-end">
            <Link href="/auditoria/configuracion?paso=2" className={buttonClass("primary")}>
              Siguiente
            </Link>
          </div>
        </>
      ) : (
        <>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink">Normas a evaluar</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              Desmarcar una norma retira del informe los hallazgos que dependen solo de ella.
            </p>
            {/* El porqué del paquete sectorial es fundamentación: se consulta, no se decide. */}
            {pack ? (
              <div className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">
                <p>
                  Recomendadas para el sector del cliente ({pack.name}):{" "}
                  {new Intl.ListFormat("es", { type: "conjunction" }).format(
                    pack.frameworks.map((id) => FRAMEWORKS[id].shortName),
                  )}
                  .
                </p>
                <details className="mt-1">
                  <summary className="cursor-pointer list-none text-[12px] text-ink-muted transition-colors hover:text-ink">
                    <span aria-hidden className="mr-1.5">›</span>
                    Ver fundamento jurídico
                  </summary>
                  <p className="mt-1.5 max-w-[68ch] text-[12px] leading-relaxed text-ink-muted">
                    {pack.note}
                  </p>
                </details>
              </div>
            ) : null}
          </div>

          <ConfigForm frameworks={Object.values(FRAMEWORKS)} initialSelected={initialSelected} />
        </>
      )}
    </div>
  );
}
