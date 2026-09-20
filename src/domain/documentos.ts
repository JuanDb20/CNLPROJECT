import {
  type Ctx,
  HIGH_RISK,
  type Hit,
  PERSONAL,
  SCHEMA_FILE,
  grep,
  hasRightsChannel,
} from "./check-kit";
import { providerTerms } from "./proveedores";
import type { AuditRun, DetectedProvider, Patch, RemediationStatus, RepoFile } from "./types";

/**
 * Documentos jurídicos que faltan en el repositorio auditado.
 *
 * Son plantillas normativas fijas —una por instrumento— que se rellenan con lo
 * que las pruebas ya leyeron del código: razón social y NIT del alcance,
 * proveedores de IA con su país, categorías de datos del esquema, puntos de
 * recolección. No interviene ningún modelo de lenguaje: el mismo código
 * produce siempre el mismo texto, que es lo que permite acreditar su origen.
 *
 * Lo que no está en el código no se inventa: va como `[POR COMPLETAR: …]` para
 * que el abogado lo diligencie antes de firmar.
 *
 * Formato de las líneas (el mismo que lee la exportación a Word):
 * `# Título` (uno solo), `## Sección`, línea vacía = separación de párrafos,
 * `- ítem` = viñeta, cualquier otra línea = párrafo. Sin tablas.
 */

export type DocumentoId =
  | "politica"
  | "aviso"
  | "autorizacion"
  | "transmision"
  | "consultas-reclamos"
  | "ficha-transparencia";

/** Campo que el abogado debe diligenciar: VIGÍA no lo deduce del código. */
const falta = (que: string) => `[POR COMPLETAR: ${que}]`;

/* ------------------------------------------------------------------ */
/* Lo que se lee del código                                            */
/* ------------------------------------------------------------------ */

/** Nombre de la columna en una línea de esquema; null si la línea no declara una. */
function columna(texto: string): string | null {
  const nombre = /^\s*"?(\w+)/.exec(texto)?.[1];
  return nombre && !/^(create|alter|drop|comment|insert|model|generator|datasource)$/i.test(nombre)
    ? nombre
    : null;
}

/* `(?:\b|_)` reconoce la palabra también dentro de un nombre en snake_case
   (monthly_income, match_score), que es como vienen las columnas. */
const BIOMETRIA = /(?:\b|_)(biometr\w*|selfie\w*|face_?template|huella\w*|iris|voiceprint)/i;
const SALUD = /(?:\b|_)(salud|health|diagn\w*|medical|historia_?cl[ií]nica)/i;
const CREDITO = /(?:\b|_)(credit\w*|scoring|puntaje|historial\w*|ingres\w*|income|salar\w*|mora\w*|cupo)/i;
const CONVERSACIONES = /(?:\b|_)(messages?|conversations?|mensajes|conversaciones|chats?|prompts?)/i;
const MENORES = /(?:\b|_)(menor\w*|edad|birth\w*|nacimiento|tutor|acudiente)/i;
const CONSERVACION = /(?:\b|_)(retention|retain|expires?|expira|ttl|purge|purga|delete_after|borrado)/i;

/** Datos del titular que el esquema del repositorio delata, con su calificación legal. */
export function categoriasDeDatos(files: RepoFile[]): string[] {
  const esquema = files.filter(SCHEMA_FILE);
  const campos = (re: RegExp) => [
    ...new Set(grep(esquema, /./, re).map((h) => columna(h.text)).filter((c): c is string => c !== null)),
  ];
  const texto = esquema.map((f) => f.content).join("\n");
  const con = (cs: string[]) => (cs.length ? ` (campos ${cs.join(", ")})` : "");

  const salida: string[] = [];
  const identificacion = campos(PERSONAL).filter((c) => !BIOMETRIA.test(c) && !SALUD.test(c));
  if (identificacion.length) {
    salida.push(
      `Datos de identificación y contacto del titular${con(identificacion)}: datos de ` +
        "naturaleza privada o semiprivada, sujetos al régimen general de la Ley 1581 de 2012.",
    );
  }
  const biometria = campos(BIOMETRIA);
  if (biometria.length) {
    salida.push(
      `Datos biométricos${con(biometria)}: son datos sensibles (art. 5 de la Ley 1581 de ` +
        "2012), su tratamiento exige autorización explícita del titular (art. 6) y el " +
        "responsable debe informarle que no está obligado a autorizarlo (Decreto 1074 de " +
        "2015, art. 2.2.2.25.2.3, que compila el art. 6 del Decreto 1377 de 2013).",
    );
  }
  const salud = campos(SALUD);
  if (salud.length) {
    salida.push(
      `Datos relativos a la salud${con(salud)}: datos sensibles (art. 5 de la Ley 1581 de ` +
        "2012), con las mismas exigencias de autorización explícita e información previa.",
    );
  }
  const credito = campos(CREDITO);
  if (credito.length) {
    salida.push(
      `Información financiera, crediticia y de capacidad de pago${con(credito)}: además de ` +
        "la Ley 1581 de 2012, le aplica el régimen especial de la Ley 1266 de 2008 (habeas " +
        "data financiero), incluidos los deberes de las fuentes y los usuarios de la " +
        "información y los plazos de permanencia del dato negativo.",
    );
  }
  if (CONVERSACIONES.test(texto)) {
    salida.push(
      "Contenido de las conversaciones del titular con el asistente, que queda almacenado " +
        "y puede contener cualquier dato que el titular escriba, incluidos datos sensibles " +
        "que nadie le pidió.",
    );
  }
  const menores = campos(MENORES);
  if (menores.length) {
    salida.push(
      `Datos que permiten identificar la edad del titular${con(menores)}: si entre los ` +
        "titulares hay niñas, niños o adolescentes, el tratamiento está prohibido salvo que " +
        "se trate de datos de naturaleza pública y se cumplan los parámetros del art. 7 de " +
        "la Ley 1581 de 2012 y del art. 2.2.2.25.2.9 del Decreto 1074 de 2015 (art. 12 del " +
        "Decreto 1377 de 2013).",
    );
  }
  return salida;
}

/** Pantallas y rutas donde la aplicación recoge datos del titular. */
export function puntosDeRecoleccion(files: RepoFile[]): Hit[] {
  return grep(
    files.filter(
      (f) =>
        /\.(tsx|jsx|html|vue|svelte)$/i.test(f.path) ||
        /(onboarding|kyc|registro|signup|vinculaci[oó]n)/i.test(f.path),
    ),
    /./,
    /<form\b|<input\b|<textarea\b|onSubmit|FormData|ChatComposer/i,
  );
}

