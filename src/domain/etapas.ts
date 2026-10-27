import { SCHEMA_FILE, personalColumns } from "./check-kit";
import { COBRO } from "./checks-consumidor";
import { getRule } from "./compliance";
import { HERRAMIENTAS_IA } from "./herramientas-ia";
import { detectProviders } from "./proveedores";
import { type SectorPack, sectorPack } from "./sectores";
import type { ComplianceRule, RepoFile } from "./types";

/**
 * Diagnóstico de etapa de una startup: qué obligaciones ya le aplican y cuáles
 * llegan con la etapa siguiente. Son reglas fijas, como el catálogo: las mismas
 * respuestas dan siempre el mismo resultado y cada obligación cita su norma (la
 * del catálogo cuando la hay, para que la cita sea la misma de la auditoría).
 * Es orientación para el fundador, no un concepto jurídico.
 */

export const ETAPAS = [
  { id: "idea", nombre: "Idea", descripcion: "Todavía no hay software: hay un nombre, un equipo y un plan." },
  { id: "prototipo", nombre: "Prototipo", descripcion: "Ya hay software, pero aún no lo usan personas reales." },
  { id: "usuarios", nombre: "Usuarios reales", descripcion: "Personas reales usan el producto y le entregan sus datos." },
  { id: "ingresos", nombre: "Ingresos", descripcion: "El producto cobra o la empresa ya tiene empleados." },
  { id: "escala", nombre: "Inversión y escala", descripcion: "La empresa levanta capital o sale a otros países." },
] as const;

export type Etapa = (typeof ETAPAS)[number];
type EtapaId = Etapa["id"];
const orden = (id: EtapaId) => ETAPAS.findIndex((e) => e.id === id);

export interface Respuestas {
  producto: "idea" | "prototipo" | "usuarios";
  equipo: "socios" | "contratistas" | "empleados";
  cobra: boolean;
  sociedad: boolean;
  inversion: boolean;
  ia: boolean;
  herramienta: boolean;
  marca: "registrada" | "en-uso" | "no";
  datos: string[];
  exterior: string[];
  sector: string;
}

type Params = Record<string, string | string[] | undefined>;
const lista = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const una = <T extends string>(v: string | string[] | undefined, valores: readonly T[]) =>
  valores.find((x) => x === lista(v)[0]);

/** Respuestas del formulario (parámetros de la URL); null mientras falte lo obligatorio. */
export function leerRespuestas(p: Params): Respuestas | null {
  const producto = una(p.producto, ["idea", "prototipo", "usuarios"] as const);
  const equipo = una(p.equipo, ["socios", "contratistas", "empleados"] as const);
  if (!producto || !equipo) return null;
  return {
    producto,
    equipo,
    cobra: lista(p.cobra)[0] === "si",
    sociedad: lista(p.sociedad)[0] === "si",
    inversion: lista(p.inversion)[0] === "si",
    ia: lista(p.ia)[0] === "si",
    herramienta: lista(p.herramienta)[0] === "si",
    marca: una(p.marca, ["registrada", "en-uso", "no"] as const) ?? "no",
    datos: lista(p.datos),
    exterior: lista(p.exterior),
    sector: (lista(p.sector)[0] ?? "").slice(0, 120),
  };
}

export function etapaDe(r: Respuestas): Etapa {
  const id: EtapaId =
    r.inversion || r.exterior.length > 0
      ? "escala"
      : r.cobra || r.equipo === "empleados"
        ? "ingresos"
        : r.producto;
  return ETAPAS[orden(id)];
}

export interface Obligacion {
  id: string;
  /** Etapa desde la que aplica. */
  desde: EtapaId;
  titulo: string;
  accion: string;
  /** Reglas del catálogo que la fundamentan; si no hay, `fundamento` trae la cita. */
  reglas?: string[];
  fundamento?: string;
  /** Pruebas de VIGÍA que la verifican en el código. */
  pruebas?: string[];
  aplica: (r: Respuestas) => boolean;
}

const fin = (r: Respuestas) => sectorPack(r.sector)?.id === "financiero";
const conDatos = (r: Respuestas) => r.datos.length > 0;

