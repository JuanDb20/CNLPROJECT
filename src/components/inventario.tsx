import type { InventoryRow } from "@/domain/inventario";

/* Tabla e exportación del inventario de tratamientos. Las columnas se declaran
   una sola vez: la tabla y el CSV no pueden quedar descuadrados. */

const COLUMNS: { head: string; cell: (r: InventoryRow) => string }[] = [
  { head: "Categoría de dato", cell: (r) => r.category },
  { head: "Origen en el código", cell: (r) => r.source },
  { head: "Finalidad", cell: (r) => r.purpose },
  { head: "Destinatarios", cell: (r) => r.recipients },
  { head: "Transferencia internacional", cell: (r) => r.international },
  { head: "Plazo de conservación", cell: (r) => r.retention },
  { head: "Sensible", cell: (r) => (r.sensitive ? "Sí" : "No") },
  { head: "Base de legitimación", cell: (r) => r.basis },
];

export function InventarioTabla({ rows }: { rows: InventoryRow[] }) {
  return (
    <div className="overflow-x-auto print:overflow-x-visible">
      <table className="w-full min-w-[62rem] border-collapse text-left text-[11.5px] print:min-w-0 print:text-[9px]">
        <caption className="mb-2 text-left text-[11.5px] leading-relaxed text-ink-muted">
          Registro de actividades de tratamiento derivado del código: una fila por categoría
          de dato, con su origen, sus destinatarios, la transferencia internacional y el
          plazo de conservación.
        </caption>
        <thead>
          <tr className="border-b border-line text-ink-muted">
            {COLUMNS.map((c) => (
              <th key={c.head} scope="col" className="py-1.5 pr-3 align-bottom font-medium">
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category} className="break-inside-avoid border-b border-line align-top">
              <th scope="row" className="py-1.5 pr-3 text-left font-medium text-ink">
                {r.category}
              </th>
              {COLUMNS.slice(1).map((c) => (
                <td key={c.head} className="py-1.5 pr-3 text-ink-soft">
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** CSV del inventario. Empieza con BOM para que Excel respete las tildes. */
export function inventarioCsv(rows: InventoryRow[]): string {
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [
    "﻿" + COLUMNS.map((c) => cell(c.head)).join(","),
    ...rows.map((r) => COLUMNS.map((c) => cell(c.cell(r))).join(",")),
  ].join("\r\n");
}
