import type { DetectedProvider, RepoFile } from "./types";

import { type Check, type Ctx, type Hit, SCHEMA_FILE, grep, isSource } from "./check-kit";
import { buildInventory } from "./inventario";
import { PROVIDERS } from "./proveedores";

/**
 * Coherencia entre la política de tratamiento publicada y el tratamiento real
 * leído del código.
 *
 * El contraste es por palabras clave: VIGÍA no interpreta el sentido del
 * documento, detecta que la política no nombra lo que el código sí hace. Por
 * eso el parche no es un diff sino el texto que falta, redactado con los hechos
 * del código, para que el abogado lo revise y lo publique.
 */

/** Documento de política publicado en el repositorio (la misma expresión de VGI-077). */
const POLICY = /(pol[ií]tica|privacidad|privacy|tratamiento)[^/]*\.(md|mdx|html|txt)$/i;
const policyFile = (files: RepoFile[]) => files.find((f) => POLICY.test(f.path));

/** Primera línea de la política que coincide con alguna expresión; 1 si ninguna. */
function at(policy: RepoFile, ...where: RegExp[]): number {
  for (const re of where) {
    const hit = grep([policy], /./, re)[0];
    if (hit) return hit.line;
  }
  return 1;
}

/** Línea donde el código llama al proveedor, para citarla en la evidencia. */
function callLine(files: RepoFile[], p: DetectedProvider): number {
  const file = files.find((f) => f.path === p.surface);
  const pattern = PROVIDERS.find((x) => x.vendor === p.vendor)?.pattern;
  return (file && pattern ? grep([file], /./, pattern)[0]?.line : undefined) ?? 1;
}

/** "Biometría facial (sensible)" → "biometría facial". */
const plain = (category: string) => category.replace(/\s*\(.*\)$/, "").toLowerCase();

/** La política afirma que no comparte datos con terceros: contradice al código. */
const NO_SHARING =
  /\bno\s+(?:se\s+)?(?:comparte|compartimos|cede|cedemos|entrega|entregamos|transfer\w+)[^.]{0,80}\btercero/i;

interface Divergence {
  hit: Hit;
  /** Párrafos que, pegados en la política, hacen desaparecer la divergencia. */
  lines: string[];
}

/**
 * Divergencias entre lo publicado y lo que hace el código. `detect` devuelve
 * sus hits y `patch` sus párrafos: se calculan en el mismo lugar para que el
 * retesteo sea coherente (si el cliente pega los párrafos, no queda ninguna).
 */
