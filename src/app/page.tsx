import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

import { ingresarPrueba } from "@/app/actions";
import { MarkIcon } from "@/components/ui";
import { CHECK_CODES } from "@/domain/checks";
import { ALL_FRAMEWORK_IDS, RULES } from "@/domain/compliance";
import { currentUser } from "@/server/auth";

import { PortadaCliente } from "./portada-cliente";
import "./portada.css";

/* next/font sirve las fuentes desde el propio dominio: ninguna petición del
   visitante sale a Google. */
const sg = Space_Grotesk({ subsets: ["latin"], display: "block", variable: "--font-sg" });
const jb = JetBrains_Mono({ subsets: ["latin"], display: "block", variable: "--font-jb" });

// ponytail: video enlazado desde un CDN ajeno; si es propio, servirlo desde /public.
const VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_132544_b6ef0174-ed95-45ad-9a2f-ccb8acfbdce8.mp4";

/* Las cifras salen del catálogo, no se escriben a mano: así no quedan viejas. */
const CIFRAS = [
  { n: CHECK_CODES.length, label: "Pruebas" },
  { n: RULES.length, label: "Obligaciones" },
  { n: ALL_FRAMEWORK_IDS.length, label: "Marcos" },
];

const NAV = [
  { href: "/mapa", label: "Cómo funciona" },
  { href: "/verificar", label: "Verificar informe" },
  { href: "/transparencia", label: "Transparencia" },
  { href: "/registro", label: "Crear cuenta" },
];

/* Curvas de color del video: pasada principal y pasada de realce, más oscura. */
const GRADE = {
  r: "0.0018 0.0105 0.0154 0.0228 0.0307 0.0404 0.0485 0.0585 0.0719 0.0923 0.1205 0.1466 0.1657 0.1866 0.2197 0.2405 0.2485 0.2921 0.3362 0.3465 0.3472 0.3781 0.3781 0.4078 0.4199 0.4391 0.4604 0.4763 0.4798 0.5197 0.5473 0.5720 0.5995 0.6048 0.6232 0.6322 0.6483 0.6734 0.7201 0.7201 0.7410 0.7707 0.7707 0.7790 0.8084 0.8084 0.8390 0.8595 0.8707 0.8870 0.8993 0.9085 0.9132 0.9132 0.9162 0.9162 0.9162 0.9162 0.9162 0.9162 0.9162 0.9162 0.9162 0.9238 0.9300",
  g: "0.0023 0.0106 0.0159 0.0250 0.0333 0.0445 0.0535 0.0620 0.0707 0.0827 0.0936 0.1063 0.1214 0.1402 0.1678 0.1727 0.2029 0.2176 0.2461 0.2757 0.2814 0.3050 0.3415 0.3692 0.3826 0.3884 0.4617 0.4617 0.4617 0.4643 0.4643 0.4808 0.5706 0.6005 0.6005 0.6390 0.6390 0.6390 0.6390 0.6390 0.6390 0.6390 0.6390 0.6390 0.6524 0.6664 0.6805 0.6945 0.7086 0.7227 0.7367 0.7508 0.7648 0.7789 0.7929 0.8070 0.8211 0.8351 0.8492 0.8632 0.8773 0.8913 0.9054 0.9195 0.9300",
  b: "0.0021 0.0110 0.0187 0.0311 0.0377 0.0466 0.0584 0.0706 0.0791 0.0924 0.1039 0.1145 0.1316 0.1464 0.1614 0.1719 0.1887 0.2014 0.2247 0.2458 0.2954 0.2954 0.3089 0.3938 0.3938 0.3988 0.3988 0.4581 0.4581 0.4762 0.4762 0.4763 0.5374 0.5560 0.5813 0.5813 0.5813 0.5813 0.5835 0.5969 0.6104 0.6238 0.6373 0.6507 0.6642 0.6777 0.6911 0.7046 0.7181 0.7315 0.7449 0.7584 0.7719 0.7853 0.7988 0.8123 0.8257 0.8391 0.8526 0.8661 0.8795 0.8930 0.9065 0.9199 0.9300",
};
const GRADE2 = {
  r: "0.0016 0.0092 0.0136 0.0201 0.0270 0.0356 0.0427 0.0515 0.0633 0.0812 0.1060 0.1290 0.1458 0.1642 0.1933 0.2116 0.2187 0.2570 0.2959 0.3049 0.3055 0.3327 0.3327 0.3589 0.3695 0.3864 0.4052 0.4191 0.4222 0.4573 0.4816 0.5034 0.5276 0.5322 0.5484 0.5563 0.5705 0.5926 0.6337 0.6337 0.6521 0.6782 0.6782 0.6855 0.7114 0.7114 0.7383 0.7564 0.7662 0.7806 0.7914 0.7995 0.8036 0.8036 0.8063 0.8063 0.8063 0.8063 0.8063 0.8063 0.8063 0.8063 0.8063 0.8129 0.8184",
  g: "0.0015 0.0069 0.0103 0.0163 0.0216 0.0289 0.0348 0.0403 0.0460 0.0538 0.0608 0.0691 0.0789 0.0911 0.1091 0.1123 0.1319 0.1414 0.1600 0.1792 0.1829 0.1983 0.2220 0.2400 0.2487 0.2525 0.3001 0.3001 0.3001 0.3018 0.3018 0.3125 0.3709 0.3903 0.3903 0.4153 0.4153 0.4153 0.4153 0.4153 0.4153 0.4153 0.4153 0.4153 0.4241 0.4332 0.4423 0.4514 0.4606 0.4698 0.4789 0.4880 0.4971 0.5063 0.5154 0.5246 0.5337 0.5428 0.5520 0.5611 0.5702 0.5793 0.5885 0.5977 0.6045",
  b: "0.0013 0.0066 0.0112 0.0187 0.0226 0.0280 0.0350 0.0424 0.0475 0.0554 0.0623 0.0687 0.0790 0.0878 0.0968 0.1031 0.1132 0.1208 0.1348 0.1475 0.1772 0.1772 0.1853 0.2363 0.2363 0.2393 0.2393 0.2749 0.2749 0.2857 0.2857 0.2858 0.3224 0.3336 0.3488 0.3488 0.3488 0.3488 0.3501 0.3581 0.3662 0.3743 0.3824 0.3904 0.3985 0.4066 0.4147 0.4228 0.4309 0.4389 0.4469 0.4550 0.4631 0.4712 0.4793 0.4874 0.4954 0.5035 0.5116 0.5197 0.5277 0.5358 0.5439 0.5519 0.5580",
};

