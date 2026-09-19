import { fail, ok } from "@/server/http";
import { repository } from "@/server/store";

/**
 * GET /api/cron/keepalive — rutina diaria (ver vercel.json).
 *
 * Hace dos cosas de una vez: toca la base para que el proyecto de Supabase no se
 * pause por inactividad (plan gratuito: 7 días), y borra las filas vencidas, que
 * en Postgres no caducan solas. La cláusula 4 del acuerdo promete ese borrado.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return fail("No autorizado", 401);
  }
  const purgedAt = new Date().toISOString();
  const alive = await repository.keepAlive(purgedAt);
  await repository.purge();
  return ok({ ok: alive, purgedAt });
}
