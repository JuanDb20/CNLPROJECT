import { InventarioTabla, inventarioCsv } from "@/components/inventario";
import { PrintButton } from "@/components/print-button";
import { Card, CardHeader, Panel, buttonClass } from "@/components/ui";
import { requireAnalyzedRun } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventario de tratamientos" };

/* Inventario de tratamientos: el registro de actividades que el abogado
   normalmente reconstruye por entrevistas, derivado del código analizado. Vive
   en la auditoría (no se recalcula aquí) y sobrevive al borrado del código. */

export default async function InventarioPage() {
  const run = await requireAnalyzedRun();
  const rows = run.inventory ?? [];
  const csv = `data:text/csv;charset=utf-8,${encodeURIComponent(inventarioCsv(rows))}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Inventario de tratamientos
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            Derivado del código de {run.scope.client.name}
          </p>
        </div>
        <PrintButton />
      </div>

      <Panel tone="brand">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Registro de actividades de tratamiento leído del código: qué categorías de datos
          trata el sistema, dónde se recolectan, a quién llegan y si salen del país. Es el
          insumo del Registro Nacional de Bases de Datos —obligatorio para sociedades y
          entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT y para
          personas jurídicas de naturaleza pública (Decreto 1074 de 2015, art. 2.2.2.26.1.2,
          modificado por el Decreto 090 de 2018)— y, para quien no esté obligado a
          inscribirse, la base de la responsabilidad demostrada (arts. 2.2.2.25.6.1 y
          2.2.2.25.6.2 del mismo decreto): no se puede acreditar una medida sobre datos que
          no se sabe que se están tratando.
        </p>
      </Panel>

      <Card>
        <CardHeader
          title="Categorías de datos detectadas"
          tag={`${rows.length} ${rows.length === 1 ? "fila" : "filas"}`}
          description="Cada fila reúne todos los puntos del código donde aparece esa categoría."
        />
        {rows.length === 0 ? (
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            Esta auditoría no tiene inventario. El inventario se arma al terminar el
            análisis: o la auditoría se ejecutó antes de que existiera, o el código cargado
            no traía esquema de base de datos ni herramientas con campos personales
            reconocibles por su nombre. Volver a ejecutar el análisis (paso 3) lo genera.
          </p>
        ) : (
          <>
            <InventarioTabla rows={rows} />
            <div className="mt-4 print:hidden">
              <a href={csv} download="inventario-de-tratamientos.csv" className={buttonClass("secondary")}>
                Descargar inventario (.csv)
              </a>
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardHeader title="Qué infiere VIGÍA y qué completa el abogado" />
        <ul className="space-y-2 text-[12.5px] leading-relaxed text-ink-soft">
          <li>
            <span className="text-ink">Se infiere del código:</span> la categoría, por el
            nombre de la columna del esquema o del campo que devuelve cada herramienta del
            asistente; el origen, con archivo y línea; los destinatarios, cuando el código
            deja ver que el dato llega a una tabla o a un proveedor de IA; y el país de ese
            proveedor.
          </li>
          <li>
            <span className="text-ink">No se infiere:</span> la finalidad, salvo cuando la
            actividad es evidente en el código; la base de legitimación, que se propone como
            autorización del titular y hay que verificar; el plazo, cuando el código no borra
            ni vence nada; y todo tratamiento que no pase por el repositorio: formularios en
            papel, hojas de cálculo, proveedores contratados por fuera del código o campos
            que solo existan en la interfaz.
          </li>
          <li>
            Las casillas marcadas <span className="font-mono text-[11px]">[POR COMPLETAR]</span>{" "}
            son las que el abogado llena y firma. El inventario no se publica: es un
            documento interno de trabajo.
          </li>
        </ul>
      </Card>
    </div>
  );
}
