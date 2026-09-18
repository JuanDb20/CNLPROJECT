import { reejecutarEscaneo } from "@/app/actions";
import { Card, buttonClass } from "@/components/ui";
import { requireAuthorizedRun } from "@/server/session";

import { LiveRun } from "./live-run";

export const dynamic = "force-dynamic";

export default async function EjecucionPage() {
  const run = await requireAuthorizedRun();

  /* Si el usuario llega por navegación directa sin haber lanzado el escaneo,
     se le ofrece lanzarlo en lugar de mostrar una consola vacía. */
  if (run.status === "configurado") {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Ejecución de pruebas adversariales
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Equipo rojo en vivo sobre el sandbox autorizado
          </p>
        </div>
        <Card>
          <p className="text-[13px] text-ink-soft">
            El alcance está autorizado y la configuración guardada, pero todavía no se
            ha lanzado el escaneo sobre {run.scope.sandboxId}.
          </p>
          <form action={reejecutarEscaneo} className="mt-4">
            <button type="submit" className={buttonClass("brand")}>
              Iniciar escaneo seguro
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return <LiveRun initialRun={run} />;
}
