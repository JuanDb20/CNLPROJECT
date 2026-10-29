"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { fieldClass } from "@/components/ui";
import { leerCertificado } from "@/domain/certificado";

export type Formalizacion = "registrada" | "en-proceso" | "sin-registro";

const OPCIONES: Array<{ id: Formalizacion; titulo: string; detalle: string }> = [
  {
    id: "registrada",
    titulo: "Sí, está registrada",
    detalle: "Tiene certificado de existencia y representación legal",
  },
  {
    id: "en-proceso",
    titulo: "Está en proceso",
    detalle: "Se está formalizando ante la Cámara de Comercio",
  },
  {
    id: "sin-registro",
    titulo: "Todavía no",
    detalle: "Persona natural o emprendimiento sin registro",
  },
];

type Campo = "cliente" | "nit" | "representante";

type Lectura =
  | { estado: "inactivo" }
  | { estado: "leyendo"; archivo: string }
  | { estado: "listo"; archivo: string; encontrados: Campo[]; faltan: Campo[] }
  | { estado: "error"; mensaje: string };

const lista = (campos: Campo[], y = "y") =>
  new Intl.ListFormat("es", { type: y === "ni" ? "disjunction" : "conjunction" })
    .format(campos.map((c) => NOMBRE_CAMPO[c]))
    .replace(/ o /, " ni ");

const NOMBRE_CAMPO: Record<Campo, string> = {
  cliente: "razón social",
  nit: "NIT",
  representante: "representante legal",
};

/** Texto del PDF, renglón por renglón, leído en el navegador con pdf.js. */
async function textoDelPdf(archivo: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) }).promise;
  const renglones: string[] = [];
  // Los datos que se buscan están en las primeras páginas; un certificado largo no hace falta entero.
  for (let n = 1; n <= Math.min(doc.numPages, 8); n += 1) {
    const pagina = await doc.getPage(n);
    const { items } = await pagina.getTextContent();
    const porAltura = new Map<number, Array<{ x: number; s: string }>>();
    for (const item of items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform as number[];
      // Agrupa por altura con tolerancia: dos piezas a ±2 puntos son el mismo renglón.
      const clave = [...porAltura.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      const fila = porAltura.get(clave) ?? [];
      fila.push({ x, s: item.str });
      porAltura.set(clave, fila);
    }
    [...porAltura.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, fila]) =>
        renglones.push(
          fila
            .sort((a, b) => a.x - b.x)
            .map((p) => p.s)
            .join(" "),
        ),
      );
  }
  await doc.destroy();
  return renglones.join("\n");
}

/**
 * Datos del cliente. Pedidos de Sara (27-oct): la mayoría de las empresas en
 * Colombia son mipymes y muchas no están registradas o se están formalizando,
 * así que primero se pregunta eso y los campos cambian según la respuesta; y si
 * está registrada, puede cargar el certificado de existencia y representación
 * legal para que VIGÍA tome de ahí la razón social exacta, el NIT y el
 * representante. El PDF se lee en el navegador: no se envía ni se guarda.
 *
 * Los nombres de los campos (cliente, nit, representante, sector) son los
 * mismos de antes: el motor y la API no cambian.
 */
