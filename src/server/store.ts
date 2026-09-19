import { randomBytes } from "node:crypto";

import type {
  AuditRun,
  ConformityCertificate,
  PublicCertificate,
  RepoFile,
  User,
} from "@/domain/types";

import { readZip } from "./zip";

/**
 * Capa de persistencia.
 *
 * `AccountRepository` y `AuditRepository` son las únicas puertas por las que la
 * aplicación toca estado. Ambas se apoyan en un almacén clave-valor: Redis
 * (Upstash, por su API REST) o Supabase (Postgres, vía PostgREST, en una sola
 * tabla `kv_store`) cuando el despliegue define sus variables de entorno, y
 * memoria en desarrollo local. En Vercel cada ruta puede correr en una
 * instancia distinta, así que en producción el estado necesita vivir en uno
 * de los dos.
 */

export interface AccountRepository {
  create(user: User): Promise<User>;
  find(id: string): Promise<User | null>;
  /** Reescribe la cuenta (p. ej. la tarjeta profesional tras la primera firma). */
  update(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  /** Abre una sesión y devuelve su token opaco. */
  openSession(userId: string): Promise<string>;
  sessionUser(token: string): Promise<string | null>;
  closeSession(token: string): Promise<void>;
}

export interface AuditRepository {
  /** Guarda la auditoría y el .zip cargado, que se almacena aparte. */
  create(run: AuditRun, zip: Buffer): Promise<AuditRun>;
  find(id: string): Promise<AuditRun | null>;
  listByOwner(ownerId: string): Promise<AuditRun[]>;
  /** Archivos del .zip original o, con `corregido`, de la versión corregida. */
  files(runId: string, version?: "corregido"): Promise<RepoFile[]>;
  saveCorrected(runId: string, zip: Buffer): Promise<void>;
  /** Borra el código cargado (original y corregido). Queda su SHA-256 en la auditoría. */
  deleteSource(runId: string): Promise<void>;
  /** Lee, aplica la mutación y guarda el nuevo estado. */
  update(id: string, mutate: (run: AuditRun) => AuditRun): Promise<AuditRun>;
  saveCertificate(cert: ConformityCertificate, ownerId: string): Promise<ConformityCertificate>;
  latestCertificateHash(ownerId: string): Promise<string>;
  /** Informe público por identificador VGI-INF-… o por hash, para /verificar. */
  findCertificate(q: string): Promise<PublicCertificate | null>;
  /** Escribe y relee una clave para que el proyecto de Supabase no se pause. */
  keepAlive(stamp: string): Promise<boolean>;
  /** Borra del almacén lo que ya venció. Solo Supabase la necesita. */
  purge(): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Almacén clave-valor                                                 */
/* ------------------------------------------------------------------ */

interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Borrado real de lo vencido. Redis y memoria caducan solos; Postgres no. */
  purge?(): Promise<void>;
}

function redis(url: string, token: string): KV {
  const cmd = async (...args: Array<string | number>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (!res.ok || body.error) throw new Error(`Redis: ${body.error ?? res.status}`);
    return body.result;
  };
  return {
    get: async (key) => (await cmd("GET", key)) as string | null,
    set: async (key, value, ttl) => void (await cmd("SET", key, value, ...(ttl ? ["EX", ttl] : []))),
    del: async (key) => void (await cmd("DEL", key)),
  };
}

/** Una sola tabla `key text primary key, value text, expires_at timestamptz`, con RLS
 * activo y sin políticas: solo la service role (que lo salta) puede tocarla. */
function supabase(url: string, serviceKey: string): KV {
  const base = `${url}/rest/v1/kv_store`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
  return {
    async get(key) {
      const res = await fetch(
        `${base}?key=eq.${encodeURIComponent(key)}` +
          `&or=(expires_at.is.null,expires_at.gte.${new Date().toISOString()})` +
          `&select=value&limit=1`,
        { headers, cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Supabase: ${res.status} ${await res.text()}`);
      const rows = (await res.json()) as Array<{ value: string }>;
      return rows[0]?.value ?? null;
    },
    async set(key, value, ttl) {
      const expires_at = ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null;
      const res = await fetch(base, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify([{ key, value, expires_at }]),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Supabase: ${res.status} ${await res.text()}`);
    },
    async del(key) {
      const res = await fetch(`${base}?key=eq.${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Supabase: ${res.status} ${await res.text()}`);
    },
    // El `expires_at` de Postgres solo filtra la lectura: sin este DELETE la fila
    // (con el .zip en base64) se quedaría para siempre, contra la cláusula 4 del acuerdo.
    async purge() {
      const res = await fetch(`${base}?expires_at=lt.${new Date().toISOString()}`, {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Supabase: ${res.status} ${await res.text()}`);
    },
  };
}

function memory(): KV {
  const map = new Map<string, { value: string; expiresAt: number }>();
  return {
    get: async (key) => {
      const row = map.get(key);
      if (!row) return null;
      if (row.expiresAt && row.expiresAt < Date.now()) {
        map.delete(key);
        return null;
      }
      return row.value;
    },
    set: async (key, value, ttl) =>
      void map.set(key, { value, expiresAt: ttl ? Date.now() + ttl * 1000 : 0 }),
    del: async (key) => void map.delete(key),
  };
}

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** En desarrollo Next recarga los módulos; la memoria se cuelga de `globalThis`. */
const globalRef = globalThis as typeof globalThis & { __vigiaKV?: KV };
const kv: KV = REDIS_URL && REDIS_TOKEN
  ? redis(REDIS_URL, REDIS_TOKEN)
  : SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? supabase(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : (globalRef.__vigiaKV ??= memory());

const json = async <T>(key: string): Promise<T | null> => {
  const value = await kv.get(key);
  return value ? (JSON.parse(value) as T) : null;
};
const put = (key: string, value: unknown) => kv.set(key, JSON.stringify(value));

/* ------------------------------------------------------------------ */
/* Repositorios                                                        */
/* ------------------------------------------------------------------ */

const SESSION_SECONDS = 60 * 60 * 8;
const ZIP_SECONDS = 60 * 60 * 24 * 90;

export const accounts: AccountRepository = {
  async create(user) {
    await put(`user:${user.id}`, user);
    await kv.set(`email:${user.email}`, user.id);
    return user;
  },
  find: (id) => json<User>(`user:${id}`),
  async update(user) {
    await put(`user:${user.id}`, user);
    return user;
  },
  async findByEmail(email) {
    const id = await kv.get(`email:${email}`);
    return id ? json<User>(`user:${id}`) : null;
  },
  async openSession(userId) {
    const token = randomBytes(32).toString("hex");
    await kv.set(`session:${token}`, userId, SESSION_SECONDS);
    return token;
  },
  sessionUser: (token) => kv.get(`session:${token}`),
  closeSession: (token) => kv.del(`session:${token}`),
};

/** Intentos fallidos de ingreso por correo, para frenar la fuerza bruta. */
export const loginAttempts = {
  failures: async (email: string) => Number(await kv.get(`login:fallos:${email}`)) || 0,
  async fail(email: string, ttlSeconds: number) {
    const key = `login:fallos:${email}`;
    await kv.set(key, String((Number(await kv.get(key)) || 0) + 1), ttlSeconds);
  },
  reset: (email: string) => kv.del(`login:fallos:${email}`),
};

// ponytail: update es leer-modificar-escribir sin bloqueo; basta porque cada
// auditoría la escribe un solo proceso a la vez. Con Postgres, SELECT … FOR UPDATE.
export const repository: AuditRepository = {
  async create(run, zip) {
    // Temporalidad (Decreto 1377 art. 11): el código se borra a los 90 días; queda su SHA-256.
    await kv.set(`zip:${run.id}`, zip.toString("base64"), ZIP_SECONDS);
    await put(`run:${run.id}`, run);
    const ids = (await json<string[]>(`owner:${run.ownerId}`)) ?? [];
    await put(`owner:${run.ownerId}`, [run.id, ...ids]);
    return run;
  },
  find: (id) => json<AuditRun>(`run:${id}`),
  async listByOwner(ownerId) {
    const ids = (await json<string[]>(`owner:${ownerId}`)) ?? [];
    const runs = await Promise.all(ids.map((id) => json<AuditRun>(`run:${id}`)));
    return runs.filter((run): run is AuditRun => run !== null);
  },
  async files(runId, version) {
    const zip = await kv.get(version ? `zip:${runId}:${version}` : `zip:${runId}`);
    return zip ? readZip(Buffer.from(zip, "base64")) : [];
  },
  saveCorrected: (runId, zip) => kv.set(`zip:${runId}:corregido`, zip.toString("base64"), ZIP_SECONDS),
  async deleteSource(runId) {
    await kv.del(`zip:${runId}`);
    await kv.del(`zip:${runId}:corregido`);
  },
  async update(id, mutate) {
    const current = await json<AuditRun>(`run:${id}`);
    if (!current) throw new Error(`Auditoría no encontrada: ${id}`);
    const next = mutate(current);
    await put(`run:${id}`, next);
    return next;
  },
  /* La cadena de hash es POR ABOGADO (`certificado:ultimo:<ownerId>`): un informe
     encadenado al de otro cliente no lo puede verificar nadie, porque su eslabón
     anterior es un documento que el destinatario nunca va a ver. */
  async saveCertificate(cert, ownerId) {
    await kv.set(`certificado:ultimo:${ownerId}`, cert.hash);
    const publicRecord: PublicCertificate = {
      id: cert.id,
      issuedAt: cert.issuedAt,
      hash: cert.hash,
      previousHash: cert.previousHash,
      timestamp: cert.timestamp ?? null,
      scoreBefore: cert.scoreBefore,
      scoreAfter: cert.scoreAfter,
      sourceSha256: cert.sourceSha256,
      retestSha256: cert.retestSha256,
      signedCount: cert.signedFindings.length,
      findingsCount: cert.findingsCount,
      // "VGI-011 · Ana Ruiz (T.P. 123456) · Salvedad: …" → "Ana Ruiz (T.P. 123456)"
      signers: [
        ...new Set(
          cert.signedFindings
            .map((f) => /·\s*([^·]*\(T\.P\.\s*\d+\))/.exec(f)?.[1].trim())
            .filter((s): s is string => Boolean(s)),
        ),
      ],
    };
    await put(`cert:id:${cert.id}`, publicRecord);
    await put(`cert:hash:${cert.hash}`, publicRecord);
    return cert;
  },
  latestCertificateHash: async (ownerId) =>
    (await kv.get(`certificado:ultimo:${ownerId}`)) ?? "0".repeat(64),
  async findCertificate(q) {
    const key = q.trim();
    if (!key) return null;
    return (
      (await json<PublicCertificate>(`cert:id:${key.toUpperCase()}`)) ??
      (await json<PublicCertificate>(`cert:hash:${key.toLowerCase()}`))
    );
  },
  async keepAlive(stamp) {
    await kv.set("keepalive", stamp);
    return (await kv.get("keepalive")) === stamp;
  },
  purge: async () => kv.purge?.(),
};
