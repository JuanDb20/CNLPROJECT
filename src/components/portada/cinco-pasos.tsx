"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { sha256 } from "./demostracion";

export interface HallazgoEjemplo {
  grave: boolean;
  norma: string;
  titulo: string;
}

const PASOS = [
  { titulo: "Seleccionar el proyecto", sub: "Carpeta comprimida o repositorio" },
  { titulo: "Preparar la versión", sub: "Qué entra y qué no" },
  { titulo: "Generar la huella", sub: "SHA-256" },
  { titulo: "Revisar y corregir", sub: "Hallazgos con su norma" },
  { titulo: "Límites", sub: "Qué no demuestra" },
];

/* Lo que excluye src/server/zip.ts (node_modules, .git, .next, dist, build y los
   archivos binarios). Si cambia esa regla, cambia esta lista. */
const ARCHIVOS = [
  { nombre: "src/", entra: true, nota: "Código fuente: se incluye en la versión revisada." },
  {
    nombre: "package.json",
    entra: true,
    nota: "Lista de dependencias: se incluye; con ella se revisan las licencias y los avisos de seguridad de cada librería.",
  },
  { nombre: "README.md", entra: true, nota: "Documentación del proyecto: se incluye." },
  {
    nombre: "node_modules/",
    entra: false,
    nota: "Librerías descargadas de terceros: se excluyen. Se revisan a partir de la lista de dependencias, no copia por copia.",
  },
  { nombre: ".git/", entra: false, nota: "Historial de versiones: se excluye; se revisa la versión que se entregó." },
  { nombre: "logo.png", entra: false, nota: "Imágenes y otros archivos binarios: se excluyen, no contienen código que leer." },
];

