import { FRAMEWORKS, RULES } from "@/domain/compliance";
import { ok } from "@/server/http";

/**
 * GET /api/v1/normativa — catálogo normativo público.
 *
 * Se expone como recurso propio porque es el activo que el producto mantiene
 * actualizado: un despacho puede consumirlo para alinear sus propias listas de
 * verificación, y añadir una jurisdicción no exige desplegar la aplicación.
 */
export async function GET() {
  return ok({
    frameworks: Object.values(FRAMEWORKS),
    rules: RULES,
    updatedAt: "2026-09-17",
  });
}