/** ¿Trata el sistema datos sensibles, según el esquema? */
const trataSensibles = (files: RepoFile[]) =>
  grep(files.filter(SCHEMA_FILE), /./, HIGH_RISK).length > 0;

/** Rutas, sin repetir, de los puntos de recolección detectados. */
const rutas = (hits: Hit[]) => [...new Set(hits.map((h) => h.path))];

/** Cómo describir a un proveedor de IA: país y lista de adecuación de la SIC. */
function paisDelProveedor(p: DetectedProvider): string {
  if (!p.country) return "país de tratamiento no declarado";
  if (p.adequateCountry === true) {
    return `${p.country}, país incluido en la lista de países con nivel adecuado de ` +
      "protección de la SIC (Circular Única, Título V, Cap. 3, num. 3.2)";
  }
  if (p.adequateCountry === false) {
    return `${p.country}, país que NO figura en la lista de países con nivel adecuado de ` +
      "protección de la SIC";
  }
  return `${p.country}, adecuación por verificar en la lista de la SIC`;
}

/** Lo que los términos públicos del proveedor dicen sobre entrenamiento y retención. */
function terminosDelProveedor(vendor: string): { entrena: string; retencion: string; fuente: string } {
  const t = providerTerms(vendor);
  if (!t) {
    return {
      entrena: "por verificar en los términos del proveedor",
      retencion: "por verificar en los términos del proveedor",
      fuente: falta("enlace y fecha de consulta de los términos del proveedor"),
    };
  }
  return {
    entrena:
      t.trainsOnApiData === null
        ? "sus términos no lo aclaran"
        : t.trainsOnApiData
          ? "usa por defecto los datos de la API para entrenar sus modelos: hay que excluirlo expresamente"
          : "no usa los datos de la API para entrenar sus modelos",
    retencion: t.retention,
    fuente: `${t.termsUrl} (verificado el ${t.verifiedAt}). ${t.note}`,
  };
}

/* ------------------------------------------------------------------ */
/* Cabecera común                                                      */
/* ------------------------------------------------------------------ */

/**
 * Cabecera fija de todo documento generado: qué es, de dónde salió, que es un
 * borrador y qué datos puso el código y cuáles debe poner el abogado.
 *
 * ponytail: Ley 1123 de 2007 arts. 28 y 34 y el Auto AC739-2026 se citan como
 * los dio el encargo; verificar el texto exacto de ambos antes de publicar.
 */
function cabecera(
  titulo: string,
  queEs: string,
  ctx: Ctx,
  delCodigo: string[],
  delAbogado: string[],
): string[] {
  return [
    `# ${titulo}`,
    "",
    queEs,
    "",
    "## Origen de este borrador",
    "",
    "VIGÍA generó este texto a partir del código fuente auditado, aplicando plantillas " +
      "normativas fijas. No intervino ninguna herramienta de inteligencia artificial " +
      "generativa: el contenido no fue redactado, completado ni sugerido por un modelo de " +
      "lenguaje, y el mismo código auditado produce siempre el mismo texto.",
    "",
    "Es un borrador, no un documento definitivo. Debe ser revisado, ajustado y firmado " +
      "por el abogado responsable, que conserva íntegro su juicio profesional: el " +
      "Código Disciplinario del Abogado le exige actuar con lealtad, honradez y " +
      "diligencia frente a su cliente (Ley 1123 de 2007, arts. 28 y 34), y la Corte " +
      "Suprema de Justicia ha recordado que el deber de verificar lo que se firma es " +
      "indelegable (Auto AC739-2026). VIGÍA propone; el abogado decide y firma.",
    "",
    "## Datos tomados del código auditado",
    "",
    ...delCodigo.map((d) => `- ${d}`),
    "",
    "## Datos que debe aportar el abogado",
    "",
    ...delAbogado.map((d) => `- ${d}`),
    "",
    `Responsable del tratamiento: ${ctx.client.name}, NIT ${ctx.client.nit}.`,
    "",
  ];
}

/** Identificación del responsable, con lo que el alcance de la auditoría aporta. */
function identificacion(ctx: Ctx): string[] {
  const { client } = ctx;
  return [
    `- Razón social: ${client.name}`,
    `- NIT: ${client.nit}`,
    `- Representante legal: ${client.legalRepresentative || falta("nombre del representante legal")}`,
    ...(client.rues
      ? [
          `- Matrícula en el RUES: ${client.rues.name} · estado ${client.rues.status} · ` +
            `actividad CIIU ${client.rues.ciiu} · renovada ${client.rues.renewed}`,
        ]
      : []),
    `- Sector: ${client.sector}`,
    `- Domicilio: ${falta("ciudad y país del domicilio social")}`,
    `- Dirección física: ${falta("dirección de notificaciones")}`,
    `- Correo electrónico de contacto: ${falta("correo del área de protección de datos")}`,
    `- Teléfono: ${falta("teléfono de contacto")}`,
  ];
}

/** Derechos del titular, art. 8 de la Ley 1581 de 2012. */
const DERECHOS = [
  "Conocer, actualizar y rectificar sus datos personales frente a los responsables o " +
    "encargados del tratamiento (art. 8 lit. a).",
  "Solicitar prueba de la autorización otorgada, salvo cuando la ley exceptúe ese " +
    "requisito (art. 8 lit. b, en concordancia con el art. 10).",
  "Ser informado, previa solicitud, sobre el uso que se les ha dado a sus datos " +
    "personales (art. 8 lit. c).",
  "Presentar ante la Superintendencia de Industria y Comercio quejas por infracciones a " +
    "la ley, una vez agotado el trámite de consulta o reclamo ante el responsable (art. 8 " +
    "lit. d, en concordancia con el art. 16).",
  "Revocar la autorización y solicitar la supresión del dato cuando en el tratamiento no " +
    "se respeten los principios, derechos y garantías constitucionales y legales (art. 8 " +
    "lit. e).",
  "Acceder de forma gratuita a sus datos personales que hayan sido objeto de tratamiento " +
    "(art. 8 lit. f).",
];

