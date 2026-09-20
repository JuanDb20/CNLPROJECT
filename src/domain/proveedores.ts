import type { DetectedProvider, RepoFile } from "./types";

import { isSource } from "./check-kit";

/* ------------------------------------------------------------------ */
/* Proveedores de IA                                                   */
/* ------------------------------------------------------------------ */

/** Patrón de detección de un proveedor y sus datos de tratamiento. */
interface ProviderPattern {
  vendor: string;
  pattern: RegExp;
  /** País de tratamiento; null si no aplica (autoalojado). */
  country: string | null;
  /** ¿Figura el país en la lista de la SIC (Circular Única, Título V, num. 3.2)? null si depende o no está confirmado. */
  adequate: boolean | null;
  /** Por defecto "third-party-llm"; los modelos autoalojados se marcan aparte. */
  classification?: DetectedProvider["classification"];
}

export const PROVIDERS: ProviderPattern[] = [
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
  /* ---- Añadidos: más superficie de detección, misma lista curada ---- */
  {
    vendor: "Mistral",
    pattern: /api\.mistral\.ai|@mistralai\//,
    country: "Francia",
    adequate: true,
  },
  {
    vendor: "Groq",
    pattern: /api\.groq\.com|groq-sdk|@ai-sdk\/groq/,
    country: "Estados Unidos",
    adequate: true,
  },
  {
    vendor: "xAI",
    pattern: /api\.x\.ai|@ai-sdk\/xai/,
    country: "Estados Unidos",
    adequate: true,
  },
  {
    vendor: "Azure OpenAI",
    pattern: /openai\.azure\.com|@azure\/openai/,
    country: "Según la región configurada",
    adequate: null,
  },
  {
    vendor: "AWS Bedrock",
    pattern: /@aws-sdk\/client-bedrock|bedrock-runtime/,
    country: "Según la región",
    adequate: null,
  },
  {
    vendor: "Cohere",
    pattern: /api\.cohere\.(ai|com)|cohere-ai/,
    /* Canadá no figura en la lista de países con nivel adecuado de la SIC (Circular
       Única, Título V, num. 3.2): queda en zona gris, no confirmado, de ahí el null. */
    country: "Canadá",
    adequate: null,
  },
  {
    vendor: "Ollama",
    pattern: /localhost:11434|ollama/,
    country: null,
    adequate: null,
    classification: "self-hosted",
  },
];

