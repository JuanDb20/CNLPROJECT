import { isResolved } from "./scoring";
import type { AuditRun, Severity } from "./types";

/**
 * Calendario de obligaciones de una auditoría, en .ics (RFC 5545).
 *
 * Todas las fechas se calculan a partir de datos del propio run (carga del
 * código, fin del análisis, informe expedido); cuando el run aún no tiene
 * informe se usa la fecha de hoy, igual que haría el abogado si lo exportara
 * antes de expedirlo. El cálculo se hace en UTC para que el mismo run
 * produzca siempre el mismo .ics sin importar la zona horaria del servidor.
 */

export interface CalendarEvent {
  uid: string;
  /** AAAA-MM-DD: los eventos son de día completo, sin hora. */
  date: string;
  summary: string;
  description: string;
}

/** Plazo de gestión (no legal) recomendado por VIGÍA para remediar según severidad. */
const REMEDIATION_DAYS: Record<Severity, number> = { critico: 15, advertencia: 30, informativo: 90 };
const SEVERITY_PLURAL: Record<Severity, string> = {
  critico: "críticos",
  advertencia: "advertencias",
  informativo: "informativos",
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** Próximo 2 de enero a partir de la fecha dada (incluida). */
function nextJan2(iso: string): string {
  const d = new Date(iso);
  const ref = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const jan2 = Date.UTC(d.getUTCFullYear(), 0, 2);
  const year = ref <= jan2 ? d.getUTCFullYear() : d.getUTCFullYear() + 1;
  return new Date(Date.UTC(year, 0, 2)).toISOString().slice(0, 10);
}

/** Fecha en español a partir de un "AAAA-MM-DD", sin desfase horario (se lee en UTC). */
function spanishDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("es-CO", { dateStyle: "long", timeZone: "UTC" });
}

export function buildCalendar(run: AuditRun): { events: CalendarEvent[]; ics: string } {
  const events: CalendarEvent[] = [];
  const { source } = run.scope;

  events.push({
    uid: `${run.id}-borrado-codigo@vigia`,
    date: addDays(source.uploadedAt, 90),
    summary: "Borrado del código cargado",
    description:
      `VIGÍA borra el código fuente cargado el ${spanishDate(source.uploadedAt.slice(0, 10))} y conserva ` +
      `solo su huella SHA-256 (${source.sha256.slice(0, 12)}…), conforme a la cláusula 4 del acuerdo de ` +
      `alcance de VIGÍA ("Contrato de transmisión, secreto profesional, minimización y retención"). ` +
      "Reauditar en el próximo despliegue: esta auditoría solo cubre la versión de código identificada " +
      "por ese SHA-256; cualquier cambio posterior en el código exige una nueva auditoría.",
  });

  const analysisEnd = run.logs.at(-1)?.at ?? run.createdAt;
  const open = run.findings.filter((f) => !isResolved(f));
  for (const severity of ["critico", "advertencia", "informativo"] as const) {
    const codes = open.filter((f) => f.severity === severity).map((f) => f.code);
    if (codes.length === 0) continue;
    const days = REMEDIATION_DAYS[severity];
    events.push({
      uid: `${run.id}-remediacion-${severity}@vigia`,
      date: addDays(analysisEnd, days),
      summary: `Plazo recomendado de remediación: hallazgos ${SEVERITY_PLURAL[severity]}`,
      description:
        `Plazo de gestión recomendado por VIGÍA para remediar los hallazgos ${SEVERITY_PLURAL[severity]} ` +
        `abiertos: ${codes.join(", ")}. No es un término legal, es una prioridad de gestión de riesgo. ` +
        `Contado desde el fin del análisis (${spanishDate(analysisEnd.slice(0, 10))}), a ${days} días.`,
    });
  }

  // Fecha de referencia de las obligaciones periódicas: la de expedición del informe, o la de hoy si aún no se expide.
  const reference = run.certificate?.issuedAt ?? new Date().toISOString();

  events.push({
    uid: `${run.id}-revision-politica@vigia`,
    date: addYears(reference, 1),
    summary: "Revisión anual de la política de tratamiento",
    description:
      "Buena práctica ligada al deber de mantener actualizada la política de tratamiento de la " +
      "información y de indicar el período de vigencia de la base de datos (Decreto 1074 de 2015, " +
      "art. 2.2.2.25.3.1 lit. f, que compila el art. 13 del Decreto 1377 de 2013).",
  });

  events.push({
    uid: `${run.id}-rnbd@vigia`,
    date: nextJan2(reference),
    summary: "Actualización anual en el RNBD, si aplica",
    description:
      "Los responsables obligados a inscribirse en el Registro Nacional de Bases de Datos de la SIC " +
      "—sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT, y " +
      "entidades públicas— deben actualizarlo cada año entre el 2 de enero y el 31 de marzo (Circular " +
      "Única de la SIC, Título V, Capítulo Segundo, numeral 2.3 literal (ii)). Verifica si el cliente " +
      "está obligado antes de agendar esta gestión.",
  });

  events.push({
    uid: `${run.id}-plazos-permanentes@vigia`,
    date: reference.slice(0, 10),
    summary: "Plazos permanentes ante los titulares y la SIC",
    description:
      "Consultas de los titulares: 10 días hábiles, prorrogables 5 más (Ley 1581 de 2012, art. 14). " +
      'Reclamos: 15 días hábiles, prorrogables 8 más; leyenda "reclamo en trámite" en la base de datos ' +
      "dentro de los 2 días hábiles siguientes a su recibo (Ley 1581 de 2012, art. 15). Reporte de " +
      "incidentes de seguridad a la SIC: dentro de los 15 días hábiles siguientes a su detección (Ley " +
      "1581 de 2012, art. 17 lit. n; el plazo concreto de 15 días lo fija la Circular Única de la SIC, " +
      "Título V, Capítulo Segundo, numeral 2.1 literal f) (ii)).",
  });

  return { events, ics: toIcs(events) };
}

/** Escapa texto para un valor TEXT de RFC 5545: barra invertida, punto y coma, coma y salto de línea. */
export function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Pliega una línea a 75 octetos (RFC 5545 §3.1), sin partir caracteres UTF-8 multibyte. */
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (parts.length === 0 ? 75 : 74), bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1; // no partir un carácter multibyte
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return parts.join("\r\n ");
}

function toIcs(events: CalendarEvent[]): string {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VIGIA//Calendario de obligaciones//ES",
    "CALSCALE:GREGORIAN",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${event.date.replaceAll("-", "")}`,
      /* DTEND explícito y exclusivo (día siguiente). El RFC permite omitirlo en
         un evento de día completo, pero varios calendarios lo importan mal o lo
         descartan si falta. */
      `DTEND;VALUE=DATE:${addDays(`${event.date}T00:00:00Z`, 1).replaceAll("-", "")}`,
      `SUMMARY:${escapeIcs(event.summary)}`,
      `DESCRIPTION:${escapeIcs(event.description)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