/** Plazos de consultas y reclamos, arts. 14 y 15 de la Ley 1581 de 2012. */
const PLAZOS = [
  "Consultas: se atienden en un término máximo de diez (10) días hábiles contados desde " +
    "la fecha de recibo. Si no es posible atenderlas en ese término, se informa al " +
    "interesado el motivo de la demora y la fecha en que se atenderá, que en ningún caso " +
    "puede superar los cinco (5) días hábiles siguientes al vencimiento del primer plazo " +
    "(art. 14 de la Ley 1581 de 2012).",
  "Reclamos: se atienden en un término máximo de quince (15) días hábiles contados desde " +
    "el día siguiente a la fecha de su recibo. Si no es posible atenderlos en ese " +
    "término, se informa al interesado el motivo de la demora y la fecha en que se " +
    "atenderá, que en ningún caso puede superar los ocho (8) días hábiles siguientes al " +
    "vencimiento del primer plazo (art. 15 de la Ley 1581 de 2012).",
  "Reclamo incompleto: se requiere al interesado dentro de los cinco (5) días siguientes " +
    "a su recepción para que subsane las fallas. Transcurridos dos (2) meses desde el " +
    "requerimiento sin respuesta, se entiende que desistió del reclamo (art. 15).",
  "Traslado por falta de competencia: si quien recibe el reclamo no es competente, da " +
    "traslado a quien corresponda en un término máximo de dos (2) días hábiles e informa " +
    "de ello al interesado (art. 15).",
  "Leyenda: una vez recibido el reclamo completo, se incluye en la base de datos una " +
    "leyenda que dice «reclamo en trámite» y el motivo del mismo, en un término no mayor " +
    "a dos (2) días hábiles, y se mantiene hasta que el reclamo sea decidido (art. 15).",
];

/* ------------------------------------------------------------------ */
/* Documentos                                                          */
/* ------------------------------------------------------------------ */

function politica(ctx: Ctx): string[] {
  const categorias = categoriasDeDatos(ctx.files);
  const puntos = rutas(puntosDeRecoleccion(ctx.files));
  const sensibles = trataSensibles(ctx.files);
  const conservacionDetectada = grep(ctx.files.filter(SCHEMA_FILE), /./, CONSERVACION).length > 0;

  return [
    ...cabecera(
      `Política de tratamiento de la información — ${ctx.client.name}`,
      "Este documento es la política de tratamiento de datos personales que el responsable " +
        "debe adoptar por escrito conforme al art. 17 lit. k de la Ley 1581 de 2012 y al " +
        "art. 2.2.2.25.3.1 del Decreto 1074 de 2015 (que compila el art. 13 del Decreto 1377 " +
        "de 2013), con los seis contenidos mínimos que esa norma exige.",
      ctx,
      [
        `Razón social y NIT del responsable, tomados del alcance de la auditoría.`,
        `Descripción del sistema auditado: ${ctx.client.system}.`,
        categorias.length
          ? `Categorías de datos personales leídas del esquema de la base de datos (${categorias.length}).`
          : "No se encontró esquema de base de datos: las categorías de datos las debe describir el abogado.",
        ctx.providers.length
          ? `Proveedores de inteligencia artificial detectados en el código: ${ctx.providers
              .map((p) => p.vendor)
              .join(", ")}.`
          : "No se detectaron proveedores de inteligencia artificial externos en el código.",
        puntos.length
          ? `Puntos de recolección detectados: ${puntos.join(", ")}.`
          : "No se detectaron formularios ni pantallas de recolección en el código.",
        conservacionDetectada
          ? "El esquema define plazos de conservación o borrado: verificar que el plazo escrito aquí coincida."
          : "El código no define ningún plazo de conservación ni de borrado.",
      ],
      [
        "Domicilio, dirección física, correo electrónico y teléfono del responsable.",
        "Área o cargo responsable de la atención de peticiones, consultas y reclamos.",
        "Fecha de entrada en vigencia de la política y período de vigencia de cada base de datos.",
        "Finalidades adicionales que no se deducen del código.",
        "Calificación de cada proveedor como encargado o como responsable, tras leer sus términos.",
      ],
    ),
    "## 1. Identificación del responsable del tratamiento",
    "",
    "Conforme al num. 1 del art. 2.2.2.25.3.1 del Decreto 1074 de 2015 (art. 13 del " +
      "Decreto 1377 de 2013), el responsable del tratamiento es:",
    "",
    ...identificacion(ctx),
    "",
    "## 2. Tratamiento al cual serán sometidos los datos y su finalidad",
    "",
    `${ctx.client.name} trata los datos personales de sus titulares para operar ${ctx.client.system}, ` +
      `en el marco de su actividad en el sector ${ctx.client.sector.toLowerCase()}. El ` +
      "tratamiento incluye la recolección, el almacenamiento, el uso, la circulación y la " +
      "supresión de los datos, con las finalidades que se describen a continuación (num. 2 " +
      "del art. 2.2.2.25.3.1).",
    "",
    "- Atender al titular a través de un asistente conversacional basado en modelos de " +
      "lenguaje, responder sus solicitudes y dejar registro de la interacción.",
    ...(puntos.length
      ? [
          "- Recolectar los datos que el titular entrega en los formularios y canales de " +
            `atención de la aplicación (${falta("nombre público de cada canal")}).`,
        ]
      : []),
    ...(trataSensibles(ctx.files)
      ? [
          "- Verificar la identidad del titular en el proceso de vinculación, cuando el " +
            "titular autorice expresamente el tratamiento de los datos sensibles que ello " +
            "supone.",
        ]
      : []),
    `- ${falta("cualquier otra finalidad real que no se deduzca del código auditado")}`,
    "",
    "Los datos no se tratan para finalidades distintas de las aquí informadas. El " +
      "principio de finalidad (art. 4 lit. b de la Ley 1581 de 2012) impide usarlos para " +
      "un propósito que el titular no conoció al autorizar.",
    "",
    "## 3. Datos personales objeto de tratamiento",
    "",
    ...(categorias.length
      ? categorias.map((c) => `- ${c}`)
      : [`- ${falta("categorías de datos personales que trata el responsable")}`]),
    "",
    ...(sensibles
      ? [
          "## 4. Datos sensibles: carácter facultativo",
          "",
          "El sistema trata datos sensibles en los términos del art. 5 de la Ley 1581 de " +
            "2012. Su tratamiento está prohibido salvo que el titular otorgue autorización " +
            "explícita (art. 6). Por tratarse de datos sensibles, el titular NO está " +
            "obligado a autorizar su tratamiento; el responsable le informa de forma " +
            "explícita y previa cuáles datos son sensibles y con qué finalidad, y no " +
            "condiciona ninguna actividad, servicio ni beneficio a que el titular los " +
            "suministre (Decreto 1074 de 2015, art. 2.2.2.25.2.3, que compila el art. 6 del " +
            "Decreto 1377 de 2013).",
          "",
          `Alternativa para quien no autorice: ${falta("canal alterno de verificación o de atención")}.`,
          "",
        ]
      : []),
    "## 5. Datos de niñas, niños y adolescentes",
    "",
    "El tratamiento de datos personales de niñas, niños y adolescentes está prohibido, " +
      "salvo cuando se trate de datos de naturaleza pública y el tratamiento responda y " +
      "respete el interés superior del menor y asegure sus derechos fundamentales (art. 7 " +
      "de la Ley 1581 de 2012; art. 2.2.2.25.2.9 del Decreto 1074 de 2015, que compila el " +
      "art. 12 del Decreto 1377 de 2013). Cumplidos esos requisitos, la autorización la " +
      "otorga el representante legal del menor, previo ejercicio del derecho del menor a " +
      "ser escuchado.",
    "",
    `Política del responsable frente a menores de edad: ${falta(
      "si el servicio admite menores y, en ese caso, cómo se verifica la autorización del representante legal",
    )}.`,
    "",
    "## 6. Encargados, transmisión y transferencia internacional",
    "",
    ...(ctx.providers.length
      ? [
          "Para prestar el servicio, los datos del titular se envían a proveedores de " +
            "inteligencia artificial que los procesan fuera de Colombia:",
          "",
          ...ctx.providers.map(
            (p) =>
              `- ${p.vendor} (modelo ${p.model}): ${paisDelProveedor(p)}. Rol por calificar ` +
              "como encargado o como responsable, según sus términos contractuales.",
          ),
          "",
          "Cuando el proveedor trata los datos por cuenta del responsable, la operación es " +
            "una transmisión y exige un contrato de transmisión con las obligaciones " +
            "mínimas del art. 2.2.2.25.5.2 del Decreto 1074 de 2015 (art. 25 del Decreto " +
            "1377 de 2013). Si el proveedor decide sobre los datos para finalidades propias, " +
            "la operación es una transferencia y queda sujeta a la prohibición y a las " +
            "excepciones del art. 26 de la Ley 1581 de 2012, entre ellas la autorización " +
            "expresa e inequívoca del titular.",
          "",
        ]
      : ["No se detectaron encargados externos en el código auditado.", ""]),
    "## 7. Derechos del titular",
    "",
    "El titular de los datos tiene derecho a (art. 8 de la Ley 1581 de 2012):",
    "",
    ...DERECHOS.map((d) => `- ${d}`),
    "",
    "## 8. Área responsable de la atención de peticiones, consultas y reclamos",
    "",
    `El área responsable de la atención de peticiones, consultas y reclamos es ${falta(
      "área o cargo responsable",
    )}, que se contacta en ${falta("correo electrónico y dirección para radicar solicitudes")} ` +
      `y en ${falta("teléfono de atención")} (num. 4 del art. 2.2.2.25.3.1 del Decreto 1074 de 2015).`,
    "",
    ...(hasRightsChannel(ctx.files)
      ? ["El repositorio auditado ya expone un canal para recibir solicitudes del titular.", ""]
      : [
          "El código auditado no expone hoy ningún canal que reciba y registre estas " +
            "solicitudes: habilitarlo es condición para cumplir los plazos del punto 9.",
          "",
        ]),
    "## 9. Procedimiento para que el titular ejerza sus derechos",
    "",
    "El titular, sus causahabientes o su representante presentan la consulta o el reclamo " +
      "por el canal indicado en el punto 8, identificándose e indicando los hechos que dan " +
      "lugar a la solicitud, la dirección de notificación y los documentos que quiera hacer " +
      "valer. Aplican los siguientes plazos:",
    "",
    ...PLAZOS.map((p) => `- ${p}`),
    "",
    "Antes de presentar una queja ante la Superintendencia de Industria y Comercio, el " +
      "titular debe agotar este trámite de consulta o reclamo (art. 16 de la Ley 1581 de " +
      "2012).",
    "",
    "## 10. Conservación de la información",
    "",
    "Los datos solo se tratan durante el tiempo razonable y necesario para cumplir las " +
      "finalidades que justificaron el tratamiento; cumplidas esas finalidades, se " +
      "suprimen (art. 2.2.2.25.2.8 del Decreto 1074 de 2015, que compila el art. 11 del " +
      "Decreto 1377 de 2013).",
    "",
    conservacionDetectada
      ? `Plazo de conservación aplicable: ${falta("plazo por cada base de datos, coherente con el que ya define el código")}.`
      : `El código auditado no define ningún plazo de conservación ni de borrado. Plazo aplicable: ${falta(
          "plazo por cada base de datos y procedimiento de supresión",
        )}.`,
    "",
    "## 11. Vigencia",
    "",
    `Esta política entra en vigencia el ${falta("fecha de entrada en vigencia (AAAA-MM-DD)")} ` +
      `y las bases de datos tienen un período de vigencia de ${falta(
        "período de vigencia de la base de datos",
      )} (num. 6 del art. 2.2.2.25.3.1 del Decreto 1074 de 2015). Versión 1.0.`,
    "",
    "Los cambios sustanciales en esta política se comunican al titular antes de " +
      "implementarlos, por el canal de contacto que él haya registrado.",
  ];
}