function divergences(ctx: Ctx): Divergence[] {
  const policy = policyFile(ctx.files);
  if (!policy) return [];

  const text = policy.content;
  const rows = buildInventory(ctx.files, ctx.providers);
  const out: Divergence[] = [];
  const add = (line: number, evidence: string, lines: string[]) =>
    out.push({ hit: { path: policy.path, line, text: evidence }, lines });

  /* (a) Proveedores que tratan los datos fuera de Colombia. */
  const abroad = ctx.providers.filter((p) => p.country && !/colombia/i.test(p.country));
  const namesCountries = abroad.every((p) => new RegExp(p.country ?? "", "i").test(text));
  if (
    abroad.length > 0 &&
    (!/transferencia|transmisi[oó]n|internacional|exterior|fuera de colombia|fuera del pa[ií]s/i.test(
      text,
    ) ||
      !namesCountries)
  ) {
    add(
      at(
        policy,
        /transfer|transmis|internacional|exterior|proveedor|encargad/i,
        /se usan|se utilizan|finalidad|prestar|servicio/i,
      ),
      "No describe transferencia ni transmisión internacional; el código envía datos a " +
        abroad
          .map(
            (p) =>
              `${p.vendor} (${p.country}${
                p.adequateCountry === false ? ", país que no figura en la lista de la SIC" : ""
              }) en ${p.surface}:${callLine(ctx.files, p)}`,
          )
          .join(", "),
      [
        "## Transferencia y transmisión internacional de datos",
        "",
        "Para prestar el servicio, los datos personales de los titulares se envían a proveedores de tecnología que los tratan fuera de Colombia:",
        "",
        ...abroad.map(
          (p) =>
            `- ${p.vendor}: tratamiento en ${p.country}, ${
              p.adequateCountry
                ? "país incluido en la lista de países con nivel adecuado de protección de la Superintendencia de Industria y Comercio"
                : "país que no figura en esa lista"
            }.`,
        ),
        "",
        "[POR COMPLETAR: indicar, para cada proveedor, si actúa como encargado —transmisión, amparada en el contrato del art. 2.2.2.25.5.2 del Decreto 1074 de 2015— o como responsable —transferencia, sujeta al art. 26 de la Ley 1581 de 2012—, y la excepción, autorización o declaración de conformidad que ampara los envíos a países que no figuran en la lista de la SIC.]",
        "",
      ],
    );
  }

  /* (b) Datos sensibles tratados por el código. */
  const sensitive = rows.filter((r) => r.sensitive);
  if (
    sensitive.length > 0 &&
    !/biom[eé]tric|dato[s]?\s+sensible|selfie|rostro|facial|huella/i.test(text)
  ) {
    add(
      at(policy, /identidad|biom|selfie|sensible|verificar/i, /datos personales|\bdato/i),
      `No menciona datos sensibles; el código trata ${sensitive
        .map((r) => plain(r.category))
        .join(", ")} en ${sensitive[0].source.split(" · ")[0]}`,
      [
        "## Datos sensibles",
        "",
        `El sistema trata datos sensibles: ${sensitive.map((r) => plain(r.category)).join(", ")}. Los datos biométricos y los relativos a la salud son datos sensibles (Ley 1581 de 2012, art. 5) y su autorización es facultativa y debe ser explícita (art. 6 de la misma ley y art. 2.2.2.25.2.3 del Decreto 1074 de 2015, que compila el art. 6 del Decreto 1377 de 2013).`,
        "",
        "El titular no está obligado a autorizar el tratamiento de estos datos y ninguna actividad puede condicionarse a que los suministre. Al solicitar la autorización se le advierte cuáles de los datos pedidos son sensibles y con qué finalidad se tratan.",
        "",
        ...sensitive.map((r) => `- ${plain(r.category)}: ${r.purpose}.`),
        "",
        "[POR COMPLETAR: medidas reforzadas de seguridad y de acceso aplicadas a estos datos, y plazo durante el cual se conservan.]",
        "",
      ],
    );
  }

  /* (c) Información financiera y crediticia (Ley 1266). */
  const credit = rows.filter((r) => /crediticio|financiera/i.test(r.category));
  if (
    credit.length > 0 &&
    !/crediticia|crediticio|central(es)? de riesgo|ley 1266|comportamiento de pago|historial de cr[eé]dito/i.test(
      text,
    )
  ) {
    add(
      at(policy, /cr[eé]dit|financ|producto|servicio/i),
      `No menciona el tratamiento de información financiera ni crediticia; el código trata ${credit
        .map((r) => plain(r.category))
        .join(", ")} en ${credit[0].source.split(" · ")[0]}`,
      [
        "## Información financiera y crediticia",
        "",
        `El sistema trata información financiera y crediticia del titular: ${credit.map((r) => plain(r.category)).join(", ")}. La consulta y el uso de esa información se rigen además por la Ley 1266 de 2008, modificada por la Ley 2157 de 2021: solo puede entregarse a las personas que enumera su art. 5 y solo puede usarse para la finalidad para la que fue entregada.`,
        "",
        "[POR COMPLETAR: identificar la fuente de la información crediticia (operador o central de riesgo consultada), la finalidad concreta de la consulta y el término de permanencia del dato negativo que debe informarse al titular.]",
        "",
      ],
    );
  }

  /* (d) Encargados y proveedores que acceden a los datos. */
  if (
    ctx.providers.length > 0 &&
    (!/encargad|proveedor|tercero|subcontrat|aliado/i.test(text) || NO_SHARING.test(text))
  ) {
    add(
      at(policy, /comparti|tercero|proveedor|encargad/i, /responsable/i, /tratamiento/i),
      NO_SHARING.test(text)
        ? `Afirma que no se comparten datos con terceros, pero el código los envía a ${ctx.providers
            .map((p) => p.vendor)
            .join(", ")}`
        : `No menciona encargados ni proveedores; el código envía datos a ${ctx.providers
            .map((p) => `${p.vendor} en ${p.surface}:${callLine(ctx.files, p)}`)
            .join(", ")}`,
      [
        "## Encargados y proveedores que tratan los datos",
        "",
        "Los datos personales son tratados, por cuenta de {cliente} y bajo sus instrucciones, por los siguientes proveedores de tecnología, que actúan como encargados del tratamiento:",
        "",
        ...ctx.providers.map((p) => {
          const gets = rows
            .filter((r) => r.recipients.includes(p.vendor) && !/^Texto de la solicitud/.test(r.category))
            .map((r) => plain(r.category));
          return (
            `- ${p.vendor}${p.model && !/no declarado/i.test(p.model) ? ` (modelo ${p.model})` : ""}: ` +
            (gets.length > 0 ? `recibe ${gets.join(", ")}.` : "recibe el contenido de las solicitudes del titular.")
          );
        }),
        "",
        "[POR COMPLETAR: razón social y domicilio de cada encargado, contrato de transmisión suscrito con cada uno (art. 2.2.2.25.5.2 del Decreto 1074 de 2015) y cualquier otra persona a la que se comuniquen los datos. Cualquier afirmación en sentido contrario que aparezca en otro aparte de esta política —por ejemplo, negar que los datos lleguen a terceros— debe eliminarse por ser contraria al tratamiento que ejecuta el sistema.]",
        "",
      ],
    );
  }

  /* (e) Conversaciones con el asistente almacenadas y no mencionadas. */
  const talk = rows.find((r) => /Conversaciones/i.test(r.category));
  if (talk && !/conversaci|chat|asistente|mensajes del titular/i.test(text)) {
    add(
      at(policy, /solicitud|atend|chat|asistente|consulta/i),
      `No menciona el asistente ni las conversaciones; el código las almacena en ${talk.source.split(" · ")[0]}`,
      [
        "## Conversaciones con el asistente",
        "",
        "Las conversaciones que el titular sostiene con el asistente de chat se almacenan y se envían al proveedor del modelo de lenguaje que genera la respuesta. Pueden contener los datos que el propio titular escriba en el chat.",
        "",
        "[POR COMPLETAR: finalidad exacta del almacenamiento de las conversaciones, plazo de conservación y si se usan para entrenar o mejorar modelos, propios o del proveedor.]",
        "",
      ],
    );
  }

  return out;
}

