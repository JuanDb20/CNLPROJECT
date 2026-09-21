import Link from "next/link";

import { ingresarPrueba } from "@/app/actions";
import { Reveal } from "@/components/reveal";
import { MarkIcon, buttonClass, cx } from "@/components/ui";
import { FRAMEWORKS } from "@/domain/compliance";
import { MODULES } from "@/engine/modules";

/**
 * Página pública de VIGÍA.
 *
 * Es lo primero que ve alguien que no conoce el producto —un jurado, un
 * abogado, un inversionista— y por eso no pasa por el portal de acceso ni pide
 * credenciales: explica el problema, el recorrido y quién responde por él.
 *
 * Regla de redacción de esta página: una idea por bloque y ninguna frase que
 * podría estar en cualquier otro producto de IA. Los datos que se afirman aquí
 * (módulos, marcos normativos) se leen del dominio, no se escriben a mano, para
 * que la promesa pública no pueda desalinearse del producto.
 */

/* ------------------------------------------------------------------ */
/* Contenido editorial                                                 */
/* ------------------------------------------------------------------ */

/* TODO equipo: el eslogan definitivo se decide entre todos. Las alternativas
   redactadas están en docs/marca-eslogan.md; cambiar aquí las dos líneas. */
const TITULAR = "Auditamos el código de tu IA. Firma un abogado.";
const BAJADA =
  "VIGÍA lee el código de tu sistema de inteligencia artificial, señala qué norma " +
  "incumple y produce el informe que tu abogado revisa y firma.";

const PROBLEMA = [
  {
    clave: "01",
    titulo: "El software ya no lo escribe un ingeniero",
    texto:
      "Las áreas de negocio generan asistentes de IA con herramientas de vibecoding y los " +
      "publican sin revisión. Nadie en la empresa puede decir qué datos toca el modelo.",
  },
  {
    clave: "02",
    titulo: "El abogado no tiene cómo verificarlo",
    texto:
      "Revisar hoy significa pedir capturas y creer en la palabra del área técnica. Si llega " +
      "una queja a la Superintendencia, no hay nada que aportar como prueba.",
  },
  {
    clave: "03",
    titulo: "La norma ya es exigible",
    texto:
      "Ley 1581 de 2012, Ley 1266 de 2008 y la Circular Externa 002 de 2024 de la SIC aplican " +
      "hoy. La obligación existe; faltaba la herramienta para acreditar que se cumple.",
  },
];

const ENTREGA = [
  {
    titulo: "Informe firmado",
    texto:
      "Doce secciones con el código auditado, su hash, los hallazgos y la puntuación. " +
      "Se descarga en Word y en PDF, y se verifica por su huella.",
  },
  {
    titulo: "Documentos jurídicos",
    texto:
      "Borradores de contrato de transmisión, ficha de transparencia del sistema y política " +
      "de gobernanza, redactados a partir del código real del cliente.",
  },
  {
    titulo: "Inventario de tratamientos",
    texto:
      "Qué dato personal entra, desde qué línea del código, hacia qué proveedor y bajo qué " +
      "base de legitimación. En pantalla y en hoja de cálculo.",
  },
];

const LIMITES = [
  "VIGÍA propone el análisis jurídico; la firma y la responsabilidad son del abogado.",
  "No se conecta a producción ni a bases de datos activas: solo lee el código autorizado.",
  "No ejecuta ninguna prueba sin la autorización escrita del representante legal del cliente.",
];

/* TODO equipo: reemplazar por los datos reales de cada integrante.
   El orden de esta lista es el orden en que aparecen en la página. */
const EQUIPO = [
  { nombre: "[Nombre completo]", rol: "[Derecho · Universidad]", linea: "[Una línea: qué aporta al proyecto]" },
  { nombre: "[Nombre completo]", rol: "[Ingeniería · Universidad]", linea: "[Una línea: qué aporta al proyecto]" },
  { nombre: "[Nombre completo]", rol: "[Rol · Universidad]", linea: "[Una línea: qué aporta al proyecto]" },
];

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

function Seccion({
  id,
  etiqueta,
  titulo,
  children,
}: {
  id?: string;
  etiqueta: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line py-16 sm:py-20">
      <Reveal>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-brand">
          {etiqueta}
        </p>
        <h2 className="mt-3 max-w-[22ch] text-[24px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">
          {titulo}
        </h2>
      </Reveal>
      <div className="mt-9">{children}</div>
    </section>
  );
}

