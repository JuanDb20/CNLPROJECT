/**
 * Lectura del certificado de existencia y representación legal (Cámara de
 * Comercio) para prellenar el formulario de una auditoría nueva.
 *
 * Pedido de Sara (27-oct): la gente cree que la razón social es el nombre con el
 * que conoce su negocio, pero el certificado dice otra cosa («Fintrex» frente a
 * «FINTREX S.A.S.»). Cargarlo es más ágil y evita ese error.
 *
 * Recibe el texto ya extraído del PDF (en el navegador, con pdf.js: el archivo
 * no sale del equipo) y busca tres datos con reglas fijas. Es una función pura
 * para poder probarla sin navegador. Los formatos cambian entre cámaras (Cali,
 * Bogotá, Medellín…), así que todo lo que devuelve es una propuesta: el usuario
 * la ve en los campos y la corrige si hace falta.
 */

export interface DatosCertificado {
  razonSocial?: string;
  nit?: string;
  representante?: string;
  /** El texto tiene cara de certificado de Cámara de Comercio. */
  pareceCertificado: boolean;
}

const LETRA = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";

/** Espacios normalizados, una línea por renglón. */
function limpiar(texto: string): string[] {
  return texto
    .replace(/ /g, " ")
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

/** «MARÍA FERNANDA RÍOS» → «María Fernanda Ríos»; respeta partículas («de», «del»). */
export function nombrePropio(nombre: string): string {
  const minusculas = new Set(["de", "del", "la", "las", "los", "y"]);
  return nombre
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/* Rótulos que en el certificado vienen en la misma línea después del valor
   (cuando el PDF pone dos columnas en un renglón): ahí se corta. */
const SIGUIENTE_ROTULO = /\s+(?:Nit|NIT|Sigla|SIGLA|Matr[íi]cula|MATR[ÍI]CULA|Domicilio|DOMICILIO|Fecha|FECHA|Direcci[óo]n|DIRECCI[ÓO]N)\b.*$/;

function razonSocial(lineas: string[]): string | undefined {
  const patrones = [
    /^(?:Raz[óo]n\s+social|RAZ[ÓO]N\s+SOCIAL)\s*[:.]?\s*(.+)$/i,
    /^(?:Nombre\s+o\s+raz[óo]n\s+social|Nombre)\s*:\s*(.+)$/i,
  ];
  for (const patron of patrones) {
    for (const linea of lineas) {
      const m = linea.match(patron);
      const valor = m?.[1]?.replace(SIGUIENTE_ROTULO, "").replace(/[\s:;,]+$/, "").trim();
      // «Nombre: …» también aparece en las tablas de nombramientos; una razón social
      // de una sola letra o puramente numérica no es razón social.
      if (valor && valor.length >= 2 && new RegExp(`[${LETRA}]`).test(valor)) return valor;
    }
  }
  return undefined;
}

function nit(texto: string): string | undefined {
  const conDigito = texto.match(/\bN\.?\s?I\.?\s?T(?:\.|\b)\s*(?:No\.?|N[°º.]|n[úu]mero)?\s*[:.]?\s*(\d[\d.\s]{4,14}\d)\s*-\s*(\d)\b/i);
  if (conDigito) return `${miles(conDigito[1].replace(/[\s.]/g, ""))}-${conDigito[2]}`;
  const sinDigito = texto.match(/\bN\.?\s?I\.?\s?T(?:\.|\b)\s*(?:No\.?|N[°º.])?\s*[:.]?\s*(\d[\d.]{5,13})\b/i);
  return sinDigito ? miles(sinDigito[1].replace(/\./g, "")) : undefined;
}

/** 902999990 → 902.999.990, como se escribe el NIT en Colombia. */
const miles = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/* Cargo de quien representa a la sociedad. Se excluyen los suplentes: el
   formulario pide el representante legal principal. */
const CARGO = String.raw`(?:representante\s+legal(?:\s+principal)?|gerente(?:\s+general)?|presidente)`;
const DOCUMENTO = String.raw`(?:C\.?\s?C\.?|CC|C[ée]dula|P\.?P\.?|C\.?E\.?|Pasaporte)`;

function representante(lineas: string[]): string | undefined {
  const enLinea = new RegExp(
    `^${CARGO}\\s*:?\\s+((?:[${LETRA}'.]+\\s+){1,6}?[${LETRA}'.]+)\\s+${DOCUMENTO}`,
    "i",
  );
  const conDosPuntos = new RegExp(`^${CARGO}\\s*:\\s*([${LETRA}'.\\s]{5,80})$`, "i");
  const suplente = /^(?:suplente|segundo|primer|primera|segunda)\b/i;

  for (const patron of [enLinea, conDosPuntos]) {
    for (let i = 0; i < lineas.length; i += 1) {
      const linea = lineas[i];
      if (/suplente/i.test(linea.slice(0, 40))) continue;
      const m = linea.match(patron);
      const valor = m?.[1]?.trim();
      if (!valor || suplente.test(valor)) continue;
      // Descarta frases del texto de facultades («… será ejercida por el gerente …»).
      if (valor.split(" ").length < 2 || /\b(?:quien|ser[áa]|tendr[áa]|estar[áa]|ejercer[áa]?|sociedad|cargo|facultades)\b/i.test(valor)) {
        continue;
      }
      return nombrePropio(valor);
    }
  }
  return undefined;
}

export function leerCertificado(texto: string): DatosCertificado {
  const lineas = limpiar(texto);
  const plano = lineas.join("\n");
  const pareceCertificado =
    /c[áa]mara\s+de\s+comercio/i.test(plano) &&
    /(existencia|representaci[óo]n\s+legal|matr[íi]cula\s+mercantil)/i.test(plano);
  return {
    razonSocial: razonSocial(lineas),
    nit: nit(plano),
    representante: representante(lineas),
    pareceCertificado,
  };
}