const OBLIGACIONES: Obligacion[] = [
  {
    id: "marca",
    desde: "idea",
    titulo: "Registrar la marca",
    accion:
      "Pedir el registro del nombre ante la Superintendencia de Industria y Comercio antes de " +
      "invertir en él: el derecho a usarlo en exclusiva solo nace del registro.",
    fundamento: "Decisión Andina 486 de 2000, art. 154",
    aplica: (r) => r.marca !== "registrada",
  },
  {
    id: "sociedad",
    desde: "prototipo",
    titulo: "Que una sociedad sea la dueña",
    accion:
      "Constituir la sociedad (por ejemplo, una SAS) y dejar a su nombre el código, la marca y " +
      "los contratos: mientras no exista, todo queda en cabeza de personas naturales.",
    fundamento: "Ley 1258 de 2008 (sociedad por acciones simplificada)",
    aplica: (r) => !r.sociedad,
  },
  {
    id: "cesion",
    desde: "prototipo",
    titulo: "Cesión por escrito de los derechos sobre el código",
    accion:
      "Firmar con cada persona que programa o diseña y no es socia un contrato escrito que deje " +
      "en la empresa los derechos patrimoniales sobre lo que crea. Sin contrato escrito no opera " +
      "la presunción a favor de la empresa.",
    reglas: ["col-pi-encargo"],
    pruebas: ["VGI-131"],
    aplica: (r) => r.equipo !== "socios",
  },
  {
    id: "herramienta-ia",
    desde: "prototipo",
    titulo: "Términos de la herramienta de IA que genera el código",
    accion:
      "Guardar qué dicen los términos de Lovable, Cursor, Bolt u otra herramienta sobre la " +
      "titularidad del código que generan, con la fecha en que se revisaron.",
    reglas: ["col-pi-origen"],
    pruebas: ["VGI-112"],
    aplica: (r) => r.herramienta,
  },
  {
    id: "licencias",
    desde: "prototipo",
    titulo: "Licencias de las librerías",
    accion:
      "Revisar las licencias de las dependencias antes de lanzar: algunas, como la AGPL, obligan " +
      "a ofrecer el código fuente a quienes usan el servicio.",
    reglas: ["col-pi-licencias"],
    pruebas: ["VGI-110", "VGI-111"],
    aplica: () => true,
  },
  {
    id: "contrato-realidad",
    desde: "prototipo",
    titulo: "Contratistas que en la práctica son empleados",
    accion:
      "Si quien trabaja por prestación de servicios cumple horario, recibe órdenes y depende de " +
      "la empresa, la relación es laboral aunque el contrato diga otra cosa.",
    fundamento: "Constitución Política, art. 53 (primacía de la realidad sobre las formalidades)",
    aplica: (r) => r.equipo === "contratistas",
  },
  {
    id: "politica",
    desde: "usuarios",
    titulo: "Política de tratamiento que describa lo que el código hace",
    accion:
      "Publicar la política de tratamiento con sus contenidos mínimos y que coincida con lo que " +
      "el sistema hace de verdad con los datos.",
    reglas: ["col-1377-politicas"],
    pruebas: ["VGI-077", "VGI-089"],
    aplica: conDatos,
  },
  {
    id: "autorizacion",
    desde: "usuarios",
    titulo: "Autorización y aviso antes del primer dato",
    accion:
      "Pedir la autorización previa, expresa e informada y mostrar el aviso de privacidad en " +
      "cada punto donde el producto recoge datos.",
    reglas: ["col-1581-autorizacion", "col-1377-aviso"],
    pruebas: ["VGI-060", "VGI-087"],
    aplica: conDatos,
  },
  {
    id: "sensibles",
    desde: "usuarios",
    titulo: "Datos sensibles: salud y biometría",
    accion:
      "Informar que entregarlos es facultativo y pedir autorización explícita; nada puede " +
      "condicionarse a que el titular los entregue.",
    reglas: ["col-1581-sensibles"],
    pruebas: ["VGI-081"],
    aplica: (r) => r.datos.includes("sensibles"),
  },
  {
    id: "menores",
    desde: "usuarios",
    titulo: "Datos de niños, niñas y adolescentes",
    accion:
      "Tratarlos solo si responde a su interés superior, con autorización de su representante " +
      "legal y oyendo al menor.",
    reglas: ["col-1581-menores"],
    pruebas: ["VGI-085"],
    aplica: (r) => r.datos.includes("menores"),
  },
  {
    id: "transmision",
    desde: "usuarios",
    titulo: "Contrato con cada proveedor de IA",
    accion:
      "Firmar o documentar el contrato de transmisión con cada servicio de IA al que el producto " +
      "envía datos personales, y saber en qué país los trata.",
    reglas: ["col-1074-transmision"],
    pruebas: ["VGI-078"],
    aplica: (r) => r.ia,
  },
  {
    id: "seguridad",
    desde: "usuarios",
    titulo: "Seguridad del código antes de abrirlo al público",
    accion:
      "Revisar llaves expuestas, tablas legibles y control de acceso antes de que entren " +
      "usuarios reales. Es lo que hace la auditoría de VIGÍA.",
    reglas: ["col-1581-seguridad"],
    pruebas: ["VGI-011", "VGI-013", "VGI-014"],
    aplica: conDatos,
  },
  {
    id: "derechos",
    desde: "usuarios",
    titulo: "Canal para consultas y reclamos",
    accion:
      "Tener un canal para que los titulares conozcan, actualicen, rectifiquen o supriman sus " +
      "datos, con los plazos de la ley.",
    reglas: ["col-1581-derechos"],
    pruebas: ["VGI-082", "VGI-076"],
    aplica: conDatos,
  },
  {
    id: "fintech",
    desde: "usuarios",
    titulo: "Instrucciones de la SIC para fintech",
    accion:
      "Separar las finalidades necesarias de las accesorias en la autorización, borrar la " +
      "biometría al terminar la relación, explicar los rechazos automáticos y no leer los " +
      "contactos ni la galería del teléfono para cobrar.",
    reglas: [
      "col-sic-fintech-finalidades",
      "col-sic-fintech-biometria",
      "col-sic-fintech-decisiones",
      "col-sic-fintech-minimizacion",
    ],
    pruebas: ["VGI-124", "VGI-125", "VGI-126", "VGI-127"],
    aplica: fin,
  },
  {
    id: "historia-clinica",
    desde: "usuarios",
    titulo: "Historia clínica reservada e inalterable",
    accion:
      "Que solo el paciente y su equipo de salud lean la historia, que nada se pueda editar ni " +
      "borrar después de registrado y que cada anotación diga quién la hizo y cuándo.",
    reglas: ["col-salud-hc-reserva", "col-salud-hc-integridad"],
    pruebas: ["VGI-132", "VGI-133"],
    aplica: (r) => sectorPack(r.sector)?.id === "salud",
  },
  {
    id: "consumidor",
    desde: "ingresos",
    titulo: "Deberes de quien vende en línea",
    accion:
      "Cuando cobre por medios electrónicos: identificar a la empresa, informar el precio total " +
      "y explicar el derecho de retracto y la reversión del pago.",
    reglas: ["col-1480-ecommerce", "col-1480-retracto", "col-1480-reversion"],
    pruebas: ["VGI-092", "VGI-093"],
    aplica: () => true,
  },
  {
    id: "cobranza",
    desde: "ingresos",
    titulo: "Cobranza dentro de la ley",
    accion:
      "Cobrar solo por los canales que el deudor autorizó, de lunes a viernes de 7:00 a. m. a " +
      "7:00 p. m. y los sábados de 8:00 a. m. a 3:00 p. m., y nunca a sus referencias.",
    reglas: ["col-2300-horarios", "col-2300-referencias"],
    pruebas: ["VGI-128", "VGI-129"],
    aplica: (r) => fin(r) || r.datos.includes("financieros"),
  },
  {
    id: "inversion",
    desde: "escala",
    titulo: "Llegar a la ronda con la casa en orden",
    accion:
      "Antes de la revisión del inversionista, tener documentados la titularidad del código, " +
      "las licencias y el cumplimiento en datos. El informe firmado de VIGÍA sirve de evidencia.",
    reglas: ["col-pi-encargo", "col-1074-responsabilidad"],
    aplica: () => true,
  },
  {
    id: "rnbd",
    desde: "escala",
    titulo: "Registro Nacional de Bases de Datos",
    accion:
      "Inscribir las bases de datos en el registro de la SIC cuando los activos de la sociedad " +
      "superen 100.000 UVT.",
    reglas: ["col-1581-rnbd"],
    aplica: conDatos,
  },
  {
    id: "sandbox",
    desde: "escala",
    titulo: "Actividad vigilada por la Superintendencia Financiera",
    accion:
      "Si el producto desarrolla actividades propias de las entidades vigiladas, evaluar con un " +
      "abogado la licencia o el espacio controlado de prueba, que permite probar desarrollos " +
      "tecnológicos innovadores en esas actividades.",
    fundamento: "Decreto 2555 de 2010, art. 2.35.7.1.1, adicionado por el Decreto 1234 de 2020",
    aplica: fin,
  },
  {
    id: "chile",
    desde: "escala",
    titulo: "Operar en Chile",
    accion: "Adecuar el tratamiento de datos a la nueva ley chilena antes de ofrecer el servicio allá.",
    fundamento: "Ley 21.719 de Chile, que rige desde el 1.º de diciembre de 2026 (art. 1.º transitorio)",
    aplica: (r) => r.exterior.includes("chile"),
  },
  {
    id: "ue",
    desde: "escala",
    titulo: "Usuarios en la Unión Europea",
    accion:
      "Si ofrece bienes o servicios a personas en la Unión o monitorea su comportamiento, se " +
      "aplica el RGPD aunque la empresa esté en Colombia.",
    fundamento: "Reglamento (UE) 2016/679, art. 3.2",
    aplica: (r) => r.exterior.includes("ue"),
  },
];

