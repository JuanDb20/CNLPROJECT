import type { ComplianceRule, Framework, FrameworkId } from "./types";

/**
 * Catálogo normativo.
 *
 * Es deliberadamente *datos* y no código: incorporar un nuevo régimen (por
 * ejemplo la futura ley colombiana de IA o el AI Act de otra jurisdicción)
 * consiste en añadir entradas aquí, no en modificar el motor.
 *
 * El eje es el derecho colombiano. Los marcos europeos se declaran como
 * referencia comparada (`kind: "comparado"`): orientan la corrección, pero no se
 * reportan como incumplimiento de una empresa colombiana que no ofrece el
 * sistema en la Unión Europea.
 *
 * Las citas del Decreto 1377 de 2013 se dan con la doble numeración: el artículo
 * decimal del Decreto 1074 de 2015, que lo compiló, y entre paréntesis el
 * artículo de origen, para que el lector pueda cotejar cualquiera de los dos.
 */

export const FRAMEWORKS: Record<FrameworkId, Framework> = {
  "col-1581": {
    id: "col-1581",
    shortName: "Ley 1581",
    name: "Régimen General de Protección de Datos Personales",
    jurisdiction: "Colombia",
    kind: "juridico",
    citation:
      "Ley 1581 de 2012; Decreto 1074 de 2015 (compila el Decreto 1377 de 2013); " +
      "Circular Única SIC, Título V; Circular Externa 002 de 2024 SIC; " +
      "Circular Externa 003 de 2025 SIC (cláusulas contractuales modelo RIPD)",
    description:
      "Deber de seguridad, autorización previa e informada, régimen reforzado para " +
      "datos sensibles, transmisión y transferencia internacional, y lineamientos de " +
      "la SIC para el tratamiento de datos con inteligencia artificial. Autoridad: SIC.",
  },
  "col-1266": {
    id: "col-1266",
    shortName: "Ley 1266",
    name: "Habeas Data financiero",
    jurisdiction: "Colombia",
    kind: "juridico",
    citation: "Ley 1266 de 2008, modificada y adicionada por la Ley 2157 de 2021",
    description:
      "Régimen especial para información financiera, crediticia y comercial. Relevante " +
      "para cualquier asistente de IA que opere sobre historial de pagos o scoring. La " +
      "Ley 2157 de 2021 («borrón y cuenta nueva») adicionó y modificó varios artículos, " +
      "pero no los arts. 5 ni 9, que son los que aquí se citan.",
  },
  "col-1480": {
    id: "col-1480",
    shortName: "Ley 1480",
    name: "Estatuto del Consumidor",
    jurisdiction: "Colombia",
    kind: "interfaz",
    citation: "Ley 1480 de 2011",
    description:
      "Deber de suministrar al consumidor información clara, veraz, suficiente y " +
      "verificable (art. 23), y deberes específicos de identificación e información de " +
      "quien ofrece productos por medios electrónicos (art. 50). Se aplica a lo que el " +
      "asistente afirma sobre sí mismo y sobre el producto.",
  },
  "col-pi": {
    id: "col-pi",
    shortName: "Propiedad intelectual",
    name: "Derecho de autor sobre el software y licencias",
    jurisdiction: "Colombia y Comunidad Andina",
    kind: "juridico",
    citation:
      "Ley 23 de 1982 (modificada por la Ley 1915 de 2018); Decisión Andina 351 de 1993; " +
      "licencias de software libre y de código abierto; términos de las herramientas de generación de código",
    description:
      "El software se protege como obra literaria. Las dependencias de la aplicación y el " +
      "código generado con herramientas de IA se usan bajo licencias y términos que imponen " +
      "obligaciones (publicar el código, atribuir, no usar comercialmente). Autoridad: " +
      "Dirección Nacional de Derecho de Autor; los conflictos de licencia se resuelven por vía civil.",
  },
  "col-inclusion": {
    id: "col-inclusion",
    shortName: "Accesibilidad",
    name: "Accesibilidad e inclusión digital",
    jurisdiction: "Colombia",
    kind: "interfaz",
    citation:
      "Ley 1618 de 2013, art. 14; Resolución 1519 de 2020 de MinTIC (anexo 1, accesibilidad web); NTC 5854; WCAG 2.1 (referencia técnica)",
    description:
      "La obligación de accesibilidad web recae sobre las entidades públicas y los prestadores " +
      "de servicios públicos; para las empresas privadas es una buena práctica que previene " +
      "reclamos por discriminación (art. 13 de la Constitución) y amplía el mercado. Se " +
      "reporta con severidad informativa salvo que el cliente sea una entidad obligada.",
  },
  owasp: {
    id: "owasp",
    shortName: "OWASP",
    name: "OWASP Top 10 y OWASP Top 10 for LLM Applications",
    jurisdiction: "Estándar técnico",
    kind: "tecnico",
    citation: "OWASP Top 10:2025 y OWASP Top 10 for LLM Applications 2025",
    description:
      "Taxonomías de referencia de vulnerabilidades en aplicaciones web y en " +
      "aplicaciones basadas en modelos de lenguaje. Clasifican el hecho técnico; la " +
      "consecuencia jurídica la fija la norma colombiana.",
  },
  "eu-ai-act": {
    id: "eu-ai-act",
    shortName: "AI Act (ref.)",
    name: "Reglamento Europeo de Inteligencia Artificial",
    jurisdiction: "Unión Europea · referencia comparada",
    kind: "comparado",
    citation: "Reglamento (UE) 2024/1689",
    description:
      "Referencia comparada. Solo sería exigible si el sistema se ofrece o su resultado " +
      "se usa en la Unión (art. 2). Las obligaciones de transparencia del art. 50 aplican " +
      "desde el 2 de agosto de 2026; el Ómnibus Digital de 2026 aplazó el régimen de alto " +
      "riesgo del Anexo III y previó una transición acotada al marcado del art. 50.2.",
  },
  gdpr: {
    id: "gdpr",
    shortName: "RGPD (ref.)",
    name: "Reglamento General de Protección de Datos",
    jurisdiction: "Unión Europea · referencia comparada",
    kind: "comparado",
    citation:
      "Reglamento (UE) 2016/679 y Directrices EDPB 03/2022 v2.0, adoptadas el 14 de " +
      "febrero de 2023",
    description:
      "Referencia comparada. Solo sería exigible si la empresa ofrece bienes o " +
      "servicios a personas en la Unión o monitorea su comportamiento (art. 3.2). Las " +
      "Directrices 03/2022 v2.0 tratan patrones de diseño engañoso en interfaces de " +
      "plataformas de redes sociales: fuera de ese ámbito se citan por analogía.",
  },
};

