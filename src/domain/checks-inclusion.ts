import type { RepoFile } from "./types";

import type { Check, Ctx, Hit } from "./check-kit";
import { isPublicEntity } from "./sectores";

/** Accesibilidad e inclusión de la aplicación auditada. */

/** Archivos de interfaz: solo ellos tienen marcado que el lector de pantalla recorre. */
const UI = /\.(tsx|jsx|html|vue|svelte)$/i;

/**
 * Busca una etiqueta de apertura a la que le falta un atributo. Mira la línea de
 * la etiqueta y las dos siguientes, porque en JSX los atributos se reparten en
 * varias líneas, y hasta seis anteriores para reconocer un `<label>` que envuelve
 * el campo (el texto de la etiqueta puede ocupar varias líneas): cuenta como
 * envuelto si el último marcador de label antes del campo no es un cierre.
 * Es una heurística de texto: no construye el árbol de accesibilidad.
 */
const tagSin = (files: RepoFile[], abre: RegExp, atributo: RegExp, envuelve?: RegExp): Hit[] =>
  files
    .filter((f) => UI.test(f.path))
    .flatMap((f) => {
      const lines = f.content.split(/\r?\n/);
      return lines.flatMap((text, i) => {
        if (!abre.test(text)) return [];
        /* La etiqueta va desde donde abre hasta su primer ">", aunque cruce de
           línea; sin ese corte, los atributos de la etiqueta siguiente contarían
           como propios. */
        const ventana = lines.slice(i, i + 3).join(" ").slice(text.search(abre));
        const cierra = ventana.indexOf(">");
        const etiqueta = cierra < 0 ? ventana : ventana.slice(0, cierra + 1);
        const anterior = lines.slice(Math.max(0, i - 6), i).join(" ");
        const marcas = envuelve ? [...anterior.matchAll(new RegExp(envuelve.source, "gi"))] : [];
        const envuelto = marcas.length > 0 && !marcas[marcas.length - 1][0].startsWith("</");
        return atributo.test(etiqueta) || envuelto
          ? []
          : [{ path: f.path, line: i + 1, text: text.trim() }];
      });
    });

/** Reemplaza la etiqueta encontrada por la misma con el atributo que le faltaba. */
const anadeAtributo = (abre: RegExp, atributo: string, expectedImpact: string) => (hits: Hit[]) => ({
  kind: "interfaz" as const,
  target: hits[0].path,
  removed: [hits[0].text],
  added: [hits[0].text.replace(abre, `$& ${atributo}`)],
  expectedImpact,
});

const ANALISIS_BASE =
  "La accesibilidad de la interfaz es exigible a las entidades del orden nacional, " +
  "departamental, distrital y local y a las entidades públicas y privadas encargadas de la " +
  "prestación de servicios públicos, que deben desarrollar sus actividades siguiendo los " +
  "postulados del diseño universal, de manera que no se excluya ni se limite el acceso de " +
  "ninguna persona en razón de su discapacidad (art. 14 num. 1 de la Ley 1618 de 2013). A los " +
  "sujetos obligados de la Ley 1712 de 2014 la Resolución 1519 de 2020 de MinTIC les exige, " +
  "desde el 1.º de enero de 2022, cumplir como mínimo los estándares AA de las WCAG 2.1 " +
  "conforme a su anexo 1 (art. 3). Para un responsable privado no es una obligación " +
  "reglamentaria, pero una barrera que deja por fuera a una persona con discapacidad puede " +
  "fundar un reclamo por trato discriminatorio (art. 13 de la Constitución) y se corrige con " +
  "un atributo.";

/*
 * `Check.severity` es estático —runChecks lo copia tal cual al hallazgo—, así que
 * la severidad no puede depender del cliente dentro de una misma prueba. Cada
 * regla se publica en dos versiones excluyentes: la del sujeto obligado
 * (advertencia) y la del responsable privado (informativo). Solo una de las dos
 * puede disparar, porque cada `detect` consulta el sector del cliente.
 */
const porSector = (
  base: Omit<Check, "code" | "severity">,
  codigoObligado: string,
  codigoPrivado: string,
): Check[] => [
  {
    ...base,
    code: codigoObligado,
    severity: "advertencia",
    legalAnalysis:
      `${base.legalAnalysis} Por el sector declarado, {cliente} está entre las entidades ` +
      "obligadas: corregirlo no es discrecional.",
    detect: (ctx: Ctx) => (isPublicEntity(ctx.client.sector) ? base.detect(ctx) : []),
  },
  {
    ...base,
    code: codigoPrivado,
    severity: "informativo",
    legalAnalysis:
      `${base.legalAnalysis} Por el sector declarado, {cliente} no es sujeto obligado de la ` +
      "Resolución 1519 de 2020: el hallazgo se reporta como recomendación, no como incumplimiento.",
    detect: (ctx: Ctx) => (isPublicEntity(ctx.client.sector) ? [] : base.detect(ctx)),
  },
];

