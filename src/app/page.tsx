import Link from "next/link";
import { redirect } from "next/navigation";

import { ingresarPrueba } from "@/app/actions";
import { CIFRAS, Flecha, SiteHeader, escalon } from "@/components/sitio";
import { currentUser } from "@/server/auth";

import "./portada.css";

// ponytail: video enlazado desde un CDN ajeno; si es propio, servirlo desde /public.
const VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_132544_b6ef0174-ed95-45ad-9a2f-ccb8acfbdce8.mp4";

/* Filtro del video sobre blanco: la opacidad sale del brillo, con un umbral que
   borra el grano (lo negro y lo casi negro se vuelven transparentes), y el color
   va del petróleo #123B4A (grises) al verde azulado #2A9D8F (líneas rojas del
   original) según cuánto domina el rojo (R − G). */
const TINTE = [
  "0.0941 -0.0941 0 0 0.0706",
  "0.3843 -0.3843 0 0 0.2314",
  "0.2706 -0.2706 0 0 0.2902",
  "1.1 0.55 0.18 0 -0.14",
].join(" ");

export default async function Home() {
  if (await currentUser()) redirect("/panel");

  return (
    <div className="sitio portada">
      <svg className="svgdefs" aria-hidden>
        <filter id="tinte" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={TINTE} />
        </filter>
      </svg>
      <div className="bg" aria-hidden>
        <video src={VIDEO} autoPlay muted loop playsInline preload="auto" />
      </div>

      <div className="frame">
        <SiteHeader />

        <main id="contenido">
          <div className="sp sp-a" />
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
          <ul className="stats" aria-label="Catálogo de VIGÍA">
            {CIFRAS.map((c, n) => (
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
