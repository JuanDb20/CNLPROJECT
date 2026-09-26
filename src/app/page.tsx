import Link from "next/link";
import { redirect } from "next/navigation";

import { ingresarPrueba } from "@/app/actions";
import { Flecha, LEYES, SiteHeader, escalon } from "@/components/sitio";
import { getRule } from "@/domain/compliance";
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
            <p className="sub">
              Cada hallazgo, con la norma que incumple;
              <br />
              VIGÍA lo propone y un abogado lo firma.
            </p>
            <form action={ingresarPrueba}>
              <button type="submit" className="btn btn-cta">
                <span>Probar sin registrarse</span>
                <Flecha />
              </button>
            </form>
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

        <Link href="/privacidad" className="legal">
          Política de tratamiento de datos
        </Link>
      </div>
    </div>
  );
}