export const CHECKS_INCLUSION: Check[] = [
  ...porSector(
    {
      module: "consent-ux",
      title: "Imágenes sin texto alternativo",
      summary:
        "Hay imágenes en la interfaz sin atributo alt: quien usa lector de pantalla no " +
        "sabe qué muestran.",
      legalAnalysis: ANALISIS_BASE,
      ruleIds: ["col-inclusion-web", "col-inclusion-igualdad"],
      probe:
        "Búsqueda en los archivos de interfaz de etiquetas <img> sin atributo alt en la " +
        "propia etiqueta ni en sus dos líneas siguientes.",
      detect: ({ files }: Ctx) => tagSin(files, /<img\b/i, /\balt\s*=/i),
      patch: anadeAtributo(
        /<img\b/i,
        'alt="Descripción de la imagen"',
        "El lector de pantalla anuncia qué muestra la imagen; si es decorativa, alt=\"\" la " +
          "omite deliberadamente.",
      ),
      branch: "vigia-patch/img-alt",
      changeNote: "Atributo alt en la imagen. No cambia el diseño ni el comportamiento.",
      retests: ["Cada imagen informativa anuncia su contenido en el lector de pantalla"],
    },
    "VGI-098",
    "VGI-099",
  ),
  ...porSector(
    {
      module: "consent-ux",
      title: "Campos de formulario sin etiqueta accesible",
      summary:
        "Hay campos de entrada sin etiqueta, sin aria-label y sin texto asociado: el " +
        "lector de pantalla los anuncia sin decir qué se pide.",
      legalAnalysis:
        `${ANALISIS_BASE} El campo sin etiqueta pesa más que el resto: si el formulario ` +
        "es el que recoge la autorización de tratamiento, quien no puede leer qué se le " +
        "pregunta tampoco está dando una autorización informada (art. 9 de la Ley 1581 de 2012).",
      ruleIds: ["col-inclusion-web", "col-inclusion-igualdad", "col-1581-autorizacion"],
      probe:
        "Búsqueda en los archivos de interfaz de campos <input>, <select> y <textarea> sin " +
        "aria-label, aria-labelledby, placeholder ni un <label> que los envuelva.",
      detect: ({ files }: Ctx) =>
        tagSin(
          files,
          /<(input|select|textarea)\b/i,
          /aria-label|aria-labelledby|placeholder\s*=|\btitle\s*=|type\s*=\s*["'{]?\s*(hidden|submit|button)/i,
          /<label|htmlFor|<\/label>/i,
        ),
      patch: anadeAtributo(
        /<(input|select|textarea)\b/i,
        'aria-label="Nombre del campo"',
        "El campo se anuncia con su nombre; si ya existe un <label>, asociarlo con htmlFor " +
          "es preferible al atributo.",
      ),
      branch: "vigia-patch/campo-etiqueta",
      changeNote: "Atributo aria-label en el campo. No cambia la validación ni el envío.",
      retests: ["Cada campo del formulario se anuncia con el dato que pide"],
    },
    "VGI-100",
    "VGI-101",
  ),
  ...porSector(
    {
      module: "consent-ux",
      title: "Documento sin idioma declarado",
      summary:
        "La etiqueta <html> no declara el idioma: el lector de pantalla puede leer el " +
        "español con pronunciación de otro idioma.",
      legalAnalysis:
        `${ANALISIS_BASE} Declarar el idioma es además la condición para que el texto en ` +
        "castellano que exige el art. 23 de la Ley 1480 de 2011 llegue legible a quien usa " +
        "lector de pantalla.",
      ruleIds: ["col-inclusion-web", "col-inclusion-igualdad"],
      probe:
        "Búsqueda de la etiqueta <html> de la aplicación sin atributo lang en la etiqueta " +
        "ni en sus dos líneas siguientes.",
      detect: ({ files }: Ctx) => tagSin(files, /<html\b/i, /\blang\s*=/i),
      patch: anadeAtributo(
        /<html\b/i,
        'lang="es"',
        "El documento declara su idioma y el lector de pantalla lo pronuncia en castellano.",
      ),
      branch: "vigia-patch/html-lang",
      changeNote: "Atributo lang en la etiqueta html. Sin efecto visual.",
      retests: ["El documento declara lang=\"es\" y el lector lo pronuncia en castellano"],
    },
    "VGI-102",
    "VGI-103",
  ),
];
