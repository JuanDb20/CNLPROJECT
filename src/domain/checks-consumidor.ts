import { type Check, PROMPT, TOOLS, edit, grep } from "./check-kit";

/** Consumidor y comercio electrónico (Ley 1480 de 2011). */

/** Cobro al consumidor: pasarela de pago o ruta de compra en el código. */
const COBRO =
  /\bstripe\b|\bwompi\b|\bpayu\b|mercadopago|\bepayco\b|@stripe|\/checkout|\/pagos?\b|\bcheckout\b/i;
/** Archivos donde vive la interfaz de compra. */
const UI = /\.(tsx|jsx|ts|js|mjs|vue|svelte|html)$/i;

/* La condición de estos hallazgos es negativa: el cobro existe y el deber de
   información no aparece en NINGUNA parte del repositorio (código, interfaz o
   documentación). Una sola mención basta para que el hallazgo no se produzca:
   VIGÍA no juzga la redacción del aviso, solo su ausencia total. */

export const CHECKS_CONSUMIDOR: Check[] = [
  {
    code: "VGI-092",
    module: "consent-ux",
    severity: "advertencia",
    title: "Cobro al consumidor sin informar el retracto ni la reversión del pago",
    summary:
      "El código cobra por medios electrónicos, pero ni la interfaz ni la documentación " +
      "mencionan el derecho de retracto ni la reversión del pago.",
    legalAnalysis:
      "En las ventas que utilizan métodos no tradicionales o a distancia se entiende " +
      "pactado el derecho de retracto, que el consumidor puede ejercer dentro de los " +
      "cinco (5) días hábiles siguientes a la entrega del bien o a la celebración del " +
      "contrato en el caso de los servicios; ejercido, {cliente} debe devolver en dinero " +
      "todas las sumas pagadas sin descuentos ni retenciones (art. 47 de la Ley 1480 de " +
      "2011). Cuando el pago se hace con tarjeta o con otro instrumento de pago " +
      "electrónico, el consumidor puede además pedir la reversión del pago si fue objeto " +
      "de fraude, la operación no fue solicitada, el producto no llegó, llegó defectuoso " +
      "o no corresponde a lo pedido, presentando la queja dentro de los cinco (5) días " +
      "hábiles siguientes a la noticia del hecho (art. 51). Informar el retracto y el " +
      "procedimiento para ejercerlo es, además, un deber expreso de quien ofrece " +
      "productos por medios electrónicos (art. 50 lit. c). Callarlo no extingue el " +
      "derecho: lo convierte en una reclamación ante la Superintendencia de Industria y " +
      "Comercio que {cliente} no podrá contestar con la prueba de haber informado.",
    ruleIds: ["col-1480-retracto", "col-1480-reversion", "col-1480-precio"],
    probe:
      "Búsqueda de pasarelas de pago o rutas de compra en el código y, en todo el " +
      "repositorio, de cualquier mención del derecho de retracto o de la reversión del pago.",
    detect: ({ files }) =>
      files.some((f) => /retracto|reversi[oó]n del pago/i.test(f.content))
        ? []
        : grep(files, UI, COBRO),
    patch: edit(
      "interfaz",
      [
        "$linea",
        "// Aviso que debe verse en la página de pago, antes de confirmar la compra:",
        '// "Derecho de retracto: usted puede retractarse de esta compra dentro de los cinco (5)',
        "//  días hábiles siguientes a la entrega del bien o a la celebración del contrato de",
        '//  servicios, y le devolveremos todo lo pagado (art. 47 de la Ley 1480 de 2011)."',
        '// "Reversión del pago: si la operación fue fraudulenta o no solicitada, o el producto no',
        "//  llegó, llegó defectuoso o no corresponde a lo pedido, puede pedir la reversión del pago",
        "//  dentro de los cinco (5) días hábiles siguientes, radicando la queja en <canal> y",
        '//  notificando al emisor de su medio de pago (art. 51 de la Ley 1480 de 2011)."',
      ],
      "El consumidor conoce el retracto y la reversión antes de pagar, y {cliente} puede " +
        "acreditar ante la Superintendencia de Industria y Comercio que informó el " +
        "procedimiento y los plazos.",
    ),
    branch: "vigia-patch/retracto-reversion",
    changeNote:
      "Texto informativo en la página de pago. No cambia el flujo de cobro ni la pasarela.",
    retests: [
      "El aviso de retracto y reversión se ve antes de confirmar el pago",
      "El procedimiento para ejercerlos indica canal y plazo",
    ],
  },
  {
    code: "VGI-093",
    module: "transparency",
    severity: "advertencia",
    title: "Oferta electrónica sin identificación del proveedor o sin precio total",
    summary:
      "La tienda cobra por medios electrónicos sin que en el repositorio aparezca la " +
      "identificación completa del proveedor o el precio total con impuestos y gastos.",
    legalAnalysis:
      "Quien ofrece productos por medios electrónicos debe informar en todo momento, de " +
      "forma cierta, fidedigna, suficiente, clara, accesible y actualizada, su identidad: " +
      "nombre o razón social, NIT, dirección de notificación judicial, teléfono y correo " +
      "(art. 50 lit. a de la Ley 1480 de 2011). Debe además informar el precio total del " +
      "producto incluyendo todos los impuestos, costos y gastos que deba pagar el " +
      "consumidor para adquirirlo y, cuando proceda, por separado los gastos de envío " +
      "(art. 50 lit. c). Uno y otro concretan el deber general de información clara, " +
      "veraz, suficiente, oportuna, verificable, comprensible, precisa e idónea del art. " +
      "23, cuya inobservancia hace a {cliente} responsable de todo daño que sea " +
      "consecuencia de la información inadecuada o insuficiente. Sin dirección de " +
      "notificación judicial el consumidor tampoco sabe a dónde dirigir su reclamo.",
    ruleIds: ["col-1480-ecommerce", "col-1480-precio", "col-1480-informacion"],
    probe:
      "Búsqueda de pasarelas de pago o rutas de compra y, en todo el repositorio, del NIT " +
      "o la razón social del proveedor y de la expresión del precio total con impuestos.",
    detect: ({ files }) => {
      const identidad = files.some((f) =>
        /\bNIT\b|raz[óo]n social|notificaci[óo]n judicial/i.test(f.content),
      );
      const precio = files.some((f) =>
        /precio total|total a pagar|impuestos incluidos|iva incluido/i.test(f.content),
      );
      return identidad && precio ? [] : grep(files, UI, COBRO);
    },
    patch: edit(
      "interfaz",
      [
        "$linea",
        "// Bloque visible en todo momento en la tienda (art. 50 lit. a de la Ley 1480 de 2011):",
        '// "{cliente}, NIT <NIT>, dirección de notificación judicial <dirección>,',
        '//  teléfono <teléfono>, correo <correo>."',
        "// Resumen del pedido, antes de confirmar (art. 50 lit. c): precio total del producto",
        "// incluyendo todos los impuestos, costos y gastos, y por separado los gastos de envío.",
      ],
      "El consumidor puede identificar a {cliente} y saber cuánto va a pagar en total antes " +
        "de aceptar la transacción, que es lo que exigen los literales a y c del art. 50.",
    ),
    branch: "vigia-patch/identidad-precio",
    changeNote: "Bloque de identificación y resumen de precio. No toca la lógica de cobro.",
    retests: [
      "Razón social, NIT, dirección de notificación judicial, teléfono y correo visibles",
      "El resumen del pedido muestra el precio total con impuestos y los gastos de envío",
    ],
  },
  {
    code: "VGI-094",
    module: "transparency",
    severity: "informativo",
    title: "El asistente ofrece o cotiza productos sin informar el precio total",
    summary:
      "Las instrucciones o las herramientas del asistente lo habilitan para vender, " +
      "cotizar o promocionar, sin ordenarle informar el precio total ni las condiciones.",
    legalAnalysis:
      "Lo que el asistente le dice al consumidor es información del proveedor y debe ser " +
      "clara, veraz, suficiente, oportuna, verificable, comprensible, precisa e idónea " +
      "(art. 23 de la Ley 1480 de 2011); {cliente} responde por todo daño que sea " +
      "consecuencia de una información inadecuada o insuficiente. Si la oferta se hace " +
      "por un medio electrónico, el precio que se informe debe ser el precio total, " +
      "incluyendo todos los impuestos, costos y gastos que deba pagar el consumidor, y " +
      "debe informarse también el derecho de retracto y el procedimiento para ejercerlo " +
      "(art. 50 lit. c). Un asistente que cotiza cifras sin impuestos ni condiciones " +
      "induce a error sobre el precio y compromete la oferta.",
    ruleIds: ["col-1480-informacion", "col-1480-precio"],
    probe:
      "Búsqueda en las instrucciones y herramientas del asistente de verbos de venta o " +
      "cotización, en archivos que no mencionan el precio total ni las condiciones.",
    detect: ({ files }) =>
      grep(
        files.filter(
          (f) =>
            (PROMPT.test(f.path) || TOOLS.test(f.path) || /agent|asistente|instruc/i.test(f.path)) &&
            !/precio total|impuesto|\biva\b|condiciones|t[ée]rminos/i.test(f.content),
        ),
        /\.(ts|tsx|js|jsx|mjs|md|txt|json)$/i,
        /\b(vende\w*|cotiza\w*|precio\w*|oferta\w*|promoci\w*)\b/i,
      ),
    patch: edit(
      "prompt",
      [
        "$linea",
        '"Cuando informes un precio, indica el precio total incluyendo todos los impuestos,',
        " costos y gastos, y por separado los gastos de envío. Antes de cerrar cualquier compra,",
        " remite al consumidor a las condiciones generales y al derecho de retracto. Si no tienes",
        ' el dato exacto, dilo y ofrece el canal donde puede confirmarlo."',
      ],
      "El asistente deja de dar cifras incompletas: informa el precio total con impuestos o " +
        "reconoce que no lo tiene, que es lo que exigen los arts. 23 y 50 lit. c.",
    ),
    branch: "vigia-patch/precio-total-asistente",
    changeNote: "Directriz añadida al prompt. No cambia las herramientas ni la lógica de venta.",
    retests: [
      "El asistente informa el precio total con impuestos cuando cotiza",
      "El asistente remite a las condiciones generales y al retracto antes de cerrar la compra",
    ],
  },
];
