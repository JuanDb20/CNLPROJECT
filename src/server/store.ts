import type { AuditRun, ConformityCertificate, LogEntry } from "@/domain/types";

/**
 * Capa de persistencia y de eventos.
 *
 * `AuditRepository` y `EventBus` son las dos únicas puertas por las que la
 * aplicación toca estado mutable. La implementación de este MVP vive en memoria;
 * sustituirla por Postgres (repositorio) y Redis Pub/Sub (bus) no exige cambios
 * en el dominio, en el motor ni en la interfaz, porque nadie fuera de este
 * archivo conoce el mecanismo de almacenamiento.
 */

export interface AuditRepository {
  create(run: AuditRun): Promise<AuditRun>;
  find(id: string): Promise<AuditRun | null>;
  list(): Promise<AuditRun[]>;
  /** Mutación transaccional: recibe el estado actual y devuelve el nuevo. */
  update(id: string, mutate: (run: AuditRun) => AuditRun): Promise<AuditRun>;
  saveCertificate(cert: ConformityCertificate): Promise<ConformityCertificate>;
  latestCertificateHash(): Promise<string>;
}

export interface EventBus {
  publish(runId: string, entry: LogEntry): void;
  subscribe(runId: string, listener: (entry: LogEntry) => void): () => void;
}

/* ------------------------------------------------------------------ */
/* Implementación en memoria                                           */
/* ------------------------------------------------------------------ */

class MemoryRepository implements AuditRepository {
  private runs = new Map<string, AuditRun>();
  private certificates: ConformityCertificate[] = [];

  async create(run: AuditRun) {
    this.runs.set(run.id, run);
    return run;
  }

  async find(id: string) {
    return this.runs.get(id) ?? null;
  }

  async list() {
    return [...this.runs.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async update(id: string, mutate: (run: AuditRun) => AuditRun) {
    const current = this.runs.get(id);
    if (!current) throw new Error(`Auditoría no encontrada: ${id}`);
    const next = mutate(current);
    this.runs.set(id, next);
    return next;
  }

  async saveCertificate(cert: ConformityCertificate) {
    this.certificates.push(cert);
    return cert;
  }

  async latestCertificateHash() {
    const last = this.certificates.at(-1);
    return last ? last.hash : "0".repeat(16);
  }
}

class MemoryEventBus implements EventBus {
  private listeners = new Map<string, Set<(entry: LogEntry) => void>>();

  publish(runId: string, entry: LogEntry) {
    this.listeners.get(runId)?.forEach((listener) => {
      try {
        listener(entry);
      } catch {
        /* un suscriptor caído no puede tumbar la publicación */
      }
    });
  }

  subscribe(runId: string, listener: (entry: LogEntry) => void) {
    const set = this.listeners.get(runId) ?? new Set();
    set.add(listener);
    this.listeners.set(runId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(runId);
    };
  }
}

/* ------------------------------------------------------------------ */
/* Singleton                                                           */
/* ------------------------------------------------------------------ */

/**
 * En desarrollo Next recarga los módulos en cada cambio, así que el estado se
 * cuelga de `globalThis` para no perder la auditoría en curso entre recargas.
 */
interface VigiaGlobal {
  repository?: AuditRepository;
  bus?: EventBus;
  /** Auditorías cuyo orquestador ya está corriendo, para no duplicarlo. */
  running?: Set<string>;
}

const globalRef = globalThis as typeof globalThis & { __vigia?: VigiaGlobal };
globalRef.__vigia ??= {};

export const repository: AuditRepository = (globalRef.__vigia.repository ??=
  new MemoryRepository());

export const bus: EventBus = (globalRef.__vigia.bus ??= new MemoryEventBus());

export const runningRuns: Set<string> = (globalRef.__vigia.running ??= new Set());
