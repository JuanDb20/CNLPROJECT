import type { DetectedProvider, RepoFile } from "./types";

import { FULL_RECORD, SCHEMA_FILE, TOOLS, grep, isSource, tableName } from "./check-kit";
import { PROVIDERS } from "./proveedores";

/**
 * Inventario de tratamientos: cada categoría de dato que el código trata, como
 * fila de un registro de actividades de tratamiento (dato, origen, finalidad,
 * destinatarios, transferencia internacional, plazo, base de legitimación).
 *
 * Qué se infiere del código:
 *  - la categoría, por el nombre de la columna del esquema o del campo que la
 *    herramienta devuelve;
 *  - el origen, como archivo y línea exactos;
 *  - los destinatarios: la tabla que la almacena y el proveedor de IA al que
 *    llega, cuando el código deja ver el envío;
 *  - la transferencia internacional, por el país del proveedor;
 *  - el carácter sensible de la categoría.
 *
 * Qué NO se infiere y tiene que completar el abogado:
 *  - la finalidad, salvo cuando la actividad es evidente en el código (KYC,
 *    chat, evaluación crediticia); el resto queda en "[POR COMPLETAR]";
 *  - la base de legitimación: se propone la autorización del titular y se marca
 *    para verificación, porque puede haber otra causal (art. 10 de la Ley 1581);
 *  - el plazo de conservación cuando el código no tiene purga ni vencimiento;
 *  - los tratamientos que no pasan por el repositorio (formularios en papel,
 *    hojas de cálculo, proveedores contratados por fuera del código) y los
 *    campos que solo existan en la interfaz y no en el esquema ni en las
 *    herramientas.
 *
 * Relación con el RNBD: el inventario es el insumo natural del Registro
 * Nacional de Bases de Datos, pero la inscripción no es universal. Están
 * obligadas las sociedades y entidades sin ánimo de lucro con activos totales
 * superiores a 100.000 UVT y las personas jurídicas de naturaleza pública
 * (Decreto 1074 de 2015, art. 2.2.2.26.1.2, modificado por el Decreto 090 de
 * 2018, art. 1). Quien no esté obligado a inscribirse sigue necesitando el
 * inventario para acreditar responsabilidad demostrada (Decreto 1074 de 2015,
 * arts. 2.2.2.25.6.1 y 2.2.2.25.6.2, que compilan los arts. 26 y 27 del Decreto
 * 1377 de 2013): saber qué datos se tratan, para qué y hacia dónde salen es el
 * primer requisito de cualquier medida verificable.
 */

export interface InventoryRow {
  /** Categoría del dato, p. ej. "Documento de identidad", "Biometría facial (sensible)". */
  category: string;
  /** Dónde se recolecta o almacena: archivo y línea de la columna o de la herramienta. */
  source: string;
  /** Finalidad inferida del código; "[POR COMPLETAR]" cuando no se puede inferir. */
  purpose: string;
  /** Destinatarios: tablas que la almacenan y proveedores de IA a los que llega. */
  recipients: string;
  /** Transferencia o transmisión internacional: país del proveedor o "No". */
  international: string;
  /** Plazo de conservación detectado o "No definido". */
  retention: string;
  sensitive: boolean;
  /** Base de legitimación propuesta; la confirma el abogado. */
  basis: string;
}

/* ------------------------------------------------------------------ */
/* Categorías                                                          */
/* ------------------------------------------------------------------ */

/** Nombre de columna o de campo → categoría. Gana la primera que coincida. */
const CATEGORIES: { category: string; pattern: RegExp; sensitive?: boolean }[] = [
  {
    category: "Biometría facial (sensible)",
    pattern: /biometr|selfie|face_?template|huella|iris|voiceprint|rostro|match_score/i,
    sensitive: true,
  },
  {
    category: "Salud (sensible)",
    /* "diagnosticar" (un error de producción) no es un dato de salud: se exige
       el sustantivo, no el verbo. */
    pattern: /\bsalud\b|health|medical|diagn[oó]stic[oa]s?\b|historia_?cl[ií]nica|\beps\b/i,
    sensitive: true,
  },
  {
    category: "Imagen del documento de identidad",
    pattern: /document_image|documento_?imagen|imagen_?documento|c[eé]dula_?image|id_?image/i,
  },
  {
    category: "Documento de identidad",
    pattern: /document|c[eé]dula|\bnit\b|passport|pasaporte|\bdni\b/i,
  },
  {
    category: "Historial crediticio (Ley 1266)",
    pattern: /credit|cr[eé]dit|datacr[eé]dito|cifin|transunion|\bmora|puntaje|\bscore/i,
  },
  {
    category: "Información financiera / ingresos",
    pattern: /income|ingres|salar|patrimonio|egres|financ/i,
  },
  { category: "Nombre", pattern: /full_?name|first_?name|last_?name|nombre|apellido/i },
  { category: "Correo electrónico", pattern: /e?mail|correo/i },
  { category: "Teléfono", pattern: /phone|tel[eé]fono|celular|m[oó]vil/i },
  { category: "Dirección", pattern: /address|direcci[oó]n|\bciudad\b/i },
  { category: "Fecha de nacimiento", pattern: /birth|nacimiento|\bedad\b/i },
  {
    category: "Conversaciones con el asistente",
    pattern: /message|conversation|conversaci|\bchat|mensaje|transcript/i,
  },
];

