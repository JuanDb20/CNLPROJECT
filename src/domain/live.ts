import type { ScopeClause } from "./types";

/**
 * Inspección de solo lectura del despliegue declarado en el alcance.
 *
 * VIGÍA consulta desde su servidor las rutas públicas de `LIVE_PATHS` y guarda
 * lo que cualquier visitante vería: estado, cabeceras y los primeros bytes del
 * cuerpo. Nunca envía datos, nunca intenta explotar lo que encuentre, y de los
 * archivos de configuración expuestos conserva solo los nombres de las
 * variables. La cláusula de más abajo es el límite jurídico de esa conducta y
 * debe describir exactamente lo que hace `inspectDeployment`: si una cambia,
 * cambia la otra.
 */

/** Rutas que se consultan, una sola vez cada una. La cláusula las lista textualmente. */
export const LIVE_PATHS = [
  "/",
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.git/HEAD",
  "/.git/config",
  "/robots.txt",
  "/sitemap.xml",
  "/politica-de-tratamiento",
  "/politica-de-privacidad",
  "/privacidad",
  "/politica",
  "/tratamiento-de-datos",
  "/api/chat",
] as const;

/** Máximo de redirecciones que se siguen por ruta, revalidando cada destino. */
export const LIVE_MAX_REDIRECTS = 3;

/** Cabeceras de respuesta que se conservan; el resto se descarta. */
export const LIVE_HEADERS = [
  "content-type",
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "server",
  "x-powered-by",
] as const;

export interface LivePage {
  /** Ruta consultada, p. ej. "/", "/.env", "/politica-de-tratamiento". */
  path: string;
  /** Código de estado; 0 si la petición no llegó a completarse. */
  status: number;
  /** Cabeceras de `LIVE_HEADERS` presentes, con el nombre en minúsculas. */
  headers: Record<string, string>;
  /** Cada `Set-Cookie` de la respuesta, tal como llegó. */
  setCookie: string[];
  /** Primeros bytes del cuerpo, en texto. Si parecía un `.env`, solo los nombres de las variables. */
  body: string;
  /** Destino final si hubo redirecciones. */
  redirectedTo?: string;
  /** Motivo por el que la ruta no se pudo consultar (tiempo agotado, red, destino no permitido). */
  error?: string;
}

export interface LiveInspection {
  /** Origen consultado, sin barra final: `${url}${page.path}` es la dirección exacta. */
  url: string;
  at: string;
  pages: LivePage[];
}

/** Origen público que realmente se consulta: la cláusula y la inspección deben nombrar lo mismo. */
export function liveOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

/** Línea con forma `CLAVE=valor` (o `export CLAVE=valor`) de un archivo de entorno. */
const ENV_LINE = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

/**
 * Nombres de las variables si el texto tiene forma de archivo `.env`; lista vacía
 * si no la tiene. La usan tanto la inspección (para guardar solo los nombres y
 * nunca los valores) como la prueba VGI-115 (para leerlos como evidencia): así
 * las dos no pueden discrepar.
 */
export function envVarNames(body: string): string[] {
  if (/<(!doctype|html|body|head)\b/i.test(body)) return [];
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const names = lines.flatMap((l) => ENV_LINE.exec(l)?.[1] ?? []);
  return names.length >= 2 && names.length >= lines.length * 0.7 ? names : [];
}

/** La página de una ruta, si se consultó. */
export const livePage = (live: LiveInspection, path: string): LivePage | undefined =>
  live.pages.find((p) => p.path === path);

/** Cláusula del acuerdo de alcance que autoriza peticiones de solo lectura a la URL declarada. */
export function buildLiveClause(url: string): ScopeClause {
  return {
    id: "clause-live",
    label: "Autorización de inspección de solo lectura del despliegue público declarado",
    detail:
      "El cliente autoriza a VIGÍA a consultar desde sus servidores, identificándose con el " +
      "encabezado «User-Agent: VIGIA/1 inspeccion de solo lectura autorizada por el cliente» " +
      `para que las peticiones sean reconocibles en sus registros, únicamente estas ` +
      `${LIVE_PATHS.length} direcciones de ${liveOrigin(url)}: ${LIVE_PATHS.join(", ")}. ` +
      "Cada dirección se consulta una sola vez, por los métodos GET o HEAD —esta versión solo " +
      "emplea GET—, sin autenticación ni credenciales, sin enviar formularios, mensajes ni dato " +
      "personal alguno, y siguiendo a lo sumo " +
      `${LIVE_MAX_REDIRECTS} redirecciones por dirección: en total, ${LIVE_PATHS.length} peticiones ` +
      "sin repetición y sin carga sobre el sistema. La inspección se limita a lo que cualquier " +
      "visitante de internet puede ver —el código de estado, las cabeceras de la respuesta y los " +
      "primeros bytes del cuerpo—; de los archivos de configuración que resulten expuestos VIGÍA " +
      "registra solo los nombres de las variables, nunca su valor. El art. 269A de la Ley 1273 de " +
      "2009 sanciona el acceso a un sistema informático «sin autorización o por fuera de lo " +
      "acordado», y el art. 269H agrava la pena cuando la conducta recae sobre sistemas del sector " +
      "financiero o se aprovecha un vínculo contractual: por eso esta cláusula fija la dirección " +
      "exacta, el método, las rutas y el número de peticiones, y sin su aceptación VIGÍA no consulta " +
      "el despliegue. Quedan expresamente excluidas la obstaculización o el agotamiento de recursos " +
      "(art. 269B), la interceptación de datos informáticos (art. 269C), el daño, borrado o " +
      "alteración de datos o de componentes lógicos (art. 269D) y toda prueba de explotación de las " +
      "fallas que se observen: si VIGÍA detecta un archivo de configuración expuesto, lo reporta y no " +
      "lo utiliza. La autorización rige solo mientras se ejecuta esta auditoría —el análisis inicial y " +
      "el retesteo de la versión corregida— y es revocable en cualquier momento por escrito al abogado " +
      "revisor o al canal de contacto del informe; recibida la revocatoria, la inspección se detiene. " +
      "VIGÍA no conoce pronunciamiento colombiano que se haya ocupado específicamente de peticiones de " +
      "lectura autorizadas a recursos ya públicos (por confirmar): precisamente por eso esta " +
      "autorización se pide previa, expresa y delimitada.",
    required: true,
    accepted: false,
  };
}