export interface Diagnostico {
  etapa: Etapa;
  siguiente: Etapa | null;
  ahora: Obligacion[];
  despues: Obligacion[];
  especialista: SectorPack | null;
}

export function diagnosticar(r: Respuestas): Diagnostico {
  const etapa = etapaDe(r);
  const i = orden(etapa.id);
  const siguiente = ETAPAS[i + 1] ?? null;
  const aplicables = OBLIGACIONES.filter((o) => o.aplica(r));
  return {
    etapa,
    siguiente,
    ahora: aplicables.filter((o) => orden(o.desde) <= i),
    despues: aplicables.filter((o) => orden(o.desde) === i + 1),
    especialista: sectorPack(r.sector),
  };
}

/** Reglas del catálogo de una obligación, con su cita tal como la usa la auditoría. */
export const reglasDe = (o: Obligacion): ComplianceRule[] =>
  (o.reglas ?? []).map(getRule).filter((x): x is ComplianceRule => Boolean(x));

/** Columnas de datos sensibles: salud o biometría. */
const SENSIBLES = /\b(biometr\w*|selfie\w*|face_?template|huella\w*|salud|diagn\w*|medical\w*|health\w*)\b/i;

/**
 * Lo que el código ya responde: el diagnóstico llega prellenado desde una
 * auditoría. Solo hechos que se leen en el código; la etapa la confirma quien
 * responde, porque el código no dice si ya hay usuarios reales.
 */
export function respuestasDelCodigo(files: RepoFile[], sector: string): URLSearchParams {
  const params = new URLSearchParams({ desde: "codigo", producto: "prototipo", sector });
  if (files.some((f) => COBRO.test(f.content))) params.set("cobra", "si");
  if (detectProviders(files).length > 0) params.set("ia", "si");
  if (HERRAMIENTAS_IA.some((h) => files.some((f) => h.marker.test(f.path) || h.marker.test(f.content)))) {
    params.set("herramienta", "si");
  }
  if (personalColumns(files).length > 0) params.append("datos", "personales");
  if (files.some((f) => SCHEMA_FILE(f) && SENSIBLES.test(f.content))) params.append("datos", "sensibles");
  return params;
}
