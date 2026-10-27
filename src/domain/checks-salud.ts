import { type Check, type Ctx, type Hit, SCHEMA, edit, grep, isSource } from "./check-kit";

/**
 * Especialista en salud: la historia clínica (Resolución 1995 de 1999 del
 * Ministerio de Salud). Se reconoce por el nombre de la tabla, no por el sector
 * declarado: una tabla «historias_clinicas» ya dice lo que guarda.
 */

const TABLA_HC =
  /^(historias?_?clinicas?|hc_\w+|\w*medical_?records?|\w*health_?records?|epicrisis|evoluciones?_medicas?|consultas?_medicas?|notas?_(medicas?|clinicas?))$/i;
/** Escritura sobre la historia desde el código: Supabase o Prisma. */
const MODIFICA_HC =
  /\.from\(\s*["'`](historias?_?clinicas?|hc_\w+|\w*medical_?records?|\w*health_?records?|epicrisis|evoluciones?_medicas?|consultas?_medicas?)["'`]\s*\)[^;]*\.(update|delete|upsert)\(|\b(historiaClinica|historiasClinicas|medicalRecord|healthRecord)\.(update|delete|upsert)(Many)?\(/i;
/** Basta con haber iniciado sesión: cualquier paciente lee la historia de todos. */
const CUALQUIER_SESION =
  /using\s*\(\s*(auth\.role\(\)\s*=\s*'authenticated'|auth\.uid\(\)\s+is\s+not\s+null)\s*\)/i;

interface Politica {
  path: string;
  /** Línea donde empieza la sentencia y sus líneas originales, para reemplazarla entera. */
  line: number;
  lines: string[];
  tabla: string;
  sentencia: string;
}

/** Políticas de seguridad por fila sobre tablas de historia clínica, sentencia por sentencia. */
function politicasHC(ctx: Ctx): Politica[] {
  return ctx.files
    .filter((f) => SCHEMA.test(f.path))
    .flatMap((f) => {
      const original = f.content.split(/\r?\n/);
      // Sin comentarios, pero con los mismos saltos de línea: los números de línea no cambian.
      const sql = f.content.replace(/--.*$/gm, "");
      return [...sql.matchAll(/create\s+policy[^;]*;/gi)].flatMap((m) => {
        const tabla = /\son\s+(?:public\.)?"?(\w+)"?/i.exec(m[0])?.[1] ?? "";
        if (!TABLA_HC.test(tabla)) return [];
        const line = sql.slice(0, m.index).split("\n").length;
        const lines = original.slice(line - 1, line - 1 + m[0].split("\n").length).map((l) => l.trim());
        return [{ path: f.path, line, lines, tabla, sentencia: m[0] }];
      });
    });
}

const comoHit = (p: Politica): Hit => ({ path: p.path, line: p.line, text: p.lines.join(" ") });
const politicaDe = (ctx: Ctx, hit: Hit) =>
  politicasHC(ctx).find((p) => p.path === hit.path && p.line === hit.line);

export const CHECKS_SALUD: Check[] = [
  {
    code: "VGI-132",
    module: "static-scan",
    severity: "advertencia",
    title: "La historia clínica se puede modificar o borrar después de registrada",
    summary:
      "Una política de la base o una línea del código permite actualizar o eliminar registros " +
      "de la historia clínica ya guardados.",
    legalAnalysis:
      "Los programas que manejan historias clínicas deben tener mecanismos de seguridad que " +
      "imposibiliten modificarlas una vez se registren y guarden los datos, evitar su " +
      "destrucción accidental o provocada y permitir establecer con exactitud quién hizo cada " +
      "registro, con su hora y fecha (art. 18 de la Resolución 1995 de 1999 del Ministerio de " +
      "Salud). La historia clínica es un documento obligatorio y sometido a reserva en el que " +
      "los registros se hacen en orden cronológico (art. 1 lit. a): una corrección no reemplaza " +
      "lo anotado, se agrega como anotación nueva. Si el sistema de {cliente} permite editar o " +
      "borrar, la historia pierde su valor como prueba de la atención, que es justo para lo que " +
      "se consulta en una queja o en un proceso de responsabilidad médica.",
    ruleIds: ["col-salud-hc-integridad", "col-1581-seguridad"],
    probe:
      "Búsqueda en las migraciones de políticas de actualización o borrado sobre tablas de " +
      "historia clínica, y en el código de llamadas que las actualizan o eliminan.",
    detect: (ctx) => [
      ...politicasHC(ctx)
        .filter((p) => /\bfor\s+(update|delete|all)\b/i.test(p.sentencia))
        .map(comoHit),
      ...grep(ctx.files.filter(isSource), /./, MODIFICA_HC),
    ],
    patch: (hits, ctx) => {
      const politica = politicaDe(ctx, hits[0]);
      if (!politica) {
        return edit(
          "codigo",
          [
            "// La historia clínica no se modifica: la corrección queda como anotación nueva, con su",
            "// autor, fecha y hora (Resolución 1995 de 1999 del Ministerio de Salud, art. 18).",
            'await supabase.from("notas_aclaratorias").insert({ historia_id, texto: correccion, autor_id, registrada_en: new Date().toISOString() });',
          ],
          "Lo registrado en la historia queda intacto y cada corrección conserva quién la hizo y " +
            "cuándo, como exige el art. 18 de la Resolución 1995 de 1999.",
        )(hits);
      }
      return {
        kind: "codigo",
        target: politica.path,
        removed: politica.lines,
        added: [
          `-- Sin UPDATE ni DELETE sobre ${politica.tabla}: la historia clínica solo admite inserciones`,
          "-- y cada corrección se registra como anotación nueva, con su autor, fecha y hora",
          "-- (Resolución 1995 de 1999 del Ministerio de Salud, art. 18).",
        ],
        expectedImpact:
          "La base deja de aceptar cambios sobre lo ya registrado en la historia clínica; las " +
          "correcciones se agregan sin borrar lo anterior.",
      };
    },
    branch: "vigia-patch/historia-inalterable",
    changeNote:
      "Retira el permiso de modificar o borrar. Si la política era «for all», hay que volver a " +
      "crear la de lectura con el alcance de VGI-133.",
    retests: [
      "Ninguna política ni línea del código actualiza o elimina registros de la historia clínica",
      "Las correcciones se guardan como anotaciones nuevas con autor, fecha y hora",
    ],
  },
  {
    code: "VGI-133",
    module: "static-scan",
    severity: "critico",
    title: "La historia clínica la puede leer cualquier usuario con sesión iniciada",
    summary:
      "La política de lectura de la tabla de historias clínicas solo exige haber iniciado " +
      "sesión: cualquier paciente o empleado puede leer la historia de todos.",
    legalAnalysis:
      "La historia clínica es un documento privado, sometido a reserva, que solo puede ser " +
      "conocido por terceros con autorización del paciente o en los casos de ley (art. 1 lit. " +
      "a de la Resolución 1995 de 1999 del Ministerio de Salud). Solo pueden acceder a ella el " +
      "usuario, el equipo de salud, las autoridades judiciales y de salud en los casos previstos " +
      "en la ley y las demás personas que la ley determine (art. 14), y la reserva debe " +
      "protegerse con mecanismos que impidan el acceso de personal no autorizado (art. 18). " +
      "Además, los datos de salud son sensibles (art. 5 de la Ley 1581 de 2012). Una política " +
      "que se conforma con una sesión iniciada pone la historia de cada paciente al alcance de " +
      "cualquier otro usuario de {cliente}.",
    ruleIds: ["col-salud-hc-reserva", "col-1581-sensibles", "col-1581-seguridad", "owasp-a01"],
    probe:
      "Búsqueda en las migraciones de políticas de lectura sobre tablas de historia clínica " +
      "cuya única condición es tener sesión (auth.role() = 'authenticated' o auth.uid() is " +
      "not null).",
    /* Las políticas `using (true)` no se reportan aquí: ya las cubre VGI-011. */
    detect: (ctx) =>
      politicasHC(ctx)
        .filter(
          (p) =>
            !/\bfor\s+(insert|update|delete)\b/i.test(p.sentencia) &&
            CUALQUIER_SESION.test(p.sentencia),
        )
        .map(comoHit),
    patch: (hits, ctx) => {
      const politica = politicaDe(ctx, hits[0])!;
      return {
        kind: "codigo",
        target: politica.path,
        removed: politica.lines,
        added: [
          `create policy "historia_reserva" on public.${politica.tabla} for select`,
          "  using (auth.uid() = paciente_id or es_equipo_tratante(auth.uid(), paciente_id));",
          "-- Solo el paciente y su equipo de salud leen la historia (Resolución 1995 de 1999, arts. 14",
          "-- y 18). paciente_id y es_equipo_tratante() deben ajustarse al esquema real.",
        ],
        expectedImpact:
          "Cada paciente ve solo su historia y el personal solo la de los pacientes que atiende, " +
          "que son las personas que el art. 14 de la Resolución 1995 de 1999 autoriza.",
      };
    },
    branch: "vigia-patch/reserva-historia-clinica",
    changeNote:
      "Reemplaza la política de lectura. Requiere una función que diga qué profesionales " +
      "atienden a cada paciente.",
    retests: [
      "Un usuario con sesión no puede leer historias clínicas de otros pacientes",
      "El equipo de salud solo lee las historias de los pacientes que atiende",
    ],
  },
];
