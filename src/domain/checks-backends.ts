import type { RepoFile } from "./types";
import { type Check, HIGH_RISK, PERSONAL, PLACEHOLDER, edit, grep, isSource, lacking } from "./check-kit";

/**
 * Otros backends del vibe coding: Firebase, Prisma, Drizzle, Mongo.
 *
 * Cada prueba de VGI-011/013/014/017 ya cubre Supabase y los secretos genéricos;
 * aquí se cubre lo que esas no ven: reglas de Firebase, consultas de Prisma/Drizzle/
 * Mongo sin sesión, cadenas de conexión de otros motores y el esquema de Drizzle
 * (que `SCHEMA_FILE` no reconoce: solo sabe de `.sql` y `.prisma`).
 */

/* Regla de Firestore o Storage con "allow ...: if true" (sin condición alguna). */
const RULES_FILE = /\.rules$/i;
const ALLOW_TRUE = /allow\s+[\w,\s]+:\s*if\s+true\b/i;

/* Regla de Realtime Database abierta: ".read": true o ".write": true en un JSON. */
const RTDB_JSON = /\.json$/i;
const RTDB_OPEN = /"\.(read|write)"\s*:\s*true\b/;

/* Ruta de API o server action que consulta la base de datos sin ninguna señal de sesión. */
const SERVER_ENTRY = /(^|\/)api\/|(^|\/)actions?(\/|\.[jt]sx?$)/i;
const AUTH_HINT = /auth|session|getServerSession|currentUser|verifyIdToken|getUser|jwt|Bearer/i;
const DB_CALL =
  /prisma\.\w+\.(findMany|findFirst|findUnique|update|delete)\s*\(|\bdb\.(select|insert|update|delete)\s*\(|\.collection\(\s*["']\w+["']\s*\)|\.from\(\s*["']\w+["']\s*\)/;

/* Cadena de conexión con usuario y clave incrustados en el código fuente. */
const CONN_STRING = /\b(mongodb(\+srv)?|postgres(ql)?|mysql):\/\/[^\s"'`]+:[^\s"'`@]+@[^\s"'`]+/i;

/* Esquema de Drizzle: SCHEMA_FILE (check-kit) ya reconoce `.sql` y `.prisma`, no `drizzle/*.ts`. */
const isDrizzleSchema = (f: RepoFile) => /(^|\/)drizzle\/.*\.ts$/i.test(f.path) && /pgTable\(/.test(f.content);
const PROTECTED = /encrypt|cifr\w*|retention|retain\w*|expires?|\bttl\b|purge|delete_after/i;
const PERSONAL_OR_RISK = new RegExp(`${PERSONAL.source}|${HIGH_RISK.source}`, "i");

export const CHECKS_BACKENDS: Check[] = [
  {
    code: "VGI-105",
    module: "static-scan",
    severity: "critico",
    title: "Reglas de Firestore o Storage abiertas a cualquiera",
    summary:
      "Una regla de seguridad de Firestore o de Storage autoriza leer, crear, " +
      "modificar o borrar sin ninguna condición (`if true`).",
    legalAnalysis:
      "Una regla con `if true` no exige nada: cualquiera con la configuración pública " +
      "del proyecto —expuesta al navegador, como toda configuración de Firebase— lee, " +
      "crea, modifica o borra los documentos o archivos de esa colección. Es la " +
      "negación del deber de seguridad (art. 4 lit. g y art. 17 lit. d de la Ley 1581): " +
      "no hay ninguna medida técnica que impida el acceso no autorizado. Si la colección " +
      "guarda datos sensibles (art. 5), el riesgo se agrava. Que un tercero aproveche " +
      "esta puerta abierta para acceder sin autorización a un sistema informático es la " +
      "conducta que sanciona el art. 269A de la Ley 1273 de 2009 —un riesgo que la regla " +
      "abierta facilita a cualquier tercero, no una infracción de {cliente}, que es quien " +
      "debe cerrarla—. Si hay indicios de que alguien ya accedió, corresponde evaluar el " +
      "reporte a la SIC (art. 17 lit. n).",
    ruleIds: ["owasp-a01", "col-1581-seguridad"],
    probe:
      "Búsqueda en los archivos `.rules` (Firestore o Storage) de una regla `allow` sin " +
      "ninguna condición de autenticación.",
    detect: ({ files }) => grep(files, RULES_FILE, ALLOW_TRUE),
    patch: edit(
      "config",
      ["allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;"],
      "Deniega por defecto y solo permite al titular autenticado leer o escribir su " +
        "propio documento. El patrón exacto (campo de propietario, colección) debe " +
        "ajustarse a cada regla que siga abierta.",
    ),
    branch: "vigia-patch/firestore-rules-abiertas",
    changeNote: "Cambio acotado al archivo de reglas. No migra datos ni cambia el modelo.",
    retests: [
      "Ninguna regla del proyecto autoriza lectura o escritura sin autenticación",
      "Un usuario autenticado solo accede a sus propios documentos",
    ],
  },
  {
    code: "VGI-106",
    module: "static-scan",
    severity: "critico",
    title: "Reglas de Firebase Realtime Database abiertas a cualquiera",
    summary:
      "El archivo de reglas de Realtime Database declara `\".read\": true` o " +
      "`\".write\": true`: cualquiera lee o escribe todo el árbol de datos.",
    legalAnalysis:
      "En Realtime Database la regla se hereda hacia abajo: abrir la raíz o un nodo " +
      "alto dejar legible o escribible todo lo que cuelga de él. Igual que la regla " +
      "de Firestore, es la negación del deber de seguridad (art. 4 lit. g y art. 17 " +
      "lit. d de la Ley 1581): ninguna medida técnica impide el acceso no autorizado " +
      "o fraudulento. El acceso que un tercero obtenga por esta vía puede configurar " +
      "el delito del art. 269A de la Ley 1273 de 2009 a cargo de ese tercero —un " +
      "riesgo que la regla abierta facilita, no una conducta de {cliente}—, que es " +
      "quien debe cerrar la regla antes de que eso ocurra.",
    ruleIds: ["owasp-a01", "col-1581-seguridad"],
    probe:
      "Búsqueda en los archivos JSON de reglas de Realtime Database de una regla " +
      "`\".read\"` o `\".write\"` fijada en `true`.",
    detect: ({ files }) => grep(files, RTDB_JSON, RTDB_OPEN),
    patch: edit(
      "config",
      ['".read": "auth != null",', '".write": "auth != null",'],
      "Exige sesión de Firebase Auth para leer o escribir el nodo. Si el dato debe " +
        "acotarse por titular, la condición debe compararse además contra `auth.uid`.",
    ),
    branch: "vigia-patch/rtdb-rules-abiertas",
    changeNote: "Cambio acotado al archivo de reglas. No migra datos ni cambia el modelo.",
    retests: ["Ninguna regla del árbol de datos autoriza lectura o escritura sin autenticación"],
  },
  {
    code: "VGI-107",
    module: "static-scan",
    severity: "advertencia",
    title: "Consulta a la base de datos en una ruta de API o server action sin verificar sesión",
    summary:
      "Una ruta de API o una server action consulta Prisma, Drizzle, Mongo o " +
      "Firestore/Supabase directamente, sin ninguna señal de que primero verifique " +
      "quién hace la solicitud.",
    legalAnalysis:
      "El control de acceso se aplica en el servidor, no en el cliente: una ruta que " +
      "consulta la base de datos sin comprobar antes la sesión responde igual a quien " +
      "inició sesión que a un tercero anónimo. Es el mismo defecto de fondo que la " +
      "tabla sin RLS (deber de seguridad, art. 4 lit. g y art. 17 lit. d de la Ley " +
      "1581), aplicado a un backend distinto de Supabase. Que un tercero use esa " +
      "puerta para acceder sin autorización a datos personales que no le pertenecen " +
      "es el riesgo que sanciona el art. 269A de la Ley 1273 de 2009 a cargo de ese " +
      "tercero, no una infracción de {cliente}; pero es {cliente} quien debe cerrar la " +
      "ruta para que ese tercero no tenga cómo intentarlo.",
    ruleIds: ["owasp-a01", "col-1581-seguridad"],
    probe:
      "Búsqueda en rutas bajo api/ o actions/ de una consulta directa a Prisma, " +
      "Drizzle, Mongo/Firestore o Supabase, en un archivo que no menciona sesión, " +
      "autenticación ni token en ninguna parte.",
    detect: ({ files }) => {
      const candidates = files.filter(
        (f) => isSource(f) && SERVER_ENTRY.test(f.path) && !AUTH_HINT.test(f.content),
      );
      return grep(candidates, /./, DB_CALL);
    },
    patch: edit(
      "codigo",
      [
        "// Verificación de sesión antes de tocar la base de datos.",
        "const session = await getServerSession();",
        'if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });',
        "$linea",
      ],
      "La consulta solo se ejecuta si hay una sesión activa verificada en el servidor; " +
        "sin ella, la ruta responde 401 antes de tocar la base de datos.",
    ),
    branch: "vigia-patch/verificacion-sesion-backend",
    changeNote: "Cambio acotado al inicio del handler señalado. No cambia la consulta en sí.",
    retests: [
      "La ruta responde 401 sin sesión, antes de ejecutar cualquier consulta",
      "Con sesión activa, la ruta sigue respondiendo igual que antes",
    ],
  },
  {
    code: "VGI-108",
    module: "static-scan",
    severity: "critico",
    title: "Cadena de conexión con usuario y clave escritos en el código",
    summary:
      "El código fuente contiene una cadena de conexión (MongoDB, PostgreSQL o " +
      "MySQL) con usuario y clave incrustados, y no es un marcador de ejemplo.",
    legalAnalysis:
      "Quien lea el repositorio obtiene el mismo acceso a la base de datos que tiene " +
      "{cliente}: puede leer, modificar o borrar cualquier registro, incluidos los " +
      "datos personales de todos los titulares. Publicar una credencial no es una " +
      "medida técnica, humana ni administrativa apropiada para otorgar seguridad a " +
      "los registros (art. 4 lit. g de la Ley 1581, y art. 17 lit. d). La credencial " +
      "debe rotarse aunque se corrija el código —desde que se escribió en el " +
      "repositorio hay que tratarla como comprometida—, y si el repositorio fue " +
      "público corresponde evaluar el reporte a la SIC (art. 17 lit. n). El acceso que " +
      "un tercero logre con esa credencial puede configurar el art. 269A de la Ley " +
      "1273 de 2009 a cargo de ese tercero, no de {cliente}.",
    ruleIds: ["col-1581-seguridad", "owasp-a02"],
    probe:
      "Búsqueda en el código fuente de cadenas de conexión de MongoDB, PostgreSQL o " +
      "MySQL con usuario y clave incrustados, descartando los marcadores de ejemplo.",
    detect: ({ files }) => grep(files.filter(isSource), /./, CONN_STRING).filter((h) => !PLACEHOLDER.test(h.text)),
    patch: edit(
      "codigo",
      [
        "// Cadena de conexión retirada del código: se lee de una variable de entorno del servidor.",
        "const conn = process.env.DATABASE_URL!;",
        "// La credencial anterior queda comprometida y debe rotarse en el proveedor.",
      ],
      "La credencial deja de viajar en el repositorio. La rotación se hace en el panel " +
        "del proveedor, fuera del parche: el valor anterior ya circuló.",
    ),
    branch: "vigia-patch/conn-string-credenciales",
    changeNote: "Retira la cadena de conexión del archivo señalado. La rotación es manual, fuera del parche.",
    retests: ["Ningún archivo del repositorio contiene una cadena de conexión con credenciales"],
  },
  {
    code: "VGI-109",
    module: "static-scan",
    severity: "advertencia",
    title: "Columna personal en un esquema de Drizzle sin cifrado ni plazo de conservación",
    summary:
      "Una tabla de Drizzle (`pgTable`) declara una columna con datos personales o de " +
      "alto riesgo y el archivo no menciona cifrado ni un plazo de conservación.",
    legalAnalysis:
      "El deber de seguridad (art. 4 lit. g y art. 17 lit. d de la Ley 1581) exige " +
      "medidas técnicas frente al acceso no autorizado; si la columna guarda datos " +
      "sensibles del art. 5 (biometría, salud), el régimen reforzado del art. 6 se " +
      "suma. Ni el cifrado ni el plazo de conservación se acreditan con una " +
      "intención: deben quedar en el esquema, donde una migración futura no pueda " +
      "borrarlos sin que se note. Un acceso no autorizado a esa columna por un " +
      "tercero puede configurar el art. 269A de la Ley 1273 de 2009 a cargo de ese " +
      "tercero, no de {cliente}, pero es {cliente} quien debe verificar en el motor " +
      "de base de datos si el cifrado en reposo está activo, más allá de lo que este " +
      "hallazgo puede leer del código.",
    ruleIds: ["col-1581-seguridad", "col-1581-sensibles"],
    probe:
      "Búsqueda en los esquemas de Drizzle (`drizzle/*.ts` con `pgTable(`) de columnas " +
      "con nombre de dato personal o de alto riesgo, en archivos sin ninguna mención " +
      "de cifrado, retención o purga.",
    detect: ({ files }) => lacking(files.filter(isDrizzleSchema), /./, PROTECTED, PERSONAL_OR_RISK),
    patch: edit(
      "config",
      [
        "$linea",
        "// Cifrar en reposo (pgcrypto o KMS) o declarar aquí el plazo de conservación (retainUntil) de esta columna.",
      ],
      "Deja explícito en el propio esquema el cifrado o el plazo de conservación de la " +
        "columna con datos personales: verificable en cada migración, no solo en un " +
        "documento aparte.",
    ),
    branch: "vigia-patch/drizzle-columnas-personales",
    changeNote: "Comentario en el esquema. Si se decide cifrar, exige además una migración de datos.",
    retests: ["El esquema declara cifrado o plazo de conservación para cada columna personal señalada"],
  },
];
