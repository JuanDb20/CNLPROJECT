import type { RepoFile } from "./types";
import { type Check, type Hit, grep } from "./check-kit";
import { HERRAMIENTAS_IA } from "./herramientas-ia";

/** Licencias de las dependencias y origen del código generado con IA. */

/* Copyleft de red o fuerte. \bGPL-?[23] no coincide dentro de "LGPL": el límite de
   palabra exige que el carácter anterior no sea alfanumérico, y en LGPL lo es. */
const COPYLEFT = /\bAGPL|\bGPL-?[23]|SSPL|EUPL|OSL-3|CC-BY-(NC|SA)/i;
const UNDECLARED = /sin declarar|UNLICENSED|SEE LICENSE/i;

/** `ctx.licenses` trae "<paquete>@<versión>: <licencia>"; toma el nombre del paquete. */
const pkgName = (text: string) => /^(.+)@[^@]+:\s/.exec(text)?.[1] ?? text;
const license = (text: string) => text.split(/:\s/).slice(1).join(": ");

/** Un doc de licencias ya presente y que nombra cada paquete afectado cierra el hallazgo. */
function coveredByDoc(files: RepoFile[], hits: Hit[]): boolean {
  const doc = files.find((f) => /(^|\/)docs\/licencias\.md$/i.test(f.path));
  return !!doc && hits.every((h) => doc.content.includes(pkgName(h.text)));
}

function licenciasPatch(hits: Hit[], opciones: string[]) {
  return {
    kind: "dependencia" as const,
    target: "docs/licencias.md",
    removed: [],
    added: [
      "# Licencias de dependencias",
      "",
      "| Dependencia | Licencia | Opciones | Decisión |",
      "| --- | --- | --- | --- |",
      ...hits.map((h) => `| ${pkgName(h.text)} | ${license(h.text)} | ${opciones.join(" · ")} | pendiente |`),
    ],
    expectedImpact:
      "Deja registrada la decisión jurídica sobre cada dependencia señalada. Mientras el " +
      "documento no la nombre, el hallazgo se mantiene abierto.",
  };
}

/* Estos dos archivos son los únicos de VIGÍA que citan los marcadores como texto (para
   definirlos): se excluyen de su propia búsqueda para no detectarse a sí mismos. */
const SELF = /(^|\/)src\/domain\/(herramientas-ia|checks-licencias)\.ts$/;

/** Evidencia de una herramienta: la línea que la delata, o la ruta si el marcador es de archivo. */
function toolEvidence(files: RepoFile[], marker: RegExp): Hit[] {
  const candidates = files.filter((f) => !SELF.test(f.path));
  const enContenido = grep(candidates, /./, marker);
  const enRuta = candidates
    .filter((f) => marker.test(f.path) && !enContenido.some((h) => h.path === f.path))
    .map((f) => ({ path: f.path, line: 1, text: f.path }));
  return [...enContenido, ...enRuta];
}

const matchedTools = (files: RepoFile[]) =>
  HERRAMIENTAS_IA.filter((h) => toolEvidence(files, h.marker).length > 0);

