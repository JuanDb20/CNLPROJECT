import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { scoreRun } from "@/domain/scoring";
import type { AuditRun } from "@/domain/types";

import { currentUser } from "./auth";
import { repository } from "./store";

/** Cookie que identifica la auditoría abierta en esta sesión del navegador. */
export const RUN_COOKIE = "vigia_run";

/** Cookie del modo aprendizaje: mientras está puesta, cada pantalla explica el paso. */
export const MODO_COOKIE = "vigia_modo";

/** ¿Está activo el modo aprendizaje? */
export async function learningMode(): Promise<boolean> {
  return (await cookies()).get(MODO_COOKIE)?.value === "aprendizaje";
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Envuelve un handler para que cualquier error del dominio salga como 400/404. */
export async function guard<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    // Un fallo del almacén no es culpa de quien llama, y su cuerpo (PostgREST,
    // Upstash) no debe salir por la API: se registra y se responde en neutro.
    if (/^(Supabase|Redis):/.test(message)) {
      console.error(message);
      return fail("El almacenamiento no respondió; inténtalo de nuevo", 500);
    }
    return fail(message, /no encontrad/i.test(message) ? 404 : 400);
  }
}

/** Representación que consume la interfaz: la auditoría más su puntuación derivada. */
export function present(run: AuditRun) {
  return { run, score: scoreRun(run) };
}

export async function currentRunId(): Promise<string | null> {
  const store = await cookies();
  return store.get(RUN_COOKIE)?.value ?? null;
}

/** Lee la auditoría en curso desde un componente de servidor. */
export async function currentRun(): Promise<AuditRun | null> {
  const id = await currentRunId();
  if (!id) return null;
  return repository.find(id);
}

/** La auditoría, solo si pertenece al abogado de la sesión. Para la API. */
export async function ownedRun(runId: string): Promise<AuditRun | null> {
  const [user, run] = await Promise.all([currentUser(), repository.find(runId)]);
  return user && run?.ownerId === user.id ? run : null;
}

/** La auditoría, solo si el token del enlace del cliente coincide. Para su portal. */
export async function clientRun(runId: string, token: string): Promise<AuditRun | null> {
  const run = await repository.find(runId);
  const expected = Buffer.from(run?.scope.clientToken ?? "");
  const given = Buffer.from(token);
  return run && expected.length > 0 && expected.length === given.length && timingSafeEqual(expected, given)
    ? run
    : null;
}