function aviso(ctx: Ctx): string[] {
  const puntos = rutas(puntosDeRecoleccion(ctx.files));
  const sensibles = trataSensibles(ctx.files);

  return [
    ...cabecera(
      `Aviso de privacidad — ${ctx.client.name}`,
      "Este es el texto que debe mostrarse al titular en el punto de recolección, cuando no " +
        "es posible poner a su disposición la política de tratamiento completa. Su contenido " +
        "mínimo es el del art. 2.2.2.25.3.3 del Decreto 1074 de 2015 (que compila el art. 15 " +
        "del Decreto 1377 de 2013). Está redactado para pantalla: corto y legible antes de " +
        "que el titular entregue cualquier dato.",
      ctx,
      [
        "Razón social y NIT del responsable, tomados del alcance de la auditoría.",
        puntos.length
          ? `Puntos de recolección donde debe mostrarse: ${puntos.join(", ")}.`
          : "No se detectaron puntos de recolección en el código: el abogado indica dónde se muestra.",
        sensibles
          ? "El sistema trata datos sensibles: el aviso señala el carácter facultativo de la respuesta."
          : "No se detectaron datos sensibles en el esquema.",
      ],
      [
        "Dirección, correo y teléfono de contacto del responsable.",
        "Dirección web donde se publica la política de tratamiento completa.",
        "Fecha de la versión del aviso que se pone en producción.",
      ],
    ),
    "## Texto para mostrar al titular",
    "",
    `${ctx.client.name} (NIT ${ctx.client.nit}) es responsable del tratamiento de los datos ` +
      "personales que usted entregue en este canal.",
    "",
    `Finalidad: sus datos se usan para operar ${ctx.client.system} y atender sus ` +
      "solicitudes. No se usan para finalidades distintas de las informadas en la política " +
      "de tratamiento.",
    "",
    ...(ctx.providers.length
      ? [
          "Para prestar el servicio, su información puede ser procesada por proveedores de " +
            `inteligencia artificial ubicados fuera de Colombia (${ctx.providers
              .map((p) => `${p.vendor}, ${p.country ?? "país por declarar"}`)
              .join("; ")}), que la tratan por cuenta del responsable y siguiendo sus instrucciones.`,
          "",
        ]
      : []),
    ...(sensibles
      ? [
          "Algunos de los datos que se le solicitan son sensibles. Usted no está obligado a " +
            "autorizar su tratamiento y puede negarse sin perder el acceso al servicio " +
            "(Decreto 1074 de 2015, art. 2.2.2.25.2.3).",
          "",
        ]
      : []),
    "Usted puede conocer, actualizar y rectificar sus datos, solicitar prueba de la " +
      "autorización, ser informado sobre el uso que se les ha dado, revocar la autorización, " +
      "solicitar su supresión y acceder a ellos gratuitamente (art. 8 de la Ley 1581 de " +
      "2012). También puede presentar un reclamo por el mismo canal; el procedimiento y los " +
      "plazos están en la política de tratamiento.",
    "",
    `Para ejercer sus derechos escriba a ${falta("correo de atención al titular")} o comuníquese ` +
      `al ${falta("teléfono de atención")}. Dirección de notificación: ${falta(
        "dirección física del responsable",
      )}.`,
    "",
    `Consulte la política de tratamiento completa en ${falta(
      "dirección web donde se publica la política",
    )}. Los cambios sustanciales se informarán por este mismo canal antes de aplicarse.`,
    "",
    `Versión del aviso: 1.0, vigente desde ${falta("fecha (AAAA-MM-DD)")}.`,
    "",
    "## Cómo se usa este aviso",
    "",
    ...(puntos.length
      ? puntos.map(
          (p) => `- Debe mostrarse antes de la primera entrega de datos en ${p}, no después.`,
        )
      : [`- ${falta("pantallas donde se muestra el aviso")}`]),
    "- El responsable debe conservar el modelo del aviso mientras dure el tratamiento, para " +
      "poder acreditar qué versión vio cada titular (art. 16 del Decreto 1377 de 2013, " +
      "compilado en el Decreto 1074 de 2015).",
    "- Mostrar el aviso no sustituye la autorización: esta debe ser previa, expresa e " +
      "informada (art. 9 de la Ley 1581 de 2012).",
  ];
}

