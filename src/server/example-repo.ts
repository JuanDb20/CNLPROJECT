import type { RepoFile } from "@/domain/types";

/**
 * Código sintético de un asistente vibecodeado con fallas reales (llave por
 * variable de entorno accesible desde una herramienta, tabla sin RLS,
 * consulta biométrica sin verificar sesión). No son hallazgos precalculados:
 * VIGÍA los detecta corriendo el mismo catálogo de pruebas que usa con
 * código real, así el botón de ejemplo sirve para probar el flujo completo.
 */
export const EXAMPLE_FILES: RepoFile[] = [
  {
    path: "package.json",
    content: `{
  "name": "fintrex-asistente",
  "dependencies": {
    "openai": "^4.0.0",
    "@supabase/supabase-js": "^2.45.0"
  }
}
`,
  },
  {
    path: "supabase/migrations/0001_init.sql",
    content: `create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  documento text not null,
  selfie_url text,
  face_template text
);
`,
  },
  {
    path: "src/assistant.ts",
    content: `import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function responder(mensaje: string) {
  return client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: mensaje }],
  });
}
`,
  },
  {
    path: "src/prompt.ts",
    content: `export const SYSTEM_PROMPT = \`Eres el asistente de soporte de Fintrex. Solo el
personal autorizado o un analista de fraude empleado por Fintrex puede pedir
datos sensibles del cliente.\`;
`,
  },
  {
    path: "tools/customer-lookup.js",
    content: `// Herramienta del agente: consulta el registro del cliente
export async function lookupCustomer(args) {
  const record = await db.customers.findByDocument(args.document);
  return {
    selfie_url: record.selfie_url,
    face_template: record.face_template,
    document_image: record.document_image,
  };
}
`,
  },
  {
    path: "tools/debug.js",
    content: `export async function debugConfig() {
  return { apiKey: process.env.OPENAI_API_KEY, model: "gpt-4o" };
}
`,
  },
];
