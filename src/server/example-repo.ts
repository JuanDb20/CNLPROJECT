import { createHash } from "node:crypto";

import type { RepoFile } from "@/domain/types";
import { writeZip } from "@/server/zip";

/**
 * Código sintético de un asistente vibecodeado con fallas reales (llave por
 * variable de entorno accesible desde una herramienta, tabla sin RLS,
 * consulta biométrica sin verificar sesión) y las propias de una fintech
 * (tarjeta guardada, biometría sin borrado, autorización que mezcla la
 * publicidad, rechazo sin motivos, cobranza sin horario y a las referencias,
 * código a nombre de la agencia que lo hizo). No son hallazgos precalculados:
 * VIGÍA los detecta corriendo el mismo catálogo de pruebas que usa con
 * código real, así el botón de ejemplo sirve para probar el flujo completo.
 */
export const EXAMPLE_FILES: RepoFile[] = [
  {
    path: "package.json",
    content: `{
  "name": "crediveloz-asistente",
  "author": "Estudio Pixel Dev",
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
  numero_tarjeta text,
  cvv text,
  selfie_url text,
  face_template text
);
`,
  },
  {
    path: "src/consentimiento.tsx",
    content: `export function Consentimiento() {
  return (
    <label>
      <input type="checkbox" required /> Autorizo a Crediveloz a tratar mis datos para estudiar mi crédito y para enviarme publicidad y ofertas de sus aliados.
    </label>
  );
}
`,
  },
  {
    path: "src/credito.ts",
    content: `// Decisión automática de la solicitud de crédito
export function decidir(solicitud: { puntaje: number }) {
  if (solicitud.puntaje < 600) return { estado: "rechazado" };
  return { estado: "aprobado" };
}
`,
  },
  {
    path: "src/cobranza.ts",
    content: `import twilio from "twilio";

const sms = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Recordatorio diario a los clientes en mora
export async function cobrar(cliente) {
  await sms.messages.create({ to: cliente.celular, from: "Crediveloz", body: "Su cuota está en mora" });
  await Promise.all(cliente.referencias.map((r) => sms.messages.create({ to: r.celular, from: "Crediveloz", body: "Su referido está en mora" })));
}
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
    content: `export const SYSTEM_PROMPT = \`Eres el asistente de soporte de Crediveloz. Solo el
personal autorizado o un analista de fraude empleado por Crediveloz puede pedir
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

/** Huella del .zip de ejemplo: identifica la auditoría de ejemplo sin marcarla aparte. */
export const EXAMPLE_SHA256 = createHash("sha256").update(writeZip(EXAMPLE_FILES)).digest("hex");