function autorizacion(ctx: Ctx): string[] {
  const sensibles = trataSensibles(ctx.files);
  const biometria = grep(ctx.files.filter(SCHEMA_FILE), /./, BIOMETRIA).length > 0;

  return [
    ...cabecera(
      `Texto de autorización para el tratamiento de datos personales — ${ctx.client.name}`,
      "Este es el texto de la autorización que el titular debe otorgar de forma previa, " +
        "expresa e informada antes de que se recolecten sus datos (art. 9 de la Ley 1581 de " +
        "2012), con la información que exige el art. 12 de la misma ley y los requisitos de " +
        "los arts. 2.2.2.25.2.2 a 2.2.2.25.2.5 del Decreto 1074 de 2015 (arts. 5 a 8 del " +
        "Decreto 1377 de 2013).",
      ctx,
      [
        "Razón social y NIT del responsable, tomados del alcance de la auditoría.",
        sensibles
          ? "El esquema del repositorio trata datos sensibles: la autorización los separa y los hace facultativos."
          : "No se detectaron datos sensibles en el esquema del repositorio.",
        biometria
          ? "Se detectó tratamiento de datos biométricos: lleva autorización separada."
          : "No se detectó tratamiento de datos biométricos.",
      ],
      [
        "Dirección física o electrónica y teléfono del responsable.",
        "Finalidades concretas que no se deducen del código.",
        "Mecanismo técnico con el que se conservará la prueba de la autorización.",
      ],
    ),
    "## Texto de la autorización",
    "",
    `Autorizo de manera previa, expresa e informada a ${ctx.client.name} (NIT ${ctx.client.nit}) ` +
      "para recolectar, almacenar, usar, circular y suprimir mis datos personales conforme a " +
      "su política de tratamiento, con las finalidades que se me informan a continuación.",
    "",
    "Se me informa que (art. 12 de la Ley 1581 de 2012):",
    "",
    `- El tratamiento y su finalidad: operar ${ctx.client.system} y atender mis solicitudes.`,
    "- La respuesta a las preguntas sobre datos sensibles o sobre datos de niñas, niños y " +
      "adolescentes es facultativa: no estoy obligado a autorizar su tratamiento.",
    "- Tengo derecho a conocer, actualizar y rectificar mis datos, a solicitar prueba de " +
      "esta autorización, a ser informado sobre el uso que se les ha dado, a presentar " +
      "quejas ante la Superintendencia de Industria y Comercio una vez agotado el trámite " +
      "ante el responsable, a revocar esta autorización y solicitar la supresión del dato, y " +
      "a acceder gratuitamente a mis datos (art. 8 de la Ley 1581 de 2012).",
    `- La identificación del responsable: ${ctx.client.name}, NIT ${ctx.client.nit}, ` +
      `${falta("dirección física o electrónica")}, ${falta("teléfono")}.`,
    "",
    "[ ] Autorizo el tratamiento de mis datos personales en los términos anteriores.",
    "",
    ...(sensibles
      ? [
          "## Autorización separada para datos sensibles",
          "",
          "Los siguientes datos son sensibles. No estoy obligado a autorizar su tratamiento y " +
            "mi negativa no condiciona el acceso al servicio (art. 6 de la Ley 1581 de 2012; " +
            "art. 2.2.2.25.2.3 del Decreto 1074 de 2015).",
          "",
          ...(biometria
            ? [
                "[ ] Autorizo de manera explícita el tratamiento de mis datos biométricos " +
                  `(fotografía del rostro y plantilla facial) con la única finalidad de ${falta(
                    "finalidad concreta de la verificación de identidad",
                  )}, y por el tiempo indicado en la política de tratamiento.`,
              ]
            : []),
          `[ ] ${falta("otros datos sensibles que trate el sistema, con su finalidad concreta")}`,
          "",
        ]
      : []),
    "## Reglas de la casilla de autorización",
    "",
    "- Ninguna casilla puede estar premarcada: el silencio del titular no se asimila a la " +
      "autorización (art. 2.2.2.25.2.4 del Decreto 1074 de 2015, que compila el art. 7 del " +
      "Decreto 1377 de 2013).",
    "- La autorización de datos sensibles es una casilla distinta de la autorización " +
      "general: no pueden agruparse en una sola aceptación.",
    "- Antes de la casilla, el titular debe poder leer el aviso de privacidad y acceder a la " +
      "política de tratamiento.",
    "- El responsable debe conservar prueba de cuándo y cómo obtuvo cada autorización, y " +
      "poder exhibirla a solicitud del titular o de la autoridad (art. 2.2.2.25.2.5 del " +
      "Decreto 1074 de 2015, que compila el art. 8 del Decreto 1377 de 2013).",
    "- Revocar la autorización debe costarle al titular el mismo esfuerzo que otorgarla.",
  ];
}

