import type { FrameworkId } from "./types";

/**
 * Paquetes normativos por sector: el campo "sector" del cliente activa marcos y
 * obligaciones propias (fintech, salud, menores, comercio…).
 *
 * El sector es texto libre (el `<select>` de /panel/nueva propone unas opciones,
 * pero el abogado puede escribir otra cosa), así que el paquete se elige por
 * palabra clave y no por igualdad exacta.
 */
export interface SectorPack {
  id: string;
  name: string;
  /** Marcos que el paquete recomienda seleccionar. */
  frameworks: FrameworkId[];
  /** Obligaciones (ids de ComplianceRule) que el paquete pone en primer plano. */
  ruleIds: string[];
  /** Por qué aplica, en lenguaje de abogado. */
  note: string;
}

/**
 * Entidades públicas y prestadores de servicios públicos. Sobre ellos recae la
 * obligación de accesibilidad del art. 14 num. 1 de la Ley 1618 de 2013 y el
 * registro de bases de datos en el RNBD; para un particular esas mismas medidas
 * son buena práctica. La accesibilidad usa esta función para fijar la severidad.
 */
const PUBLICA =
  /\bp[úu]blic[oa]s?\b|estatal|gubernament|alcald[ií]a|gobernaci[óo]n|ministerio|superintendencia|municipio|distrito|entidad territorial|rama judicial|personer[ií]a|contralor[ií]a|empresa social del estado/i;

export const isPublicEntity = (sector: string): boolean => PUBLICA.test(sector);

/* El orden decide: el primero que coincide es el que se aplica. "Sector público"
   va de primero porque una entidad pública que además vende sigue siendo entidad
   pública para efectos de accesibilidad y de RNBD. */
