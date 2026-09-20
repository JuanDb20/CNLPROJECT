/**
 * Herramientas de IA que "vibecodean" apps y qué dicen sus propios términos sobre
 * la titularidad del código que generan. Datos, no código: VGI-112 (checks-licencias.ts)
 * solo recorre esta tabla.
 *
 * Cada `termsUrl`/`verifiedAt` se verificó leyendo la fuente oficial el 19-sep-2026.
 * Donde el término no es verificable con certeza, `ownership` queda "por confirmar" y
 * `termsUrl`/`verifiedAt` en null: no se inventa lo que la fuente no dice con claridad.
 */
export interface HerramientaIA {
  tool: string;
  /** Marcador que delata el origen: se prueba contra la ruta y contra el contenido del archivo. */
  marker: RegExp;
  /** A quién atribuyen los términos la propiedad del código generado, en una frase. */
  ownership: string;
  termsUrl: string | null;
  verifiedAt: string | null;
  note: string;
}

export const HERRAMIENTAS_IA: HerramientaIA[] = [
  {
    tool: "Lovable",
    marker: /lovable-tagger|lovable\.dev/i,
    ownership:
      "El cliente es dueño del código y de cualquier «AI Output» que Lovable genere para él, " +
      "sujeto a derechos de terceros en los modelos o datos de entrenamiento subyacentes.",
    termsUrl: "https://lovable.dev/product-terms",
    verifiedAt: "2026-09-19",
    note:
      "Cláusula 4.5: «The Customer also own[s] any AI Output generated for the Customer through " +
      "the Lovable.dev Services». Desde el 9-sep-2026 Lovable puede usar el contenido de los " +
      "planes Free y Pro para entrenar sus modelos, salvo que el cliente lo desactive en su cuenta.",
  },
  {
    tool: "v0 (Vercel)",
    marker: /v0\.dev|v0 by Vercel/i,
    ownership:
      "Vercel cede al cliente los derechos que ella tenga sobre el «Output», con la salvedad de " +
      "que ese resultado puede no ser único: otro usuario puede recibir un resultado similar.",
    termsUrl: "https://vercel.com/legal/ai-product-terms",
    verifiedAt: "2026-09-19",
    note:
      "Sección 6.2: «you own Customer Content and Vercel assigns to you Vercel's rights, if any, " +
      "in the Output». Vercel recomienda además revisión humana del código antes de uso comercial.",
  },
  {
    tool: "Bolt (StackBlitz)",
    marker: /(^|\/)\.bolt\/|bolt\.new/i,
    ownership:
      "El usuario conserva su contenido y StackBlitz le cede los derechos que tenga sobre el " +
      "«AI Output» generado, sujeto a derechos de terceros y de otros usuarios.",
    termsUrl: "https://stackblitz.com/terms-of-service",
    verifiedAt: "2026-09-19",
    note:
      "Sección 3.3: «Stackblitz assigns to you all of its right, title, and interest [...] in and " +
      "to the AI Output generated for you». La sección 3.5 permite usar lo generado en Bolt desde " +
      "el 14-sep-2026 para entrenar modelos, con opción de exclusión (privacy@stackblitz.com).",
  },
  {
    tool: "Cursor",
    marker: /(^|\/)\.cursor\/rules\b|(^|\/)\.cursorrules$/i,
    ownership:
      "Anysphere (Cursor) cede al usuario todos sus derechos sobre las «Suggestions» generadas; " +
      "el usuario ya era dueño de sus propios «Inputs».",
    termsUrl: "https://cursor.com/terms-of-service",
    verifiedAt: "2026-09-19",
    note:
      "Sección 5.3: «Anysphere hereby assigns to you all of our right, title, and interest if any " +
      "in and to any Suggestions». Sin «Privacy Mode», Cursor puede usar el código para mejorar " +
      "sus modelos.",
  },
  {
    tool: "Replit",
    marker: /(^|\/)replit\.nix$|(^|\/)\.replit$/i,
    ownership:
      "Por confirmar: los términos no fijan expresamente quién es dueño del código que la IA " +
      "genera; solo advierten que puede ser erróneo o incompleto.",
    termsUrl: "https://replit.com/terms-of-service",
    verifiedAt: "2026-09-19",
    note:
      "A diferencia de Lovable, v0, Bolt y Cursor, no se encontró una cláusula de cesión expresa " +
      "del «Output Content» de IA. Antes de explotar el código conviene pedir a Replit que lo " +
      "confirme por escrito, o tratarlo como de titularidad no acreditada.",
  },
  {
    tool: "GitHub Copilot",
    marker: /(^|\/)\.github\/copilot-instructions\.md$/i,
    ownership: "GitHub no reclama las «Suggestions»: el usuario conserva la titularidad de su código.",
    termsUrl: "https://github.com/customer-terms/github-copilot-product-specific-terms",
    verifiedAt: "2026-09-19",
    note:
      "Sección 2: «GitHub does not own Suggestions. You retain ownership of Your Code». El " +
      "archivo de instrucciones personalizadas del repositorio es un indicio de uso, no prueba " +
      "de que todo el código provenga de Copilot.",
  },
  {
    tool: "Firebase Studio",
    marker: /(^|\/)\.idx\//i,
    ownership:
      "Google no reclama la titularidad del contenido generado por sus funciones de IA, aunque " +
      "aclara que puede generar el mismo resultado o uno similar para otros usuarios.",
    termsUrl: "https://ai.google.dev/gemini-api/terms",
    verifiedAt: "2026-09-20",
    note:
      "Firebase Studio se rige por los Términos de Servicio de Google, y su propia página de FAQ " +
      "remite lo generativo a los Gemini API Additional Terms of Service, que son la fuente de " +
      "esta cláusula de no reclamación de titularidad. Nota de vigencia: Firebase Studio deja de " +
      "aceptar cuentas nuevas desde el 22-jun-2026 y se retira el 22-mar-2027, así que este " +
      "marcador cada vez tendrá menos código nuevo que detectar.",
  },
  {
    tool: "Herramienta no identificada (marcador .same/)",
    marker: /(^|\/)\.same\//i,
    ownership: "Por confirmar: no se identificó con certeza a qué herramienta corresponde este marcador.",
    termsUrl: null,
    verifiedAt: null,
    note:
      "El marcador `.same/` es habitual en proyectos generados con herramientas de desarrollo " +
      "asistido por IA; antes de citar una cláusula hay que confirmar la herramienta exacta y " +
      "leer sus términos vigentes.",
  },
];
