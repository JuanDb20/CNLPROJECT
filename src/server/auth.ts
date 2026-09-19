import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { POLITICA_VERSION, POLITICA_VIGENCIA } from "@/app/privacidad/datos";
import type { User } from "@/domain/types";

import { accounts, loginAttempts } from "./store";

/**
 * Cuentas de abogado y sesiones.
 *
 * La contraseña se guarda con scrypt y sal por usuario; la sesión es un token
 * opaco en una cookie httpOnly. Cada auditoría pertenece al abogado que la abrió.
 */

export const SESSION_COOKIE = "vigia_sesion";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, "hex"));
}

async function startSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await accounts.openSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function register(input: {
  name: string;
  email: string;
  firm: string;
  password: string;
  privacyAccepted: boolean;
}): Promise<void> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 3 || name.length > 120) throw new Error("nombre");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("correo");
  if (input.password.length < 8 || input.password.length > 200) throw new Error("clave");
  // Prueba de la autorización (Decreto 1377, art. 8): versión de la política y fecha.
  if (!input.privacyAccepted) throw new Error("politica");
  if (await accounts.findByEmail(email)) throw new Error("existe");

  const user = await accounts.create({
    id: randomUUID(),
    name,
    email,
    firm: input.firm.trim().slice(0, 120),
    passwordHash: hashPassword(input.password),
    privacyAcceptance: {
      version: `${POLITICA_VERSION}, vigente desde el ${POLITICA_VIGENCIA}`,
      at: new Date().toISOString(),
    },
  });
  await startSession(user.id);
}

/** Hash de descarte: se verifica contra él cuando el correo no existe, para que
 * el tiempo de respuesta no revele qué cuentas están registradas. */
const DECOY_HASH = hashPassword(randomBytes(16).toString("hex"));

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_BLOCK_SECONDS = 15 * 60;

/** `bloqueado` cuando el correo acumuló demasiados intentos fallidos. */
export async function login(
  email: string,
  password: string,
): Promise<"ok" | "credenciales" | "bloqueado"> {
  const address = email.trim().toLowerCase();
  if ((await loginAttempts.failures(address)) >= LOGIN_MAX_FAILURES) return "bloqueado";

  const user = await accounts.findByEmail(address);
  // Verificar siempre, exista o no la cuenta: el tiempo de scrypt es el mismo.
  const valid = verifyPassword(password, user?.passwordHash ?? DECOY_HASH);
  if (!user || !valid) {
    await loginAttempts.fail(address, LOGIN_BLOCK_SECONDS);
    return "credenciales";
  }
  await loginAttempts.reset(address);
  await startSession(user.id);
  return "ok";
}

/**
 * Usuario de prueba nuevo en cada ingreso, para no tener que registrar una cuenta
 * real: cada jurado ve solo sus auditorías y nadie pisa las de otro.
 */
export async function loginDemo(): Promise<void> {
  const id = randomUUID();
  const user = await accounts.create({
    id,
    name: "Usuario de prueba",
    email: `demo-${id.slice(0, 8)}@vigia.test`,
    firm: "VIGÍA (demo)",
    passwordHash: hashPassword(randomBytes(16).toString("hex")),
  });
  await startSession(user.id);
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await accounts.closeSession(token);
  store.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = token ? await accounts.sessionUser(token) : null;
  return id ? accounts.find(id) : null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/ingresar");
  return user;
}