const PACKS: Array<{ match: RegExp; pack: SectorPack }> = [
  {
    match: PUBLICA,
    pack: {
      id: "publico",
      name: "Entidad pública o prestador de servicios públicos",
      frameworks: ["col-1581", "col-inclusion", "owasp"],
      ruleIds: ["col-inclusion-web", "col-1581-rnbd", "col-1581-seguridad", "col-1074-estructura"],
      note:
        "La accesibilidad es obligatoria para las entidades del orden nacional, departamental, " +
        "distrital y local y para las entidades públicas y privadas encargadas de la prestación " +
        "de servicios públicos (Ley 1618 de 2013, art. 14 num. 1). La Resolución 1519 de 2020 de " +
        "MinTIC exige a los sujetos obligados de la Ley 1712 de 2014, desde el 1.º de enero de " +
        "2022, cumplir como mínimo los estándares AA de las WCAG 2.1 conforme a su anexo 1 " +
        "(art. 3). La Ley 1581 de 2012 se aplica igual a las entidades públicas, y las personas " +
        "jurídicas de naturaleza pública deben inscribir sus bases de datos en el Registro " +
        "Nacional de Bases de Datos (Decreto 1074 de 2015, Capítulo 26), sin el umbral de activos " +
        "que se exige a las sociedades.",
    },
  },
  {
    match: /financ|fintech|cr[ée]dito|crediticia|banc(o|a|ari)|seguros|aseguradora|superfinanciera|libranza|cobranza/i,
    pack: {
      id: "financiero",
      name: "Financiero, fintech y seguros",
      frameworks: ["col-1581", "col-1266", "owasp"],
      ruleIds: [
        "col-1266-circulacion",
        "col-1266-usuarios",
        "col-1581-sensibles",
        "col-1581-seguridad",
        "col-sic-ia",
      ],
      note:
        "La información financiera, crediticia y comercial se rige por la Ley 1266 de 2008, " +
        "modificada y adicionada por la Ley 2157 de 2021: circulación restringida a los " +
        "legitimados del art. 5 y deber de reserva del usuario de la información (art. 9 num. 1). " +
        "La mayoría de las fintech no son entidades vigiladas por la Superintendencia Financiera; " +
        "para las que sí lo son, la Circular Externa 007 de 2018 de esa Superintendencia " +
        "complementó los requerimientos mínimos de gestión del riesgo de ciberseguridad. En todo " +
        "caso se aplica la Ley 1581 de 2012 y, si la vinculación usa biometría, el régimen " +
        "reforzado de datos sensibles (arts. 5 y 6).",
    },
  },
  {
    match: /salud|\beps\b|\bips\b|cl[ií]nic|hospital|m[ée]dic|supersalud|farmac|paciente/i,
    pack: {
      id: "salud",
      name: "Salud y prestación de servicios médicos",
      frameworks: ["col-1581", "owasp"],
      ruleIds: [
        "col-1581-sensibles",
        "col-1581-autorizacion",
        "col-1581-seguridad",
        "col-sic-ia-eip",
      ],
      note:
        "Los datos relativos a la salud son datos sensibles (Ley 1581 de 2012, art. 5) y su " +
        "tratamiento está prohibido salvo las excepciones del art. 6, entre ellas la autorización " +
        "explícita del titular, quien debe ser informado de que no está obligado a autorizarlo. " +
        "La historia clínica es un documento privado, obligatorio y sometido a reserva, que " +
        "únicamente puede ser conocido por terceros previa autorización del paciente o en los " +
        "casos previstos por la ley (Resolución 1995 de 1999 del Ministerio de Salud, art. 1 " +
        "lit. a); su interoperabilidad la regula la Ley 2015 de 2020.",
    },
  },
  {
    match: /educa|colegio|escuela|universidad|estudiante|men(or|ores)\b|ni[ñn][oa]s|academ|jard[ií]n infantil|guarder/i,
    pack: {
      id: "educacion",
      name: "Educación y tratamiento de datos de menores",
      frameworks: ["col-1581"],
      ruleIds: ["col-1581-menores", "col-1581-autorizacion", "col-1581-finalidad"],
      note:
        "El tratamiento de datos personales de niños, niñas y adolescentes está proscrito, salvo " +
        "los de naturaleza pública (Ley 1581 de 2012, art. 7). Cuando procede, debe responder y " +
        "respetar su interés superior y asegurar el respeto de sus derechos fundamentales, y la " +
        "autorización la otorga el representante legal previo ejercicio del derecho del menor a " +
        "ser escuchado (Decreto 1074 de 2015, art. 2.2.2.25.2.9, que compila el art. 12 del " +
        "Decreto 1377 de 2013). La protección integral del art. 7 de la Ley 1098 de 2006 " +
        "comprende la prevención de la amenaza o vulneración de esos derechos.",
    },
  },
  {
    match: /comercio|retail|marketplace|tienda|e-?commerce|venta|consumidor|restaurante|domicilio\b/i,
    pack: {
      id: "comercio",
      name: "Comercio electrónico y consumo",
      frameworks: ["col-1581", "col-1480", "owasp"],
      ruleIds: [
        "col-1480-informacion",
        "col-1480-ecommerce",
        "col-1480-precio",
        "col-1480-retracto",
        "col-1480-reversion",
        "col-1480-atencion",
      ],
      note:
        "Quien ofrece productos por medios electrónicos debe informar en todo momento su " +
        "identidad —nombre o razón social, NIT, dirección de notificación judicial, teléfono y " +
        "correo— (Ley 1480 de 2011, art. 50 lit. a); el precio total incluyendo todos los " +
        "impuestos, costos y gastos, los medios de pago, el tiempo de entrega y el derecho de " +
        "retracto con su procedimiento (art. 50 lit. c); y disponer, en el mismo medio, de " +
        "canales de atención con trazabilidad de las reclamaciones (art. 50 lit. g, modificado " +
        "por la Ley 2439 de 2024). El retracto se ejerce dentro de los cinco (5) días hábiles " +
        "siguientes a la entrega del bien o a la celebración del contrato de servicios (art. 47), " +
        "y la reversión del pago procede cuando el consumidor la solicita dentro de los cinco (5) " +
        "días hábiles siguientes a la noticia del hecho que la motiva (art. 51).",
    },
  },
  {
    match: /talento humano|recursos humanos|\brr\.?hh\b|reclutamiento|selecci[óo]n de personal|empleo|n[óo]mina|candidat/i,
    pack: {
      id: "talento",
      name: "Talento humano y selección de personal",
      frameworks: ["col-1581", "gdpr"],
      ruleIds: ["col-sic-ia", "col-sic-ia-calidad", "col-1581-sensibles", "gdpr-art22"],
      note:
        "Colombia no tiene una norma que regule de manera específica las decisiones " +
        "automatizadas sobre personas: el control se hace con el examen de idoneidad, necesidad, " +
        "razonabilidad y proporcionalidad de la Circular Externa 002 de 2024 de la SIC (num. I), " +
        "con el principio de calidad del dato (num. V) y con el derecho a la igualdad y la " +
        "prohibición de discriminación del art. 13 de la Constitución. El art. 22 del RGPD se " +
        "cita únicamente como referencia comparada. Los datos sensibles —salud, origen racial, " +
        "convicciones, afiliación sindical— no pueden condicionar la vinculación: ninguna " +
        "actividad puede condicionarse a que el titular los suministre (Ley 1581 de 2012, art. 6).",
    },
  },
];

/** Paquete que corresponde al texto libre del sector, o null si ninguno aplica. */
export function sectorPack(sector: string): SectorPack | null {
  return PACKS.find(({ match }) => match.test(sector))?.pack ?? null;
}