const CHAT_CATEGORY = "Conversaciones con el asistente";
const FREE_TEXT = "Texto de la solicitud enviado al modelo";

const categoryOf = (name: string) => CATEGORIES.find((c) => c.pattern.test(name));

/** Actividades visibles en el código, de las que se infiere la finalidad. */
const KYC = /kyc|selfie|vinculaci[oó]n|onboarding|face_?template|document_image/i;
const CHAT = /chat|asistente|assistant|conversation|mensaje/i;
const CREDIT = /credit|cr[eé]dit|riesgo|scoring|\bmora|puntaje/i;
/** Señal de que el código fija un plazo o borra: sin ella, no hay plazo que reportar. */
const RETENTION = /\b(retain|retention|expires?_?at|ttl|purge|delete_after|caduc\w*)\b|supresi[oó]n autom/i;

/** Columnas de los esquemas (SQL o Prisma), con la tabla a la que pertenecen. */
function schemaColumns(files: RepoFile[]) {
  return files.filter(SCHEMA_FILE).flatMap((f) => {
    let table = "";
    return f.content.split(/\r?\n/).flatMap((text, i) => {
      const created = tableName(text) ?? /^\s*model\s+(\w+)/.exec(text)?.[1]?.toLowerCase();
      if (created) {
        table = created;
        return [];
      }
      const column = table ? /^\s*"?(\w+)"?\s+\w/.exec(text)?.[1] : undefined;
      return column ? [{ table, column, path: f.path, line: i + 1 }] : [];
    });
  });
}

/** Referencia al módulo del proveedor en un import: "@/lib/llm-client" → llm-client. */
const moduleRef = (surface: string) => {
  const base = (surface.split("/").pop() ?? surface).replace(/\.\w+$/, "").replace(/\W/g, "\\$&");
  return new RegExp(`["'\`][^"'\`]*${base}["'\`]`);
};

interface Draft {
  category: string;
  sensitive: boolean;
  order: number;
  origins: string[];
  tables: string[];
  vendors: DetectedProvider[];
  /** Llega al modelo pero no se sabe a qué proveedor. */
  toModel: boolean;
}

