import { randomBytes } from "node:crypto";

import type { AuditRun, ConformityCertificate, RepoFile, User } from "@/domain/types";

import { readZip } from "./zip";

/**
 * Capa de persistencia.
 *
 * `AccountRepository` y `AuditRepository` son las únicas puertas por las que la
 * aplicación toca estado. Ambas se apoyan en un almacén clave-valor: Redis
 * (Upstash, por su API REST) cuando el despliegue define sus variables de
 * entorno, y memoria en desarrollo local. En Vercel cada ruta puede correr en
 * una instancia distinta, así que en producción el estado vive en Redis.
 */

export interface AccountRepository {
  create(user: User): Promise<User>;
  find(id: string): Promise<User | null>;
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
  /** Lee, aplica la mutación y guarda el nuevo estado. */
  update(id: string, mutate: (run: AuditRun) => AuditRun): Promise<AuditRun>;
  saveCertificate(cert: ConformityCertificate): Promise<ConformityCertificate>;
  latestCertificateHash(): Promise<string>;
}

/* ------------------------------------------------------------------ */
/* Almacén clave-valor                                                 */
/* ------------------------------------------------------------------ */

interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
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

// ponytail: en memoria las sesiones no caducan; la cookie sí (8 h).
function memory(): KV {
  const map = new Map<string, string>();
  return {
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => void map.set(key, value),
    del: async (key) => void map.delete(key),
  };
}

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

/** En desarrollo Next recarga los módulos; la memoria se cuelga de `globalThis`. */
const globalRef = globalThis as typeof globalThis & { __vigiaKV?: KV };
const kv: KV =
  REDIS_URL && REDIS_TOKEN ? redis(REDIS_URL, REDIS_TOKEN) : (globalRef.__vigiaKV ??= memory());

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
  async update(id, mutate) {
    const current = await json<AuditRun>(`run:${id}`);
    if (!current) throw new Error(`Auditoría no encontrada: ${id}`);
    const next = mutate(current);
    await put(`run:${id}`, next);
    return next;
  },
  async saveCertificate(cert) {
    await kv.set("certificado:ultimo", cert.hash);
    return cert;
  },
  latestCertificateHash: async () => (await kv.get("certificado:ultimo")) ?? "0".repeat(16),
};