function SeleccionarProyecto() {
  const [via, setVia] = useState<"zip" | "repo">("zip");
  const opciones = [
    {
      id: "zip" as const,
      titulo: "Archivo comprimido .zip",
      sub: "Sube la carpeta del proyecto",
      nota: "Comprime la carpeta y cárgala (hasta 4 MB). VIGÍA la lee en memoria y no la ejecuta.",
    },
    {
      id: "repo" as const,
      titulo: "Repositorio público",
      sub: "Indica la dirección en GitHub",
      nota: "VIGÍA descarga la versión principal del repositorio. Si das los dos, se usa el repositorio.",
    },
  ];
  return (
    <>
      <p className="cp-texto">
        Se carga el código del sistema en un archivo comprimido o directamente desde un repositorio
        público, el lugar en internet donde los desarrolladores guardan el código, como GitHub.
      </p>
      <div className="cp-opciones">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            className="cp-opcion"
            aria-pressed={via === o.id}
            onClick={() => setVia(o.id)}
          >
            <span className="cp-opcion-icono" aria-hidden>
              {o.id === "zip" ? (
                <svg viewBox="0 0 24 24">
                  <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M9 18.5c-4 1.2-4-2-5.6-2.5m11.2 4.5v-3.1a2.7 2.7 0 0 0-.8-2.1c2.6-.3 5.4-1.3 5.4-5.8a4.5 4.5 0 0 0-1.2-3.1 4.2 4.2 0 0 0-.1-3.1s-1-.3-3.2 1.2a11 11 0 0 0-5.8 0C6.7 3 5.7 3.3 5.7 3.3a4.2 4.2 0 0 0-.1 3.1 4.5 4.5 0 0 0-1.2 3.1c0 4.5 2.7 5.5 5.4 5.8a2.7 2.7 0 0 0-.8 2.1v3.1" />
                </svg>
              )}
            </span>
            <span>
              <span className="cp-opcion-titulo">{o.titulo}</span>
              <span className="cp-opcion-sub">{o.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="cp-nota" key={via}>
        {opciones.find((o) => o.id === via)!.nota}
      </p>
    </>
  );
}

function PrepararVersion() {
  const [sel, setSel] = useState(0);
  return (
    <>
      <p className="cp-texto">
        Antes del análisis se separa lo que pertenece al proyecto de lo que no. Toca cada elemento para
        ver qué ocurre con él.
      </p>
      <p className="cp-nota" key={sel}>
        {ARCHIVOS[sel].nota}
      </p>
      <ul className="cp-archivos">
        {ARCHIVOS.map((a, i) => (
          <li key={a.nombre}>
            <button
              type="button"
              className="cp-archivo"
              data-entra={a.entra || undefined}
              aria-pressed={sel === i}
              onClick={() => setSel(i)}
            >
              <span className="cp-archivo-nombre">{a.nombre}</span>
              <span className="cp-archivo-estado">{a.entra ? "incluido" : "excluido"}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function GenerarHuella() {
  const [texto, setTexto] = useState("const usuario = 'María';");
  const [huella, setHuella] = useState("");
  const anterior = useRef("");
  const [cambio, setCambio] = useState(0);

  useEffect(() => {
    let vivo = true;
    sha256(texto).then((h) => {
      if (!vivo) return;
      if (anterior.current && anterior.current !== h) setCambio((c) => c + 1);
      anterior.current = h;
      setHuella(h);
    });
    return () => {
      vivo = false;
    };
  }, [texto]);

  return (
    <>
      <p className="cp-texto">
        SHA-256 calcula una cadena de 64 caracteres a partir del archivo. Si cambia un solo carácter, la
        huella cambia por completo: así se identifica la versión concreta que se revisó.
      </p>
      <label className="cp-huella-campo">
        <span>Prueba: cambia una sola letra</span>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck={false} maxLength={120} />
      </label>
      <div className="cp-huella" aria-live="polite">
        <span className="cp-huella-rotulo">Huella (ejemplo ilustrativo)</span>
        <code key={cambio} className={cambio ? "cp-huella-nueva" : undefined}>
          {huella}
        </code>
      </div>
      <p className="cp-pie">
        En VIGÍA la huella se calcula sobre el .zip completo y queda en el informe. La huella permite
        comparar versiones; no demuestra por sí sola quién hizo el código ni que sea seguro.
      </p>
    </>
  );
}

function RevisarCorregir({ pruebas, hallazgos }: { pruebas: number; hallazgos: HallazgoEjemplo[] }) {
  const [corregidos, setCorregidos] = useState<number[]>([]);
  return (
    <>
      <p className="cp-texto">
        VIGÍA corre {pruebas} pruebas automáticas en un entorno aislado. Cada hallazgo llega con su
        gravedad, la norma que incumple, la línea exacta del código y la corrección propuesta; luego
        vuelve a probar la versión corregida. Toca un hallazgo para ver el retesteo.
      </p>
      <ul className="cp-hallazgos">
        {hallazgos.map((h, i) => {
          const ok = corregidos.includes(i);
          return (
            <li key={h.norma}>
              <button
                type="button"
                className="cp-hallazgo"
                data-grave={h.grave || undefined}
                data-ok={ok || undefined}
                aria-pressed={ok}
                onClick={() => setCorregidos((c) => (ok ? c.filter((x) => x !== i) : [...c, i]))}
              >
                <span className="cp-hallazgo-sev">{ok ? "Retesteo superado" : h.grave ? "Crítico" : "Advertencia"}</span>
                <span className="cp-hallazgo-titulo">{h.titulo}</span>
                <span className="cp-hallazgo-norma">{h.norma}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="cp-pie">
        Queda registrado: la autorización del representante legal, la huella de la versión revisada, la
        ejecución de cada prueba, los hallazgos con sus correcciones y el informe de lo encontrado y lo
        realizado, con sello de tiempo.
      </p>
    </>
  );
}

function Limites() {
  return (
    <div className="cp-limites">
      <div className="cp-limite" data-tipo="si">
        <p className="cp-limite-titulo">Sí permite comprobar</p>
        <ul>
          <li>Que los datos revisados en dos momentos son idénticos, cuando sus huellas coinciden.</li>
          <li>Que el informe no se alteró después de expedido (verificación pública en línea).</li>
        </ul>
      </div>
      <div className="cp-limite" data-tipo="no">
        <p className="cp-limite-titulo">No acredita por sí sola</p>
        <ul>
          <li>La autoría del código</li>
          <li>La fecha original de creación</li>
          <li>La veracidad del contenido</li>
          <li>La ausencia de vulnerabilidades</li>
          <li>Hechos que el usuario no informó o cambios normativos posteriores</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * «Cinco pasos, de la carpeta al informe»: el recorrido interactivo del
 * prototipo de Sara, con pestañas que se pueden recorrer con el teclado
 * (flechas) y un panel por paso. Los textos describen lo que hace el código.
 */
export function CincoPasos({
  pruebas,
  hallazgos,
  cta,
}: {
  pruebas: number;
  hallazgos: HallazgoEjemplo[];
  cta: ReactNode;
}) {
  const [activo, setActivo] = useState(0);
  const base = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const ir = (i: number, enfocar = false) => {
    const n = (i + PASOS.length) % PASOS.length;
    setActivo(n);
    if (enfocar) tabs.current[n]?.focus();
    tabs.current[n]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  };
  const teclas = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") ir(activo + 1, true);
    else if (e.key === "ArrowLeft") ir(activo - 1, true);
    else if (e.key === "Home") ir(0, true);
    else if (e.key === "End") ir(PASOS.length - 1, true);
    else return;
    e.preventDefault();
  };

  const paneles = [
    <SeleccionarProyecto key="0" />,
    <PrepararVersion key="1" />,
    <GenerarHuella key="2" />,
    <RevisarCorregir key="3" pruebas={pruebas} hallazgos={hallazgos} />,
    <Limites key="4" />,
  ];

  return (
    <div className="cp">
      <div className="cp-tabs" role="tablist" aria-label="Pasos del recorrido" onKeyDown={teclas}>
        {PASOS.map((p, i) => (
          <button
            key={p.titulo}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${i}`}
            aria-selected={activo === i}
            aria-controls={`${base}-panel`}
            tabIndex={activo === i ? 0 : -1}
            className="cp-tab"
            onClick={() => ir(i)}
          >
            <span className="cp-tab-num">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <span className="cp-tab-titulo">{p.titulo}</span>
              <span className="cp-tab-sub">{p.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="cp-progreso" aria-hidden>
        <i style={{ width: `${((activo + 1) / PASOS.length) * 100}%` }} />
      </div>
      <div
        className="cp-panel"
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${activo}`}
        key={activo}
      >
        <h3 className="cp-panel-titulo">{PASOS[activo].titulo}</h3>
        {paneles[activo]}
      </div>
      <div className="cp-nav">
        <button type="button" className="cp-nav-btn" onClick={() => ir(activo - 1)} disabled={activo === 0}>
          ← Anterior
        </button>
        {activo < PASOS.length - 1 ? (
          <button type="button" className="cp-nav-btn cp-nav-sig" onClick={() => ir(activo + 1)}>
            Siguiente: {PASOS[activo + 1].titulo} →
          </button>
        ) : (
          cta
        )}
      </div>
    </div>
  );
}
