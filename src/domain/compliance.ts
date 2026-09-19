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
      "Circular Única SIC, Título V; Circular Externa 002 de 2024 SIC",
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
    citation: "Ley 1266 de 2008",
    description:
      "Régimen especial para información financiera, crediticia y comercial. Relevante " +
      "para cualquier asistente de IA que opere sobre historial de pagos o scoring.",
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
      "verificable. Se aplica a lo que el asistente afirma sobre sí mismo y sobre el " +
      "producto.",
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
      "se usa en la Unión (art. 2). Su calendario de aplicación se modificó en 2026: " +
      "verificar la fecha vigente antes de citarlo.",
  },
  gdpr: {
    id: "gdpr",
    shortName: "RGPD (ref.)",
    name: "Reglamento General de Protección de Datos",
    jurisdiction: "Unión Europea · referencia comparada",
    kind: "comparado",
    citation: "Reglamento (UE) 2016/679 y Directrices EDPB 03/2022",
    description:
      "Referencia comparada. Solo sería exigible si la empresa ofrece bienes o " +
      "servicios a personas en la Unión o monitorea su comportamiento (art. 3.2).",
  },
};

export const RULES: ComplianceRule[] = [
  /* ---------------- Colombia · Ley 1581 y reglamentación ---------------- */
  {
    id: "col-1581-seguridad",
    framework: "col-1581",
    label: "Ley 1581 Art. 4 lit. g y Art. 17 lit. d",
    title: "Principio y deber de seguridad",
    obligation:
      "La información debe manejarse con las medidas técnicas, humanas y " +
      "administrativas necesarias para otorgar seguridad a los registros, evitando su " +
      "adulteración, pérdida, consulta, uso o acceso no autorizado o fraudulento. El " +
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
    label: "Ley 1581 Arts. 5 y 6",
    title: "Datos sensibles",
    obligation:
      "Los datos biométricos son datos sensibles (art. 5). Su tratamiento está " +
      "prohibido salvo las excepciones del art. 6, entre ellas la autorización " +
      "explícita del titular, y exige medidas reforzadas de seguridad y acceso.",
  },
  {
    id: "col-1581-autorizacion",
    framework: "col-1581",
    label: "Ley 1581 Art. 9",
    title: "Autorización previa e informada",
    obligation:
      "El tratamiento requiere autorización previa e informada del titular, que el " +
      "responsable debe conservar y poder acreditar. Un sistema que accede a datos por " +
      "fuera del alcance autorizado trata datos sin título habilitante.",
  },
  {
    id: "col-1581-finalidad",
    framework: "col-1581",
    label: "Ley 1581 Art. 4 lit. b",
    title: "Principio de finalidad",
    obligation:
      "El tratamiento debe obedecer a una finalidad legítima, informada al titular. " +
      "Usar un dato para algo distinto de lo autorizado, o ampliar por cuenta propia el " +
      "conjunto de datos tratados, desborda la finalidad.",
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
    id: "col-1581-derechos",
    framework: "col-1581",
    label: "Ley 1581 Arts. 8, 14 y 15",
    title: "Derechos del titular, consultas y reclamos",
    obligation:
      "El titular puede conocer, actualizar, rectificar y pedir la supresión de sus " +
      "datos, y revocar la autorización (art. 8). El responsable debe tramitar sus " +
      "consultas (art. 14) y reclamos (art. 15) por canales habilitados.",
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
      "propios), no cuando los trata por cuenta de la empresa (transmisión).",
  },
  {
    id: "col-1074-transmision",
    framework: "col-1581",
    label: "Decreto 1074/2015 Arts. 2.2.2.25.5.1 y 2.2.2.25.5.2",
    title: "Transmisión a encargados: contrato de transmisión",
    obligation:
      "La transmisión internacional a un encargado no requiere informar al titular ni " +
      "su consentimiento si existe contrato de transmisión. El contrato debe obligar al " +
      "encargado, como mínimo, a tratar los datos a nombre del responsable conforme a " +
      "los principios de la ley, a salvaguardar la seguridad de las bases de datos y a " +
      "guardar confidencialidad.",
  },
  {
    id: "col-sic-paises",
    framework: "col-1581",
    label: "Circular Única SIC Título V, num. 3.2 (CE 008/2017)",
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
    id: "col-1377-aviso",
    framework: "col-1581",
    label: "Decreto 1377/2013 Arts. 14 y 15 (hoy Decreto 1074/2015)",
    title: "Aviso de privacidad",
    obligation:
      "Cuando no sea posible poner a disposición la política de tratamiento, el " +
      "responsable debe informar mediante aviso de privacidad la existencia de la " +
      "política, la forma de acceder a ella y la finalidad del tratamiento.",
  },
  {
    id: "col-1377-temporalidad",
    framework: "col-1581",
    label: "Decreto 1377/2013 Art. 11 (hoy Decreto 1074/2015)",
    title: "Limitaciones temporales al tratamiento",
    obligation:
      "Los datos solo pueden tratarse durante el tiempo razonable y necesario según las " +
      "finalidades que justificaron el tratamiento. Cumplidas esas finalidades, deben " +
      "suprimirse.",
  },
  {
    id: "col-1377-politicas",
    framework: "col-1581",
    label: "Decreto 1377/2013 Art. 13 (hoy Decreto 1074/2015)",
    title: "Políticas de tratamiento de la información",
    obligation:
      "La política debe indicar, entre otros, su fecha de entrada en vigencia. Los " +
      "cambios sustanciales deben comunicarse a los titulares antes de implementarse.",
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
    id: "col-1480-informacion",
    framework: "col-1480",
    label: "Ley 1480 Art. 23",
    title: "Información clara, veraz y verificable",
    obligation:
      "El proveedor debe suministrar al consumidor información clara, veraz, " +
      "suficiente, oportuna, verificable, comprensible, precisa e idónea sobre los " +
      "productos que ofrece.",
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
    label: "OWASP LLM01",
    title: "Prompt Injection",
    obligation:
      "Entradas del usuario capaces de alterar las directrices del sistema deben " +
      "tratarse como no confiables; los permisos se aplican en el código de las " +
      "herramientas, no en las instrucciones del modelo.",
  },
  {
    id: "owasp-llm02",
    framework: "owasp",
    label: "OWASP LLM02",
    title: "Sensitive Information Disclosure",
    obligation:
      "El sistema no debe revelar datos personales, credenciales ni información interna " +
      "a través de sus respuestas.",
  },
  {
    id: "owasp-llm03",
    framework: "owasp",
    label: "OWASP LLM03",
    title: "Supply Chain",
    obligation:
      "Dependencias, SDK y modelos de terceros deben inventariarse y mantenerse en " +
      "versiones sin vulnerabilidades conocidas.",
  },
  {
    id: "owasp-llm07",
    framework: "owasp",
    label: "OWASP LLM07",
    title: "System Prompt Leakage",
    obligation:
      "El prompt de sistema no debe contener secretos ni ser la única barrera de " +
      "control; debe asumirse que el usuario puede recuperarlo.",
  },
  {
    id: "owasp-llm09",
    framework: "owasp",
    label: "OWASP LLM09",
    title: "Misinformation",
    obligation:
      "Las afirmaciones del modelo sobre hechos verificables deben apoyarse en fuentes " +
      "controladas y ser trazables hasta ellas.",
  },
  {
    id: "owasp-llm10",
    framework: "owasp",
    label: "OWASP LLM10",
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
    label: "EDPB 03/2022 (ref.)",
    title: "Diseño engañoso en la gestión del consentimiento",
    obligation:
      "Aceptar y revocar deben requerir un esfuerzo equivalente. Ocultar la revocación " +
      "o darle menor jerarquía visual afecta el carácter libre del consentimiento.",
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