export function buildInventory(files: RepoFile[], providers: DetectedProvider[]): InventoryRow[] {
  const code = files.filter(isSource);
  const columns = schemaColumns(files);

  /* Archivos que hablan con el modelo: los que registran las herramientas (su
     resultado vuelve al modelo) y los que arman el contexto con el registro
     completo del titular.
     ponytail: la vinculación proveedor–asistente se hace por el nombre del
     módulo importado, no por un grafo real de importaciones; alcanza para el
     caso normal (un cliente del modelo por asistente) y el abogado confirma el
     resto. Un grafo de importaciones lo haría exacto. */
  const wiring = code.filter(
    (f) => /from\s+["'`][^"'`]*tools?(\/index)?["'`]/.test(f.content) || FULL_RECORD.test(f.content),
  );
  const chat = providers.filter((p) =>
    wiring.some((f) => f.path !== p.surface && moduleRef(p.surface).test(f.content)),
  );

  /* Tablas cuyo registro completo viaja al modelo: las que nombra el archivo
     que arma el contexto con FULL_RECORD. */
  const tables = [...new Set(columns.map((c) => c.table))];
  const whole = new Set(
    code
      .filter((f) => FULL_RECORD.test(f.content))
      .flatMap((f) => tables.filter((t) => new RegExp(`\\b${t}\\b`).test(f.content))),
  );

  const drafts = new Map<string, Draft>();
  const push = (
    found: { category: string; sensitive?: boolean },
    origin: string,
    extra: { table?: string; vendors?: DetectedProvider[]; toModel?: boolean } = {},
  ) => {
    const order = CATEGORIES.findIndex((c) => c.category === found.category);
    const draft = drafts.get(found.category) ?? {
      category: found.category,
      sensitive: found.sensitive === true,
      order: order < 0 ? CATEGORIES.length : order,
      origins: [],
      tables: [],
      vendors: [],
      toModel: false,
    };
    if (!draft.origins.includes(origin)) draft.origins.push(origin);
    if (extra.table && !draft.tables.includes(extra.table)) draft.tables.push(extra.table);
    for (const v of extra.vendors ?? []) {
      if (!draft.vendors.some((x) => x.id === v.id)) draft.vendors.push(v);
    }
    draft.toModel = draft.toModel || extra.toModel === true;
    drafts.set(found.category, draft);
  };

  // 1. Columnas del esquema: dónde se almacena cada categoría.
  for (const c of columns) {
    const found = categoryOf(c.column);
    if (found) {
      push(found, `${c.path}:${c.line} (${c.table}.${c.column})`, {
        table: c.table,
        vendors: whole.has(c.table) ? chat : [],
      });
    }
  }

  // 2. Herramientas del asistente: lo que devuelven vuelve al modelo.
  for (const f of code.filter((f) => TOOLS.test(f.path) && !/\/index\.\w+$/.test(f.path))) {
    for (const c of CATEGORIES) {
      const hit = grep([f], /./, c.pattern)[0];
      if (hit) {
        push(c, `${hit.path}:${hit.line} (herramienta)`, { vendors: chat, toModel: true });
      }
    }
  }

  /* 3. Archivo que llama al proveedor: solo cuenta si nombra literalmente una
     columna del esquema. Buscar la categoría por palabra clave aquí daría
     falsos positivos (el prompt del clasificador nombra "créditos" y no por eso
     le llega el historial crediticio). */
  for (const p of providers) {
    const f = code.find((x) => x.path === p.surface);
    if (!f) continue;
    for (const c of columns) {
      const found = categoryOf(c.column);
      /* "messages" es además el parámetro de todos los SDK: nombrarlo no prueba
         que se envíen las conversaciones almacenadas. */
      if (!found || found.category === CHAT_CATEGORY) continue;
      const hit = grep([f], /./, new RegExp(`\\b${c.column}\\b`))[0];
      if (hit) push(found, `${hit.path}:${hit.line} (llamada a ${p.vendor})`, { vendors: [p] });
    }
  }

  // 4. La conversación es, por definición, lo que se le envía al modelo del asistente.
  const talk = drafts.get(CHAT_CATEGORY);
  if (talk) {
    for (const p of chat) if (!talk.vendors.some((x) => x.id === p.id)) talk.vendors.push(p);
    talk.toModel = talk.toModel || chat.length === 0;
  }

  // 5. Proveedor que no recibe ninguna categoría nombrada: recibe el texto de la solicitud.
  const reached = new Set([...drafts.values()].flatMap((d) => d.vendors.map((v) => v.id)));
  for (const p of providers.filter((x) => !reached.has(x.id))) {
    const surface = code.find((f) => f.path === p.surface);
    const pattern = PROVIDERS.find((x) => x.vendor === p.vendor)?.pattern ?? /\S/;
    const line = surface ? (grep([surface], /./, pattern)[0]?.line ?? 1) : 1;
    push({ category: FREE_TEXT }, `${p.surface}:${line} (llamada a ${p.vendor})`, { vendors: [p] });
  }

  /* El plazo se lee del código: sin purga ni vencimiento, no hay plazo que
     reportar y la fila lo dice en lugar de suponerlo. */
  const retention = code.some((f) => RETENTION.test(f.content))
    ? "Por confirmar: el código fija plazos; verificar cuál aplica"
    : "No definido";

  return [...drafts.values()]
    .sort((a, b) => a.order - b.order || a.category.localeCompare(b.category))
    .map((d) => ({
      category: d.category,
      source:
        d.origins.slice(0, 3).join(" · ") +
        (d.origins.length > 3 ? ` · y ${d.origins.length - 3} más` : ""),
      purpose: purposeOf(d.category, files),
      recipients:
        [
          ...d.tables.map((t) => `Tabla ${t}`),
          ...d.vendors.map(
            (p) => `${p.vendor} (${p.country ?? "país no declarado"})`,
          ),
          ...(d.toModel && d.vendors.length === 0
            ? ["Modelo del asistente (proveedor por confirmar)"]
            : []),
        ].join(" · ") || "[POR COMPLETAR]",
      international: internationalOf(d),
      retention,
      sensitive: d.sensitive,
      basis: basisOf(d),
    }));
}

/** Finalidad: solo se infiere cuando la actividad es visible en el código. */
function purposeOf(category: string, files: RepoFile[]): string {
  const shows = (re: RegExp) => files.some((f) => re.test(f.path) || re.test(f.content));
  if (/Biometr|Imagen del documento|Documento de identidad/.test(category)) {
    return shows(KYC) ? "Verificación de identidad (KYC)" : "[POR COMPLETAR]";
  }
  if (category === CHAT_CATEGORY || category === FREE_TEXT) {
    return shows(CHAT) ? "Atención por chat" : "[POR COMPLETAR]";
  }
  if (/crediticio|financiera/.test(category)) {
    return shows(CREDIT) ? "Evaluación crediticia" : "[POR COMPLETAR]";
  }
  return "[POR COMPLETAR]";
}

function internationalOf(d: Draft): string {
  const abroad = d.vendors.filter((p) => p.country && !/colombia/i.test(p.country));
  if (abroad.length === 0) return d.toModel ? "Por confirmar" : "No";
  return abroad
    .map(
      (p) =>
        `${p.country} — ${p.vendor} (${
          p.adequateCountry
            ? "país con nivel adecuado según la SIC"
            : "país que no figura en la lista de la SIC"
        })`,
    )
    .join(" · ");
}

function basisOf(d: Draft): string {
  if (d.sensitive) {
    return "Autorización explícita y facultativa del titular (Ley 1581, arts. 5 y 6) — por verificar";
  }
  if (/crediticio/.test(d.category)) {
    return "Autorización del titular; la consulta se rige además por la Ley 1266 de 2008 — por verificar";
  }
  return "Autorización del titular (Ley 1581, art. 9) — por verificar";
}
