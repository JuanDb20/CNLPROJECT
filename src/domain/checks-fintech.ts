import { type Check, type Ctx, type Hit, SCHEMA_FILE, edit, grep, isCode, isSource, tableName } from "./check-kit";
import { sectorPack } from "./sectores";
import type { RepoFile } from "./types";

/**
 * Especialista fintech: crédito, pagos y cobranza.
 *
 * Las pruebas que se apoyan en la Circular Externa 001 de 2025 de la SIC solo corren
 * si el cliente declara el sector financiero, porque la Circular se dirige a los
 * vigilados de la SIC que prestan servicios de financiación con tecnologías digitales.
 * Las de cobranza (Ley 2300 de 2023) y la de datos de tarjeta corren siempre: la ley
 * obliga a cualquiera que cobre, y el deber de seguridad, a cualquier responsable.
 */

const fintech = (ctx: Ctx) => sectorPack(ctx.client.sector)?.id === "financiero";

/** La misma expresión, pero solo en líneas que no son comentarios. */
const enCodigo = (re: RegExp) =>
  new RegExp(`^(?!\\s*(//|/\\*|\\*|#|--|<!--)).*(${re.source})`, re.flags);

const UI = /\.(tsx|jsx|vue|svelte|html)$/i;

/** Columna biométrica de la vinculación digital, en SQL o Prisma. */
const COLUMNA_BIOMETRICA =
  /^\s*"?(selfie\w*|face_?(template|embedding|vector)\w*|huella\w*|biometr\w*|liveness\w*)"?\s+\w+/i;
const BIO = "(selfie|biometr|face_|huella|liveness)";
const BORRA = "(delete|borr|purg|supr|retenci|retention|expir|\\bttl\\b|=\\s*null)";
/** Borrado o plazo de conservación que alcanza a la biometría. */
const BORRADO_BIOMETRIA = new RegExp(`${BORRA}[^\\n]{0,120}${BIO}|${BIO}[^\\n]{0,120}${BORRA}`, "i");

/** Lectura masiva de la agenda o de la galería del dispositivo (no el selector de una foto). */
const AGENDA_GALERIA =
  /Contacts\.(getContactsAsync|getAll)|navigator\.contacts|MediaLibrary\.getAssetsAsync|CameraRoll\.getPhotos|READ_CONTACTS/;

/** Autorización que en la misma frase suma finalidades accesorias. */
const AUTORIZA_ACCESORIA =
  /autoriz\w*.*(publicidad|mercadeo|marketing|ofertas?\b|promocion\w*|fines comerciales|aliados)/i;
const SEPARADAS = /opcional|accesori\w*|puedes? negarte|puede negarse|no afecta|sin que afecte/i;

