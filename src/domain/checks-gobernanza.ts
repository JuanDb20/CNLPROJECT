import type { RepoFile } from "./types";

import { type Check, PROMPT, TOOLS, edit, grep, lacking } from "./check-kit";

/** Gobernanza del sistema de IA: supervisión humana, control del prompt, límites declarados. */

/** Datos de ejemplo: no son el sistema de IA del cliente, son material de prueba. */
const FIXTURE = /example|ejemplo|fixture|mock|seed|sample/i;

/** Archivos donde vive el sistema de IA: sus instrucciones o sus herramientas. */
const SISTEMA = (f: RepoFile) =>
  !FIXTURE.test(f.path) &&
  (PROMPT.test(f.path) || TOOLS.test(f.path) || /agent|asistente|assistant|chatbot/i.test(f.path));

/** Cualquier vía de atención humana: escalamiento, asesor o traspaso de la conversación. */
const HUMANO =
  /humano|asesor|escalar|escalamiento|hand-?off|transferir a|agente en l[ií]nea|atenci[oó]n personalizada/i;

/**
 * Quién responde por el sistema, declarado en la documentación. Se exige una
 * persona o un área: "X S.A.S. es responsable del tratamiento" identifica a la
 * empresa, no a quien dentro de ella responde por el sistema ni atiende al titular.
 */
const RESPONSABLE =
  /responsable del sistema|responsable de la atenci[oó]n|persona o [áa]rea responsable|[áa]rea responsable|oficial de (protecci[oó]n|privacidad|cumplimiento)|delegado de protecci[oó]n|code\s?owners?/i;
const DOC = /\.(md|mdx|txt|html)$|CODEOWNERS/i;

/** El archivo que mejor representa al sistema: el prompt si existe, si no el primero. */
const foco = (sistema: RepoFile[]) => {
  const prompt = sistema.filter((f) => PROMPT.test(f.path));
  return (prompt.length ? prompt : sistema).slice(0, 1);
};

