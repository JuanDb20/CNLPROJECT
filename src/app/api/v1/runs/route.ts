import { NextResponse } from "next/server";

import { createRun } from "@/engine/orchestrator";
import { RUN_COOKIE, ok, present } from "@/server/http";
import { repository } from "@/server/store";

/** GET /api/v1/runs — auditorías de la instancia. */
export async function GET() {
  const runs = await repository.list();
  return ok(runs.map(present));
}

/** POST /api/v1/runs — abre una auditoría y la fija en la sesión del navegador. */
export async function POST() {
  const run = await createRun();
  const response = NextResponse.json(present(run), { status: 201 });
  response.cookies.set(RUN_COOKIE, run.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
