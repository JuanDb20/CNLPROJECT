import { buttonClass, cx } from "./ui";

/**
 * Documento jurídico generado, en lectura.
 *
 * Recibe las líneas del parche de tipo `documento` tal como las produce
 * `src/domain/documentos.ts`: `# Título`, `## Sección`, `- viñeta`, línea vacía
 * como separación y cualquier otra línea como párrafo. Lo que el abogado debe
 * diligenciar viene entre corchetes y se resalta para que no pase inadvertido.
 */

/** Resalta los `[POR COMPLETAR: …]` dentro de un párrafo. */
function conPendientes(texto: string) {
  return texto.split(/(\[POR COMPLETAR:[^\]]*\])/g).map((parte, i) =>
    parte.startsWith("[POR COMPLETAR:") ? (
      <mark key={i} className="rounded-[3px] bg-warning-soft px-1 text-warning">
        {parte}
      </mark>
    ) : (
      parte
    ),
  );
}

type Bloque =
  | { tipo: "titulo" | "seccion" | "parrafo"; texto: string }
  | { tipo: "lista"; items: string[] };

function bloques(lines: string[]): Bloque[] {
  const salida: Bloque[] = [];
  for (const line of lines) {
    if (line.startsWith("- ")) {
      const ultimo = salida.at(-1);
      if (ultimo?.tipo === "lista") ultimo.items.push(line.slice(2));
      else salida.push({ tipo: "lista", items: [line.slice(2)] });
    } else if (line.startsWith("## ")) {
      salida.push({ tipo: "seccion", texto: line.slice(3) });
    } else if (line.startsWith("# ")) {
      salida.push({ tipo: "titulo", texto: line.slice(2) });
    } else if (line.trim()) {
      salida.push({ tipo: "parrafo", texto: line });
    }
  }
  return salida;
}

export function Documento({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <article className={cx("space-y-3", className)}>
      {bloques(lines).map((bloque, i) => {
        if (bloque.tipo === "titulo") {
          return (
            <h3 key={i} className="text-[14px] font-semibold tracking-tight text-ink">
              {bloque.texto}
            </h3>
          );
        }
        if (bloque.tipo === "seccion") {
          return (
            <h4
              key={i}
              className="pt-1 font-mono text-[10.5px] font-medium uppercase tracking-wider text-ink-faint"
            >
              {bloque.texto}
            </h4>
          );
        }
        if (bloque.tipo === "lista") {
          return (
            <ul key={i} className="space-y-1.5">
              {bloque.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
                  <span aria-hidden className="text-ink-faint">
                    ·
                  </span>
                  <span>{conPendientes(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[12px] leading-relaxed text-ink-soft">
            {conPendientes(bloque.texto)}
          </p>
        );
      })}
    </article>
  );
}

/** Descarga del documento: texto plano por data: URI y Word por la API. */
export function DescargasDocumento({
  code,
  lines,
  runId,
  findingId,
  className,
}: {
  code: string;
  lines: string[];
  runId: string;
  findingId: string;
  className?: string;
}) {
  const href = `data:text/markdown;charset=utf-8,${encodeURIComponent(lines.join("\n"))}`;
  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      <a href={href} download={`${code}.md`} className={buttonClass("secondary")}>
        Descargar documento (.md)
      </a>
      <a
        href={`/api/v1/runs/${runId}/hallazgos/${findingId}/documento?formato=docx`}
        className={buttonClass("secondary")}
      >
        Descargar en Word (.docx)
      </a>
    </div>
  );
}
