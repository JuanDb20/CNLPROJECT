import Link from "next/link";
import { redirect } from "next/navigation";

import { ingresarPrueba } from "@/app/actions";
import { CincoPasos, type HallazgoEjemplo } from "@/components/portada/cinco-pasos";
import { Demostracion } from "@/components/portada/demostracion";
import { Revelar } from "@/components/portada/revelar";
import { Flecha, LEYES, SiteHeader, escalon } from "@/components/sitio";
import { MarkIcon } from "@/components/ui";
import { CHECK_CODES } from "@/domain/checks";
import { FRAMEWORKS, RULES, getRule } from "@/domain/compliance";
import { currentUser } from "@/server/auth";

import "./portada.css";

/* Escáner de la portada: un archivo de código en abstracto que VIGÍA recorre.
   Al pasar el haz, cada hallazgo queda marcado con la norma que incumple (la
   etiqueta sale del catálogo). Anchos en em; `mal` es la ficha señalada. */
type Fila = { in?: number; w: number[]; mal?: number; norma?: string; grave?: boolean };
const norma = (id: string) => getRule(id)!.label;
const CODIGO: Fila[] = [
  { w: [3.4, 5.2, 2.2, 7] },
  { w: [3.4, 8.4, 2.2, 9.6] },
  { w: [4.6, 6.2, 9], mal: 2, norma: norma("col-1581-transferencia"), grave: true },
  { w: [] },
  { w: [5.4, 6.4, 3.2, 1.4] },
  { in: 1, w: [3.2, 5.4, 8.6] },
  { in: 1, w: [2.6, 6, 9.2], mal: 1, norma: norma("col-1480-retracto") },
  { in: 2, w: [5.8, 11.4] },
  { in: 2, w: [4.4, 3.6, 7.2] },
  { in: 1, w: [1.4] },
  { in: 1, w: [3.8, 4.2, 8.8], mal: 2, norma: norma("col-1581-circulacion"), grave: true },
  { in: 2, w: [7, 5.2, 3] },
  { in: 2, w: [6.2, 9] },
  { in: 1, w: [1.4] },
  { w: [1.4] },
  { w: [] },
];

const sangria = (f: Fila) => ({ paddingLeft: `${(f.in ?? 0) * 1.6}em` });
const fichas = (f: Fila, revisado = false) =>
  f.w.map((w, j) => (
    <i key={j} className={revisado && j === f.mal ? "mal" : undefined} style={{ width: `${w}em` }} />
  ));

function Escaner() {
  return (
    <div className="escaner" aria-hidden>
      <ol className="codigo">
        {CODIGO.map((f, n) => (
          <li key={n} style={sangria(f)}>
            {fichas(f)}
          </li>
        ))}
      </ol>
      <ol className="codigo revisado">
        {CODIGO.map((f, n) =>
          f.norma ? (
            <li key={n} className={f.grave ? "hit grave" : "hit"} style={sangria(f)}>
              {fichas(f, true)}
              <span className="norma">{f.norma}</span>
            </li>
          ) : (
            <li key={n} />
          ),
        )}
      </ol>
      <div className="haz" />
    </div>
  );
}

/* Ejemplos del paso «Revisar y corregir»: las mismas normas que marca el escáner,
   con la etiqueta del catálogo. */
const HALLAZGOS: HallazgoEjemplo[] = [
  {
    grave: true,
    norma: norma("col-1581-transferencia"),
    titulo: "Datos personales enviados a un proveedor de IA en un país sin nivel adecuado de protección",
  },
  {
    grave: true,
    norma: norma("col-1581-circulacion"),
    titulo: "Datos de un usuario visibles para otros usuarios con sesión",
  },
  {
    grave: false,
    norma: norma("col-1480-retracto"),
    titulo: "La compra en línea no informa el derecho de retracto",
  },
];

/* Marcos que se reportan como incumplimiento (los de referencia comparada, no). */
const NORMAS = Object.values(FRAMEWORKS).filter((f) => !/\(ref\.\)/.test(f.shortName));

function Probar({ className, texto = "Probar sin registrarse" }: { className: string; texto?: string }) {
  return (
    <form action={ingresarPrueba}>
      <button type="submit" className={className}>
        <span>{texto}</span>
        <Flecha />
      </button>
    </form>
  );
}