export const CHECKS_LICENCIAS: Check[] = [
  {
    code: "VGI-110",
    module: "static-scan",
    severity: "advertencia",
    title: "Dependencia con licencia copyleft en un servicio en línea",
    summary:
      "Una dependencia de ejecución está licenciada bajo una copyleft de red (AGPL, " +
      "SSPL) o fuerte (GPL-2/3, EUPL, OSL-3, CC-BY-NC/SA), según el registro de npm.",
    legalAnalysis:
      "El software se protege como obra literaria y solo puede reproducirse, " +
      "modificarse o distribuirse en los términos de la licencia de su titular " +
      "(Decisión Andina 351 de 1993, arts. 4 y 23; Ley 23 de 1982). La AGPL-3.0 " +
      "(cláusula 13) es una copyleft de red: si el servicio que la usa se ofrece por " +
      "internet, obliga a poner el código fuente completo a disposición de quien " +
      "interactúa con él, aunque nunca se distribuya el binario. La GPL no exige eso " +
      "para un servicio en línea, pero condiciona la distribución de cualquier obra " +
      "derivada a licenciarla también bajo GPL. Operar el servicio sin haber decidido " +
      "cuál de las tres salidas —publicar el código propio bajo la misma licencia, " +
      "sustituir la dependencia o conseguir una licencia comercial— dejaría a " +
      "{cliente} incumpliendo la licencia de un tercero desde el primer despliegue.",
    ruleIds: ["col-pi-licencias"],
    probe:
      "Consulta de la licencia de cada dependencia de ejecución en el registro " +
      "público de npm, cotejada contra las licencias copyleft de red o fuertes " +
      "(se excluye LGPL, que no impone esa condición al servicio que la enlaza).",
    detect: ({ files, licenses }) => {
      const hits = licenses.filter((h) => COPYLEFT.test(h.text));
      return hits.length > 0 && !coveredByDoc(files, hits) ? hits : [];
    },
    patch: (hits) =>
      licenciasPatch(hits, [
        "publicar el código propio bajo la misma licencia",
        "sustituir la dependencia",
        "obtener licencia comercial del titular",
      ]),
    branch: "vigia-patch/licencia-copyleft",
    changeNote: "Documento nuevo con la decisión pendiente sobre cada dependencia. No cambia el código.",
    retests: ["docs/licencias.md declara la decisión para cada dependencia copyleft señalada"],
  },
  {
    code: "VGI-111",
    module: "static-scan",
    severity: "informativo",
    title: "Dependencia sin licencia declarada",
    summary:
      "Una dependencia de ejecución no declara licencia en el registro de npm, o la " +
      "declara como `UNLICENSED` o `SEE LICENSE IN <archivo>`.",
    legalAnalysis:
      "A falta de licencia, la Decisión Andina 351 de 1993 (art. 3) deja la obra bajo " +
      "el control exclusivo de quien la creó: no hay autorización implícita para " +
      "usarla, modificarla o redistribuirla. `UNLICENSED` es, precisamente, la reserva " +
      "expresa de todos los derechos; `SEE LICENSE IN <archivo>` remite a un texto que " +
      "hay que leer antes de asumir nada. Mientras {cliente} no confirme los términos " +
      "reales —con el autor o en el archivo que el paquete señale— no puede acreditar " +
      "que el uso que le da a esa pieza del sistema es lícito.",
    ruleIds: ["col-pi-licencias"],
    probe:
      "Consulta de la licencia de cada dependencia de ejecución en el registro " +
      "público de npm, señalando las que no declaran licencia o remiten a un archivo " +
      "aparte.",
    detect: ({ files, licenses }) => {
      const hits = licenses.filter((h) => UNDECLARED.test(h.text));
      return hits.length > 0 && !coveredByDoc(files, hits) ? hits : [];
    },
    patch: (hits) =>
      licenciasPatch(hits, [
        "pedir al autor que confirme la licencia por escrito",
        "leer el archivo de licencia que el paquete señale",
        "sustituir la dependencia por una con licencia declarada",
      ]),
    branch: "vigia-patch/licencia-no-declarada",
    changeNote: "Documento nuevo con la verificación pendiente sobre cada dependencia. No cambia el código.",
    retests: ["docs/licencias.md declara la verificación para cada dependencia sin licencia señalada"],
  },
  {
    code: "VGI-112",
    module: "static-scan",
    severity: "informativo",
    title: "Código generado con herramienta de IA: titularidad y condiciones según sus términos",
    summary:
      "El repositorio tiene marcadores de una herramienta de IA que genera código " +
      "(Lovable, v0, Bolt, Cursor, Replit, GitHub Copilot, Firebase Studio u otra), " +
      "y ningún documento registra qué dicen sus términos sobre la titularidad del " +
      "resultado.",
    legalAnalysis:
      "Solo la persona natural que realiza la creación intelectual es autora " +
      "(Decisión Andina 351 de 1993, art. 3); cuando el código lo produce una " +
      "herramienta de IA, la titularidad sobre ese resultado —si {cliente} puede " +
      "explotarlo, licenciarlo o registrarlo como propio— la fija el contrato de esa " +
      "herramienta con su usuario, no una presunción. Los términos difieren entre " +
      "herramientas y cambian con el tiempo, así que la verificación tiene fecha: " +
      "antes de vender, licenciar o registrar el software, {cliente} debe poder " +
      "mostrar de cuál herramienta salió cada parte y qué decían sus términos vigentes " +
      "en ese momento, no los de hoy.",
    ruleIds: ["col-pi-origen"],
    probe:
      "Búsqueda en el repositorio de marcadores de herramientas generadoras de código " +
      "por IA (dependencias, carpetas y archivos de configuración propios de cada una).",
    detect: ({ files }) => {
      const tools = matchedTools(files);
      if (tools.length === 0) return [];
      const doc = files.find((f) => /(^|\/)docs\/origen-del-codigo\.md$/i.test(f.path));
      if (doc && tools.every((t) => doc.content.includes(t.tool))) return [];
      return tools.flatMap((t) => toolEvidence(files, t.marker));
    },
    patch: (_hits, { files }) => {
      const tools = matchedTools(files);
      return {
        kind: "config",
        target: "docs/origen-del-codigo.md",
        removed: [],
        added: [
          "# Origen del código y condiciones de la herramienta generadora",
          "",
          ...tools.flatMap((t) => [
            `## ${t.tool}`,
            `- Titularidad según sus términos: ${t.ownership}`,
            `- Términos: ${t.termsUrl ?? "por confirmar"} (verificado: ${t.verifiedAt ?? "por confirmar"})`,
            `- ${t.note}`,
            "",
          ]),
        ],
        expectedImpact:
          "Deja registrada, herramienta por herramienta, la cláusula de titularidad vigente " +
          "cuando se verificó, para poder acreditar de quién es el código antes de explotarlo.",
      };
    },
    branch: "vigia-patch/origen-del-codigo",
    changeNote: "Documento nuevo con la cláusula de cada herramienta detectada. No cambia el código.",
    retests: ["docs/origen-del-codigo.md nombra cada herramienta detectada y su cláusula de titularidad"],
  },
];
