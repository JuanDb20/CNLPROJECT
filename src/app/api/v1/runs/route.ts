import { NextResponse } from "next/server";

import { createRunFromForm } from "@/engine/orchestrator";
import { currentUser } from "@/server/auth";
import { RUN_COOKIE, fail, ok, present } from "@/server/http";
import { repository } from "@/server/store";

/** GET /api/v1/runs — auditorías del abogado de la sesión. */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Sesión requerida", 401);
  return ok((await repository.listByOwner(user.id)).map(present));
}

/**
 * POST /api/v1/runs — abre una auditoría. Recibe multipart/form-data con los
 * mismos campos del formulario: cliente, nit, representante, sector, sistema y
 * codigo (.zip).
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail("Sesión requerida", 401);
  const form = await request.formData().catch(() => null);
  if (!form) return fail("Envía el formulario como multipart/form-data");

  try {
    const run = await createRunFromForm(user, form);
    const response = NextResponse.json(present(run), { status: 201 });
    response.cookies.set(RUN_COOKIE, run.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Error inesperado");
  }
}