function Curvas({ id, t }: { id: string; t: typeof GRADE }) {
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feComponentTransfer>
        <feFuncR type="table" tableValues={t.r} />
        <feFuncG type="table" tableValues={t.g} />
        <feFuncB type="table" tableValues={t.b} />
      </feComponentTransfer>
    </filter>
  );
}

function Flecha() {
  return (
    <svg className="arrow" viewBox="0 0 21.5 18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M0 9H20.1M12.1 1 20.1 9 12.1 17" />
    </svg>
  );
}

const i = (n: number) => ({ "--i": n }) as CSSProperties;

export default async function Home() {
  if (await currentUser()) redirect("/panel");

  return (
    <div className={`portada ${sg.variable} ${jb.variable}`}>
      <svg className="svgdefs" aria-hidden>
        <Curvas id="grade" t={GRADE} />
        <Curvas id="grade2" t={GRADE2} />
      </svg>
      <div className="bg" aria-hidden>
        <video src={VIDEO} autoPlay muted loop playsInline preload="auto" />
      </div>
      <div className="bg2" aria-hidden>
        <video src={VIDEO} autoPlay muted loop playsInline preload="auto" />
      </div>
      <PortadaCliente />
      <div className="scrim" aria-hidden />

      <div className="frame">
        <header>
          <span className="logo">
            <MarkIcon />
            VIGÍA
          </span>
          <nav className="nav" aria-label="Principal">
            {NAV.map((l, n) => (
              <Link key={l.href} href={l.href} style={i(n)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/ingresar" className="btn btn-top">
            <span>Ingresar</span>
            <Flecha />
          </Link>
          <button
            type="button"
            className="burger"
            popoverTarget="menu"
            aria-label="Menú"
            aria-expanded="false"
          >
            <i />
            <i />
            <i />
          </button>
        </header>

        <main id="contenido">
          <div className="sp sp-a" />
          <section className="hero">
            <h1>
              <span className="ln">
                <span>Auditoría adversarial</span>
              </span>
              <span className="ln" style={i(1)}>
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
              <li key={c.label} className="stat" style={i(n)}>
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

      <div id="menu" popover="auto" className="menu">
        <div className="menu-rule" aria-hidden />
        <p className="menu-eyebrow">Menú</p>
        <nav aria-label="Menú">
          {NAV.map((l, n) => (
            <Link key={l.href} href={l.href} className="mrow" style={i(n)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="menu-foot">
          <Link href="/ingresar" className="btn btn-menu">
            <span>Ingresar</span>
            <Flecha />
          </Link>
          <p className="menu-note">
            {CIFRAS[0].n} pruebas &nbsp;/&nbsp; {CIFRAS[1].n} obligaciones
          </p>
        </div>
      </div>
    </div>
  );
}