export const RULES: ComplianceRule[] = [
  /* ---------------- Colombia · Ley 1581 y reglamentación ---------------- */
  {
    id: "col-1581-veracidad",
    framework: "col-1581",
    label: "Ley 1581 Art. 4 lit. d",
    title: "Principio de veracidad o calidad",
    obligation:
      "La información sujeta a tratamiento debe ser veraz, completa, exacta, actualizada, " +
      "comprobable y comprensible; se prohíbe el tratamiento de datos parciales, incompletos, " +
      "fraccionados o que induzcan a error. Una política de tratamiento que no describe el " +
      "tratamiento real (proveedores, transferencias, datos sensibles, plazos) induce a error " +
      "al titular sobre lo que se hace con sus datos.",
  },
  {
    id: "col-1581-informar",
    framework: "col-1581",
    label: "Ley 1581 Arts. 12 y 17 lit. k",
    title: "Deber de informar al titular",
    obligation:
      "Al solicitar la autorización, el responsable debe informar de manera clara y expresa " +
      "el tratamiento al que serán sometidos los datos y su finalidad, el carácter facultativo " +
      "de las respuestas sobre datos sensibles o de menores, los derechos del titular y la " +
      "identificación, dirección y teléfono del responsable (art. 12); y debe informar, a " +
      "solicitud del titular, sobre el uso dado a sus datos (art. 17 lit. k).",
  },
  {
    id: "col-1581-seguridad",
    framework: "col-1581",
    label: "Ley 1581 Arts. 4 lit. g, 17 lit. d y 18 lit. b",
    title: "Principio y deber de seguridad",
    obligation:
      "La información debe manejarse con las medidas técnicas, humanas y " +
      "administrativas necesarias para otorgar seguridad a los registros, evitando su " +
      "adulteración, pérdida, consulta, uso o acceso no autorizado o fraudulento. El " +
      "mismo deber recae sobre el encargado del tratamiento (art. 18 lit. b), y por " +
      "tanto sobre el proveedor de IA que trata datos por cuenta del responsable. El " +
      "deber no distingue cómo se escribió el código: una instrucción al modelo no es " +
      "una medida técnica de control de acceso.",
  },
  {
    id: "col-1581-incidentes",
    framework: "col-1581",
    label: "Ley 1581 Art. 17 lit. n",
    title: "Reporte de incidentes de seguridad",
    obligation:
      "El responsable debe informar a la autoridad de protección de datos cuando se " +
      "presenten violaciones a los códigos de seguridad y existan riesgos en la " +
      "administración de la información de los titulares.",
  },
  {
    id: "col-1581-sensibles",
    framework: "col-1581",
    label:
      "Ley 1581 Arts. 5 y 6; Decreto 1074/2015 Art. 2.2.2.25.2.3 (Decreto 1377/2013, art. 6)",
    title: "Datos sensibles",
    obligation:
      "Los datos biométricos son datos sensibles (art. 5). Su tratamiento está " +
      "prohibido salvo las excepciones del art. 6, entre ellas la autorización " +
      "explícita del titular, y exige medidas reforzadas de seguridad y acceso. " +
      "Además, el responsable debe informar al titular que por tratarse de datos " +
      "sensibles no está obligado a autorizar su tratamiento, señalar cuáles datos son " +
      "sensibles y obtener consentimiento expreso; ninguna actividad puede " +
      "condicionarse a que el titular suministre datos sensibles.",
  },
  {
    id: "col-1581-autorizacion",
    framework: "col-1581",
    label:
      "Ley 1581 Arts. 9 y 17 lit. b; Decreto 1074/2015 Arts. 2.2.2.25.2.4 y 2.2.2.25.2.5 " +
      "(Decreto 1377/2013, arts. 7 y 8)",
    title: "Autorización previa e informada",
    obligation:
      "El tratamiento requiere autorización previa e informada del titular (art. 9), " +
      "que el responsable debe conservar y poder acreditar (art. 17 lit. b de la ley y " +
      "art. 2.2.2.25.2.5 del decreto). La autorización debe constar en una conducta " +
      "inequívoca del titular: en ningún caso el silencio podrá asimilarse a una " +
      "conducta inequívoca. Un sistema que accede a datos por fuera del alcance " +
      "autorizado trata datos sin título habilitante.",
  },
  {
    id: "col-1581-finalidad",
    framework: "col-1581",
    label: "Ley 1581 Art. 4 lit. b; Decreto 1074/2015 Art. 2.2.2.25.2.1 (Decreto 1377/2013, art. 4)",
    title: "Principio de finalidad y minimización",
    obligation:
      "El tratamiento debe obedecer a una finalidad legítima, informada al titular. La " +
      "recolección de datos deberá limitarse a aquellos datos personales que son " +
      "pertinentes y adecuados para la finalidad, y no podrán usarse medios engañosos o " +
      "fraudulentos para recolectar y realizar tratamiento de datos personales. Usar un " +
      "dato para algo distinto de lo autorizado, o ampliar por cuenta propia el conjunto " +
      "de datos tratados, desborda la finalidad.",
  },
  {
    id: "col-1581-circulacion",
    framework: "col-1581",
    label: "Ley 1581 Art. 4 lit. f",
    title: "Principio de acceso y circulación restringida",
    obligation:
      "Los datos personales, salvo la información pública, no pueden estar disponibles " +
      "en internet u otros medios de divulgación masiva, salvo que el acceso sea " +
      "técnicamente controlable para brindar un conocimiento restringido solo a los " +
      "titulares o a terceros autorizados.",
  },
  {
    id: "col-1581-legitimados",
    framework: "col-1581",
    label: "Ley 1581 Arts. 4 lit. f y 13",
    title: "Quién puede acceder a los datos personales",
    obligation:
      "El tratamiento solo puede hacerlo el titular, sus causahabientes o " +
      "representantes legales, las entidades públicas en ejercicio de funciones legales " +
      "o por orden judicial, y los terceros autorizados por el titular o por la ley " +
      "(art. 13). Conocer un número de documento no acredita ninguna de esas calidades.",
  },
  {
    id: "col-1581-derechos",
    framework: "col-1581",
    label:
      "Ley 1581 Arts. 8, 14 y 15; Decreto 1074/2015 Art. 2.2.2.25.2.6 (Decreto 1377/2013, art. 9)",
    title: "Derechos del titular, consultas y reclamos",
    obligation:
      "El titular puede conocer, actualizar, rectificar y pedir la supresión de sus " +
      "datos, y revocar la autorización (art. 8). Puede en todo momento solicitar la " +
      "supresión y revocar la autorización mediante reclamo, y el responsable y el " +
      "encargado deben poner a su disposición mecanismos gratuitos y de fácil acceso " +
      "para hacerlo. La consulta se atiende en máximo diez (10) días hábiles (art. 14) y " +
      "el reclamo en quince (15) días hábiles (art. 15).",
  },
  {
    id: "col-1581-menores",
    framework: "col-1581",
    label:
      "Ley 1581 Art. 7; Decreto 1074/2015 Art. 2.2.2.25.2.9 (Decreto 1377/2013, art. 12)",
    title: "Datos de niños, niñas y adolescentes",
    obligation:
      "Queda proscrito el tratamiento de datos personales de niños, niñas y " +
      "adolescentes, salvo los de naturaleza pública. Cuando sea posible, el tratamiento " +
      "debe responder y respetar el interés superior del menor y asegurar el respeto de " +
      "sus derechos fundamentales; cumplidos esos requisitos, la autorización la otorga " +
      "el representante legal, previo ejercicio del derecho del menor a ser escuchado.",
  },
  {
    id: "col-1581-transferencia",
    framework: "col-1581",
    label: "Ley 1581 Art. 26",
    title: "Transferencia internacional",
    obligation:
      "Se prohíbe transferir datos personales a países que no proporcionen niveles " +
      "adecuados de protección, salvo las excepciones del mismo artículo. Aplica cuando " +
      "el destinatario actúa como responsable (por ejemplo, usa los datos para fines " +
      "propios), no cuando los trata por cuenta de la empresa (transmisión). Cuando no " +
      "hay país adecuado ni excepción, la salida es la declaración de conformidad que " +
      "expide la Superintendencia de Industria y Comercio (parágrafo 1.º).",
  },
  {
    id: "col-1074-transmision",
    framework: "col-1581",
    label:
      "Decreto 1074/2015 Arts. 2.2.2.25.5.1 y 2.2.2.25.5.2 (Decreto 1377/2013, arts. 24 y 25)",
    title: "Transmisión a encargados: contrato de transmisión",
    obligation:
      "La transmisión internacional a un encargado no requiere informar al titular ni " +
      "su consentimiento si existe contrato de transmisión. El contrato señalará los " +
      "alcances del tratamiento, las actividades que el encargado realizará por cuenta " +
      "del responsable y las obligaciones del encargado para con el titular y el " +
      "responsable, y debe obligarlo, como mínimo, a tratar los datos a nombre del " +
      "responsable conforme a los principios de la ley, a salvaguardar la seguridad de " +
      "las bases de datos y a guardar confidencialidad.",
  },
  {
    id: "col-sic-paises",
    framework: "col-1581",
    label:
      "Circular Única SIC, Título V, Cap. 3, num. 3.2 (CE 005/2017, adicionada por las " +
      "CE 008/2017 y 002/2018)",
    title: "Países con nivel adecuado de protección",
    obligation:
      "La SIC mantiene la lista de países con nivel adecuado; Estados Unidos figura en " +
      "ella desde la Circular Externa 008 de 2017. Para transmisiones, verificar el país es una zona gris: el " +
      "decreto no lo exige, pero la SIC lo lee como exigible (Circular Externa 002 de " +
      "2025, consideraciones). Se recomienda tratarlo como exigible.",
  },
  {
    id: "col-sic-ia",
    framework: "col-1581",
    label: "Circular Externa 002/2024 SIC, num. I",
    title: "Tratamiento de datos personales en sistemas de IA",
    obligation:
      "El tratamiento con IA debe ser idóneo, necesario, razonable y proporcional. " +
      "Necesidad: que no exista otra medida más moderada en su impacto sobre los datos " +
      "personales e igual de eficaz para conseguir el objetivo.",
  },
  {
    id: "col-sic-ia-seguridad",
    framework: "col-1581",
    label: "Circular Externa 002/2024 SIC, num. VIII",
    title: "Seguridad en el desarrollo y despliegue de IA",
    obligation:
      "Para cumplir el principio de seguridad en el desarrollo y despliegue de la IA se " +
      "requiere adoptar medidas tecnológicas, humanas, administrativas, físicas, " +
      "contractuales y de cualquier otra índole para evitar el acceso indebido o no " +
      "autorizado a los datos personales, la manipulación, la destrucción o el uso " +
      "indebido de la información y su circulación a personas no autorizadas. Las " +
      "medidas de seguridad implementadas deben ser auditables por las autoridades.",
  },
  {
    id: "col-sic-ia-eip",
    framework: "col-1581",
    label: "Circular Externa 002/2024 SIC, nums. III y IV",
    title: "Gestión de riesgos y estudio de impacto de privacidad",
    obligation:
      "La identificación y clasificación de riesgos y la adopción de medidas para " +
      "mitigarlos son elementos esenciales del principio de responsabilidad demostrada. " +
      "Previo al diseño y desarrollo de la IA, cuando sea probable que entrañe un alto " +
      "riesgo de afectación a los titulares, es necesario efectuar y documentar un " +
      "estudio de impacto de privacidad que contenga, como mínimo, la descripción " +
      "detallada de las operaciones de tratamiento, la evaluación de los riesgos " +
      "específicos con su identificación y clasificación, y las medidas previstas para " +
      "evitar su materialización.",
  },
  {
    id: "col-sic-ia-publico",
    framework: "col-1581",
    label: "Circular Externa 002/2024 SIC, num. IX",
    title: "Dato accesible al público no es dato público",
    obligation:
      "La información personal accesible al público no es, por ese solo hecho, " +
      "información de naturaleza pública. Quien recolecte datos privados, semiprivados o " +
      "sensibles en internet no está legitimado para apropiarse de esa información ni " +
      "para tratarla con cualquier finalidad sin la autorización previa, expresa e " +
      "informada del titular.",
  },
  {
    id: "col-sic-ia-calidad",
    framework: "col-1581",
    label: "Circular Externa 002/2024 SIC, num. V; Ley 1581 Art. 4 lit. d",
    title: "Calidad del dato tratado con IA",
    obligation:
      "Los datos personales sujetos a tratamiento en sistemas de IA deben ser veraces, " +
      "completos, exactos, actualizados, comprobables y comprensibles. Se prohíbe el " +
      "tratamiento de datos parciales, incompletos, fraccionados o que induzcan a error.",
  },
  {
    id: "col-1377-aviso",
    framework: "col-1581",
    label:
      "Decreto 1074/2015 Arts. 2.2.2.25.3.2 y 2.2.2.25.3.3 (Decreto 1377/2013, arts. 14 y 15)",
    title: "Aviso de privacidad",
    obligation:
      "Cuando no sea posible poner a disposición la política de tratamiento, el " +
      "responsable debe informar mediante aviso de privacidad la existencia de la " +
      "política, la forma de acceder a ella y la finalidad del tratamiento. El aviso " +
      "debe contener, como mínimo, el nombre o razón social y los datos de contacto del " +
      "responsable; el tratamiento y su finalidad; los derechos del titular; y los " +
      "mecanismos para conocer la política. Cuando se recolecten datos sensibles, el " +
      "aviso debe señalar expresamente el carácter facultativo de la respuesta.",
  },
  {
    id: "col-1377-temporalidad",
    framework: "col-1581",
    label: "Decreto 1074/2015 Art. 2.2.2.25.2.8 (Decreto 1377/2013, art. 11)",
    title: "Limitaciones temporales al tratamiento",
    obligation:
      "Los datos solo pueden tratarse durante el tiempo razonable y necesario según las " +
      "finalidades que justificaron el tratamiento. Cumplidas esas finalidades, deben " +
      "suprimirse. Los responsables y encargados deberán documentar los procedimientos " +
      "para el tratamiento, conservación y supresión de los datos personales.",
  },
  {
    id: "col-1377-politicas",
    framework: "col-1581",
    label: "Decreto 1074/2015 Art. 2.2.2.25.3.1 (Decreto 1377/2013, art. 13)",
    title: "Políticas de tratamiento de la información",
    obligation:
      "La política debe constar por escrito e indicar, como mínimo: 1) el nombre o " +
      "razón social, domicilio, dirección, correo electrónico y teléfono del " +
      "responsable; 2) el tratamiento al cual serán sometidos los datos y su finalidad; " +
      "3) los derechos del titular; 4) la persona o área responsable de la atención de " +
      "peticiones, consultas y reclamos; 5) el procedimiento para que los titulares " +
      "ejerzan sus derechos; y 6) la fecha de entrada en vigencia de la política y el " +
      "período de vigencia de la base de datos. Los cambios sustanciales deben " +
      "comunicarse a los titulares antes de implementarse.",
  },
  /* ---------------- Colombia · otros regímenes ---------------- */
  {
    id: "col-1266-circulacion",
    framework: "col-1266",
    label: "Ley 1266 Art. 5",
    title: "Circulación restringida de información financiera",
    obligation:
      "La información financiera y crediticia de un banco de datos solo puede entregarse " +
      "a las personas que enumera el art. 5: el titular y quienes él autorice, los " +
      "usuarios de la información dentro de los parámetros de la ley y las autoridades " +
      "en los casos previstos. Conocer el número de documento del titular no acredita " +
      "ninguna de esas calidades.",
  },
  {
    id: "col-1266-usuarios",
    framework: "col-1266",
    label: "Ley 1266 Art. 9 num. 1",
    title: "Deberes del usuario de información financiera",
    obligation:
      "Los usuarios de la información deben guardar reserva sobre la información que les " +
      "suministren los operadores, las fuentes o los titulares, y utilizarla únicamente " +
      "para los fines para los que les fue entregada.",
  },
  {
    id: "col-1480-informacion",
    framework: "col-1480",
    label: "Ley 1480 Art. 23",
    title: "Información clara, veraz y verificable",
    obligation:
      "El proveedor debe suministrar al consumidor información clara, veraz, " +
      "suficiente, oportuna, verificable, comprensible, precisa e idónea sobre los " +
      "productos que ofrece.",
  },
  {
    id: "col-1480-ecommerce",
    framework: "col-1480",
    label: "Ley 1480 Art. 50 lit. a y b",
    title: "Identificación e información en comercio electrónico",
    obligation:
      "Los proveedores que ofrezcan productos por medios electrónicos deben informar en " +
      "todo momento, de forma cierta, fidedigna, suficiente, clara, accesible y " +
      "actualizada, su identidad —nombre o razón social, NIT, dirección de notificación " +
      "judicial, teléfono y correo— y suministrar información cierta y actualizada sobre " +
      "los productos o servicios que ofrecen.",
  },
  /* ---------------- Propiedad intelectual y licencias ---------------- */
  {
    id: "col-pi-licencias",
    framework: "col-pi",
    label: "Decisión Andina 351/1993 Arts. 4 y 23; Ley 23/1982; licencia de cada dependencia",
    title: "Licencias del software de terceros",
    obligation:
      "El software se protege como obra literaria y solo puede reproducirse, modificarse o " +
      "distribuirse en los términos de la licencia que concede su titular. Las licencias " +
      "copyleft de red (AGPL-3.0, cláusula 13) obligan a ofrecer el código fuente completo a " +
      "los usuarios que interactúan con la aplicación a través de la red, y las copyleft " +
      "fuertes (GPL) condicionan la distribución de la obra derivada.",
  },
  {
    id: "col-pi-origen",
    framework: "col-pi",
    label: "Decisión Andina 351/1993 Art. 3; términos de uso de la herramienta generadora",
    title: "Titularidad del código generado con IA",
    obligation:
      "Solo la persona natural que realiza la creación intelectual es autora; la titularidad " +
      "del código generado con herramientas de IA la fijan los términos de cada herramienta. " +
      "El responsable debe poder acreditar de quién es el código que explota y bajo qué " +
      "condiciones antes de licenciarlo, venderlo o registrarlo.",
  },
  /* ---------------- Estándares técnicos ---------------- */
  {
    id: "owasp-a01",
    framework: "owasp",
    label: "OWASP A01:2025",
    title: "Broken Access Control",
    obligation:
      "Los controles de acceso deben aplicarse en el servidor y denegar por defecto; un " +
      "recurso no debe quedar legible solo porque su dirección es conocida.",
  },
  {
    id: "owasp-a02",
    framework: "owasp",
    label: "OWASP A02:2025",
    title: "Security Misconfiguration",
    obligation:
      "Secretos y credenciales no deben publicarse en el código que se entrega al " +
      "navegador ni en la configuración expuesta al cliente.",
  },
  {
    id: "owasp-a03",
    framework: "owasp",
    label: "OWASP A03:2025",
    title: "Software Supply Chain Failures",
    obligation:
      "Las dependencias deben inventariarse y mantenerse en versiones sin " +
      "vulnerabilidades conocidas.",
  },
  {
    id: "owasp-llm01",
    framework: "owasp",
    label: "OWASP LLM01:2025",
    title: "Prompt Injection",
    obligation:
      "Entradas del usuario capaces de alterar las directrices del sistema deben " +
      "tratarse como no confiables; los permisos se aplican en el código de las " +
      "herramientas, no en las instrucciones del modelo.",
  },
  {
    id: "owasp-llm02",
    framework: "owasp",
    label: "OWASP LLM02:2025",
    title: "Sensitive Information Disclosure",
    obligation:
      "El sistema no debe revelar datos personales, credenciales ni información interna " +
      "a través de sus respuestas.",
  },
  {
    id: "owasp-llm03",
    framework: "owasp",
    label: "OWASP LLM03:2025",
    title: "Supply Chain",
    obligation:
      "Dependencias, SDK y modelos de terceros deben inventariarse y mantenerse en " +
      "versiones sin vulnerabilidades conocidas.",
  },
  {
    id: "owasp-llm06",
    framework: "owasp",
    label: "OWASP LLM06:2025",
    title: "Excessive Agency",
    obligation:
      "Un agente no debe conservar funciones, permisos ni autonomía que excedan lo que " +
      "su propósito exige: la categoría describe las acciones dañinas que el sistema " +
      "puede ejecutar en respuesta a salidas inesperadas, ambiguas o manipuladas del " +
      "modelo, y su causa es el exceso de funcionalidad, de permisos o de autonomía. Las " +
      "medidas esperadas son limitar las herramientas y sus funciones a lo " +
      "estrictamente necesario, ejecutarlas con los permisos del usuario que las " +
      "invoca, exigir aprobación humana para las acciones de alto impacto y verificar la " +
      "autorización en el sistema que recibe la acción, no en el prompt.",
  },
  {
    id: "owasp-llm07",
    framework: "owasp",
    label: "OWASP LLM07:2025",
    title: "System Prompt Leakage",
    obligation:
      "El prompt de sistema no debe contener secretos ni ser la única barrera de " +
      "control; debe asumirse que el usuario puede recuperarlo.",
  },
  {
    id: "owasp-llm09",
    framework: "owasp",
    label: "OWASP LLM09:2025",
    title: "Misinformation",
    obligation:
      "Las afirmaciones del modelo sobre hechos verificables deben apoyarse en fuentes " +
      "controladas y ser trazables hasta ellas.",
  },
  {
    id: "owasp-llm10",
    framework: "owasp",
    label: "OWASP LLM10:2025",
    title: "Unbounded Consumption",
    obligation:
      "El consumo de tokens y solicitudes debe acotarse por usuario y por sesión para " +
      "proteger la disponibilidad y el costo del servicio.",
  },
  /* ---------------- Referencia comparada (UE) ---------------- */
  {
    id: "eu-ai-act-art50",
    framework: "eu-ai-act",
    label: "AI Act Art. 50 (ref.)",
    title: "Transparencia de la interacción con IA",
    obligation:
      "Los sistemas destinados a interactuar directamente con personas físicas deben " +
      "informar que se trata de un sistema de IA, salvo que resulte evidente para una " +
      "persona razonablemente informada.",
  },
  {
    id: "gdpr-art9",
    framework: "gdpr",
    label: "RGPD Art. 9 (ref.)",
    title: "Categorías especiales de datos",
    obligation:
      "El tratamiento de datos biométricos dirigidos a identificar a una persona está " +
      "prohibido salvo que concurra una de las excepciones del apartado 2.",
  },
  {
    id: "gdpr-art22",
    framework: "gdpr",
    label: "RGPD Art. 22 (ref.)",
    title: "Decisiones individuales automatizadas",
    obligation:
      "El titular tiene derecho a no ser objeto de una decisión basada únicamente en el " +
      "tratamiento automatizado, incluida la elaboración de perfiles, que produzca " +
      "efectos jurídicos en él o le afecte significativamente de modo similar, salvo las " +
      "excepciones del apartado 2, que exigen en todo caso medidas para salvaguardar " +
      "sus derechos, entre ellas obtener intervención humana. Colombia no tiene una " +
      "regla equivalente vinculante: se cita solo como referencia comparada.",
  },
  {
    id: "gdpr-art25",
    framework: "gdpr",
    label: "RGPD Art. 25 y 5.1.c (ref.)",
    title: "Protección desde el diseño y minimización",
    obligation:
      "Aplicar medidas técnicas desde el diseño para tratar únicamente los datos " +
      "personales necesarios para cada finalidad específica.",
  },
  {
    id: "dark-consent",
    framework: "gdpr",
    label: "Directrices EDPB 03/2022 v2.0 (ref.)",
    title: "Diseño engañoso en la gestión del consentimiento",
    obligation:
      "Aceptar y revocar deben requerir un esfuerzo equivalente. Ocultar la revocación " +
      "o darle menor jerarquía visual afecta el carácter libre del consentimiento. Son " +
      "directrices sobre patrones de diseño engañoso en interfaces de plataformas de " +
      "redes sociales; fuera de ese ámbito se citan por analogía.",
  },
];

const RULE_INDEX = new Map(RULES.map((r) => [r.id, r]));

export function getRule(id: string): ComplianceRule | undefined {
  return RULE_INDEX.get(id);
}

export function getRules(ids: string[]): ComplianceRule[] {
  return ids.map(getRule).filter((r): r is ComplianceRule => Boolean(r));
}

export function getFramework(id: FrameworkId): Framework {
  return FRAMEWORKS[id];
}

export const ALL_FRAMEWORK_IDS = Object.keys(FRAMEWORKS) as FrameworkId[];