/** Maqueta del producto en el hero: sugiere la consola sin ser una captura. */
function Maqueta() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-[560px]">
      <div className="relative overflow-hidden rounded-[12px] border border-line bg-surface shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
          <span aria-hidden className="size-2 rounded-full bg-line-strong" />
          <span aria-hidden className="size-2 rounded-full bg-line-strong" />
          <span className="ml-1.5 font-mono text-[10px] text-ink-faint">
            vigia · ejecución en el entorno aislado
          </span>
        </div>

        <div className="relative space-y-2 p-4 text-left font-mono text-[10.5px] leading-[1.9]">
          <span
            aria-hidden
            className="scanline pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-brand/10 to-transparent"
          />
          <p className="text-ink-faint">
            <span className="text-ink-muted">[código]</span> 6 archivos · sha-256 b75e19d6…
          </p>
          <p className="text-brand">
            <span className="text-ink-muted">[prueba]</span> herramienta del agente sin control de acceso
          </p>
          <p className="text-critical">
            <span className="text-ink-muted">[hallazgo]</span> biometría facial tratada sin autorización
            explícita
          </p>
          <p className="text-legal">
            <span className="text-ink-muted">[norma]</span> Ley 1581 de 2012, arts. 5 y 6
          </p>
          <p className="text-safe">
            <span className="text-ink-muted">[informe]</span> listo para revisión y firma del abogado
          </p>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-ink-faint">
        Ejemplo del recorrido. El caso de demostración usa un cliente ficticio.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function Landing() {
  const marcosColombia = Object.values(FRAMEWORKS).filter(
    (f) => f.jurisdiction === "Colombia",
  );
  const marcosOtros = Object.values(FRAMEWORKS).filter(
    (f) => f.jurisdiction !== "Colombia",
  );

  return (
    <div id="contenido" role="main">
      {/* ------------------------------ Navegación ------------------------------ */}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur">
        <nav className="mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between px-5">
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-[7px] border border-line-strong text-brand"
            >
              <MarkIcon className="size-[15px]" />
            </span>
            <span className="text-[14px] font-semibold tracking-[0.14em] text-ink">
              VIGÍA
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <Link
              href="#como-funciona"
              className="hidden rounded-[7px] px-3 py-2 text-[12.5px] text-ink-muted transition-colors hover:text-ink sm:block"
            >
              Cómo funciona
            </Link>
            <Link
              href="#equipo"
              className="hidden rounded-[7px] px-3 py-2 text-[12.5px] text-ink-muted transition-colors hover:text-ink sm:block"
            >
              Equipo
            </Link>
            <Link href="/ingresar" className={cx(buttonClass("ghost"), "px-3 py-2")}>
              Ingresar
            </Link>
          </div>
        </nav>
      </header>

      {/* --------------------------------- Hero --------------------------------- */}
      <section className="relative overflow-hidden">
        <span aria-hidden className="hero-glow" />
        <span aria-hidden className="absolute inset-0 grid-faint" />

        <div className="relative mx-auto w-full max-w-[1080px] px-5 pb-4 pt-20 text-center sm:pt-28">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              <span aria-hidden className="size-1.5 rounded-full bg-brand" />
              Equipo rojo legal para sistemas de IA
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-7 max-w-[15ch] text-[34px] font-semibold leading-[1.08] tracking-tight text-ink sm:max-w-[20ch] sm:text-[50px]">
              {TITULAR}
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-[56ch] text-[15px] leading-relaxed text-ink-soft sm:text-[16px]">
              {BAJADA}
            </p>
          </Reveal>

          {/* Dos acciones, del mismo ancho y centradas: una sola decisión real. */}
          <Reveal delay={0.24}>
            <div className="mx-auto mt-9 flex w-full max-w-[420px] flex-col items-stretch justify-center gap-3 sm:flex-row">
              <form action={ingresarPrueba} className="sm:flex-1">
                <button type="submit" className={cx(buttonClass("brand", true), "h-11")}>
                  Probar sin registrarse
                </button>
              </form>
              <Link
                href="/registro"
                className={cx(buttonClass("secondary", true), "h-11 sm:flex-1")}
              >
                Crear cuenta
              </Link>
            </div>
            <p className="mt-3 text-[11.5px] text-ink-faint">
              La prueba abre una auditoría de ejemplo con código real y fallas reales.
            </p>
          </Reveal>

          <Reveal delay={0.32}>
            <Maqueta />
          </Reveal>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1080px] px-5">
        {/* ------------------------------ El problema ----------------------------- */}
        <Seccion etiqueta="El problema" titulo="Hay IA en producción que nadie leyó con la ley en la mano">
          <ul className="grid gap-x-8 gap-y-9 sm:grid-cols-3">
            {PROBLEMA.map((p, i) => (
              <Reveal as="li" key={p.clave} delay={i * 0.07}>
                <p className="font-mono text-[11px] text-brand">{p.clave}</p>
                <h3 className="mt-2.5 text-[14px] font-semibold leading-snug text-ink">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{p.texto}</p>
              </Reveal>
            ))}
          </ul>
        </Seccion>

        {/* ----------------------------- Cómo funciona ---------------------------- */}
        <Seccion
          id="como-funciona"
          etiqueta="Cómo funciona"
          titulo="Cuatro módulos sobre el código, en un entorno aislado"
        >
          <ol className="divide-y divide-line border-y border-line">
            {MODULES.map((m, i) => (
              <Reveal as="li" key={m.id} delay={i * 0.06}>
                <div className="flex flex-col gap-1.5 py-5 sm:flex-row sm:items-baseline sm:gap-7">
                  <span className="shrink-0 font-mono text-[11px] text-ink-faint sm:w-8">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="shrink-0 text-[14px] font-medium text-ink sm:w-[19rem]">
                    {m.name}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-ink-muted">{m.description}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.1}>
            <p className="mt-7 max-w-[62ch] text-[13px] leading-relaxed text-ink-muted">
              Cada hallazgo queda unido a la línea de código que lo produce y al artículo que
              incumple. El abogado revisa esa pareja —evidencia y norma— y decide si firma.
            </p>
          </Reveal>
        </Seccion>

        {/* ------------------------------ Qué entrega ----------------------------- */}
        <Seccion etiqueta="Qué entrega" titulo="Documentos, no una pantalla bonita">
          <div className="grid gap-4 sm:grid-cols-3">
            {ENTREGA.map((e, i) => (
              <Reveal key={e.titulo} delay={i * 0.07}>
                <div className="h-full rounded-[10px] border border-line bg-surface p-5">
                  <h3 className="text-[14px] font-semibold text-ink">{e.titulo}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{e.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Seccion>

        {/* ---------------------------- Marco normativo --------------------------- */}
        <Seccion etiqueta="Marco normativo" titulo="Normas colombianas primero, comparadas después">
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-legal">
                Vigentes en Colombia
              </p>
              <ul className="mt-4 space-y-3.5">
                {marcosColombia.map((f) => (
                  <li key={f.id}>
                    <p className="text-[13px] font-medium text-ink">{f.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-ink-faint">
                      {f.citation}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.08}>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                Estándares y referencia comparada
              </p>
              <ul className="mt-4 space-y-3.5">
                {marcosOtros.map((f) => (
                  <li key={f.id}>
                    <p className="text-[13px] font-medium text-ink-soft">{f.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-ink-faint">
                      {f.citation}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[12px] leading-relaxed text-ink-faint">
                Las normas europeas se citan como referencia comparada, nunca como derecho
                vigente en Colombia.
              </p>
            </Reveal>
          </div>
        </Seccion>

        {/* ------------------------------ Los límites ----------------------------- */}
        <Seccion etiqueta="Los límites" titulo="Lo que VIGÍA no hace">
          <ul className="space-y-3">
            {LIMITES.map((l, i) => (
              <Reveal as="li" key={l} delay={i * 0.06}>
                <div className="flex gap-3">
                  <span aria-hidden className="mt-[9px] h-px w-5 shrink-0 bg-brand-dim" />
                  <p className="text-[13.5px] leading-relaxed text-ink-soft">{l}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Seccion>

        {/* -------------------------------- Equipo -------------------------------- */}
        <Seccion id="equipo" etiqueta="Equipo" titulo="Quién responde por esto">
          <div className="grid gap-4 sm:grid-cols-3">
            {EQUIPO.map((p, i) => (
              <Reveal key={i} delay={i * 0.07}>
                <div className="h-full rounded-[10px] border border-line bg-surface p-5">
                  <span
                    aria-hidden
                    className="grid size-9 place-items-center rounded-full border border-line-strong font-mono text-[12px] text-ink-faint"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-3.5 text-[14px] font-semibold text-ink">{p.nombre}</p>
                  <p className="mt-0.5 text-[12px] text-brand">{p.rol}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{p.linea}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Seccion>

        {/* ------------------------------ Cierre ---------------------------------- */}
        <section className="border-t border-line py-16 text-center sm:py-20">
          <Reveal>
            <h2 className="mx-auto max-w-[20ch] text-[24px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
              Abre una auditoría de ejemplo y recorre el flujo completo
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[14px] leading-relaxed text-ink-muted">
              Sin registro y sin datos de nadie: un cliente ficticio, código real con fallas
              reales y el informe al final.
            </p>
            <form action={ingresarPrueba} className="mt-8 flex justify-center">
              <button type="submit" className={cx(buttonClass("brand"), "h-11 px-6")}>
                Probar sin registrarse
              </button>
            </form>
          </Reveal>
        </section>
      </div>

      {/* -------------------------------- Pie ----------------------------------- */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            VIGÍA propone el análisis jurídico; cada hallazgo lo firma un abogado.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[11.5px] text-ink-muted">
            <Link href="/privacidad" className="transition-colors hover:text-ink">
              Política de tratamiento
            </Link>
            <Link href="/verificar" className="transition-colors hover:text-ink">
              Verificar un informe
            </Link>
            <Link href="/transparencia" className="transition-colors hover:text-ink">
              Transparencia
            </Link>
            <Link href="/ingresar" className="transition-colors hover:text-ink">
              Ingresar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