export default async function Home() {
  if (await currentUser()) redirect("/panel");

  return (
    <div className="sitio portada">
      <div className="frame">
        <SiteHeader />

        <main id="contenido">
          <div className="sp sp-a" />
          <Escaner />
          <section className="hero">
            <h1>
              <span className="ln">
                <span>Auditoría adversarial</span>
              </span>
              <span className="ln" style={escalon(1)}>
                <span>de apps hechas con IA</span>
              </span>
            </h1>
            {/* Eslogan nuevo (Sara, 27-oct): sin «el abogado firma»; el papel del
                abogado se presenta en el modelo de negocio del pitch. */}
            <p className="sub">
              Cada hallazgo, con la norma que incumple
              <br />
              y la corrección para cerrarlo.
            </p>
            <Probar className="btn btn-cta" />
          </section>
          <div className="sp sp-b" />
          <ul className="stats" aria-label="Leyes que revisa VIGÍA">
            {LEYES.map((c, n) => (
              <li key={c.label} className="stat" style={escalon(n)}>
                <span className="num">{c.n}</span>
                <span className="lab">{c.label}</span>
              </li>
            ))}
          </ul>
          <div className="sp sp-c" />
        </main>

        <a href="#problema" className="bajar">
          Cómo funciona
          <svg viewBox="0 0 16 16" aria-hidden>
            <path d="M3 6l5 5 5-5" />
          </svg>
        </a>
      </div>

      <div className="portada-mas">
        <section id="problema" className="pm-seccion pm-dos" aria-labelledby="pm-problema">
          <div data-revelar>
            <p className="pm-eyebrow">01 · El problema</p>
            <h2 id="pm-problema" className="pm-h2">
              Un código puede cambiar después de revisarlo.
            </h2>
            <p className="pm-p">
              Si no queda fijada la versión que se revisó, después nadie puede demostrar sobre qué se
              hizo la revisión. Las apps hechas con IA salen en días y casi nadie revisa su código con la
              norma en la mano.
            </p>
            <p className="pm-p">
              VIGÍA fija la versión con una huella digital, corre sus pruebas sin tocar producción y deja
              constancia de lo encontrado, lo corregido y lo que se volvió a probar.
            </p>
          </div>
          <div data-revelar style={escalon(1)}>
            <Demostracion pruebas={CHECK_CODES.length} />
          </div>
        </section>

        <section id="pasos" className="pm-seccion" aria-labelledby="pm-pasos">
          <div data-revelar>
            <p className="pm-eyebrow">02 · Cómo funciona</p>
            <h2 id="pm-pasos" className="pm-h2">
              Cinco pasos, de la carpeta al informe.
            </h2>
            <p className="pm-p">Sin necesidad de saber de GitHub ni de criptografía. Recorre cada etapa.</p>
          </div>
          <div data-revelar style={escalon(1)}>
            <CincoPasos
              pruebas={CHECK_CODES.length}
              hallazgos={HALLAZGOS}
              cta={<Probar className="btn btn-cta" texto="Ir a la herramienta" />}
            />
          </div>
        </section>

        <section className="pm-seccion pm-cifras" aria-labelledby="pm-revisa">
          <div data-revelar>
            <p className="pm-eyebrow">03 · Qué revisa</p>
            <h2 id="pm-revisa" className="pm-h2">
              La norma colombiana, prueba por prueba.
            </h2>
          </div>
          <ul className="pm-numeros" data-revelar style={escalon(1)}>
            <li>
              <span className="pm-num">{CHECK_CODES.length}</span>
              <span className="pm-lab">pruebas automáticas de cumplimiento</span>
            </li>
            <li>
              <span className="pm-num">{RULES.length}</span>
              <span className="pm-lab">obligaciones legales que verifica</span>
            </li>
          </ul>
          <div className="pm-normas" data-revelar style={escalon(2)}>
            <p className="pm-normas-rotulo">Normas que revisa</p>
            <ul>
              {NORMAS.map((f) => (
                <li key={f.id} title={f.name}>
                  {f.shortName}
                </li>
              ))}
            </ul>
            <Link href="/mapa" className="pm-enlace">
              Ver el mapa completo de funcionalidades <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section className="pm-seccion pm-somos" aria-labelledby="pm-somos" data-revelar>
          <p className="pm-eyebrow">04 · Quiénes somos</p>
          <h2 id="pm-somos" className="pm-h2">
            Revisión legal de software, con evidencia de qué se revisó.
          </h2>
          <p className="pm-p">
            Un equipo de Derecho, Contaduría e Ingeniería de Sistemas. VIGÍA analiza sistemas de
            software —incluidos los que usan inteligencia artificial— frente a las normas que les
            aplican, y explica los resultados sin tecnicismos para equipos jurídicos y técnicos.
          </p>
          <Link href="/quienes-somos" className="pm-enlace">
            Conoce al equipo <span aria-hidden>→</span>
          </Link>
        </section>

        <section className="pm-cta" data-revelar aria-labelledby="pm-cta">
          <h2 id="pm-cta" className="pm-h2">
            Revisa tu app antes de que la revise otro.
          </h2>
          <div className="pm-cta-acciones">
            <Probar className="btn btn-cta" />
            <Link href="/ingresar" className="pm-enlace">
              Ingresar o crear cuenta <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <footer className="pm-pie">
          <span className="pm-pie-marca">
            <MarkIcon className="size-5" />
            VIGÍA
          </span>
          <nav aria-label="Pie de página">
            <Link href="/privacidad">Política de tratamiento de datos</Link>
            <Link href="/verificar">Verificar informe</Link>
            <Link href="/transparencia">Transparencia</Link>
            <Link href="/quienes-somos">Quiénes somos</Link>
          </nav>
        </footer>
      </div>
      <Revelar />
    </div>
  );
}