const DESFAVORABLE =
  /["'`](rechazad[oa]|negad[oa]|denegad[oa]|rejected|denied|declined)["'`]|\b(aprobad[oa]|approved)\s*:\s*false\b/i;
const PUNTAJE = /\b(score|scoring|puntaje|calificaci[oó]n|riesgo)\b/i;
const EXPLICACION = /motivo|raz[oó]n|explica\w*|reason|factor\w*|causal/i;

const COBRANZA = /cobranza|\bcobr(ar|o)\b|\bmora\b|vencid[oa]|recordatorio de pago|\bdeuda\b|overdue|dunning/i;
const ENVIO =
  /messages\.create\(|sendMessage\(|sendMail\(|send(Sms|SMS|WhatsApp|Email)\(|enviar(Mensaje|Sms|SMS|WhatsApp|Correo)\(/;
const HORARIO = /getHours|getUTCHours|getDay|horario|hora_permitida|Ley 2300|business_?hours|quiet_?hours|festivo/i;
const REFERENCIAS =
  /\b(referencias?(_personales)?|references?|contactos?_de_emergencia|emergency_?contacts?)\b/i;

/* Lo que va dentro de una plantilla `…` es texto, no código: el cuerpo de un mensaje, o un
   repositorio de ejemplo guardado como dato. Se borra conservando los saltos de línea para
   que los números de línea sigan siendo los del archivo. */
const sinPlantillas = (s: string) =>
  s.replace(/`(?:\\[\s\S]|[^`\\])*`/g, (m) => m.replace(/[^\n]/g, " "));

/** Archivo que cobra: habla de mora o deuda (en cualquier parte) y envía mensajes (en el código). */
const cobra = (f: RepoFile) =>
  isSource(f) && COBRANZA.test(f.content) && ENVIO.test(sinPlantillas(f.content));

/** Líneas de código, fuera de comentarios y de plantillas de texto, que coinciden con `re`. */
const enCodigoReal = (files: RepoFile[], re: RegExp): Hit[] =>
  files.flatMap((f) => {
    const original = f.content.split(/\r?\n/);
    return grep([{ ...f, content: sinPlantillas(f.content) }], /./, enCodigo(re)).map((h) => ({
      ...h,
      text: original[h.line - 1].trim(),
    }));
  });

/** Número de tarjeta o código de seguridad como columna de la base. */
const COLUMNA_TARJETA =
  /^\s*"?(cvv2?|cvc2?|card_?(cvc|cvv|number)|codigo_?seguridad|numero_?tarjeta|num_?tarjeta)"?\s+\w+/i;

/** Tabla en la que vive la línea `line` del archivo: la última `create table` antes de ella. */
function tablaDe(ctx: Ctx, hit: Hit): string {
  const file = ctx.files.find((f) => f.path === hit.path);
  const antes = file?.content.split(/\r?\n/).slice(0, hit.line).join("\n") ?? "";
  const tablas = [...antes.matchAll(/create\s+table[^(]*/gi)].map((m) => tableName(m[0]));
  return tablas.at(-1) ?? "<tabla>";
}

export const CHECKS_FINTECH: Check[] = [
  {
    code: "VGI-124",
    module: "static-scan",
    severity: "advertencia",
    title: "Biometría de la vinculación sin borrado previsto al terminar la relación",
    summary:
      "La base guarda la selfie o la plantilla facial de la vinculación y en ninguna parte " +
      "del código hay borrado ni plazo de conservación para esos datos.",
    legalAnalysis:
      "Los datos biométricos son sensibles (art. 5 de la Ley 1581 de 2012) y en los servicios " +
      "de financiación prestados con tecnologías digitales exigen diligencia reforzada: la " +
      "Circular Externa 001 de 2025 de la SIC ordena borrarlos en un término razonable una vez " +
      "termine la relación contractual con el titular y no subsistan las finalidades precisas " +
      "para las que se autorizaron (num. 5.2 lit. e), y no usarlos para finalidades distintas " +
      "(lit. a). Una tabla que conserva la selfie y la plantilla facial sin ningún mecanismo de " +
      "borrado deja a {cliente} sin forma de cumplir esa instrucción ni de acreditarla. La " +
      "Circular se dirige a los vigilados de la SIC; si {cliente} es vigilada por la " +
      "Superintendencia Financiera, el deber de conservar solo lo necesario sigue en pie por " +
      "el principio de finalidad de la Ley 1581.",
    ruleIds: ["col-sic-fintech-biometria", "col-1581-sensibles", "col-1377-temporalidad"],
    probe:
      "Búsqueda en los esquemas de columnas biométricas (selfie, plantilla facial, huella) y, " +
      "en todo el código, de cualquier borrado o plazo de conservación que las alcance. Solo " +
      "corre si el cliente declara el sector financiero.",
    detect: (ctx) =>
      !fintech(ctx) || ctx.files.some((f) => isCode(f) && BORRADO_BIOMETRIA.test(f.content))
        ? []
        : grep(ctx.files.filter(SCHEMA_FILE), /./, COLUMNA_BIOMETRICA),
    patch: (hits, ctx) => {
      const tabla = tablaDe(ctx, hits[0]);
      const columnas = hits
        .filter((h) => tablaDe(ctx, h) === tabla)
        .map((h) => COLUMNA_BIOMETRICA.exec(h.text)?.[1] ?? "")
        .filter(Boolean);
      return {
        kind: "codigo",
        target: hits[0].path,
        removed: [],
        added: [
          "-- Purga de la biometría al terminar la relación (Circular Externa 001 de 2025 de la SIC, num. 5.2 lit. e).",
          "-- fin_relacion es la fecha en que terminó el contrato: ajústela a la columna real.",
          "create extension if not exists pg_cron;",
          "select cron.schedule('purga-biometria', '0 3 * * *', $$",
          `  update public.${tabla} set ${columnas.map((c) => `${c} = null`).join(", ")}`,
          "  where fin_relacion < now() - interval '90 days'",
          "$$);",
        ],
        expectedImpact:
          "La biometría deja de conservarse indefinidamente: se borra sola cuando la relación " +
          "con el titular termina y vence el plazo que {cliente} fije como razonable, que es lo " +
          "que pide el num. 5.2 lit. e de la Circular 001 de 2025.",
      };
    },
    branch: "vigia-patch/purga-biometria",
    changeNote:
      "Rutina programada que vacía las columnas biométricas de las relaciones terminadas. El " +
      "plazo de 90 días es una propuesta: lo fija {cliente} con su abogado.",
    retests: [
      "Existe un borrado programado que alcanza todas las columnas biométricas",
      "El plazo de conservación está documentado en la política de tratamiento",
    ],
  },
  {
    code: "VGI-125",
    module: "static-scan",
    severity: "advertencia",
    title: "La aplicación lee la agenda de contactos o la galería del dispositivo",
    summary:
      "El código lee de forma masiva los contactos o las fotos del teléfono del titular, en " +
      "una aplicación de servicios de financiación.",
    legalAnalysis:
      "En los servicios de financiación prestados con tecnologías digitales el tratamiento " +
      "debe limitarse a los datos idóneos y necesarios, y la Circular Externa 001 de 2025 de " +
      "la SIC lo concreta con un ejemplo: las aplicaciones no podrán acceder a la galería de " +
      "imágenes ni a la lista de contactos del dispositivo con fines de cobranza (num. 2). " +
      "Quien cobra debe además abstenerse de contactar a las personas de la lista de contactos " +
      "del titular sin su autorización (num. 10), y la Ley 2300 de 2023 prohíbe en todo caso " +
      "contactar a las referencias (art. 4). VIGÍA no puede ver para qué se usa la lectura: " +
      "{cliente} debe acreditar una finalidad distinta de la cobranza, informada y autorizada " +
      "en el momento en que se pide el permiso (num. 3), o retirarla.",
    ruleIds: ["col-sic-fintech-minimizacion", "col-1581-finalidad"],
    probe:
      "Búsqueda en el código y en los manifiestos de la aplicación de lecturas masivas de la " +
      "agenda o de la galería (Contacts.getContactsAsync, Contacts.getAll, " +
      "MediaLibrary.getAssetsAsync, CameraRoll.getPhotos, READ_CONTACTS). Solo corre si el " +
      "cliente declara el sector financiero.",
    detect: (ctx) => (fintech(ctx) ? grep(ctx.files.filter(isCode), /./, enCodigo(AGENDA_GALERIA)) : []),
    patch: edit(
      "codigo",
      [
        "// Eliminado: la aplicación no lee la agenda ni la galería del dispositivo. La cobranza",
        "// usa solo los canales que el titular autorizó (Circular Externa 001 de 2025 de la SIC,",
        "// nums. 2 y 10; Ley 2300 de 2023, art. 2).",
      ],
      "La aplicación deja de recolectar los contactos y las fotos del titular, que no son " +
        "necesarios para prestar el servicio y que la Circular 001 de 2025 excluye de la cobranza.",
    ),
    branch: "vigia-patch/sin-agenda-ni-galeria",
    changeNote:
      "Retira la lectura masiva. Si había una finalidad legítima distinta de la cobranza, se " +
      "vuelve a pedir el permiso en el momento de usarla, informando para qué.",
    retests: [
      "Ninguna parte del código lee la agenda de contactos ni la galería",
      "El permiso del dispositivo ya no aparece en el manifiesto de la aplicación",
    ],
  },
  {
    code: "VGI-126",
    module: "consent-ux",
    severity: "advertencia",
    title: "La autorización mezcla las finalidades necesarias con las accesorias",
    summary:
      "Una sola casilla autoriza a la vez el tratamiento que exige el crédito y el envío de " +
      "publicidad u ofertas, sin separarlos ni decir que lo accesorio es opcional.",
    legalAnalysis:
      "La autorización debe ser previa, expresa e informada (art. 9 de la Ley 1581 de 2012). " +
      "En los servicios de financiación prestados con tecnologías digitales, la Circular " +
      "Externa 001 de 2025 de la SIC exige pedirla presentando las finalidades de forma " +
      "diferenciada, al menos en dos grupos: las necesarias para el contrato y las accesorias, " +
      "como el envío de publicidad o la oferta de otros servicios; y reconoce al titular el " +
      "derecho a oponerse a las accesorias en cualquier momento sin que su negativa afecte el " +
      "servicio principal (num. 4). Una casilla obligatoria que suma las dos convierte la " +
      "publicidad en condición del crédito, y la autorización que {cliente} conserva no le " +
      "sirve para acreditar el consentimiento sobre lo accesorio.",
    ruleIds: ["col-sic-fintech-finalidades", "col-1581-autorizacion"],
    probe:
      "Búsqueda en la interfaz de textos de autorización que en la misma frase incluyen " +
      "publicidad, ofertas o aliados, en archivos que no presentan lo accesorio como opcional. " +
      "Solo corre si el cliente declara el sector financiero.",
    detect: (ctx) =>
      fintech(ctx)
        ? grep(
            ctx.files.filter((f) => UI.test(f.path) && !SEPARADAS.test(f.content)),
            /./,
            AUTORIZA_ACCESORIA,
          )
        : [],
    patch: edit(
      "interfaz",
      [
        '<input type="checkbox" required /> Autorizo el tratamiento de mis datos para estudiar y administrar mi crédito.',
        "</label>",
        "<label>",
        '<input type="checkbox" /> Opcional: autorizo el envío de publicidad y ofertas. Si no lo marco, el servicio no cambia y puedo retirar esta autorización cuando quiera.',
      ],
      "El titular autoriza por separado lo necesario y lo accesorio, y puede negarse a la " +
        "publicidad sin perder el crédito, que es lo que exige el num. 4 de la Circular 001 de 2025.",
    ),
    branch: "vigia-patch/finalidades-separadas",
    changeNote:
      "Divide la casilla en dos: la necesaria sigue siendo obligatoria y la accesoria queda " +
      "opcional y desmarcada. No cambia la lógica del registro.",
    retests: [
      "La autorización presenta las finalidades necesarias y las accesorias por separado",
      "La casilla de publicidad es opcional y viene desmarcada",
    ],
  },
  {
    code: "VGI-127",
    module: "transparency",
    severity: "advertencia",
    title: "Rechazo automático del crédito sin explicación al solicitante",
    summary:
      "Una regla del código rechaza la solicitud según un puntaje y no devuelve los motivos " +
      "ni los factores que pesaron en la decisión.",
    legalAnalysis:
      "Según el principio de transparencia, el titular tiene derecho a una explicación clara y " +
      "comprensible de cualquier decisión automatizada que le resulte desfavorable, con al menos " +
      "una descripción general de la lógica y los criterios principales del sistema y de los " +
      "factores que más influyen en el resultado (Circular Externa 001 de 2025 de la SIC, num. " +
      "8). Si hay secretos comerciales, la explicación puede darse por tipos de factores, pero " +
      "el solicitante debe poder entender por qué se le negó. Un rechazo que solo devuelve el " +
      "estado deja a {cliente} sin con qué responder esa solicitud, y la información sobre esos " +
      "tratamientos automatizados debe estar además en la política de tratamiento y en los " +
      "términos y condiciones (mismo numeral).",
    ruleIds: ["col-sic-fintech-decisiones", "col-1581-informar"],
    probe:
      "Búsqueda en el código de estados de rechazo asignados en archivos que calculan un " +
      "puntaje o un riesgo y que no registran motivos, razones ni factores. Solo corre si el " +
      "cliente declara el sector financiero.",
    detect: (ctx) =>
      fintech(ctx)
        ? grep(
            ctx.files.filter(
              (f) => isSource(f) && PUNTAJE.test(f.content) && !EXPLICACION.test(f.content),
            ),
            /./,
            enCodigo(DESFAVORABLE),
          )
        : [],
    patch: edit(
      "codigo",
      [
        "$linea",
        "// Con el rechazo van sus motivos (Circular Externa 001 de 2025 de la SIC, num. 8): los",
        "// factores que más pesaron, en lenguaje claro («puntaje por debajo del mínimo», «ingresos",
        "// no verificables»), y el canal para pedir que una persona revise la decisión.",
      ],
      "El solicitante recibe los factores principales de la decisión y una vía para " +
        "controvertirla, y {cliente} conserva la explicación que dio.",
    ),
    branch: "vigia-patch/motivos-del-rechazo",
    changeNote:
      "Agrega los motivos a la respuesta de rechazo. No cambia la regla de decisión ni el puntaje.",
    retests: [
      "Cada rechazo devuelve los factores principales que lo explican",
      "La política de tratamiento describe la lógica general de la decisión automatizada",
    ],
  },
  {
    code: "VGI-128",
    module: "static-scan",
    severity: "advertencia",
    title: "Cobranza automática sin restricción de horario ni de frecuencia",
    summary:
      "El código envía mensajes de cobro sin verificar el día ni la hora del envío, ni " +
      "cuántas veces se ha contactado ya al deudor.",
    legalAnalysis:
      "Quien adelante gestiones de cobranza, directamente, por terceros o por cesión de la " +
      "obligación, solo puede contactar al consumidor de lunes a viernes de 7:00 a. m. a 7:00 " +
      "p. m. y los sábados de 8:00 a. m. a 3:00 p. m., nunca domingos ni festivos; y, " +
      "establecido el contacto directo, no puede contactarlo por varios canales en la misma " +
      "semana ni más de una vez el mismo día (arts. 1 y 3 de la Ley 2300 de 2023). Solo se " +
      "admiten los canales que el consumidor haya autorizado (art. 2). Un envío automático que " +
      "no consulta la hora ni lleva la cuenta de los contactos puede violar esos límites cada " +
      "noche, y el incumplimiento lo sancionan la Superintendencia Financiera y la SIC (art. 9). " +
      "Quedan por fuera los avisos que el art. 8 exceptúa, como la confirmación de operaciones " +
      "o las alertas de fraude.",
    ruleIds: ["col-2300-horarios", "col-1266-usuarios"],
    probe:
      "Búsqueda en el código de envíos de mensajes en archivos de cobranza (mora, cobro, " +
      "deuda, recordatorio de pago) que no consultan el día ni la hora del envío.",
    detect: ({ files }) => enCodigoReal(files.filter((f) => cobra(f) && !HORARIO.test(f.content)), ENVIO),
    patch: edit(
      "codigo",
      [
        "// Ley 2300 de 2023, art. 3: solo de lunes a viernes de 7:00 a. m. a 7:00 p. m. y los sábados",
        "// de 8:00 a. m. a 3:00 p. m.; nunca domingos ni festivos. Antes de enviar, verificar además",
        "// que el deudor no haya recibido ya un contacto hoy ni por otro canal esta semana.",
        "if (!dentroDelHorarioDeCobranza(new Date())) return;",
        "$linea",
      ],
      "Los mensajes de cobro solo salen en los días y horas que permite la Ley 2300 de 2023 y " +
        "nunca más de una vez el mismo día.",
    ),
    branch: "vigia-patch/horario-de-cobranza",
    changeNote:
      "Agrega la verificación de horario y de frecuencia antes del envío. Las funciones " +
      "auxiliares deben incluir el calendario de festivos de Colombia.",
    retests: [
      "Ningún mensaje de cobro sale domingos, festivos ni fuera del horario de la ley",
      "Un mismo deudor no recibe más de un contacto de cobranza el mismo día",
    ],
  },
  {
    code: "VGI-129",
    module: "static-scan",
    severity: "critico",
    title: "La cobranza contacta a las referencias personales del deudor",
    summary:
      "En el flujo de cobro, el código envía mensajes a las referencias o contactos de " +
      "emergencia que el deudor registró al pedir el crédito.",
    legalAnalysis:
      "La Ley 2300 de 2023 es categórica: en ningún caso quien adelante gestiones de cobranza, " +
      "directamente, por terceros o por cesión de la obligación, puede contactar a las " +
      "referencias personales o de otra índole del deudor; al avalista, codeudor o deudor " +
      "solidario se le contacta en las mismas condiciones que al deudor (art. 4). La Circular " +
      "Externa 001 de 2025 de la SIC reitera el deber de abstenerse de contactar a las " +
      "referencias y lo declara objeto especial de vigilancia (num. 10). Cada mensaje revela, " +
      "además, a un tercero que el titular está en mora: un dato financiero negativo que solo " +
      "puede circular entre los legitimados de la Ley 1266 (art. 5). Para {cliente} es la " +
      "conducta más visible y la más fácil de probar en una queja.",
    ruleIds: ["col-2300-referencias", "col-1266-circulacion", "col-sic-fintech-minimizacion"],
    probe:
      "Búsqueda, en los archivos de cobranza que envían mensajes, de líneas de código que " +
      "toman como destinatarios las referencias o los contactos de emergencia del deudor.",
    detect: ({ files }) => enCodigoReal(files.filter(cobra), REFERENCIAS),
    patch: edit(
      "codigo",
      [
        "// Eliminado: la cobranza nunca contacta a las referencias personales del deudor",
        "// (Ley 2300 de 2023, art. 4; Circular Externa 001 de 2025 de la SIC, num. 10).",
      ],
      "Los terceros dejan de enterarse de la deuda: la cobranza se dirige solo al deudor y, en " +
        "las mismas condiciones, al codeudor o avalista.",
    ),
    branch: "vigia-patch/sin-contacto-a-referencias",
    changeNote:
      "Retira el envío a las referencias. Las referencias pueden seguir guardándose si tienen " +
      "otra finalidad autorizada, pero no se usan para cobrar.",
    retests: [
      "Ningún mensaje de cobranza tiene como destinatario a una referencia del deudor",
      "El flujo de cobro solo contacta al deudor, al codeudor o al avalista",
    ],
  },
  {
    code: "VGI-130",
    module: "static-scan",
    severity: "critico",
    title: "Número de tarjeta o código de seguridad guardados en la base de datos",
    summary:
      "El esquema tiene columnas para el número de la tarjeta o para su código de seguridad " +
      "(CVV/CVC), en lugar del token que entrega la pasarela de pagos.",
    legalAnalysis:
      "El responsable debe conservar la información con las medidas técnicas necesarias para " +
      "impedir su consulta, uso o acceso no autorizado o fraudulento (arts. 4 lit. g y 17 lit. " +
      "d de la Ley 1581 de 2012), y recolectar solo lo pertinente y adecuado para la finalidad " +
      "(art. 4 lit. b). El código de seguridad no sirve para nada después de autorizado el pago: " +
      "el estándar de la industria de tarjetas, que las marcas exigen por contrato a quien " +
      "acepta pagos (PCI DSS v4.0.1, requisito 3.3.1), prohíbe conservarlo después de la " +
      "autorización, aunque esté cifrado. Una base que guarda el número y el código convierte " +
      "cualquier fuga en fraude inmediato con las tarjetas de los clientes de {cliente}. Para " +
      "las fintech vigiladas por la SIC, la Circular Externa 001 de 2025 exige además medidas " +
      "de seguridad documentadas y verificables por la autoridad (num. 9).",
    ruleIds: ["col-1581-seguridad", "col-1581-finalidad"],
    probe:
      "Búsqueda en los esquemas SQL y Prisma de columnas para el número de tarjeta o para el " +
      "código de seguridad (cvv, cvc, card_number, numero_tarjeta).",
    detect: ({ files }) => grep(files.filter(SCHEMA_FILE), /./, COLUMNA_TARJETA),
    patch: (hits) => {
      /* Las columnas de tarjeta suelen ir juntas: se reemplazan en un solo bloque. */
      const mismas = hits.filter((h) => h.path === hits[0].path);
      const bloque = mismas.filter((h, i) => h.line === mismas[0].line + i);
      return {
        kind: "codigo",
        target: hits[0].path,
        removed: bloque.map((h) => h.text),
        added: [
          "-- Sin número de tarjeta ni código de seguridad: el CVV/CVC no se guarda nunca y el",
          "-- número lo custodia la pasarela de pagos; la base guarda solo el token que ella entrega.",
          "card_token text,",
        ],
        expectedImpact:
          "Una fuga de la base ya no expone tarjetas utilizables: {cliente} conserva solo el " +
          "token de la pasarela, que no sirve fuera de ella.",
      };
    },
    branch: "vigia-patch/token-de-tarjeta",
    changeNote:
      "Reemplaza las columnas de tarjeta por el token de la pasarela. Hay que migrar los cobros " +
      "recurrentes al token y borrar de forma segura los datos ya guardados.",
    retests: [
      "Ninguna tabla guarda el número de la tarjeta ni su código de seguridad",
      "Los cobros recurrentes usan el token de la pasarela de pagos",
    ],
  },
];
