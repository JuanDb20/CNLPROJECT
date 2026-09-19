import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { User } from "@/domain/types";

import { accounts } from "./store";

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
  professionalCard: string;
  firm: string;
  password: string;
}): Promise<void> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const card = input.professionalCard.trim();
  if (name.length < 3 || name.length > 120) throw new Error("nombre");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("correo");
  if (!/^\d{3,7}$/.test(card)) throw new Error("tarjeta");
  if (input.password.length < 8 || input.password.length > 200) throw new Error("clave");
  if (await accounts.findByEmail(email)) throw new Error("existe");

  const user = await accounts.create({
    id: randomUUID(),
    name,
    email,
    professionalCard: card,
    firm: input.firm.trim().slice(0, 120),
    passwordHash: hashPassword(input.password),
  });
  await startSession(user.id);
}

export async function login(email: string, password: string): Promise<boolean> {
  const user = await accounts.findByEmail(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) return false;
  await startSession(user.id);
  return true;
}

const DEMO_EMAIL = "demo@vigia.test";

/** Usuario de prueba fijo, para no tener que registrar una cuenta real solo para probar el flujo. */
export async function loginDemo(): Promise<void> {
  const user =
    (await accounts.findByEmail(DEMO_EMAIL)) ??
    (await accounts.create({
      id: randomUUID(),
      name: "Usuario de prueba",
      email: DEMO_EMAIL,
      professionalCard: "000000",
      firm: "VIGÍA (demo)",
      passwordHash: hashPassword(randomBytes(16).toString("hex")),
    }));
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
