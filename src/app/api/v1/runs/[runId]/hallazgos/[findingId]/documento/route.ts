import { docxFromLines } from "@/server/docx";
import { fail, ownedRun } from "@/server/http";

type Params = { params: Promise<{ runId: string; findingId: string }> };

/**
 * GET /api/v1/runs/:runId/hallazgos/:findingId/documento?formato=docx|md
 * Descarga el documento jurídico de un hallazgo cuyo parche es de tipo "documento".
 */
export async function GET(request: Request, { params }: Params) {
  const { runId, findingId } = await params;
  const run = await ownedRun(runId);
  if (!run) return fail("Auditoría no encontrada", 404);

  const finding = run.findings.find((f) => f.id === findingId);
  const patch = finding?.remediation.patch;
  if (!finding || !patch || patch.kind !== "documento") {
    return fail("El hallazgo no tiene un documento jurídico generado", 404);
  }

  const base = patch.target.split("/").pop()!.replace(/\.[^.]+$/, "");
  const formato = new URL(request.url).searchParams.get("formato");

  if (formato === "docx") {
    // Buffer implementa BodyInit en tiempo de ejecución; el aserto evita el desajuste de
    // tipos entre los genéricos de @types/node y los de lib.dom para ArrayBufferLike.
    return new Response(docxFromLines(patch.added) as BodyInit, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="${finding.code}-${base}.docx"`,
      },
    });
  }
  return new Response(patch.added.join("\n"), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
