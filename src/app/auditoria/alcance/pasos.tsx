import Link from "next/link";

import { cx } from "@/components/ui";

/**
 * Pantallas de un paso, en orden: dicen en qué punto de la secuencia se está y
 * dejan volver a una anterior. El número viaja en la URL (?paso=), así que el
 * servidor decide qué se muestra y recargar no pierde el lugar.
 */
export function Pasos({
  base,
  nombres,
  actual,
}: {
  base: string;
  nombres: string[];
  actual: number;
}) {
  return (
    <ol
      aria-label="Pantallas de este paso"
      className={cx("grid gap-2", nombres.length === 3 ? "grid-cols-3" : "grid-cols-2")}
    >
      {nombres.map((nombre, i) => (
        <li key={nombre}>
          <Link
            href={`${base}?paso=${i + 1}`}
            aria-current={i + 1 === actual ? "step" : undefined}
            className={cx(
              "block border-t-[3px] pt-2 text-[12px] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              i + 1 <= actual ? "border-brand" : "border-line",
              i + 1 === actual ? "font-medium text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {nombre}
          </Link>
        </li>
      ))}
    </ol>
  );
}
