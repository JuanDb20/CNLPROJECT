import type { Check, Hit } from "./check-kit";
import { type LiveInspection, type LivePage, envVarNames, livePage } from "./live";

/**
 * Inspección de solo lectura del despliegue declarado en el alcance.
 *
 * Estas pruebas no miran el código: leen `ctx.live`, lo que el despliegue
 * público respondió a las peticiones GET que autoriza la cláusula
 * `clause-live`. Si el cliente no declaró URL, o si el despliegue no respondió,
 * `ctx.live` es null y ninguna prueba dispara. El retesteo vuelve a consultar
 * el despliegue, de modo que cada prueba pasa cuando la versión corregida ya no
 * muestra la falla: no basta con cambiar el código, hay que desplegarlo.
 */

/** Evidencia de una ruta: la dirección exacta consultada y qué respondió. */
const hit = (live: LiveInspection, page: LivePage, text: string): Hit => ({
  path: `${live.url}${page.path}`,
  line: 1,
  text: `HTTP ${page.status} · ${text}`,
});

const PROBE = "petición GET de solo lectura autorizada por el cliente en el acuerdo de alcance";

const ENV_PATHS = ["/.env", "/.env.local", "/.env.production"];
const POLICY_PATHS = [
  "/politica-de-tratamiento",
  "/politica-de-privacidad",
  "/privacidad",
  "/politica",
  "/tratamiento-de-datos",
];
/** Enlace o texto que anuncia la política de tratamiento. */
const POLICY_TEXT = /pol[ií]tica|privacidad|tratamiento\s*de\s*datos/i;
/** Puntero de un repositorio git servido en claro. */
const GIT_SHAPE = /^ref:\s*refs\//m;
/** Cookie que probablemente transporta la sesión: ahí HttpOnly no es opcional. */
const SESSION_COOKIE = /sess|auth|sid|jwt|login|_token/i;

/** Cabeceras de seguridad que faltan en la respuesta de `/`. */
function missingHeaders(live: LiveInspection): string[] {
  const root = livePage(live, "/");
  /* Solo una respuesta normal dice qué cabeceras envía el sistema: una página de
     desafío antibots, un 401 o un mantenimiento traen las del proveedor. */
  if (root?.status !== 200) return [];
  const h = root.headers;
  const csp = h["content-security-policy"] ?? "";
  return [
    live.url.startsWith("https:") && !h["strict-transport-security"]
      ? "Strict-Transport-Security"
      : "",
    !csp ? "Content-Security-Policy" : "",
    !/frame-ancestors/i.test(csp) && !h["x-frame-options"]
      ? "X-Frame-Options (o frame-ancestors en la CSP)"
      : "",
    !/nosniff/i.test(h["x-content-type-options"] ?? "") ? "X-Content-Type-Options: nosniff" : "",
    !h["referrer-policy"] ? "Referrer-Policy" : "",
  ].filter(Boolean);
}

/** Cookies del despliegue a las que les falta alguna marca, con el nombre y qué falta. */
function weakCookies(live: LiveInspection): Array<{ page: LivePage; name: string; missing: string[] }> {
  return live.pages.flatMap((page) =>
    /* Una página de desafío o de error entrega cookies del proveedor, no del
       sistema auditado: solo se juzgan las de una respuesta normal. */
    (page.status === 200 ? page.setCookie : []).flatMap((cookie) => {
      const name = cookie.split("=")[0].trim();
      const missing = [
        /;\s*secure\b/i.test(cookie) ? "" : "Secure",
        /;\s*httponly\b/i.test(cookie) || !SESSION_COOKIE.test(name) ? "" : "HttpOnly",
        /;\s*samesite\s*=/i.test(cookie) ? "" : "SameSite",
      ].filter(Boolean);
      return missing.length > 0 && name ? [{ page, name, missing }] : [];
    }),
  );
}

/** El bloque `headers()` que VIGÍA usa en su propio next.config.ts. */
const HEADERS_PATCH = [
  "  async headers() {",
  "    return [",
  "      {",
  '        source: "/:path*",',
  "        headers: [",
  '          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },',
  '          { key: "X-Frame-Options", value: "DENY" },',
  '          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },',
  '          { key: "X-Content-Type-Options", value: "nosniff" },',
  "          {",
  '            key: "Content-Security-Policy",',
  '            value: "frame-ancestors \'none\'; base-uri \'self\'; form-action \'self\'",',
  "          },",
  "        ],",
  "      },",
  "    ];",
  "  },",
];

