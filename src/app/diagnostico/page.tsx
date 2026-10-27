import Link from "next/link";
import type { ReactNode } from "react";

import { ingresarPrueba } from "@/app/actions";
import { SitePage } from "@/components/sitio";
import { Card, Label, Panel, RuleChip, Tag, buttonClass, fieldClass } from "@/components/ui";
import { getFramework } from "@/domain/compliance";
import { ETAPAS, type Obligacion, diagnosticar, leerRespuestas, reglasDe } from "@/domain/etapas";

/**
 * Diagnóstico de etapa para quien funda una startup: ocho preguntas y, con
 * ellas, qué obligaciones ya le aplican y cuáles llegan con la etapa siguiente.
 * No pide sesión ni guarda nada: las respuestas viajan en la URL (solo opciones,
 * ningún dato personal) y el cálculo son las reglas fijas de src/domain/etapas.ts.
 */
export const metadata = { title: "Diagnóstico de etapa" };

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

function Pregunta({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <legend className="text-[13px] font-medium text-ink">{titulo}</legend>
      {ayuda ? <p className="mt-0.5 text-[11.5px] text-ink-muted">{ayuda}</p> : null}
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Opcion({
  tipo,
  name,
  value,
  marcada,
  requerida,
  children,
}: {
  tipo: "radio" | "checkbox";
  name: string;
  value: string;
  marcada: boolean;
  requerida?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] border border-line bg-surface px-3 py-2.5 text-[12.5px] leading-snug text-ink-soft has-[:checked]:border-ink has-[:checked]:text-ink">
      <input
        type={tipo}
        name={name}
        value={value}
        defaultChecked={marcada}
        required={requerida}
        className="mt-0.5 accent-[var(--color-ink)]"
      />
      <span>{children}</span>
    </label>
  );
}

function Item({ o }: { o: Obligacion }) {
  return (
    <li className="border-t border-line py-3.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13.5px] font-medium text-ink">{o.titulo}</h3>
        {o.pruebas ? <Tag tone="brand">VIGÍA lo revisa en el código</Tag> : null}
      </div>
      <p className="mt-1 max-w-[68ch] text-[12.5px] leading-relaxed text-ink-soft">{o.accion}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {reglasDe(o).map((r) => (
          <RuleChip key={r.id} kind={getFramework(r.framework).shortName} label={r.label} />
        ))}
        {o.fundamento ? <RuleChip kind="Norma" label={o.fundamento} /> : null}
      </div>
      {o.pruebas ? (
        <p className="mt-1.5 font-mono text-[10.5px] text-ink-faint">Pruebas {o.pruebas.join(" · ")}</p>
      ) : null}
    </li>
  );
}

export default async function DiagnosticoPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const tiene = (name: string, value: string) =>
    (Array.isArray(p[name]) ? p[name] : [p[name]]).includes(value);
  const respuestas = leerRespuestas(p);
  const d = respuestas ? diagnosticar(respuestas) : null;
  const revisadas = d ? [...d.ahora, ...d.despues].filter((o) => o.pruebas).length : 0;

  return (
    <SitePage actual="/diagnostico" className="mx-auto w-full max-w-[760px] space-y-6 px-5 pb-16 pt-8">
      <div>
        <h1 className="sitio-titulo">Diagnóstico de etapa</h1>
        <p className="sitio-bajada">
          Ocho preguntas sobre tu startup y VIGÍA te dice en qué etapa está, qué obligaciones ya te
          aplican y cuáles llegan con la siguiente, cada una con su norma. Las que se pueden ver en
          el código, VIGÍA las verifica en la auditoría.
        </p>
      </div>

      {p.desde === "codigo" ? (
        <Panel tone="brand">
          <p className="text-[12.5px] leading-relaxed text-ink">
            Algunas respuestas vienen marcadas con lo que VIGÍA leyó en el código auditado: cobros,
            proveedores de IA y datos personales o sensibles. Revísalas y responde quién programa y
            en qué punto está el producto: eso el código no lo dice.
          </p>
        </Panel>
      ) : null}

      <Card>
        <form method="get" action="/diagnostico#resultado" className="space-y-5">
          <Pregunta titulo="¿En qué punto está el producto?">
            <Opcion tipo="radio" name="producto" value="idea" marcada={tiene("producto", "idea")} requerida>
              Es una idea: aún no hay software
            </Opcion>
            <Opcion tipo="radio" name="producto" value="prototipo" marcada={tiene("producto", "prototipo")}>
              Hay un prototipo, sin usuarios reales
            </Opcion>
            <Opcion tipo="radio" name="producto" value="usuarios" marcada={tiene("producto", "usuarios")}>
              Ya lo usan personas reales
            </Opcion>
          </Pregunta>

          <Pregunta titulo="¿Quién programa o diseña?">
            <Opcion tipo="radio" name="equipo" value="socios" marcada={tiene("equipo", "socios")} requerida>
              Solo los socios
            </Opcion>
            <Opcion tipo="radio" name="equipo" value="contratistas" marcada={tiene("equipo", "contratistas")}>
              Personas o agencias por prestación de servicios
            </Opcion>
            <Opcion tipo="radio" name="equipo" value="empleados" marcada={tiene("equipo", "empleados")}>
              Empleados con contrato de trabajo
            </Opcion>
          </Pregunta>

          <Pregunta titulo="La empresa">
            <Opcion tipo="checkbox" name="sociedad" value="si" marcada={tiene("sociedad", "si")}>
              Ya constituimos la sociedad
            </Opcion>
            <Opcion tipo="checkbox" name="cobra" value="si" marcada={tiene("cobra", "si")}>
              Ya cobramos o facturamos
            </Opcion>
            <Opcion tipo="checkbox" name="inversion" value="si" marcada={tiene("inversion", "si")}>
              Estamos levantando o ya levantamos inversión
            </Opcion>
          </Pregunta>

          <Pregunta titulo="La marca">
            <Opcion tipo="radio" name="marca" value="registrada" marcada={tiene("marca", "registrada")}>
              Registrada ante la SIC
            </Opcion>
            <Opcion tipo="radio" name="marca" value="en-uso" marcada={tiene("marca", "en-uso")}>
              La usamos, pero no está registrada
            </Opcion>
            <Opcion tipo="radio" name="marca" value="no" marcada={tiene("marca", "no")}>
              Aún no tenemos nombre
            </Opcion>
          </Pregunta>

          <Pregunta titulo="¿Qué datos trata el producto?" ayuda="Marca todos los que apliquen.">
            <Opcion tipo="checkbox" name="datos" value="personales" marcada={tiene("datos", "personales")}>
              Datos personales: nombre, correo, cédula
            </Opcion>
            <Opcion tipo="checkbox" name="datos" value="sensibles" marcada={tiene("datos", "sensibles")}>
              Salud o biometría: selfie, huella
            </Opcion>
            <Opcion tipo="checkbox" name="datos" value="menores" marcada={tiene("datos", "menores")}>
              Datos de niños, niñas o adolescentes
            </Opcion>
            <Opcion tipo="checkbox" name="datos" value="financieros" marcada={tiene("datos", "financieros")}>
              Crédito, pagos o deudas
            </Opcion>
          </Pregunta>

          <Pregunta titulo="Inteligencia artificial">
            <Opcion tipo="checkbox" name="ia" value="si" marcada={tiene("ia", "si")}>
              Enviamos datos a servicios de IA de terceros (OpenAI, Anthropic, Google…)
            </Opcion>
            <Opcion tipo="checkbox" name="herramienta" value="si" marcada={tiene("herramienta", "si")}>
              El código se hizo con herramientas de IA (Lovable, Cursor, Bolt…)
            </Opcion>
          </Pregunta>

          <fieldset className="border-t border-line pt-4">
            <legend className="text-[13px] font-medium text-ink">Sector</legend>
            <input
              name="sector"
              list="sectores"
              maxLength={120}
              defaultValue={typeof p.sector === "string" ? p.sector : ""}
              placeholder="Por ejemplo: Financiero y fintech"
              aria-label="Sector"
              className={fieldClass}
            />
            <datalist id="sectores">
              <option value="Financiero y fintech" />
              <option value="Salud" />
              <option value="Educación y menores" />
              <option value="Comercio electrónico" />
              <option value="Talento humano" />
              <option value="Entidad pública" />
            </datalist>
          </fieldset>

          <Pregunta titulo="¿Opera o va a operar fuera de Colombia?">
            <Opcion tipo="checkbox" name="exterior" value="chile" marcada={tiene("exterior", "chile")}>
              Chile
            </Opcion>
            <Opcion tipo="checkbox" name="exterior" value="ue" marcada={tiene("exterior", "ue")}>
              Unión Europea
            </Opcion>
          </Pregunta>

          <div className="flex flex-col sm:flex-row sm:justify-end">
            <button type="submit" className={buttonClass("brand")}>
              Ver mi diagnóstico
            </button>
          </div>
        </form>
      </Card>

      {d ? (
        <section id="resultado" className="space-y-6 scroll-mt-6">
          <Card>
            <Label>Tu etapa</Label>
            <p className="text-[20px] font-semibold tracking-tight text-ink">{d.etapa.nombre}</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">{d.etapa.descripcion}</p>
            <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Etapas">
              {ETAPAS.map((e) => (
                <li
                  key={e.id}
                  aria-current={e.id === d.etapa.id ? "step" : undefined}
                  className={`rounded-[6px] px-1.5 py-1.5 text-center text-[10.5px] leading-tight ${
                    e.id === d.etapa.id ? "bg-ink text-canvas" : "bg-surface-muted text-ink-muted"
                  }`}
                >
                  {e.nombre}
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <Label>Lo que ya te aplica ({d.ahora.length})</Label>
            <ul>
              {d.ahora.map((o) => (
                <Item key={o.id} o={o} />
              ))}
            </ul>
          </Card>

          {d.siguiente && d.despues.length > 0 ? (
            <Card>
              <Label>
                Lo que llega con la etapa «{d.siguiente.nombre}» ({d.despues.length})
              </Label>
              <ul>
                {d.despues.map((o) => (
                  <Item key={o.id} o={o} />
                ))}
              </ul>
            </Card>
          ) : null}

          {d.especialista ? (
            <Card>
              <Label>Especialista que se activa</Label>
              <p className="text-[14px] font-medium text-ink">{d.especialista.name}</p>
              <p className="mt-1.5 max-w-[68ch] text-[12px] leading-relaxed text-ink-muted">
                {d.especialista.note}
              </p>
            </Card>
          ) : null}

          <Card>
            <p className="text-[13px] leading-relaxed text-ink">
              {revisadas > 0
                ? `VIGÍA verifica en el código ${revisadas} de estas obligaciones y propone la corrección de cada falla.`
                : "Cuando haya código, VIGÍA verifica en él las obligaciones que se pueden ver ahí."}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <form action={ingresarPrueba}>
                <button type="submit" className={buttonClass("brand", true)}>
                  Probar la auditoría sin registrarse
                </button>
              </form>
              <Link href="/registro" className={buttonClass("secondary")}>
                Crear cuenta de abogado
              </Link>
            </div>
          </Card>

          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            Es una orientación general calculada con reglas fijas a partir de tus respuestas: las
            mismas respuestas dan siempre el mismo resultado y ningún texto lo redacta un modelo de
            lenguaje. No es un concepto jurídico; el concepto sobre tu caso lo firma un abogado.
          </p>
        </section>
      ) : null}
    </SitePage>
  );
}
