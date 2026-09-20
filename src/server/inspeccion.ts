import { lookup } from "node:dns/promises";

import {
  LIVE_HEADERS,
  LIVE_MAX_REDIRECTS,
  LIVE_PATHS,
  type LiveInspection,
  type LivePage,
  envVarNames,
  liveOrigin,
} from "@/domain/live";

/**
 * Inspección de solo lectura del despliegue declarado: una petición GET por
 * ruta de `LIVE_PATHS`, sin autenticación y sin carga, dentro de los límites de
 * la cláusula `clause-live` del acuerdo de alcance.
 *
 * La URL la escribe el usuario, así que todas las peticiones pasan por
 * `denyReason`: solo http/https, sin credenciales, puertos 80/443, nada de
 * nombres internos ni de literales IP, y se rechaza el dominio si CUALQUIERA de
 * sus direcciones es privada o especial (SSRF). Cada redirección se revalida
 * con las mismas guardas.
 */

const UA = "VIGIA/1 inspeccion de solo lectura autorizada por el cliente";
const TIMEOUT = 5000;
/** Se leen hasta 256 KB del cuerpo y se conservan 32 KB en texto. */
const BODY_READ = 256 * 1024;
const BODY_KEPT = 32 * 1024;
const CONCURRENCY = 4;

const REDIRECT = new Set([301, 302, 303, 307, 308]);
const KEEP_HEADERS = new Set<string>(LIVE_HEADERS);
/** Nombres que nunca salen de la red del cliente. */
const INTERNAL_HOST = /^(localhost|.*\.(local|internal|localhost))$/i;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** IPv4 privada, reservada o de uso especial (incluye metadatos de nube en 169.254/16). */
function blockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // 10/8
    a === 127 || // 127/8 loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64/10 CGNAT
    (a === 169 && b === 254) || // 169.254/16 link-local y metadatos de nube
    (a === 172 && b >= 16 && b <= 31) || // 172.16/12
    (a === 192 && b === 168) || // 192.168/16
    a >= 224 // 224/4 multidifusión y 240/4 reservado
  );
}

function blockedAddress(address: string): boolean {
  if (!address.includes(":")) return blockedIPv4(address);
  const ip = address.toLowerCase().replace(/%.*$/, ""); // sin identificador de zona
  if (ip === "::1" || ip === "::") return true;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (mapped) return blockedIPv4(mapped[1]);
  const head = Number.parseInt(ip.split(":")[0], 16);
  if (!Number.isFinite(head)) return true; // forma que no entendemos: se bloquea
  return (
    (head >= 0xfc00 && head <= 0xfdff) || // fc00::/7 únicas locales
    (head >= 0xfe80 && head <= 0xfebf) // fe80::/10 enlace local
  );
}

/**
 * Motivo por el que NO se puede consultar esa dirección, o null si es admisible.
 * ponytail: entre resolver y pedir hay una ventana de reenlace de DNS; cerrarla
 * exige un agente HTTP que fije la IP resuelta, que es lo que habría que añadir
 * si esto pasa de prototipo a producción.
 */
async function denyReason(raw: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "la dirección no es una URL válida";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return `el esquema ${url.protocol} no está autorizado`;
  }
  if (url.username || url.password) return "la URL lleva credenciales";
  if (url.port && url.port !== "80" && url.port !== "443") {
    return `el puerto ${url.port} no está autorizado`;
  }
  const host = url.hostname.toLowerCase();
  if (INTERNAL_HOST.test(host)) return `${host} es un nombre interno`;
  if (host.startsWith("[") || IPV4.test(host)) {
    return "la dirección apunta a una IP, no a un dominio público";
  }
  let addresses;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return `${host} no resuelve`;
  }
  const reserved = addresses.find((a) => blockedAddress(a.address));
  return reserved ? `${host} resuelve a la dirección reservada ${reserved.address}` : null;
}

/** Lee el cuerpo hasta `BODY_READ` bytes y corta; nunca espera a que termine. */
async function readBody(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < BODY_READ) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
  } catch {
    /* Cuerpo truncado por la red: se conserva lo leído. */
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks).toString("utf8").slice(0, BODY_KEPT);
}

/** De un `.env` solo se conservan los nombres de las variables; nunca sus valores. */
function safeBody(text: string): string {
  const names = envVarNames(text);
  return names.length > 0
    ? names.map((n) => `${n}=[valor no registrado]`).join("\n")
    : text.slice(0, BODY_KEPT);
}

const failed = (path: string, error: string, redirectedTo?: string): LivePage => ({
  path,
  status: 0,
  headers: {},
  setCookie: [],
  body: "",
  ...(redirectedTo ? { redirectedTo } : {}),
  error,
});

async function fetchPage(base: string, path: string): Promise<LivePage> {
  let target = `${base}${path}`;
  let redirectedTo: string | undefined;

  for (let hop = 0; hop <= LIVE_MAX_REDIRECTS; hop++) {
    const denial = await denyReason(target);
    if (denial) return failed(path, `destino no autorizado: ${denial}`, redirectedTo);

    let res: Response;
    try {
      res = await fetch(target, {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": UA, accept: "*/*" },
        signal: AbortSignal.timeout(TIMEOUT),
      });
    } catch (error) {
      const why = error instanceof Error && error.name === "TimeoutError" ? "no respondió a tiempo" : "no respondió";
      return failed(path, why, redirectedTo);
    }

    const location = res.headers.get("location");
    if (REDIRECT.has(res.status) && location && hop < LIVE_MAX_REDIRECTS) {
      await res.body?.cancel().catch(() => {});
      try {
        target = new URL(location, target).toString();
      } catch {
        return failed(path, "la redirección no apunta a una URL válida", redirectedTo);
      }
      redirectedTo = target;
      continue;
    }

    const headers: Record<string, string> = {};
    res.headers.forEach((value, name) => {
      if (KEEP_HEADERS.has(name.toLowerCase())) headers[name.toLowerCase()] = value;
    });
    return {
      path,
      status: res.status,
      headers,
      setCookie: res.headers.getSetCookie(),
      body: safeBody(await readBody(res)),
      ...(redirectedTo ? { redirectedTo } : {}),
    };
  }
  return failed(path, `más de ${LIVE_MAX_REDIRECTS} redirecciones`, redirectedTo);
}

/** Ejecuta `fn` sobre cada elemento con como mucho `size` peticiones en vuelo, conservando el orden. */
async function pool<T, R>(items: readonly T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/**
 * Consulta las rutas públicas del despliegue. Devuelve null si la URL no es
 * admisible o si su raíz no responde: la auditoría sigue sin este insumo y el
 * orquestador lo deja dicho en la traza.
 */
export async function inspectDeployment(url: string): Promise<LiveInspection | null> {
  /* Se valida la URL tal como la escribió el usuario —credenciales incluidas—
     y solo después se reduce a su origen, que es lo que nombra la cláusula. */
  if (await denyReason(url)) return null;
  const base = liveOrigin(url);
  const pages = await pool(LIVE_PATHS, CONCURRENCY, (path) => fetchPage(base, path));
  if (pages[0]?.status === 0) return null; // la raíz no respondió: no hay nada que analizar
  return { url: base, at: new Date().toISOString(), pages };
}