/** El código borra o vence los datos: lo que permite cumplir un plazo publicado. */
const DELETION =
  /\bdelete\b|\bborrar\b|\belimina\w*|\bexpir\w*|\bttl\b|retention|retain|purge|delete_after|supresi[oó]n/i;

export const CHECKS_COHERENCIA: Check[] = [
  {
    code: "VGI-089",
    module: "transparency",
    severity: "advertencia",
    title: "La política de tratamiento publicada no describe el tratamiento real",
    summary:
      "El repositorio publica una política de tratamiento, pero omite tratamientos que el " +
      "código sí realiza: envíos a proveedores en el exterior, datos sensibles, " +
      "información crediticia, encargados o conversaciones almacenadas. El titular " +
      "autoriza sobre un texto que no corresponde a lo que ocurre con sus datos.",
    legalAnalysis:
      "La política es el documento con el que {cliente} le dice al titular qué hace con " +
      "sus datos. Cuando describe menos de lo que el código hace, el tratamiento se " +
      "vuelve parcial e incompleto y el titular queda inducido a error sobre su propia " +
      "información, que es justamente lo que prohíbe el principio de veracidad o calidad " +
      "(art. 4 lit. d de la Ley 1581 de 2012). El deber de informar del art. 12 queda " +
      "vacío: la autorización se otorga sobre un tratamiento que no es el que se ejecuta, " +
      "y lo no informado queda por fuera de la finalidad autorizada (art. 4 lit. b). El " +
      "reglamento lo exige expresamente: la política debe indicar el tratamiento al cual " +
      "serán sometidos los datos y su finalidad (Decreto 1074 de 2015, art. 2.2.2.25.3.1 " +
      "num. 2, que compila el art. 13 del Decreto 1377 de 2013), es decir, el tratamiento " +
      "efectivo y no una descripción genérica. Si la divergencia está en los envíos al " +
      "exterior, se suma el régimen de transferencias y transmisiones internacionales " +
      "(art. 26 de la Ley 1581 y arts. 2.2.2.25.5.1 y 2.2.2.25.5.2 del Decreto 1074); si " +
      "está en datos sensibles, la advertencia de facultatividad del art. 2.2.2.25.2.3. " +
      "Corregir la política no legaliza el tratamiento: lo hace visible, que es el " +
      "presupuesto para poder autorizarlo.",
    ruleIds: ["col-1581-veracidad", "col-1581-informar", "col-1377-politicas", "col-1581-finalidad"],
    probe:
      "Contraste por palabras clave entre el texto de la política publicada en el " +
      "repositorio y el inventario de tratamientos derivado del código: proveedores y su " +
      "país, categorías sensibles, información crediticia, encargados y conversaciones " +
      "almacenadas. La prueba no interpreta el sentido del documento: detecta que la " +
      "política no nombra lo que el código sí hace. Si el repositorio no publica ninguna " +
      "política, la prueba no dispara (esa ausencia es otro hallazgo).",
    detect: (ctx) => divergences(ctx).map((d) => d.hit),
    patch: (_hits, ctx) => ({
      kind: "documento",
      target: policyFile(ctx.files)?.path ?? "public/politica-tratamiento.md",
      removed: [],
      added: [
        "## Tratamiento efectivo de los datos personales",
        "",
        "Los apartes siguientes describen el tratamiento que el sistema realiza hoy, verificado sobre el código fuente, y se incorporan a la política para que el texto publicado corresponda a lo que efectivamente ocurre con los datos (Ley 1581 de 2012, art. 4 lit. d; Decreto 1074 de 2015, art. 2.2.2.25.3.1 num. 2, que compila el art. 13 del Decreto 1377 de 2013).",
        "",
        ...divergences(ctx).flatMap((d) => d.lines),
        "[POR COMPLETAR: fecha de entrada en vigencia de esta versión y comunicación previa del cambio a los titulares, si el cambio es sustancial.]",
      ],
      expectedImpact:
        "La política pasa a describir el tratamiento que el código ejecuta: proveedores y " +
        "países, datos sensibles, información crediticia, encargados y conversaciones. El " +
        "titular autoriza sobre lo que de verdad ocurre y {cliente} puede acreditar que " +
        "informó (arts. 4 lit. d y 12 de la Ley 1581 de 2012).",
    }),
    branch: "vigia-patch/policy-mirrors-code",
    changeNote:
      "Texto propuesto para la política publicada; no modifica el código. Lo revisa y " +
      "completa el abogado antes de publicarlo, y si la política afirma en otro aparte " +
      "que los datos no se comparten con terceros, esa frase debe eliminarse.",
    retests: [
      "La política nombra cada proveedor, su país y el carácter internacional del envío",
      "La política describe los datos sensibles tratados y advierte que autorizarlos es facultativo",
      "El contraste con el inventario derivado del código no deja divergencias",
    ],
  },
  {
    code: "VGI-090",
    module: "transparency",
    severity: "advertencia",
    title: "La política promete un plazo de conservación que el código no puede cumplir",
    summary:
      "La política publicada anuncia un plazo de conservación, pero el código no borra ni " +
      "vence ningún dato: no hay columna de expiración, ni purga, ni supresión programada.",
    legalAnalysis:
      "Los datos solo pueden conservarse durante el tiempo razonable y necesario para la " +
      "finalidad que justificó el tratamiento, y responsables y encargados deben " +
      "documentar los procedimientos de tratamiento, conservación y supresión (Decreto " +
      "1074 de 2015, art. 2.2.2.25.2.8, que compila el art. 11 del Decreto 1377 de 2013). " +
      "Cuando la política anuncia un plazo que el sistema no ejecuta, el incumplimiento es " +
      "doble: los datos se conservan más de lo necesario y el titular recibe una " +
      "información que no es exacta ni comprobable, en contra del principio de veracidad " +
      "o calidad (art. 4 lit. d de la Ley 1581 de 2012). Frente a la SIC, un plazo " +
      "publicado es una afirmación verificable: {cliente} tiene que poder demostrar que la " +
      "supresión ocurre.",
    ruleIds: ["col-1377-temporalidad", "col-1581-veracidad"],
    probe:
      "Lectura del plazo de conservación anunciado en la política publicada y búsqueda, en " +
      "el código y en el esquema de la base de datos, de una columna de expiración, una " +
      "purga programada o una rutina de supresión que permita cumplirlo.",
    detect: (ctx) => {
      const policy = policyFile(ctx.files);
      if (!policy) return [];
      const promised = grep([policy], /./, /\d{1,3}\s*(d[ií]as|meses|a[ñn]os)/i).filter((h) =>
        /conserv|almacen|retenc|guard|suprim|elimin|vigencia/i.test(h.text),
      );
      if (promised.length === 0) return [];
      const deletes = ctx.files.some((f) => (isSource(f) || SCHEMA_FILE(f)) && DELETION.test(f.content));
      return deletes ? [] : promised.slice(0, 1);
    },
    patch: (hits, ctx) => ({
      kind: "config",
      target: ctx.files.find(SCHEMA_FILE)?.path ?? "docs/conservacion-y-supresion.md",
      removed: [],
      added: [
        `-- Plazo publicado en ${hits[0].path}:${hits[0].line}: ${hits[0].text}`,
        "-- Vencimiento por registro y purga programada: hacen verificable ese plazo.",
        "alter table <tabla> add column if not exists expires_at timestamptz;",
        "update <tabla> set expires_at = created_at + interval '<plazo publicado>';",
        "select cron.schedule('purga-<tabla>', '0 3 * * *',",
        "  $$delete from <tabla> where expires_at < now()$$);",
        "-- Documentar aquí el procedimiento de conservación y supresión (art. 2.2.2.25.2.8).",
      ],
      expectedImpact:
        "Cada registro queda con fecha de vencimiento y una purga diaria lo elimina al " +
        "cumplirse, de modo que el plazo publicado deja de ser una promesa y pasa a ser un " +
        "hecho verificable en la base de datos.",
    }),
    branch: "vigia-patch/retention-matches-policy",
    changeNote:
      "Migración de esquema y tarea programada de purga. Requiere decidir qué tablas " +
      "cubre el plazo publicado y desde qué fecha se cuenta.",
    retests: [
      "La purga elimina los registros que superan el plazo publicado",
      "El procedimiento de conservación y supresión queda documentado",
    ],
  },
];