function transmision(ctx: Ctx): string[] {
  const proveedores = ctx.providers;
  return [
    ...cabecera(
      `Cláusulas del contrato de transmisión de datos personales — ${ctx.client.name}`,
      "Este documento reúne las cláusulas que debe contener el contrato de transmisión de " +
        "datos personales entre el responsable y cada encargado que trate datos por su " +
        "cuenta, con las obligaciones mínimas del art. 2.2.2.25.5.2 del Decreto 1074 de 2015 " +
        "(que compila el art. 25 del Decreto 1377 de 2013). Hay un bloque por cada proveedor " +
        "detectado en el código auditado.",
      ctx,
      [
        proveedores.length
          ? `Proveedores detectados en el código: ${proveedores
              .map((p) => `${p.vendor} (${p.country ?? "país por declarar"}), invocado desde ${p.surface}`)
              .join("; ")}.`
          : "No se detectaron proveedores externos en el código auditado.",
        "País de tratamiento de cada proveedor y su presencia en la lista de países con nivel " +
          "adecuado de protección de la SIC.",
        "Modelo invocado en el código, cuando el código lo declara.",
      ],
      [
        "Calificación de cada proveedor como encargado o como responsable, tras leer sus términos.",
        "Fecha, partes y firma del contrato con cada proveedor.",
        "Decisión jurídica sobre los proveedores en países que no figuran en la lista de la SIC.",
      ],
    ),
    "## Regla general",
    "",
    "Cuando el proveedor trata los datos por cuenta del responsable y siguiendo sus " +
      "instrucciones, la operación es una transmisión: no requiere informar al titular ni " +
      "obtener su consentimiento, siempre que exista contrato de transmisión (art. " +
      "2.2.2.25.5.1 del Decreto 1074 de 2015, que compila el art. 24 del Decreto 1377 de " +
      "2013). Si el proveedor decide sobre los datos para finalidades propias, la operación " +
      "es una transferencia y le aplica la prohibición del art. 26 de la Ley 1581 de 2012, " +
      "con sus excepciones, entre ellas la autorización expresa e inequívoca del titular.",
    "",
    "La calificación del rol de cada proveedor depende de sus términos contractuales y no " +
      "puede deducirse del código: la hace el abogado.",
    "",
    ...proveedores.flatMap((p) => {
      const t = terminosDelProveedor(p.vendor);
      return [
        `## Cláusulas aplicables a ${p.vendor}`,
        "",
        `Proveedor: ${p.vendor}. Modelo invocado en el código: ${p.model}. País de ` +
          `tratamiento: ${paisDelProveedor(p)}.`,
        "",
        "- Alcance y finalidad del tratamiento: el encargado trata los datos personales que " +
          `${ctx.client.name} le remita, exclusivamente para ${falta(
            "finalidad concreta del tratamiento encomendado",
          )}, y por el tiempo que dure el contrato.`,
        "- Actividades que el encargado realiza por cuenta del responsable: procesar las " +
          "entradas que el responsable le envía y devolver la respuesta del modelo, sin " +
          "destinarlas a ninguna finalidad propia.",
        "- Obligación de tratar los datos a nombre del responsable y conforme a los " +
          "principios de la Ley 1581 de 2012 (legalidad, finalidad, libertad, veracidad, " +
          "transparencia, acceso y circulación restringida, seguridad y confidencialidad), y " +
          "a la política de tratamiento del responsable.",
        "- Obligación de salvaguardar la seguridad de las bases de datos en las que se " +
          "contengan datos personales.",
        "- Obligación de guardar confidencialidad respecto del tratamiento, incluso después " +
          "de terminada la relación contractual.",
        "- Obligación de atender, por conducto del responsable, las consultas y reclamos de " +
          "los titulares, y de devolver o suprimir los datos al terminar el contrato.",
        `- Uso de los datos para entrenar modelos: ${t.entrena}. El contrato debe excluir ` +
          "expresamente que las entradas y las salidas se destinen al entrenamiento de " +
          "modelos del proveedor; si el proveedor las usa para esa finalidad propia, deja de " +
          "actuar por cuenta del responsable.",
        `- Retención de entradas y salidas por el proveedor: ${t.retencion}. El contrato debe ` +
          "fijar el plazo y la forma de supresión.",
        `- Fuente de lo anterior: ${t.fuente}`,
        ...(p.adequateCountry === false
          ? [
              `- Zona gris: ${p.country} no figura en la lista de países con nivel adecuado de ` +
                "protección de la SIC. Para una transmisión, el decreto no exige verificar el " +
                "país, pero la SIC lo lee como exigible; para una transferencia, el art. 26 de " +
                "la Ley 1581 de 2012 lo prohíbe salvo excepción. Decisión jurídica pendiente: " +
                falta("calificación del rol del proveedor y decisión sobre seguir enviándole datos") +
                ".",
            ]
          : []),
        "",
      ];
    }),
    ...(proveedores.length
      ? []
      : [
          "## Sin proveedores detectados",
          "",
          "El código auditado no invoca proveedores externos de inteligencia artificial. Si " +
            "existen encargados que no aparecen en el código (alojamiento, analítica, " +
            "mensajería), el abogado debe incluirlos aquí.",
          "",
        ]),
    "## Cierre",
    "",
    "Estas cláusulas son el contenido mínimo exigido por la norma, no un contrato completo: " +
      "el abogado debe integrarlas al contrato con cada proveedor, verificar que los " +
      "términos del proveedor no las contradigan y dejar constancia de la fecha de esa " +
      "verificación.",
  ];
}

