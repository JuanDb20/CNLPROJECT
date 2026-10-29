import { existsSync } from "node:fs";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";

import { SitePage } from "@/components/sitio";
import { CHECK_CODES } from "@/domain/checks";

import "./quienes-somos.css";

export const metadata: Metadata = { title: "Quiénes somos" };

/*
 * PENDIENTE (decide el equipo): mostrar nombres, universidad y fotos.
 * En septiembre quedó anotado (src/app/privacidad/datos.ts) que la evaluación del
 * concurso es anónima y que el manual enlaza este sitio; por eso, mientras no se
 * confirme que en la final ya no aplica, la página presenta al equipo por su
 * formación y sin nombres. Para mostrarlos: MOSTRAR_EQUIPO = true. Las fotos se
 * toman de public/equipo/<id>.jpg si existen (cuadradas, ~600 px); si no, se ven
 * las iniciales.
 */
const MOSTRAR_EQUIPO = false;
const UNIVERSIDAD = "Universidad Icesi";

const EQUIPO = [
  {
    id: "sara",
    nombre: "Sara Villada Sáenz",
    formacion: "Derecho",
    aporte: "Análisis jurídico, modelo de negocio y la relación con las firmas que acompañan el proyecto.",
  },
  {
    id: "gallego",
    nombre: "Juan José Gallego Godoy",
    formacion: "Contaduría Pública y Derecho",
    aporte: "Catálogo normativo por sector, especialistas fintech y salud, y viabilidad económica.",
  },
  {
    id: "balanta",
    nombre: "Juan Diego Balanta Molina",
    formacion: "Ingeniería de Sistemas",
    aporte: "Arquitectura, motor de pruebas, seguridad del sistema y la interfaz.",
  },
];

const PRINCIPIOS = [
  {
    titulo: "Solo con autorización",
    texto:
      "Ninguna prueba corre sin que el representante legal acepte, cláusula por cláusula, qué se va a revisar y qué no.",
  },
  {
    titulo: "Sin tocar producción",
    texto:
      "El código se analiza en memoria, en un entorno aislado. Del sitio publicado solo se leen páginas públicas, y solo si se autoriza.",
  },
  {
    titulo: "Con evidencia verificable",
    texto:
      "Cada hallazgo señala la línea de código y la norma. La versión revisada queda fijada con su huella y el informe se verifica en línea.",
  },
  {
    titulo: "Sin vender datos",
    texto:
      "No usamos analítica ni publicidad, no enviamos el código a modelos de inteligencia artificial y lo borramos a los 90 días.",
  },
];

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

/* Se resuelve al compilar (la página es estática): public/ existe en ese momento. */
const tieneFoto = (id: string) => existsSync(path.join(process.cwd(), "public", "equipo", `${id}.jpg`));

export default function QuienesSomosPage() {
  return (
    <SitePage actual="/quienes-somos" className="qs">
      <header className="qs-cabeza">
        <p className="qs-eyebrow">Quiénes somos</p>
        <h1 className="sitio-titulo qs-titulo">Revisión legal de software, con evidencia de qué se revisó.</h1>
        <p className="sitio-bajada qs-bajada">
          VIGÍA analiza sistemas de software —incluidos los que usan inteligencia artificial— frente a las
          normas que les aplican, y explica los resultados sin tecnicismos para equipos jurídicos y
          técnicos.
        </p>
      </header>

      <section className="qs-bloque qs-dos" aria-labelledby="qs-por-que">
        <div>
          <h2 id="qs-por-que" className="qs-h2">
            Por qué existe
          </h2>
          <p className="qs-p">
            Hoy una app hecha con inteligencia artificial sale en días. Detrás vienen datos personales,
            pagos y decisiones automáticas sobre personas, y casi nadie revisa ese código con la norma en
            la mano. Cuando la autoridad pregunta, la empresa no tiene cómo mostrar qué revisó ni cuándo.
          </p>
        </div>
        <div>
          <h2 className="qs-h2">Para quién</h2>
          <p className="qs-p">
            Para empresas que operan sistemas digitales —en especial las pequeñas y medianas, muchas aún
            en proceso de formalización, que necesitan saber qué deben cumplir antes de dar el siguiente
            paso—, para sus equipos jurídicos y para sus desarrolladores.
          </p>
        </div>
      </section>

      <section className="qs-bloque" aria-labelledby="qs-principios">
        <h2 id="qs-principios" className="qs-h2">
          Cómo trabajamos
        </h2>
        <ul className="qs-principios">
          {PRINCIPIOS.map((p, i) => (
            <li key={p.titulo} className="qs-principio" style={{ animationDelay: `${0.08 * i}s` }}>
              <span className="qs-principio-num">{String(i + 1).padStart(2, "0")}</span>
              <p className="qs-principio-titulo">{p.titulo}</p>
              <p className="qs-principio-texto">{p.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="qs-bloque" aria-labelledby="qs-equipo">
        <h2 id="qs-equipo" className="qs-h2">
          El equipo
        </h2>
        <p className="qs-p">
          Un equipo interdisciplinario de estudiantes de Derecho, Contaduría Pública e Ingeniería de
          Sistemas{MOSTRAR_EQUIPO ? ` de la ${UNIVERSIDAD}` : ""}: el derecho define qué se exige; la
          ingeniería, cómo comprobarlo en el código.
        </p>
        <ul className="qs-equipo">
          {EQUIPO.map((m) => (
            <li key={m.id} className="qs-persona">
              {MOSTRAR_EQUIPO && tieneFoto(m.id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/equipo/${m.id}.jpg`} alt={m.nombre} className="qs-foto" width={600} height={600} />
              ) : (
                <span className="qs-foto qs-iniciales" aria-hidden>
                  {MOSTRAR_EQUIPO ? iniciales(m.nombre) : m.formacion.charAt(0)}
                </span>
              )}
              <p className="qs-nombre">{MOSTRAR_EQUIPO ? m.nombre : m.formacion}</p>
              {MOSTRAR_EQUIPO ? <p className="qs-formacion">{m.formacion}</p> : null}
              <p className="qs-aporte">{m.aporte}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="qs-bloque qs-cierre">
        <p className="qs-p">
          {CHECK_CODES.length} pruebas automáticas, el detalle de cada una y su norma están en el mapa de
          funcionalidades. El resultado de aplicarlas a nuestro propio código, en Transparencia.
        </p>
        <div className="qs-enlaces">
          <Link href="/mapa">Cómo funciona →</Link>
          <Link href="/transparencia">VIGÍA se audita a sí misma →</Link>
        </div>
      </section>
    </SitePage>
  );
}