export function detectProviders(files: RepoFile[]): DetectedProvider[] {
  return PROVIDERS.flatMap((p) => {
    const file = files.find((f) => isSource(f) && p.pattern.test(f.content));
    if (!file) return [];
    const model = /model:\s*["'`]([\w.:/-]+)["'`]/.exec(file.content)?.[1];
    return [
      {
        id: `prov-${p.vendor.toLowerCase().replace(/\s+/g, "-")}`,
        vendor: p.vendor,
        model: model ?? "Modelo no declarado",
        surface: file.path,
        classification: p.classification ?? "third-party-llm",
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

/**
 * Base curada: cada dato viene de la fuente oficial del proveedor, verificada
 * en la fecha indicada. Donde los términos no permiten afirmar un valor único
 * (varía por plan, por región o no está lo bastante claro), el campo queda en
 * null y la nota lo explica — nunca se infiere ni se inventa.
 */
const PROVIDER_TERMS: ProviderTerms[] = [
  {
    vendor: "OpenAI",
    trainsOnApiData: false,
    retention: "30 días (monitoreo de abuso)",
    zeroRetention: true,
    termsUrl: "https://developers.openai.com/api/docs/guides/your-data",
    verifiedAt: "2026-09-19",
    note:
      'Términos de la API: "data sent to the OpenAI API is not used to train or improve OpenAI ' +
      'models" salvo que el cliente decida compartirlos; el monitoreo de abuso retiene los datos ' +
      "hasta 30 días y los clientes aprobados pueden solicitar retención cero (ZDR).",
  },
  {
    vendor: "Anthropic",
    trainsOnApiData: false,
    retention: "ninguna (30 días para los modelos «Covered Models»)",
    zeroRetention: true,
    termsUrl: "https://platform.claude.com/docs/en/manage-claude/api-and-data-retention",
    verifiedAt: "2026-09-19",
    note:
      'Documentación oficial: "Retained data is never used for model training without your ' +
      'express permission" y "conversation content... is not retained by default"; ofrece ' +
      "retención cero (ZDR) para funciones y clientes elegibles.",
  },
  {
    vendor: "Google",
    /* Depende del nivel: el gratuito sí se usa para entrenar, el de pago no. Un solo
       booleano no representa eso con honestidad, así que queda en null y la nota lo aclara. */
    trainsOnApiData: null,
    retention: "según el nivel: gratuito sin plazo fijo; de pago, solo un registro limitado para detectar abuso",
    zeroRetention: null,
    termsUrl: "https://ai.google.dev/gemini-api/terms",
    verifiedAt: "2026-09-19",
    note:
      'Términos adicionales de la API Gemini: en el nivel gratuito "Google uses the content you ' +
      'submit... to provide, improve, and develop Google products" (con revisión humana); en el ' +
      'nivel de pago "Google doesn\'t use your prompts... or responses to improve our products".',
  },
  {
    vendor: "DeepSeek",
    trainsOnApiData: true,
    retention: "sin plazo fijo (mientras sea necesario para el servicio)",
    zeroRetention: null,
    termsUrl: "https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html",
    verifiedAt: "2026-09-19",
    note:
      "Los términos de la API remiten a la política de privacidad general, que no excluye el uso " +
      'de los datos de la API para entrenar: "to train and improve our technology, such as our ' +
      'machine learning models and algorithms"; datos tratados y almacenados en la República ' +
      "Popular China (Hangzhou DeepSeek Artificial Intelligence Co., Ltd.).",
  },
  {
    vendor: "Groq",
    trainsOnApiData: false,
    retention: "ninguna (hasta 30 días si hay error o sospecha de abuso)",
    zeroRetention: true,
    termsUrl: "https://console.groq.com/docs/your-data",
    verifiedAt: "2026-09-19",
    note:
      'Documentación oficial: "By default, Groq does not retain customer data for inference ' +
      'requests"; cualquier cliente puede activar retención cero (ZDR) desde Data Controls.',
  },
  {
    vendor: "Mistral",
    /* Por plan: la API de pago/empresarial queda excluida de entrenamiento por defecto, la
       gratuita no. No se pudo confirmar un valor único en la fuente oficial: no verificado. */
    trainsOnApiData: null,
    retention: "según el plan (el acuerdo de tratamiento fija 30 días tras terminar el contrato para borrar los datos)",
    zeroRetention: true,
    termsUrl: "https://legal.mistral.ai/terms/data-processing-addendum/",
    verifiedAt: "2026-09-19",
    note:
      "No verificado con un único valor por defecto: el acuerdo de tratamiento de datos autoriza " +
      '"training its artificial intelligence models in accordance with its Privacy Policy, unless ' +
      'Customer is or has opted-out of training", y el entrenamiento por defecto varía según el ' +
      "plan; permite activar retención cero para las llamadas sin estado.",
  },
];

export function providerTerms(vendor: string): ProviderTerms | undefined {
  return PROVIDER_TERMS.find((t) => t.vendor.toLowerCase() === vendor.toLowerCase());
}

/** Línea citable de una ficha de proveedor, para la configuración y el informe. */
export function providerSummary(p: DetectedProvider): string {
  const place =
    p.country === null
      ? "No aplica"
      : `${p.country} (${
          p.adequateCountry === true
            ? "país adecuado"
            : p.adequateCountry === false
              ? "zona gris"
              : "adecuación por determinar"
        })`;
  const terms = providerTerms(p.vendor);
  if (!terms) return `${p.vendor} · ${place} · términos no verificados`;
  const trains =
    terms.trainsOnApiData === true
      ? "entrena con datos de la API por defecto"
      : terms.trainsOnApiData === false
        ? "no entrena con datos de la API por defecto"
        : "uso para entrenamiento no verificado";
  return `${p.vendor} · ${place} · ${trains} · retención ${terms.retention} · verificado ${terms.verifiedAt}`;
}