export const CHECKS_GOBERNANZA: Check[] = [
  {
    code: "VGI-095",
    module: "prompt-injection",
    severity: "informativo",
    title: "Instrucciones del sistema sin versión ni histórico de cambios",
    summary:
      "El prompt que gobierna el asistente se edita sin número de versión y el " +
      "repositorio no conserva un histórico de sus cambios.",
    legalAnalysis:
      "El prompt es la instrucción que determina qué hace el sistema con los datos " +
      "personales: cambiarlo cambia el tratamiento. La Circular Externa 002 de 2024 de la " +
      "SIC exige identificar y clasificar los riesgos y documentar las medidas adoptadas " +
      "para mitigarlos como elementos esenciales del principio de responsabilidad " +
      "demostrada (nums. III y IV), y que las medidas de seguridad implementadas sean " +
      "auditables por las autoridades (num. VIII). Sin versión ni histórico, {cliente} no " +
      "puede acreditar ante la Superintendencia qué instrucción regía el día de un " +
      "incidente, ni demostrar, como le exige el art. 2.2.2.25.6.1 del Decreto 1074 de " +
      "2015, que implementó medidas apropiadas y efectivas: la prueba de la diligencia se " +
      "construye antes del incidente, no después.",
    ruleIds: ["col-sic-ia-eip", "col-sic-ia-seguridad", "col-1074-demostracion"],
    probe:
      "Búsqueda de la definición del prompt del sistema en archivos que no llevan número " +
      "de versión, en repositorios sin archivo de histórico de cambios.",
    detect: ({ files }) =>
      files.some((f) => /change\s?log|historial de cambios/i.test(f.path))
        ? []
        : grep(
            files.filter(
              (f) => !FIXTURE.test(f.path) && !/versi[oó]n|version|changelog/i.test(f.content),
            ),
            /\.(ts|tsx|js|jsx|mjs|py|md|txt|json)$/i,
            /(system_?prompt)\s*[:=]|prompt\s*[:=]\s*`/i,
          ),
    patch: edit(
      "config",
      [
        '// Versión de las instrucciones del sistema. Cada cambio sube la versión y queda',
        "// registrado en CHANGELOG.md con fecha, autor y motivo.",
        'export const PROMPT_VERSION = "1.0.0";',
        "$linea",
      ],
      "Cada respuesta del asistente queda atada a una versión identificable del prompt, y " +
        "{cliente} puede demostrar qué instrucción regía en cada fecha.",
    ),
    branch: "vigia-patch/prompt-version",
    changeNote:
      "Constante de versión junto al prompt y archivo de histórico. No cambia el texto del prompt.",
    retests: [
      "El prompt en uso declara su versión",
      "El histórico registra fecha, autor y motivo de cada cambio",
    ],
  },
  {
    code: "VGI-096",
    module: "transparency",
    severity: "advertencia",
    title: "El asistente no ofrece salida hacia una persona",
    summary:
      "Ni las instrucciones ni las herramientas del asistente contemplan escalar la " +
      "conversación a una persona cuando el usuario lo pide o el caso lo excede.",
    legalAnalysis:
      "El consumidor tiene derecho a información y a atención sobre el servicio que " +
      "recibe, que debe ser clara, veraz, suficiente, oportuna, verificable, comprensible, " +
      "precisa e idónea (art. 23 de la Ley 1480 de 2011). Si {cliente} ofrece productos " +
      "por medios electrónicos, el art. 50 lit. g —modificado por la Ley 2439 de 2024— le " +
      "exige disponer, en el mismo medio, de canales de fácil acceso y de atención que " +
      "garanticen la orientación y la asistencia al consumidor y la trazabilidad de sus " +
      "reclamaciones, con número de radicado y mecanismo de seguimiento: un asistente que " +
      "no puede entregar el caso a una persona no satisface ese deber. La Circular Externa " +
      "002 de 2024 de la SIC exige además que el tratamiento con IA sea idóneo, necesario, " +
      "razonable y proporcional (num. I). Como referencia comparada, el art. 50 del AI Act " +
      "europeo impone informar que se interactúa con un sistema de IA, y el proyecto de " +
      "ley 025 de 2026 Cámara, en trámite, propone exigir supervisión humana.",
    ruleIds: ["col-1480-informacion", "col-1480-atencion", "col-sic-ia", "eu-ai-act-art50"],
    probe:
      "Búsqueda en las instrucciones y herramientas del asistente, y en el resto del " +
      "repositorio, de cualquier vía de escalamiento a una persona.",
    detect: ({ files }) => {
      const sistema = files.filter(SISTEMA);
      if (sistema.length === 0 || files.some((f) => HUMANO.test(f.content))) return [];
      return lacking(foco(sistema), /./, HUMANO);
    },
    patch: edit(
      "prompt",
      [
        "$linea",
        '"Si el usuario pide hablar con una persona, muestra inconformidad o plantea un caso',
        " que excede estas instrucciones, no insistas: ofrécele de inmediato la atención de un",
        " asesor humano por <canal>, registra la solicitud con un número de radicado y dile",
        ' cuándo lo contactarán."',
        "// Además, exponer al agente la herramienta escalarAHumano(motivo, contacto).",
      ],
      "El usuario puede salir del asistente hacia una persona y su reclamación queda " +
        "registrada y rastreable, que es lo que exige el art. 50 lit. g de la Ley 1480.",
    ),
    branch: "vigia-patch/escalamiento-humano",
    changeNote:
      "Directriz de escalamiento y herramienta de traspaso. No cambia las demás herramientas.",
    retests: [
      'La solicitud "quiero hablar con una persona" produce el traspaso',
      "El traspaso genera un número de radicado consultable por el usuario",
    ],
  },
  {
    code: "VGI-097",
    module: "transparency",
    severity: "informativo",
    title: "Sistema de IA sin responsable humano declarado",
    summary:
      "La documentación del repositorio no dice quién responde por el sistema de IA ni a " +
      "qué área se dirigen las peticiones, consultas y reclamos.",
    legalAnalysis:
      "Las políticas internas del responsable deben garantizar una estructura " +
      "administrativa proporcional a su estructura y tamaño empresarial para adoptar e " +
      "implementar las políticas de tratamiento, y procesos para la atención y respuesta a " +
      "consultas, peticiones y reclamos de los titulares (Decreto 1074 de 2015, art. " +
      "2.2.2.25.6.2, que compila el art. 27 del Decreto 1377 de 2013). La política de " +
      "tratamiento debe indicar, además, la persona o área responsable de atenderlos (art. " +
      "2.2.2.25.3.1). Un sistema de IA sin dueño declarado deja esas obligaciones sin " +
      "titular dentro de {cliente}: nadie autoriza los cambios del modelo, nadie responde " +
      "el requerimiento de la Superintendencia y nadie atiende al titular que reclama.",
    ruleIds: ["col-1074-estructura", "col-1377-politicas", "col-1074-demostracion"],
    probe:
      "Búsqueda en la documentación del repositorio de la persona o área responsable del " +
      "sistema, del tratamiento o de la atención de peticiones, consultas y reclamos.",
    detect: ({ files }) => {
      const sistema = files.filter(SISTEMA);
      if (sistema.length === 0) return [];
      const declarado = files.some((f) => DOC.test(f.path) && RESPONSABLE.test(f.content));
      return declarado ? [] : grep(foco(sistema), /./, /\S/).slice(0, 1);
    },
    patch: () => ({
      kind: "documento",
      target: "docs/gobernanza.md",
      removed: [],
      added: [
        "# Gobernanza del sistema de IA de {cliente}",
        "",
        "Responsable del sistema: <nombre y cargo>. Aprueba los cambios del prompt, del",
        "modelo y de las herramientas, y responde por ellos ante la dirección.",
        "",
        "Área responsable de la atención de peticiones, consultas y reclamos de los titulares:",
        "<área>, <correo>, <teléfono>. Plazos: diez (10) días hábiles para la consulta y",
        "quince (15) días hábiles para el reclamo, prorrogables en los términos de los arts.",
        "14 y 15 de la Ley 1581 de 2012.",
        "",
        "Límites declarados del sistema: qué no hace, qué decisiones no toma sin persona y",
        "qué datos no trata.",
      ],
      expectedImpact:
        "El sistema queda con dueño identificable y el titular con un área a la cual " +
        "dirigirse, que es lo que exigen los arts. 2.2.2.25.6.2 y 2.2.2.25.3.1 del Decreto " +
        "1074 de 2015.",
    }),
    branch: "vigia-patch/gobernanza-responsable",
    changeNote: "Documento nuevo. No modifica código ni instrucciones del asistente.",
    retests: [
      "La documentación identifica al responsable del sistema",
      "El área de atención de consultas y reclamos aparece con canal y plazos",
    ],
  },
];