export const CHECKS_DESPLIEGUE: Check[] = [
  /* ------------------------- CRÍTICOS ------------------------- */
  {
    code: "VGI-115",
    module: "static-scan",
    severity: "critico",
    title: "Archivo de variables de entorno accesible en el despliegue público",
    summary:
      "Una ruta como /.env responde 200 con contenido con forma CLAVE=valor: cualquiera en " +
      "internet puede descargar las credenciales del sistema escribiendo la dirección en el " +
      "navegador. VIGÍA registra solo los nombres de las variables, nunca sus valores.",
    legalAnalysis:
      "Las llaves que ese archivo publica abren la base de datos y los servicios de IA donde " +
      "{cliente} trata datos personales: el deber de seguridad obliga a adoptar las medidas " +
      "técnicas necesarias para evitar el acceso no autorizado o fraudulento (art. 4 lit. g y " +
      "art. 17 lit. d de la Ley 1581 de 2012), y un archivo de credenciales servido al público " +
      "es lo contrario de una medida. Mientras el archivo estuvo expuesto debe presumirse que " +
      "las credenciales están comprometidas, de modo que rotarlas no es opcional; si hay " +
      "indicios de que alguien las usó para acceder a los datos, {cliente} debe informar a la " +
      "Superintendencia de Industria y Comercio (art. 17 lit. n). Para sistemas con IA la " +
      "Circular Externa 002 de 2024 (num. VIII) exige medidas que eviten la circulación a " +
      "personas no autorizadas y que sean auditables. Este hallazgo no proviene del código sino " +
      "de una petición de lectura al despliegue que el representante legal autorizó: VIGÍA leyó " +
      "la respuesta y no utilizó ninguna credencial.",
    ruleIds: ["col-1581-seguridad", "col-1581-incidentes", "col-sic-ia-seguridad", "owasp-a02"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      return ENV_PATHS.flatMap((path) => {
        const page = livePage(live, path);
        if (!page || page.status !== 200) return [];
        const names = envVarNames(page.body);
        return names.length === 0
          ? []
          : [hit(live, page, `archivo de entorno expuesto; variables: ${names.join(", ")}`)];
      });
    },
    patch: (hits) => ({
      kind: "config",
      target: ".vercelignore",
      removed: [],
      added: [".env", ".env.*", "!.env.example"],
      expectedImpact:
        "El despliegue deja de publicar el archivo y las rutas señaladas pasan a responder 404 " +
        `(${hits.length === 1 ? "la ruta expuesta" : `las ${hits.length} rutas expuestas`} ` +
        "se comprueban de nuevo en el retesteo). En un servidor propio, la regla equivalente es " +
        "denegar los archivos que empiezan por punto en nginx o Apache. El bloqueo no basta por " +
        "sí solo: toda llave que estuvo publicada debe rotarse en el proveedor que la emitió.",
    }),
    branch: "vigia-patch/ocultar-env",
    changeNote:
      "Cambia solo qué archivos se publican; no toca el código. La rotación de cada llave " +
      "expuesta es manual, urgente y se hace en la consola de cada proveedor.",
    retests: [
      "Nueva petición GET a las rutas señaladas del despliegue corregido: ya no responden 200 con forma CLAVE=valor",
      "Las llaves que estuvieron expuestas quedaron rotadas en el proveedor (se acredita por escrito)",
      "El sistema sigue funcionando con las llaves nuevas",
    ],
  },
  {
    code: "VGI-116",
    module: "static-scan",
    severity: "critico",
    title: "Repositorio .git accesible en el despliegue público",
    summary:
      "El directorio .git quedó publicado: con /.git/HEAD y /.git/config cualquiera reconstruye " +
      "el historial completo del proyecto, incluidas las credenciales que alguna vez se " +
      "commitearon y luego se borraron.",
    legalAnalysis:
      "Un .git publicado entrega el código y su historial, y con ellos las llaves y la " +
      "estructura de la base de datos donde {cliente} trata datos personales. Es un " +
      "incumplimiento del deber de seguridad (art. 4 lit. g y art. 17 lit. d de la Ley 1581 de " +
      "2012), que obliga a impedir el acceso no autorizado a los registros; y del principio de " +
      "acceso y circulación restringida (art. 4 lit. f), porque el sistema queda a disposición " +
      "de cualquiera en internet. Borrar una credencial en un commit posterior no la retira del " +
      "historial: toda llave que aparezca en él debe considerarse comprometida y rotarse.",
    ruleIds: ["col-1581-seguridad", "col-1581-circulacion", "owasp-a02"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      const head = livePage(live, "/.git/HEAD");
      const config = livePage(live, "/.git/config");
      return [
        head?.status === 200 && GIT_SHAPE.test(head.body)
          ? hit(live, head, `puntero del repositorio expuesto: ${head.body.trim().slice(0, 60)}`)
          : null,
        config?.status === 200 && /\[core\]/.test(config.body)
          ? hit(live, config, "configuración del repositorio expuesta: contiene [core]")
          : null,
      ].filter((h): h is Hit => h !== null);
    },
    patch: () => ({
      kind: "config",
      target: ".vercelignore",
      removed: [],
      added: [".git", ".git/**"],
      expectedImpact:
        "El despliegue deja de publicar el directorio .git y esas rutas pasan a responder 404. " +
        "En un servidor propio, la regla equivalente deniega cualquier ruta que contenga /.git/. " +
        "Además hay que revisar el historial en busca de credenciales y rotar las que aparezcan.",
    }),
    branch: "vigia-patch/ocultar-git",
    changeNote:
      "Cambia solo qué archivos se publican. Revisar el historial y rotar credenciales es " +
      "trabajo manual posterior.",
    retests: [
      "Nueva petición GET a /.git/HEAD y /.git/config del despliegue corregido: ya no responden 200",
      "El historial se revisó y las credenciales encontradas quedaron rotadas",
    ],
  },

  /* ----------------------- ADVERTENCIAS ----------------------- */
  {
    code: "VGI-117",
    module: "static-scan",
    severity: "advertencia",
    title: "Cabeceras de seguridad ausentes en el despliegue",
    summary:
      "La respuesta de la página principal no trae alguna de las cabeceras que impiden que el " +
      "sistema se cargue dentro de otro sitio, que el navegador adivine el tipo de contenido o " +
      "que la dirección visitada viaje entera al enlace externo.",
    legalAnalysis:
      "El deber de seguridad del art. 4 lit. g y del art. 17 lit. d de la Ley 1581 de 2012 " +
      "exige medidas técnicas proporcionadas al riesgo, y estas cabeceras son la medida estándar " +
      "y gratuita frente a ataques conocidos: sin X-Frame-Options ni frame-ancestors el portal " +
      "puede incrustarse en un sitio de suplantación para capturar las credenciales del titular " +
      "(secuestro de clics); sin Strict-Transport-Security el navegador puede ser llevado a la " +
      "versión sin cifrar; sin Referrer-Policy la dirección completa —que puede incluir " +
      "identificadores del titular— se envía a terceros. Es una configuración incompleta del " +
      "despliegue en el sentido de OWASP A02:2025, no una falla del código.",
    ruleIds: ["owasp-a02", "col-1581-seguridad"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      const missing = missingHeaders(live);
      const root = livePage(live, "/");
      return missing.length === 0 || root?.status !== 200
        ? []
        : [hit(live, root, `faltan las cabeceras: ${missing.join("; ")}`)];
    },
    patch: () => ({
      kind: "config",
      target: "next.config.ts",
      removed: [],
      added: HEADERS_PATCH,
      expectedImpact:
        "El servidor envía las cabeceras en todas las rutas: el portal deja de poder " +
        "incrustarse, el navegador no adivina el tipo de contenido y la dirección visitada no " +
        "viaja completa hacia otros dominios. No cambia ninguna pantalla ni ningún dato.",
    }),
    branch: "vigia-patch/cabeceras-seguridad",
    changeNote:
      "Solo añade cabeceras de respuesta. Conviene revisar la CSP si el sistema incrusta " +
      "contenido de otros dominios a propósito.",
    retests: [
      "Nueva petición GET a la raíz del despliegue corregido: la respuesta trae todas las cabeceras señaladas",
      "El portal sigue cargando sus propios recursos sin bloqueos en la consola del navegador",
    ],
  },
  {
    code: "VGI-118",
    module: "static-scan",
    severity: "advertencia",
    title: "Cookies del despliegue sin las marcas Secure, HttpOnly o SameSite",
    summary:
      "El despliegue entrega cookies sin alguna de las marcas que impiden que viajen por " +
      "conexiones sin cifrar, que el código de la página las lea o que se envíen desde otro " +
      "sitio. VIGÍA registra el nombre de la cookie y las marcas que faltan, nunca su valor.",
    legalAnalysis:
      "Si la cookie transporta la sesión del titular, quien la obtenga entra a la cuenta sin " +
      "contraseña y accede a sus datos personales. El deber de seguridad (art. 4 lit. g y art. " +
      "17 lit. d de la Ley 1581 de 2012) exige evitar el acceso no autorizado a los registros, y " +
      "estas tres marcas son el control mínimo del lado del servidor: sin Secure la cookie viaja " +
      "en claro si alguien fuerza http; sin HttpOnly cualquier script inyectado la lee; sin " +
      "SameSite se envía en peticiones originadas en otro sitio. Además, si la cookie no es " +
      "necesaria para prestar el servicio, su instalación requiere autorización previa del " +
      "titular (art. 9 de la Ley 1581) y la información del art. 12.",
    ruleIds: ["col-1581-seguridad", "owasp-a02"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      return weakCookies(live).map(({ page, name, missing }) =>
        hit(live, page, `cookie ${name} sin ${missing.join(", ")}`),
      );
    },
    patch: (hits) => ({
      kind: "codigo",
      target: "Opciones de la cookie en el servidor",
      removed: [],
      added: [
        "cookies().set(nombre, valor, {",
        "  httpOnly: true,   // el script de la página no puede leerla",
        "  secure: true,     // solo viaja por https",
        '  sameSite: "lax",  // no se envía desde otro sitio',
        '  path: "/",',
        "});",
      ],
      expectedImpact:
        `Las ${hits.length === 1 ? "cookie señalada" : `${hits.length} cookies señaladas`} se ` +
        "emiten con las tres marcas. La sesión deja de ser legible por scripts y de viajar sin " +
        "cifrar; si alguna cookie la lee el navegador a propósito, se separa del identificador " +
        "de sesión en lugar de quitarle HttpOnly.",
    }),
    branch: "vigia-patch/cookies-seguras",
    changeNote:
      "Cambia cómo se emiten las cookies. Las sesiones abiertas antes del cambio deben " +
      "renovarse; conviene desplegarlo en una ventana de baja actividad.",
    retests: [
      "Nueva petición GET al despliegue corregido: cada Set-Cookie trae Secure, SameSite y, en la de sesión, HttpOnly",
      "El inicio de sesión y la navegación siguen funcionando con la cookie renovada",
    ],
  },
  {
    code: "VGI-119",
    module: "static-scan",
    severity: "advertencia",
    title: "Política de origen cruzado abierta en el despliegue",
    summary:
      "El despliegue responde con Access-Control-Allow-Origin: * en rutas que entregan datos, y " +
      "en un caso además declara admitir credenciales: cualquier sitio web puede pedirle " +
      "información al sistema desde el navegador de un titular.",
    legalAnalysis:
      "Abrir el origen cruzado sin restricción amplía quién puede leer las respuestas del " +
      "sistema, contra el principio de acceso y circulación restringida (art. 4 lit. f de la Ley " +
      "1581 de 2012), que ordena que los datos no queden disponibles en internet salvo que el " +
      "acceso sea técnicamente controlable. El comodín combinado con credenciales es una " +
      "configuración contradictoria —el navegador rechaza esa combinación— pero delata que la " +
      "política se escribió para que «funcione» sin delimitar orígenes, y suele acompañarse de " +
      "servidores que reflejan el Origin recibido, lo que sí permite la lectura con sesión. Es " +
      "una configuración insegura en el sentido de OWASP A02:2025 y un incumplimiento del deber " +
      "de seguridad del art. 17 lit. d.",
    ruleIds: ["col-1581-circulacion", "col-1581-seguridad", "owasp-a02"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      return live.pages.flatMap((page) => {
        /* Una ruta que no existe responde con la política del 404 del proveedor:
           no dice nada de cómo está configurada la API real. */
        if (page.status === 0 || page.status >= 400) return [];
        const origin = page.headers["access-control-allow-origin"];
        if (origin?.trim() !== "*") return [];
        const credentials = /true/i.test(page.headers["access-control-allow-credentials"] ?? "");
        if (!credentials && page.path !== "/api/chat") return [];
        return [
          hit(
            live,
            page,
            credentials
              ? "Access-Control-Allow-Origin: * junto con Access-Control-Allow-Credentials: true"
              : "Access-Control-Allow-Origin: * en la ruta del asistente",
          ),
        ];
      });
    },
    patch: () => ({
      kind: "config",
      target: "Cabeceras CORS del despliegue",
      removed: [
        'Access-Control-Allow-Origin: *',
        'Access-Control-Allow-Credentials: true',
      ],
      added: [
        "// Lista blanca de orígenes propios; nada de comodín cuando hay sesión.",
        "const PERMITIDOS = new Set([\"https://www.{cliente}.com\"]);",
        "const origen = request.headers.get(\"origin\");",
        "if (origen && PERMITIDOS.has(origen)) {",
        '  respuesta.headers.set("Access-Control-Allow-Origin", origen);',
        '  respuesta.headers.set("Vary", "Origin");',
        "}",
      ],
      expectedImpact:
        "Solo los dominios propios del cliente pueden leer las respuestas desde el navegador. " +
        "Los sitios de terceros dejan de poder consultar la API con la sesión del titular.",
    }),
    branch: "vigia-patch/cors-restringido",
    changeNote:
      "Hay que enumerar los dominios propios antes de desplegar: si falta alguno, su portal " +
      "dejará de poder llamar a la API.",
    retests: [
      "Nueva petición GET al despliegue corregido: la respuesta ya no trae Access-Control-Allow-Origin: *",
      "Una petición desde un dominio de la lista blanca sí recibe la cabecera con ese origen",
    ],
  },

  /* ----------------------- INFORMATIVOS ----------------------- */
  {
    code: "VGI-120",
    module: "static-scan",
    severity: "informativo",
    title: "No se encontró la política de tratamiento en las rutas habituales del despliegue",
    summary:
      "Ninguna de las cinco direcciones habituales de la política respondió, y la página " +
      "principal no trae un enlace cuyo texto la anuncie. Puede estar publicada en otra ruta: " +
      "este hallazgo señala dónde buscó VIGÍA, no afirma que no exista.",
    legalAnalysis:
      "El responsable debe adoptar una política de tratamiento que conste por escrito y ponerla " +
      "en conocimiento de los titulares, con el contenido mínimo del art. 2.2.2.25.3.1 del " +
      "Decreto 1074 de 2015 (antes art. 13 del Decreto 1377 de 2013): identificación y datos de " +
      "contacto del responsable, tratamiento y finalidad, derechos del titular, área encargada " +
      "de atender consultas y reclamos, procedimiento para ejercer los derechos y fecha de " +
      "entrada en vigencia. Una política que el titular no puede encontrar desde la página " +
      "principal difícilmente cumple ese deber de puesta en conocimiento, que además sustenta la " +
      "información previa a la autorización (art. 12 de la Ley 1581 de 2012). VIGÍA solo " +
      "consultó las rutas listadas en el acuerdo de alcance y el sitemap: si {cliente} la " +
      "publica en otra dirección, basta con indicarla y el hallazgo se cierra.",
    ruleIds: ["col-1377-politicas", "col-1581-informar"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      const root = livePage(live, "/");
      if (root?.status !== 200) return [];
      const published = POLICY_PATHS.some((p) => livePage(live, p)?.status === 200);
      const linked = [root, livePage(live, "/sitemap.xml")].some(
        (page) => page?.status === 200 && POLICY_TEXT.test(page.body),
      );
      return published || linked
        ? []
        : [hit(live, root, `sin enlace a la política; tampoco responden ${POLICY_PATHS.join(", ")}`)];
    },
    patch: () => ({
      kind: "codigo",
      target: "app/politica-de-tratamiento/page.tsx",
      removed: [],
      added: [
        "// Publica la política de tratamiento en una ruta estable y enlázala en el pie de página.",
        "export const metadata = { title: \"Política de tratamiento de datos personales\" };",
        "export default function PoliticaPage() {",
        "  return <article>{/* Texto de la política con el contenido mínimo del",
        "    art. 2.2.2.25.3.1 del Decreto 1074 de 2015 y su fecha de vigencia. */}</article>;",
        "}",
      ],
      expectedImpact:
        "La política queda en una dirección fija, enlazada desde la página principal, y el " +
        "titular puede consultarla antes de autorizar el tratamiento.",
    }),
    branch: "vigia-patch/publicar-politica",
    changeNote:
      "Añade una página nueva. El texto de la política lo redacta y aprueba el área jurídica " +
      "del cliente; VIGÍA solo fija la ruta y el enlace.",
    retests: [
      "Nueva petición GET al despliegue corregido: la ruta de la política responde 200",
      "La página principal enlaza la política con un texto que la nombra",
    ],
  },
  {
    code: "VGI-121",
    module: "static-scan",
    severity: "informativo",
    title: "La ruta del asistente responde a una petición sin autenticar",
    summary:
      "/api/chat devolvió 200 con JSON a una petición GET sin sesión ni llave. VIGÍA no envió " +
      "ningún mensaje ni intentó usar el asistente: solo observó que la ruta contesta a quien no " +
      "se ha identificado.",
    legalAnalysis:
      "Si esa ruta llega a entregar información del titular o a consumir el proveedor de IA por " +
      "cuenta de {cliente}, atenderla sin identificar a quien pregunta contraría el principio de " +
      "acceso y circulación restringida (art. 4 lit. f de la Ley 1581 de 2012) y el deber de " +
      "seguridad (art. 17 lit. d), que exige que el control esté en el servidor y no en la " +
      "interfaz. Puede tratarse de una respuesta inocua —un estado de salud del servicio— y por " +
      "eso el hallazgo es informativo: la verificación de qué devuelve con una sesión válida " +
      "excede la autorización de solo lectura y debe hacerse en el entorno de pruebas con una " +
      "autorización específica.",
    ruleIds: ["col-1581-circulacion", "col-1581-seguridad", "owasp-a01"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      const chat = livePage(live, "/api/chat");
      return chat?.status === 200 && /json/i.test(chat.headers["content-type"] ?? "")
        ? [hit(live, chat, "responde JSON a un GET sin autenticación")]
        : [];
    },
    patch: () => ({
      kind: "codigo",
      target: "app/api/chat/route.ts",
      removed: [],
      added: [
        "// Sin sesión no se atiende: el control va en el servidor, antes de cualquier consulta.",
        "const sesion = await currentSession();",
        'if (!sesion) return Response.json({ error: "No autenticado" }, { status: 401 });',
      ],
      expectedImpact:
        "La ruta deja de responder a quien no ha iniciado sesión y pasa a devolver 401. El " +
        "asistente sigue funcionando para los titulares autenticados.",
    }),
    branch: "vigia-patch/chat-autenticado",
    changeNote:
      "Si la ruta se usa a propósito como comprobación pública de estado, conviene separarla en " +
      "una dirección que no dé acceso al asistente en lugar de autenticarla.",
    retests: [
      "Nueva petición GET sin sesión a /api/chat del despliegue corregido: responde 401 y no JSON de datos",
      "Un titular autenticado sigue pudiendo usar el asistente",
    ],
  },
  {
    code: "VGI-123",
    module: "static-scan",
    severity: "informativo",
    title: "La inspección del despliegue no pudo observar el sistema",
    summary:
      "La dirección autorizada respondió, pero no con la página del sistema: delante hay una " +
      "capa de protección, un control de acceso o un mantenimiento. Las demás pruebas de " +
      "despliegue no se pronuncian, y su silencio no significa que el despliegue esté bien.",
    legalAnalysis:
      "Este hallazgo no imputa incumplimiento alguno: deja constancia de que la parte dinámica " +
      "de la auditoría quedó sin verificar, para que el informe no se lea como una comprobación " +
      "que no se hizo. VIGÍA no intenta resolver el desafío, imitar un navegador ni evadir el " +
      "control: hacerlo excedería la autorización de solo lectura del acuerdo de alcance y " +
      "entraría en el supuesto del art. 269A de la Ley 1273 de 2009, que sanciona el acceso a un " +
      "sistema informático «por fuera de lo acordado». Para verificar el despliegue, {cliente} " +
      "puede permitir el paso del identificador «VIGIA/1» durante la ventana de la auditoría o " +
      "indicar una dirección de preproducción equivalente; mientras tanto, las pruebas de " +
      "despliegue quedan por confirmar.",
    ruleIds: ["col-1581-seguridad"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      const root = livePage(live, "/");
      if (!root || root.status === 200) return [];
      const motivo =
        root.status === 0
          ? (root.error ?? "no respondió")
          : /checkpoint|challenge|captcha|just a moment/i.test(root.body)
            ? "respuesta de desafío antibots delante del sistema"
            : "la raíz no devolvió la página del sistema";
      return [hit(live, root, `inspección no concluyente: ${motivo}`)];
    },
    patch: () => ({
      kind: "config",
      target: "Reglas del cortafuegos del despliegue",
      removed: [],
      added: [
        "// Durante la ventana de la auditoría, dejar pasar el identificador de VIGÍA.",
        '// User-Agent: "VIGIA/1 inspeccion de solo lectura autorizada por el cliente"',
        "// (o indicar al auditor una dirección de preproducción equivalente).",
      ],
      expectedImpact:
        "La inspección de solo lectura puede observar las cabeceras y las rutas públicas reales, " +
        "y las demás pruebas de despliegue pasan a pronunciarse sobre el sistema y no sobre la " +
        "capa de protección. La excepción se retira al terminar la auditoría.",
    }),
    branch: "vigia-patch/ventana-de-inspeccion",
    changeNote:
      "No cambia el sistema: es una excepción temporal y acotada en la capa de protección, que " +
      "el cliente decide y revierte. Si prefiere no abrirla, el hallazgo se cierra dejando " +
      "constancia de que la verificación dinámica no se hizo.",
    retests: [
      "Nueva petición GET a la raíz del despliegue: responde con la página del sistema y no con un desafío",
      "Las demás pruebas de despliegue se pronuncian sobre el sistema real",
    ],
  },
  {
    code: "VGI-122",
    module: "static-scan",
    severity: "informativo",
    title: "El despliegue anuncia el producto y la versión del servidor",
    summary:
      "Las cabeceras Server o X-Powered-By de la respuesta incluyen un número de versión: quien " +
      "quiera atacar el sistema sabe de entrada qué vulnerabilidades publicadas probar.",
    legalAnalysis:
      "Revelar la versión no es por sí mismo una falla explotable, pero facilita la búsqueda de " +
      "vulnerabilidades conocidas contra el sistema donde {cliente} trata datos personales y es " +
      "una configuración innecesaria en el sentido de OWASP A02:2025. Dentro del deber de " +
      "seguridad del art. 17 lit. d de la Ley 1581 de 2012, quitar la cabecera es una medida " +
      "administrativa de costo nulo; por sí sola no repara nada, de modo que su valor está en " +
      "acompañar la actualización de las dependencias señaladas por las demás pruebas.",
    ruleIds: ["owasp-a02", "col-1581-seguridad"],
    probe: PROBE,
    detect: ({ live }) => {
      if (!live) return [];
      return live.pages.flatMap((page) =>
        ["server", "x-powered-by"].flatMap((name) => {
          const value = page.headers[name];
          return value && /\d+\.\d+/.test(value)
            ? [hit(live, page, `${name}: ${value}`)]
            : [];
        }),
      );
    },
    patch: () => ({
      kind: "config",
      target: "next.config.ts",
      removed: [],
      added: ["  poweredByHeader: false,"],
      expectedImpact:
        "El servidor deja de anunciar producto y versión en cada respuesta. En un servidor " +
        "propio, la directiva equivalente es server_tokens off en nginx o ServerTokens Prod en " +
        "Apache. No cambia el comportamiento del sistema.",
    }),
    branch: "vigia-patch/ocultar-version",
    changeNote: "Solo suprime una cabecera informativa.",
    retests: [
      "Nueva petición GET al despliegue corregido: las cabeceras Server y X-Powered-By ya no traen número de versión",
    ],
  },
];
