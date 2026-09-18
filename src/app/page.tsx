import { iniciarAuditoria } from "./actions";
import { FRAMEWORKS } from "@/domain/compliance";
import { MODULES } from "@/engine/modules";
import { ShieldIcon, buttonClass } from "@/components/ui";

const PROBLEM = [
  {
    title: "El código ya no lo escribe un ingeniero",
    body:
      "Las áreas de negocio generan asistentes de IA con herramientas de vibecoding. " +
      "El resultado llega a producción sin revisión jurídica y sin que nadie pueda " +
      "explicar qué datos toca el modelo.",
  },
  {
    title: "El abogado no tiene cómo verificarlo",
    body:
      "Auditar hoy significa pedir capturas de pantalla y confiar en la palabra del " +
      "equipo técnico. No hay evidencia oponible ante la Superintendencia de Industria " +
      "y Comercio si se materializa una queja.",
  },
  {
    title: "La norma ya es exigible",
    body:
      "Ley 1581 de 2012, Ley 1266 de 2008 y, para quien opere hacia la Unión Europea, " +
      "el Reglamento (UE) 2024/1689. La obligación existe; la herramienta para " +
      "acreditarla, no.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[880px] px-5 py-14 sm:py-20">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full border border-line-strong text-ink"
        >
          <ShieldIcon className="size-4" />
        </span>
        <span className="leading-none">
          <span className="block text-[17px] font-semibold tracking-[0.14em] text-ink">
            VIGÍA
          </span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
            Red Team IA
          </span>
        </span>
      </div>

      <h1 className="mt-10 text-[30px] leading-[1.15] font-semibold tracking-tight text-ink sm:text-[38px]">
        Auditoría adversarial de aplicaciones de IA,
        <br className="hidden sm:block" /> con evidencia que un abogado puede firmar.
      </h1>

      <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
        VIGÍA ataca el asistente de IA de una empresa en un entorno aislado y autorizado,
        traduce cada falla técnica a la norma que incumple y propone el parche. El
        entregable no es un informe: es un certificado encadenado por hash, con la
        evidencia del ataque y del retesteo.
      </p>

      <form action={iniciarAuditoria} className="mt-8">
        <button type="submit" className={buttonClass("primary")}>
          Iniciar auditoría de demostración
        </button>
        <p className="mt-2.5 text-[12px] text-ink-muted">
          Escenario precargado: <span className="font-medium">Fintrex</span>, fintech
          colombiana con un asistente generado por vibecoding.
        </p>
      </form>

      {/* Problema */}
      <section className="mt-16 border-t border-line pt-10">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-faint">
          El problema
        </h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          {PROBLEM.map((item) => (
            <div key={item.title}>
              <h3 className="text-[13px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Módulos */}
      <section className="mt-12 border-t border-line pt-10">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-faint">
          Módulos de análisis
        </h2>
        <ul className="mt-5 divide-y divide-line">
          {MODULES.map((module) => (
            <li
              key={module.id}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
            >
              <span className="text-[13px] font-medium text-ink">{module.name}</span>
              <span className="text-[12px] text-ink-muted">{module.description}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Marcos */}
      <section className="mt-12 border-t border-line pt-10">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-faint">
          Marcos evaluados
        </h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {Object.values(FRAMEWORKS).map((framework) => (
            <div key={framework.id}>
              <dt className="text-[13px] font-semibold text-ink">
                {framework.name}
              </dt>
              <dd className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                <span className="font-mono text-[11px] text-ink-soft">
                  {framework.citation}
                </span>
                <br />
                {framework.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="mt-14 border-t border-line pt-6 text-[11px] leading-relaxed text-ink-faint">
        Prototipo. Los hallazgos corresponden a un escenario de demostración sobre un
        cliente ficticio y no constituyen asesoría jurídica.
      </footer>
    </div>
  );
}
