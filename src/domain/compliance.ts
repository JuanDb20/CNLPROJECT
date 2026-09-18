import type { ComplianceRule, Framework, FrameworkId } from "./types";

/**
 * Catálogo normativo.
 *
 * Es deliberadamente *datos* y no código: incorporar un nuevo régimen (por
 * ejemplo la futura ley colombiana de IA o el AI Act de otra jurisdicción)
 * consiste en añadir entradas aquí, no en modificar el motor.
 */

export const FRAMEWORKS: Record<FrameworkId, Framework> = {
  "col-1581": {
    id: "col-1581",
    shortName: "Ley 1581",
    name: "Régimen General de Protección de Datos Personales",
    jurisdiction: "Colombia",
    kind: "juridico",
    citation: "Ley 1581 de 2012 y Decreto 1377 de 2013",
    description:
      "Autorización previa, expresa e informada del titular, principios de finalidad y " +
      "circulación restringida, y régimen reforzado para datos sensibles. Autoridad: SIC.",
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
  "eu-ai-act": {
    id: "eu-ai-act",
    shortName: "EU AI Act",
    name: "Reglamento Europeo de Inteligencia Artificial",
    jurisdiction: "Unión Europea (alcance extraterritorial)",
    kind: "juridico",
    citation: "Reglamento (UE) 2024/1689",
    description:
      "Clasificación por nivel de riesgo y obligaciones de transparencia para sistemas " +
      "que interactúan con personas. Aplica a proveedores fuera de la UE cuando el " +
      "resultado del sistema se usa en la Unión.",
  },
  gdpr: {
    id: "gdpr",
    shortName: "RGPD",
    name: "Reglamento General de Protección de Datos",
    jurisdiction: "Unión Europea",
    kind: "juridico",
    citation: "Reglamento (UE) 2016/679",
    description:
      "Transparencia, minimización, protección de datos desde el diseño y categorías " +
      "especiales de datos.",
  },
  "owasp-llm": {
    id: "owasp-llm",
    shortName: "OWASP LLM",
    name: "OWASP Top 10 for LLM Applications",
    jurisdiction: "Estándar técnico",
    kind: "tecnico",
    citation: "OWASP Top 10 for LLM Applications (2025)",
    description:
      "Taxonomía de referencia de vulnerabilidades en aplicaciones basadas en modelos " +
      "de lenguaje: inyección de prompt, fuga de información, cadena de suministro.",
  },
  "dark-patterns": {
    id: "dark-patterns",
    shortName: "Patrones oscuros",
    name: "Patrones de diseño abusivos",
    jurisdiction: "Interfaz / consumo",
    kind: "interfaz",
    citation: "EDPB Guidelines 03/2022 y Estatuto del Consumidor (Ley 1480 de 2011)",
    description:
      "Interfaces que manipulan la voluntad del usuario para obtener o retener " +
      "consentimiento. Vicia la validez de la autorización y puede constituir práctica " +
      "comercial engañosa.",
  },
};

export const RULES: ComplianceRule[] = [
  /* ---------------- Colombia ---------------- */
  {
    id: "col-1581-art9",
    framework: "col-1581",
    label: "Ley 1581 Art. 9",
    title: "Autorización previa, expresa e informada",
    obligation:
      "El tratamiento requiere autorización previa e informada del titular, que el " +
      "responsable debe conservar y poder acreditar. Un sistema que accede a datos por " +
      "fuera del alcance autorizado trata datos sin título habilitante.",
  },
  {
    id: "col-1581-art5",
    framework: "col-1581",
    label: "Ley 1581 Art. 5 y 6",
    title: "Datos sensibles",
    obligation:
      "Los datos sobre salud son datos sensibles: su tratamiento está prohibido salvo " +
      "autorización explícita y no puede condicionarse su entrega. Exige medidas " +
      "reforzadas de seguridad y acceso.",
  },
  {
    id: "col-1581-art4",
    framework: "col-1581",
    label: "Ley 1581 Art. 4 lit. b y d",
    title: "Principios de finalidad y acceso restringido",
    obligation:
      "El tratamiento debe obedecer a una finalidad legítima informada al titular, y el " +
      "acceso queda restringido a quien esté autorizado. Un asistente que amplía por sí " +
      "mismo el conjunto de datos consultables desborda la finalidad.",
  },
  {
    id: "col-1377-art10",
    framework: "col-1581",
    label: "Decreto 1377 Art. 10",
    title: "Aviso de privacidad",
    obligation:
      "Cuando no sea posible poner a disposición la política de tratamiento, el " +
      "responsable debe informar mediante aviso de privacidad la finalidad y los " +
      "mecanismos para conocer la política y ejercer derechos.",
  },
  {
    id: "col-1266-art4",
    framework: "col-1266",
    label: "Ley 1266 Art. 4 y 8",
    title: "Circulación restringida de información financiera",
    obligation:
      "La información financiera y crediticia solo puede entregarse a usuarios con " +
      "interés legítimo y finalidad autorizada. El titular tiene derecho a conocer la " +
      "información y a que se rectifique.",
  },
  /* ---------------- Unión Europea ---------------- */
  {
    id: "eu-ai-act-art50",
    framework: "eu-ai-act",
    label: "EU AI Act Art. 50",
    title: "Transparencia de la interacción con IA",
    obligation:
      "Los sistemas destinados a interactuar directamente con personas físicas deben " +
      "diseñarse de modo que la persona sea informada de que interactúa con un sistema " +
      "de IA, salvo que resulte evidente para una persona razonablemente informada.",
  },
  {
    id: "eu-ai-act-art9",
    framework: "eu-ai-act",
    label: "EU AI Act Art. 9",
    title: "Sistema de gestión de riesgos",
    obligation:
      "Los sistemas de alto riesgo exigen un sistema de gestión de riesgos documentado, " +
      "iterativo y sometido a pruebas durante todo el ciclo de vida.",
  },
  {
    id: "gdpr-art12",
    framework: "gdpr",
    label: "RGPD Art. 12 y 13",
    title: "Información transparente al interesado",
    obligation:
      "La información sobre el tratamiento debe facilitarse en forma concisa, " +
      "transparente, inteligible y de fácil acceso. El consentimiento obtenido sin esa " +
      "información no es válido.",
  },
  {
    id: "gdpr-art9",
    framework: "gdpr",
    label: "RGPD Art. 9",
    title: "Categorías especiales de datos",
    obligation:
      "El tratamiento de datos relativos a la salud está prohibido salvo que concurra " +
      "una de las excepciones del apartado 2, entre ellas el consentimiento explícito.",
  },
  {
    id: "gdpr-art25",
    framework: "gdpr",
    label: "RGPD Art. 25 y 5.1.c",
    title: "Protección desde el diseño y minimización",
    obligation:
      "El responsable aplica medidas técnicas desde el diseño para tratar únicamente los " +
      "datos personales necesarios para cada finalidad específica.",
  },
  /* ---------------- Estándares técnicos ---------------- */
  {
    id: "owasp-llm01",
    framework: "owasp-llm",
    label: "OWASP LLM01",
    title: "Prompt Injection",
    obligation:
      "Entradas del usuario capaces de alterar las directrices del sistema deben " +
      "sanitizarse y el modelo debe mantener sus restricciones bajo entrada adversarial.",
  },
  {
    id: "owasp-llm02",
    framework: "owasp-llm",
    label: "OWASP LLM02",
    title: "Sensitive Information Disclosure",
    obligation:
      "El sistema no debe revelar datos personales, credenciales ni información interna " +
      "a través de sus respuestas.",
  },
  {
    id: "owasp-llm03",
    framework: "owasp-llm",
    label: "OWASP LLM03",
    title: "Supply Chain",
    obligation:
      "Dependencias, SDK y modelos de terceros deben inventariarse y mantenerse en " +
      "versiones sin vulnerabilidades conocidas.",
  },
  {
    id: "owasp-llm07",
    framework: "owasp-llm",
    label: "OWASP LLM07",
    title: "System Prompt Leakage",
    obligation:
      "El prompt de sistema y las directrices internas no deben ser recuperables por el " +
      "usuario final.",
  },
  {
    id: "dark-consent",
    framework: "dark-patterns",
    label: "EDPB 03/2022 §3",
    title: "Consentimiento sin patrones oscuros",
    obligation:
      "Aceptar y rechazar deben requerir un esfuerzo equivalente. Ocultar la revocación " +
      "o darle menor jerarquía visual vicia el carácter libre del consentimiento.",
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