function consultasReclamos(ctx: Ctx): string[] {
  return [
    ...cabecera(
      `Procedimiento de consultas y reclamos — ${ctx.client.name}`,
      "Este documento describe el procedimiento y los plazos con los que el responsable " +
        "atiende las consultas y los reclamos de los titulares (arts. 14 y 15 de la Ley 1581 " +
        "de 2012), y el registro que debe dejar para poder acreditar que los cumplió.",
      ctx,
      [
        "Razón social y NIT del responsable, tomados del alcance de la auditoría.",
        hasRightsChannel(ctx.files)
          ? "El repositorio expone un canal para recibir solicitudes del titular."
          : "El repositorio no expone hoy ningún canal que reciba y registre solicitudes del titular.",
      ],
      [
        "Canal oficial (correo, formulario o dirección) por el que se reciben las solicitudes.",
        "Área o cargo responsable de resolverlas y su suplente.",
        "Calendario de días hábiles aplicable al responsable.",
      ],
    ),
    "## 1. Canal de recepción",
    "",
    `Las consultas y los reclamos se reciben en ${falta(
      "correo, formulario o dirección física del canal oficial",
    )} y los resuelve ${falta("área o cargo responsable")}. El canal debe estar publicado en ` +
      "la política de tratamiento y en el aviso de privacidad, y debe registrar la fecha y " +
      "la hora de recepción de cada solicitud: esa fecha es la que hace correr los plazos.",
    "",
    "## 2. Quién puede presentarlas",
    "",
    "El titular, sus causahabientes, su representante o apoderado, y quien haya recibido " +
      "autorización del titular. Antes de tramitar la solicitud debe verificarse la " +
      "identidad de quien la presenta, sin exigirle más documentos de los necesarios.",
    "",
    "## 3. Qué debe contener el reclamo",
    "",
    "- La identificación del titular.",
    "- La descripción de los hechos que dan lugar al reclamo.",
    "- La dirección del titular para notificaciones.",
    "- Los documentos que se quieran hacer valer.",
    "",
    "## 4. Plazos",
    "",
    ...PLAZOS.map((p) => `- ${p}`),
    "",
    "## 5. Registro y prueba",
    "",
    "De cada solicitud debe quedar registro de: número de radicación, tipo (consulta o " +
      "reclamo), fecha y hora de recepción, fecha límite calculada en días hábiles, estado, " +
      "prórroga informada si la hubo, fecha de respuesta y contenido de la respuesta. Sin " +
      "ese registro el responsable no puede acreditar ante la Superintendencia de Industria " +
      "y Comercio que atendió los términos de los arts. 14 y 15, que es lo primero que la " +
      "autoridad pregunta.",
    "",
    "La leyenda «reclamo en trámite» debe quedar incorporada al dato objeto del reclamo " +
      "dentro de los dos (2) días hábiles siguientes a la recepción del reclamo completo, y " +
      "mantenerse hasta que el reclamo sea decidido.",
    "",
    "## 6. Queja ante la autoridad",
    "",
    "El titular solo puede presentar queja ante la Superintendencia de Industria y Comercio " +
      "una vez haya agotado este trámite ante el responsable (art. 16 de la Ley 1581 de " +
      "2012). Por eso la respuesta debe informarle expresamente que el trámite quedó " +
      "agotado.",
  ];
}

function fichaTransparencia(ctx: Ctx): string[] {
  const categorias = categoriasDeDatos(ctx.files);
  return [
    ...cabecera(
      `Ficha de transparencia del sistema de inteligencia artificial — ${ctx.client.name}`,
      "Esta ficha describe, en lenguaje comprensible para el titular, qué sistema de " +
        "inteligencia artificial opera el responsable, qué datos recibe, para qué, qué no " +
        "puede hacer y cómo se llega a una persona. La Circular Externa 002 de 2024 de la " +
        "SIC exige que el tratamiento con inteligencia artificial sea idóneo, necesario, " +
        "razonable y proporcional (num. I) y que los datos tratados sean veraces, exactos, " +
        "comprobables y comprensibles (num. V); el deber de informar al titular está en el " +
        "art. 12 de la Ley 1581 de 2012.",
      ctx,
      [
        ctx.providers.length
          ? `Proveedores y modelos detectados en el código: ${ctx.providers
              .map((p) => `${p.vendor} — ${p.model}, invocado desde ${p.surface}`)
              .join("; ")}.`
          : "No se detectaron proveedores de inteligencia artificial en el código.",
        categorias.length
          ? `Categorías de datos que el sistema puede recibir, leídas del esquema (${categorias.length}).`
          : "No se encontró esquema de base de datos.",
        `Descripción del sistema declarada en el alcance: ${ctx.client.system}.`,
      ],
      [
        "Quién supervisa las salidas del sistema y con qué periodicidad.",
        "Canal por el que el titular llega a una persona.",
        "Límites conocidos del modelo que el responsable haya documentado en pruebas propias.",
      ],
    ),
    "## 1. Qué es este sistema y quién responde por él",
    "",
    `${ctx.client.name} (NIT ${ctx.client.nit}) opera ${ctx.client.system}. El sistema usa ` +
      "modelos de lenguaje de terceros: genera texto a partir de lo que recibe y no " +
      "consulta una fuente autorizada salvo que se le conecte una. El responsable de lo que " +
      `el sistema responda es ${ctx.client.name}, no el proveedor del modelo.`,
    "",
    "## 2. Modelo y proveedor",
    "",
    ...(ctx.providers.length
      ? ctx.providers.map(
          (p) => `- ${p.vendor} — modelo ${p.model}. Tratamiento en ${paisDelProveedor(p)}.`,
        )
      : [`- ${falta("proveedor y modelo del sistema de inteligencia artificial")}`]),
    "",
    "## 3. Qué datos recibe el sistema",
    "",
    ...(categorias.length
      ? categorias.map((c) => `- ${c}`)
      : [`- ${falta("categorías de datos que el sistema recibe")}`]),
    "",
    "El tratamiento debe limitarse a los datos necesarios: si existe una medida más " +
      "moderada e igual de eficaz, esa es la exigible (Circular Externa 002 de 2024 de la " +
      "SIC, num. I).",
    "",
    "## 4. Para qué se usa y para qué no",
    "",
    `- Finalidad: ${ctx.client.system}.`,
    "- El sistema no debe tomar por sí solo decisiones que afecten los derechos del " +
      "titular: cuando su salida alimente una decisión, la decisión la toma una persona.",
    `- Decisiones en las que interviene el sistema y quién las aprueba: ${falta(
      "decisiones sobre el titular en las que interviene el sistema y persona que las aprueba",
    )}.`,
    `- Usos excluidos: ${falta("usos que el responsable prohíbe expresamente")}.`,
    "",
    "## 5. Límites conocidos",
    "",
    "- El modelo puede generar respuestas incorrectas o inventadas y expresarlas con " +
      "seguridad. Los datos que se comuniquen al titular deben ser veraces, exactos, " +
      "actualizados, comprobables y comprensibles, y está prohibido tratar datos que " +
      "induzcan a error (Circular Externa 002 de 2024 de la SIC, num. V; art. 4 lit. d de " +
      "la Ley 1581 de 2012).",
    "- El modelo puede reproducir sesgos presentes en sus datos de entrenamiento.",
    `- Límites adicionales documentados por el responsable: ${falta(
      "resultados de las pruebas propias del responsable",
    )}.`,
    "",
    "## 6. Supervisión humana",
    "",
    `- Persona o área que supervisa las salidas del sistema: ${falta("cargo responsable")}.`,
    `- Periodicidad y alcance de la revisión: ${falta("cómo y cada cuánto se revisan las salidas")}.`,
    `- Qué hace el responsable cuando detecta una salida incorrecta: ${falta(
      "procedimiento de corrección y de aviso al titular afectado",
    )}.`,
    "",
    "## 7. Cómo hablar con una persona",
    "",
    `El titular puede pedir atención humana en cualquier momento escribiendo a ${falta(
      "canal de atención humana",
    )}. El asistente debe ofrecer ese canal cuando el titular lo pida y cuando la ` +
      "solicitud exceda lo que el sistema puede resolver.",
    "",
    "## 8. Aviso de que se conversa con un sistema automatizado",
    "",
    "El sistema debe identificarse como asistente automatizado desde el primer mensaje y no " +
      "puede afirmar que es un ser humano. En Colombia no hay todavía una ley vigente que " +
      "imponga ese anuncio: afirmar lo contrario sería información no veraz sobre el " +
      "servicio (art. 23 de la Ley 1480 de 2011) y, en comercio electrónico, el proveedor " +
      "debe informar su identidad de forma cierta y fidedigna (art. 50 lit. a de la Ley " +
      "1480 de 2011). El proyecto de ley 025 de 2026 Cámara, en trámite, propone esa " +
      "obligación expresa (art. 5 num. 3 lit. a), y el art. 50 del Reglamento (UE) 2024/1689 " +
      "(AI Act) ya la exige en la Unión Europea: se citan como referencia comparada, no como " +
      "norma vigente en Colombia.",
    "",
    "## 9. Versión de esta ficha",
    "",
    `Versión 1.0, ${falta("fecha (AAAA-MM-DD)")}. Debe actualizarse cada vez que cambie el ` +
      "modelo, el proveedor, la finalidad o los datos que el sistema recibe.",
  ];
}

