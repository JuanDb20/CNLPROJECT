import type {
  ClientInfo,
  DetectedProvider,
  ModuleId,
  Patch,
  PatchKind,
  RepoFile,
  Severity,
} from "./types";
import type { LiveInspection } from "./live";

/**
 * Kit compartido por todos los catálogos de pruebas: tipos, búsqueda en el
 * código, enmascarado y constantes. Cada dimensión nueva (coherencia, consumidor,
 * licencias, despliegue…) vive en su propio archivo `checks-*.ts` y solo importa
 * de aquí; `checks.ts` los concatena.
 */

export const isCode = (f: RepoFile) => !/\.(md|mdx|txt)$/i.test(f.path);
/** Código fuente, sin manifiestos de dependencias. */
export const isSource = (f: RepoFile) =>
  isCode(f) && !/(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(f.path);


/* ------------------------------------------------------------------ */
/* Búsqueda en el código                                               */
/* ------------------------------------------------------------------ */

export interface Hit {
  path: string;
  line: number;
  text: string;
}

export interface Ctx {
  files: RepoFile[];
  providers: DetectedProvider[];
  /** Dependencias con avisos publicados (OSV.dev), consultadas antes por el servidor. */
  advisories: Hit[];
  /** Cliente auditado: las plantillas de documentos y los paquetes sectoriales lo usan. */
  client: ClientInfo;
  /** Licencia de cada dependencia según el registro de npm, como avisos: "paquete@versión: licencia". */
  licenses: Hit[];
  /** Inspección de solo lectura del despliegue declarado en el alcance; null si no se declaró o no respondió. */
  live: LiveInspection | null;
}

/** Líneas que coinciden con `line` en los archivos cuya ruta coincide con `path`. */
export function grep(files: RepoFile[], path: RegExp, line: RegExp): Hit[] {
  return files
    .filter((f) => path.test(f.path))
    .flatMap((f) =>
      f.content
        .split(/\r?\n/)
        .flatMap((text, i) =>
          line.test(text) ? [{ path: f.path, line: i + 1, text: text.trim() }] : [],
        ),
    );
}

/** Archivos cuya ruta coincide con `path` y que NO contienen `missing`; señala la línea `at`. */
export function lacking(files: RepoFile[], path: RegExp, missing: RegExp, at = /\S/): Hit[] {
  return files
    .filter((f) => path.test(f.path) && !missing.test(f.content))
    .flatMap((f) => grep([f], /./, at).slice(0, 1));
}

/**
 * Números de documento: 5 a 12 dígitos, con o sin puntos o espacios de miles.
 * Debe dejar intactas las citas normativas ("Resolución 52185", "CVE-2025-48757",
 * "art. 2.2.2.25.5.2") y las cifras en pesos ("$214.405.120"), que viven en el
 * mismo texto que se enmascara.
 */
export const DOCUMENT = /(?<![-.\d$])\b(?:\d{1,3}(?:[.\s]\d{3}){1,3}|\d{5,12})\b/g;
/** Palabra que convierte el número siguiente en una cita, no en un documento. */
export const CITED = /(\b(?:ley|decreto|resoluci[oó]n|circular|sentencia|acuerdo|cve|art[ií]?culos?|num|apartado)|\$)\S*\s*$/i;

/** Enmascara llaves, secretos, correos y números de documento antes de mostrarlos. */
export function mask(text: string): string {
  return text
    .replace(/\b(sk-(?:proj-)?|sk_live_|AIza)[\w-]{8,}/g, "$1[ENMASCARADO]")
    .replace(
      /((?:KEY|SECRET|TOKEN|PASSWORD)\w*\s*[=:]\s*["'`]?)(?!process\.env|\[ENMASCARADO)[^\s"'`,;]{6,}/gi,
      "$1[ENMASCARADO]",
    )
    // JWT en cualquier posición, no solo asignado a una variable con nombre de llave.
    .replace(/\beyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g, "[ENMASCARADO]")
    // usuario:clave@host de cadenas de conexión (va antes que el correo: lo contiene).
    .replace(/\b\w+:\/\/[^\s"'`]+:[^\s"'`@/]+@[^\s"'`]+/g, "[ENMASCARADO]")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi, "[ENMASCARADO]")
    .replace(DOCUMENT, (m, offset: number, full: string) =>
      CITED.test(full.slice(Math.max(0, offset - 32), offset)) ? m : "[ENMASCARADO]",
    );
}

/** Parche que reemplaza la primera línea encontrada. `$linea` repite la línea original. */
export function edit(kind: PatchKind, added: string[], expectedImpact: string) {
  return (hits: Hit[]): Patch => ({
    kind,
    target: hits[0].path,
    removed: [hits[0].text],
    added: added.map((l) => (l === "$linea" ? hits[0].text : l)),
    expectedImpact,
  });
}

export const tableName = (sql: string) =>
  /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)/i.exec(sql)?.[1]?.toLowerCase();

/** CVE-2025-29927: corregida en 12.3.5, 13.5.9, 14.2.25 y 15.2.3. */
export const NEXT_FIXED: Record<number, [number, number]> = {
  12: [3, 5],
  13: [5, 9],
  14: [2, 25],
  15: [2, 3],
};

export function nextFix(text: string): string | null {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(text);
  if (!m) return null;
  const [major, minor, patch] = m.slice(1).map(Number);
  const fixed = NEXT_FIXED[major];
  if (!fixed) return null;
  const vulnerable = minor < fixed[0] || (minor === fixed[0] && patch < fixed[1]);
  return vulnerable ? `${major}.${fixed[0]}.${fixed[1]}` : null;
}

export const TOOLS = /(^|\/)tools?\//i;
/** Migraciones y esquemas SQL (no scripts de prueba ni ejemplos). */
export const SCHEMA = /(^|\/)(supabase|migrations?)\/.*\.sql$|(^|\/)schema\.sql$/i;
/** Columnas que delatan datos personales en una tabla. */
export const PERSONAL = /\b(email|correo|phone|tel[eé]fono|celular|c[eé]dula|document\w*|address|direcci[oó]n|birth\w*|nacimiento|salar\w*|passport|pasaporte|medical|diagn\w*|health|salud)\b/i;
export const PUBLIC_VAR = /(NEXT_PUBLIC_|VITE_|REACT_APP_|EXPO_PUBLIC_)\w*(KEY|TOKEN)|dangerouslyAllowBrowser/;
/** Código que no llega al navegador. */
export const SERVER_ONLY = /(^|\/)(supabase\/functions|server|backend|scripts?|api|_?tests?)\//i;

/** Carga útil de un JWT de Supabase con rol de servicio (salta todo el RLS). */
export const serviceRoleJwt = (text: string) =>
  [...text.matchAll(/eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g)].some((m) =>
    /"role"\s*:\s*"service_role"/.test(Buffer.from(m[1], "base64url").toString()),
  );
export const PROMPT = /prompt/i;
/** El registro completo del titular viajando entero hacia el modelo. */
export const FULL_RECORD =
  /=\s*\{\s*(customer|cliente|user|usuario)\s*\}|JSON\.stringify\(\s*(customer|cliente|user|usuario)\s*\)/;
/** Esquemas de base de datos, en SQL o en Prisma. */
export const SCHEMA_FILE = (f: RepoFile) => SCHEMA.test(f.path) || /\.prisma$/i.test(f.path);
/** Tratamiento de alto riesgo: biometría, salud o decisiones sobre personas. */
export const HIGH_RISK =
  /\b(biometr\w*|selfie\w*|face_?template|huella\w*|iris|voiceprint|salud|diagn\w*|scoring|puntaje|riesgo_credit\w*|elegibilidad)\b/i;
/** Estudio de impacto de privacidad, por nombre de archivo o por contenido. */
export const IMPACT_STUDY =
  /\b(eip|dpia|pia)\b|evaluaci[oó]n\s*de\s*impacto|estudio\s*de\s*impacto|privacy\s*impact/i;
/** Ingesta masiva de datos de terceros sitios. */
export const SCRAPING = /puppeteer|playwright|cheerio|scrapy|crawlee|firecrawl|apify|serpapi/i;
/** Registro auditable de accesos a datos personales. */
export const AUDIT_TRAIL =
  /\b(audit|auditor[ií]a|audit_log|access_log|activity_log|event_log|pgaudit)\w*\b|createAuditLog|logAccess/i;
/** Exclusión de entrenamiento o acuerdo de tratamiento con el proveedor. */
export const NO_TRAINING =
  /zero.?retention|no.?training|sin.?entrenamiento|opt.?out|data.?processing.?(agreement|addendum)|\bzdr\b|enterprise/i;
/** Secretos de terceros con forma reconocible (catálogo público de Gitleaks, MIT). */
export const THIRD_PARTY_SECRET =
  /AKIA[0-9A-Z]{16}|\bsk_live_[0-9a-zA-Z]{24,}|\bSG\.[\w-]{22}\.[\w-]{43}|\bxox[baprs]-[0-9a-zA-Z-]{10,}|\bgh[pousr]_[A-Za-z0-9]{36,}|-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/;
/** Marcadores de ejemplo: no son una llave viva. */
export const PLACEHOLDER = /your|xxxx|example|placeholder|reemplazar|aqu[ií]|<[^>]+>/i;

/** Columnas de esquema que delatan datos personales; sirven de evidencia, no solo de señal. */
export const personalColumns = (files: RepoFile[]) =>
  grep(files.filter(SCHEMA_FILE), /./, PERSONAL);

/** ¿Existe ruta, tabla o documento para atender consultas y reclamos del titular? */
export const hasRightsChannel = (files: RepoFile[]) =>
  files.some(
    (f) =>
      /(habeas|reclamo|derechos|arco|supresi[oó]n|petici[oó]n)/i.test(f.path) ||
      (SCHEMA_FILE(f) && /create\s+table[^;(]*\b(habeas|reclamo|solicitud|petici)/i.test(f.content)) ||
      (/\.(md|mdx|html|txt)$/i.test(f.path) &&
        /habeas|reclamo|consultas y reclamos|derecho de supresi/i.test(f.content)),
  );

export interface Check {
  code: string;
  module: ModuleId;
  severity: Severity;
  title: string;
  summary: string;
  /** `{cliente}` se sustituye por el nombre del cliente auditado. */
  legalAnalysis: string;
  ruleIds: string[];
  probe: string;
  detect: (ctx: Ctx) => Hit[];
  patch: (hits: Hit[], ctx: Ctx) => Patch;
  branch: string;
  changeNote: string;
  retests: string[];
}