export function ClienteCampos({
  sectores,
  defaults,
}: {
  sectores: string[];
  defaults: { cliente: string; nit: string; representante: string; sector: string; formalizacion: string };
}) {
  const inicial = OPCIONES.some((o) => o.id === defaults.formalizacion)
    ? (defaults.formalizacion as Formalizacion)
    : "registrada";
  const [formalizacion, setFormalizacion] = useState<Formalizacion>(inicial);
  const [valores, setValores] = useState<Record<Campo, string>>({
    cliente: defaults.cliente,
    nit: defaults.nit,
    representante: defaults.representante,
  });
  const [recien, setRecien] = useState<Campo[]>([]);
  const [lectura, setLectura] = useState<Lectura>({ estado: "inactivo" });
  const archivoRef = useRef<HTMLInputElement>(null);

  const registrada = formalizacion === "registrada";
  const cambiar = (campo: Campo) => (e: ChangeEvent<HTMLInputElement>) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function cargarCertificado(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a cargar el mismo archivo
    if (!archivo) return;
    if (archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) {
      setLectura({ estado: "error", mensaje: "El certificado debe ser un PDF." });
      return;
    }
    if (archivo.size > 10 * 1024 * 1024) {
      setLectura({ estado: "error", mensaje: "El PDF supera 10 MB. Descarga de nuevo el certificado de la Cámara de Comercio." });
      return;
    }
    setLectura({ estado: "leyendo", archivo: archivo.name });
    try {
      const texto = await textoDelPdf(archivo);
      if (texto.replace(/\s/g, "").length < 40) {
        setLectura({
          estado: "error",
          mensaje:
            "Este PDF no tiene texto que se pueda leer (parece escaneado). Escribe los datos a mano, tal como aparecen en el certificado.",
        });
        return;
      }
      const datos = leerCertificado(texto);
      const nuevos: Partial<Record<Campo, string>> = {};
      if (datos.razonSocial) nuevos.cliente = datos.razonSocial;
      if (datos.nit) nuevos.nit = datos.nit;
      if (datos.representante) nuevos.representante = datos.representante;
      const encontrados = Object.keys(nuevos) as Campo[];
      if (!datos.pareceCertificado && encontrados.length === 0) {
        setLectura({
          estado: "error",
          mensaje:
            "No parece un certificado de existencia y representación legal. Revisa el archivo o escribe los datos a mano.",
        });
        return;
      }
      setValores((v) => ({ ...v, ...nuevos }));
      setRecien(encontrados);
      window.setTimeout(() => setRecien([]), 1800);
      setLectura({
        estado: "listo",
        archivo: archivo.name,
        encontrados,
        faltan: (["cliente", "nit", "representante"] as Campo[]).filter((c) => !encontrados.includes(c)),
      });
    } catch {
      setLectura({
        estado: "error",
        mensaje: "No se pudo leer el PDF. Intenta con otro archivo o escribe los datos a mano.",
      });
    }
  }

  const resaltar = (campo: Campo) => (recien.includes(campo) ? " campo-recien" : "");

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-[12px] text-ink-soft">
          ¿La empresa está registrada en la Cámara de Comercio?
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {OPCIONES.map((o) => {
            const activa = o.id === formalizacion;
            return (
              <label
                key={o.id}
                className={`opcion-casilla relative flex cursor-pointer flex-col gap-1 rounded-[10px] border px-3.5 py-3 transition-[border-color,background-color,transform,box-shadow] duration-200 ${
                  activa
                    ? "border-brand bg-brand-soft shadow-[0_0_0_1px_var(--color-brand)]"
                    : "border-line-strong bg-surface hover:-translate-y-0.5 hover:border-ink-faint"
                }`}
              >
                <input
                  type="radio"
                  name="formalizacion"
                  aria-label={`${o.titulo}: ${o.detalle}`}
                  value={o.id}
                  checked={activa}
                  onChange={() => setFormalizacion(o.id)}
                  className="sr-only"
                />
                <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <span
                    aria-hidden
                    className={`grid size-4 place-items-center rounded-full border transition-colors ${
                      activa ? "border-brand bg-brand" : "border-ink-faint"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full bg-canvas transition-transform ${activa ? "scale-100" : "scale-0"}`} />
                  </span>
                  {o.titulo}
                </span>
                <span className="text-[11.5px] leading-snug text-ink-muted">{o.detalle}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {registrada ? (
        <div className="aparece rounded-[10px] border border-dashed border-line-strong bg-surface-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 max-w-[46ch]">
              <p className="text-[12.5px] font-semibold text-ink">
                Carga el certificado de existencia y representación legal
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
                VIGÍA toma de ahí la razón social exacta, el NIT y el representante legal. El PDF
                se lee en tu navegador: no se envía ni se guarda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => archivoRef.current?.click()}
              disabled={lectura.estado === "leyendo"}
              className="rounded-[8px] bg-ink px-3.5 py-2 text-[12px] font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {lectura.estado === "leyendo" ? "Leyendo el certificado…" : "Cargar certificado (PDF)"}
            </button>
            <input
              ref={archivoRef}
              type="file"
              aria-label="Certificado de existencia y representación legal (PDF)"
              accept="application/pdf,.pdf"
              onChange={cargarCertificado}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
            />
          </div>
          <div aria-live="polite">
            {lectura.estado === "listo" ? (
              <p className="aparece mt-3 text-[11.5px] leading-relaxed text-safe">
                {lectura.encontrados.length > 0
                  ? `Listo: tomamos ${lista(lectura.encontrados)} de «${lectura.archivo}». Revísalos abajo.`
                  : `Leímos «${lectura.archivo}», pero no encontramos los datos.`}
                {lectura.faltan.length > 0 ? (
                  <span className="text-ink-muted">
                    {" "}No encontramos {lista(lectura.faltan, "ni")}: escríbelo tal como
                    aparece en el certificado.
                  </span>
                ) : null}
              </p>
            ) : null}
            {lectura.estado === "error" ? (
              <p className="aparece mt-3 text-[11.5px] leading-relaxed text-critical">{lectura.mensaje}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="aparece rounded-[10px] bg-brand-soft px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
          No hace falta estar registrado para revisar el código. Escribe el nombre con el que operas y,
          si aún no tienes NIT, la cédula del responsable: VIGÍA calcula el dígito de verificación. En el
          informe queda que la empresa {formalizacion === "en-proceso" ? "está en proceso de formalización" : "aún no está registrada"}.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[12px] text-ink-soft sm:col-span-2">
          {registrada ? "Razón social" : "Nombre del negocio o emprendimiento"}
          <span className="text-critical"> *</span>
          <input
            name="cliente"
            required
            minLength={2}
            maxLength={200}
            value={valores.cliente}
            onChange={cambiar("cliente")}
            aria-describedby="f-cliente-help"
            className={fieldClass + resaltar("cliente")}
          />
          <span id="f-cliente-help" className="mt-1 block text-[11px] text-ink-faint">
            {registrada
              ? "Tal como aparece en el certificado, con el tipo de sociedad (S.A.S., Ltda.…)."
              : "El nombre con el que la gente conoce el negocio."}
          </span>
        </label>
        <label className="block text-[12px] text-ink-soft">
          {registrada ? "NIT" : "NIT o cédula del responsable"}
          <span className="text-critical"> *</span>
          <input
            name="nit"
            required
            minLength={5}
            maxLength={30}
            inputMode="numeric"
            placeholder={registrada ? "902.999.990-6" : "1.234.567.890"}
            value={valores.nit}
            onChange={cambiar("nit")}
            className={fieldClass + resaltar("nit")}
          />
        </label>
        <label className="block text-[12px] text-ink-soft">
          Sector
          <select name="sector" className={fieldClass} defaultValue={defaults.sector}>
            <option value="" disabled>
              Selecciona
            </option>
            {sectores.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] text-ink-soft sm:col-span-2">
          {registrada ? "Representante legal" : "Responsable (propietario o fundador)"}
          <span className="text-critical"> *</span>
          <input
            name="representante"
            required
            minLength={3}
            maxLength={200}
            value={valores.representante}
            onChange={cambiar("representante")}
            aria-describedby="f-representante-help"
            className={fieldClass + resaltar("representante")}
          />
          <span id="f-representante-help" className="mt-1 block text-[11px] text-ink-faint">
            Es quien acepta la autorización de las pruebas en el paso de alcance.
          </span>
        </label>
      </div>
    </div>
  );
}
