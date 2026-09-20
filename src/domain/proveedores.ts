import type { DetectedProvider, RepoFile } from "./types";

import { isSource } from "./check-kit";

/* ------------------------------------------------------------------ */
/* Proveedores de IA                                                   */
/* ------------------------------------------------------------------ */

/** País de tratamiento y si figura en la lista de la SIC (Circular Única, Título V, num. 3.2). */
export const PROVIDERS = [
  {
    vendor: "OpenAI",
    pattern: /api\.openai\.com|from ["']openai["']|@ai-sdk\/openai/,
    country: "Estados Unidos",
    adequate: true,
  },
  {
    vendor: "Anthropic",
    pattern: /api\.anthropic\.com|@anthropic-ai\/sdk|@ai-sdk\/anthropic/,
    country: "Estados Unidos",
    adequate: true,
  },
  {
    vendor: "Google",
    pattern: /generativelanguage\.googleapis\.com|@google\/genai|@google\/generative-ai|@ai-sdk\/google/,
    country: "Estados Unidos",
    adequate: true,
  },
  {
    vendor: "DeepSeek",
    pattern: /api\.deepseek\.com/,
    country: "China",
    adequate: false,
  },
];

export function detectProviders(files: RepoFile[]): DetectedProvider[] {
  return PROVIDERS.flatMap((p) => {
    const file = files.find((f) => isSource(f) && p.pattern.test(f.content));
    if (!file) return [];
    const model = /model:\s*["'`]([\w.:/-]+)["'`]/.exec(file.content)?.[1];
    return [
      {
        id: `prov-${p.vendor.toLowerCase()}`,
        vendor: p.vendor,
        model: model ?? "Modelo no declarado",
        surface: file.path,
        classification: "third-party-llm",
        country: p.country,
        adequateCountry: p.adequate,
        /* El rol depende de los términos del proveedor, no del software: VIGÍA lo
           deja por determinar y el abogado lo califica. */
        role: null,
      } satisfies DetectedProvider,
    ];
  });
}


/* ------------------------------------------------------------------ */
/* Términos de tratamiento de cada proveedor (datos curados)            */
/* ------------------------------------------------------------------ */

/** Lo que los términos públicos del proveedor dicen sobre los datos que recibe por API. */
export interface ProviderTerms {
  vendor: string;
  /** ¿Usa por defecto los datos de la API para entrenar sus modelos? null si sus términos no lo aclaran. */
  trainsOnApiData: boolean | null;
  /** Retención por defecto de entradas y salidas de la API, en palabras. */
  retention: string;
  /** ¿Ofrece retención cero o exclusión de retención? null si no consta. */
  zeroRetention: boolean | null;
  /** URL del acuerdo de tratamiento de datos (DPA) o de los términos de la API. */
  termsUrl: string;
  /** Fecha en que se verificaron los términos (AAAA-MM-DD). */
  verifiedAt: string;
  /** Resumen citable, en una frase, de lo verificado. */
  note: string;
}

/** ponytail: base curada mínima; la llena y amplía el módulo de proveedores. */
const PROVIDER_TERMS: ProviderTerms[] = [];

export function providerTerms(vendor: string): ProviderTerms | undefined {
  return PROVIDER_TERMS.find((t) => t.vendor.toLowerCase() === vendor.toLowerCase());
}