/* ------------------------------------------------------------------ */
/* Generador                                                           */
/* ------------------------------------------------------------------ */

const PLANTILLAS: Record<DocumentoId, (ctx: Ctx) => string[]> = {
  politica,
  aviso,
  autorizacion,
  transmision,
  "consultas-reclamos": consultasReclamos,
  "ficha-transparencia": fichaTransparencia,
};

/** Ruta donde el cliente debe publicar cada documento. */
export const RUTA_DOCUMENTO: Record<DocumentoId, string> = {
  politica: "public/politica-tratamiento.md",
  aviso: "public/aviso-privacidad.md",
  autorizacion: "public/texto-autorizacion.md",
  transmision: "docs/contrato-transmision-proveedores.md",
  "consultas-reclamos": "docs/procedimiento-consultas-reclamos.md",
  "ficha-transparencia": "docs/ficha-transparencia-ia.md",
};

const IMPACTO: Record<DocumentoId, string> = {
  politica:
    "Entrega la política de tratamiento con los seis contenidos mínimos del art. " +
    "2.2.2.25.3.1 del Decreto 1074 de 2015, redactada sobre el tratamiento que hace el " +
    "código auditado y no sobre un modelo genérico, de modo que el responsable pueda " +
    "acreditar qué texto regía cuando el titular autorizó.",
  aviso:
    "Entrega el texto que debe verse en el punto de recolección con el contenido del art. " +
    "2.2.2.25.3.3 del Decreto 1074 de 2015, para que la autorización que se obtenga allí " +
    "sea informada (art. 9 de la Ley 1581 de 2012).",
  autorizacion:
    "Entrega una autorización previa, expresa e informada con la información del art. 12 " +
    "de la Ley 1581 de 2012, separando la de datos sensibles y sin casillas premarcadas " +
    "(art. 2.2.2.25.2.4 del Decreto 1074 de 2015).",
  transmision:
    "Entrega, proveedor por proveedor, las obligaciones mínimas del contrato de " +
    "transmisión del art. 2.2.2.25.5.2 del Decreto 1074 de 2015 y deja identificada la " +
    "decisión jurídica pendiente sobre los proveedores en países que no figuran en la " +
    "lista de la SIC.",
  "consultas-reclamos":
    "Entrega el procedimiento y los plazos de los arts. 14 y 15 de la Ley 1581 de 2012 y " +
    "el registro que permite acreditar que se cumplieron.",
  "ficha-transparencia":
    "Entrega al titular una descripción comprensible del sistema de IA, sus límites y el " +
    "canal humano, conforme a los nums. I y V de la Circular Externa 002 de 2024 de la " +
    "SIC y al deber de informar del art. 12 de la Ley 1581 de 2012.",
};

/**
 * Documento jurídico prellenado, como parche de tipo `documento`. No sustituye
 * líneas de código: se publica entero en la ruta `target`.
 */
export function generarDocumento(id: DocumentoId, ctx: Ctx, hits: Hit[]): Patch {
  /* La política se reemplaza donde ya esté publicada, si la prueba la encontró. */
  const existente = hits[0]?.path;
  const target =
    id === "politica" && existente && /\.(md|mdx|html|txt)$/i.test(existente)
      ? existente
      : RUTA_DOCUMENTO[id];
  return {
    kind: "documento",
    target,
    removed: [],
    added: PLANTILLAS[id](ctx),
    expectedImpact: IMPACTO[id],
  };
}

/** Documentos jurídicos que produjo la auditoría, con el estado de su hallazgo. */
export function documentosGenerados(
  run: AuditRun,
): Array<{ code: string; title: string; target: string; status: RemediationStatus; lines: string[] }> {
  return run.findings
    .filter((f) => f.remediation.patch.kind === "documento")
    .map((f) => ({
      code: f.code,
      title: f.remediation.patch.added.find((l) => l.startsWith("# "))?.slice(2) ?? f.title,
      target: f.remediation.patch.target,
      status: f.remediation.status,
      lines: f.remediation.patch.added,
    }));
}
