import { reejecutarEscaneo } from "@/app/actions";
import { Card, buttonClass } from "@/components/ui";
import { executionLabel } from "@/domain/format";
import { requireAuthorizedRun } from "@/server/session";

import { LiveRun } from "./live-run";

export const metadata = { title: "Ejecución de pruebas" };

export const dynamic = "force-dynamic";

export default async function EjecucionPage() {
  const run = await requireAuthorizedRun();

  /* Si el usuario llega por navegación directa sin haber lanzado el escaneo, o
     si la ejecución murió a medias (la función se cortó, el almacén falló), se
     le ofrece lanzarlo en lugar de dejar la consola congelada sin salida. */
  const interrumpida =
    run.status === "ejecutando" &&
    Date.now() - Date.parse(run.logs.at(-1)?.at ?? run.createdAt) > 60_000;

  if (run.status === "configurado" || interrumpida) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Ejecución de pruebas adversariales
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Equipo rojo en vivo en el entorno aislado autorizado
          </p>
        </div>
        <Card>
          <p className="text-[13px] text-ink-soft">
            {interrumpida
              ? "La ejecución se interrumpió; puedes relanzarla."
              : `El alcance está autorizado y la configuración guardada, pero todavía no se ha lanzado el escaneo sobre ${executionLabel(run.scope.sandboxId)}.`}
          </p>
          <form action={reejecutarEscaneo} className="mt-4">
            <button type="submit" className={buttonClass("brand")}>
              {interrumpida ? "Relanzar el escaneo" : "Iniciar escaneo seguro"}
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return <LiveRun initialRun={run} />;
}
