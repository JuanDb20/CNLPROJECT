"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardHeader,
  Label,
  ProgressBar,
  Tag,
  buttonClass,
  cx,
} from "@/components/ui";
import { executionLabel } from "@/domain/format";
import type { AuditRun, LogEntry, LogLevel, ModuleStatus } from "@/domain/types";

/**
 * Consumo del flujo de eventos de la auditoría.
 *
 * El cliente no sondea: abre una conexión SSE contra /eventos y recibe la traza
 * y las instantáneas de estado. Al terminar, invalida la ruta para que el mapa
 * de riesgos se renderice en el servidor con los hallazgos ya persistidos.
 */

const STATUS_LABEL: Record<ModuleStatus, string> = {
  esperando: "Esperando",
  ejecutando: "Ejecutando",
  completado: "Completado",
  omitido: "Omitido",
};

const STATUS_STYLE: Record<ModuleStatus, string> = {
  esperando: "bg-canvas text-ink-muted",
  ejecutando: "bg-warning-soft text-warning",
  completado: "bg-safe-soft text-safe",
  omitido: "bg-canvas text-ink-faint",
};

const LOG_STYLE: Record<LogLevel, string> = {
  system: "text-ink-muted",
  info: "text-ink-soft",
  payload: "text-brand",
  vuln: "text-critical",
  ok: "text-safe",
};

const LOG_TAG: Record<LogLevel, string> = {
  system: "SISTEMA",
  info: "INFO",
  payload: "PRUEBA",
  vuln: "HALLAZGO",
  ok: "OK",
};

interface StateEvent {
  run: AuditRun;
  progress: number;
  phase: string;
}

/** Lista de módulos con su propio progreso: se muestra abierta mientras corre
    el escaneo, y plegada («Ver detalle por módulo») una vez termina. */
function ModuleList({ modules }: { modules: AuditRun["modules"] }) {
  return (
    <ul className="space-y-2.5">
      {modules.map((module) => (
        <li
          key={module.id}
          className="rounded-[8px] border border-line bg-surface-muted p-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-ink">{module.name}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                {module.description}
              </p>
            </div>
            <span
              className={cx(
                "shrink-0 rounded-[5px] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
                STATUS_STYLE[module.status],
              )}
            >
              {STATUS_LABEL[module.status]}
            </span>
          </div>
          {module.status !== "esperando" && module.status !== "omitido" ? (
            <>
              <div className="mt-2.5">
                <ProgressBar value={module.progress} tone="brand" />
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
                {module.findingsFound} hallazgos · {module.progress}%
              </p>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function LiveRun({ initialRun }: { initialRun: AuditRun }) {
  const router = useRouter();
  const [run, setRun] = useState(initialRun);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("En espera");
  const [logs, setLogs] = useState<LogEntry[]>(initialRun.logs);
  const [connected, setConnected] = useState(false);

  const consoleRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const source = new EventSource(`/api/v1/runs/${initialRun.id}/eventos`);

    source.onopen = () => setConnected(true);

    source.addEventListener("log", (event) => {
      const entry = JSON.parse((event as MessageEvent).data) as LogEntry;
      setLogs((prev) =>
        prev.some((l) => l.seq === entry.seq) ? prev : [...prev, entry],
      );
    });

    source.addEventListener("estado", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as StateEvent;
      setRun(data.run);
      setProgress(data.progress);
      setPhase(data.phase);

      if (!finishedRef.current && data.run.status !== "ejecutando") {
        finishedRef.current = true;
        source.close();
        setConnected(false);
        /* Refresca el árbol de servidor para que los pasos 4–6 vean los hallazgos. */
        router.refresh();
      }
    });

    source.onerror = () => setConnected(false);

    return () => source.close();
  }, [initialRun.id, router]);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  const done = run.status !== "ejecutando";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Ejecución de las pruebas
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Análisis del código cargado, en un entorno aislado y autorizado
        </p>
      </div>

      {done ? (
        /* Terminó: el resultado es la acción principal y va primero, justo
           bajo el título — no al final de la lista de módulos. */
        <Card>
          <CardHeader title="Análisis completado" />
          <p className="text-[13px] text-ink-soft">
            Se encontraron {run.findings.length} hallazgos. El siguiente paso es
            revisarlos en el mapa de riesgos.
          </p>
          <a
            href="/auditoria/riesgos"
            className={cx(buttonClass("primary", true), "mt-4")}
          >
            Ver mapa de riesgos ({run.findings.length} hallazgos)
          </a>
        </Card>
      ) : (
        /* Corriendo: la barra global y el detalle por módulo son la misma
           historia, así que viven visibles en una sola tarjeta. */
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink">
              Progreso de pruebas: {progress}%
            </p>
            <p className="text-[12px] text-ink-muted">{phase}</p>
          </div>
          <ProgressBar value={progress} />

          <div className="mt-4">
            <Label>Módulos</Label>
          </div>
          <ModuleList modules={run.modules} />
        </Card>
      )}

      {done ? (
        <details>
          <summary className="cursor-pointer list-none text-[12px] text-ink-muted transition-colors hover:text-ink">
            <span aria-hidden className="mr-1.5">
              ›
            </span>
            Ver detalle por módulo
          </summary>
          <Card className="mt-3">
            <ModuleList modules={run.modules} />
          </Card>
        </details>
      ) : null}

      {/* Registro técnico: es la traza cruda del escaneo, consulta para quien
          la quiera auditar, no algo que compita con el progreso o el resultado. */}
      <details open={!done}>
        <summary className="cursor-pointer list-none text-[12px] text-ink-muted transition-colors hover:text-ink">
          <span aria-hidden className="mr-1.5">
            ›
          </span>
          Ver registro técnico
        </summary>

        <Card className="mt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] text-ink-soft">Traza del análisis</p>
            <Tag tone="brand">{logs.length} eventos</Tag>
          </div>

          <div className="overflow-hidden rounded-[8px] border border-line-strong bg-canvas">
            <div className="flex items-center gap-1.5 border-b border-line bg-surface-muted px-3 py-2">
              <span className="truncate font-mono text-[10px] text-ink-faint">
                {executionLabel(run.scope.sandboxId)} —{" "}
                <span className={connected ? "text-safe" : "text-ink-faint"}>
                  {connected ? "sesión activa" : done ? "sesión cerrada" : "reconectando"}
                </span>
              </span>
            </div>
            <div
              ref={consoleRef}
              className="scroll-slim h-[320px] overflow-y-auto p-3"
              aria-live="polite"
              aria-label="Traza de la auditoría"
            >
              {logs.length === 0 ? (
                <p className="font-mono text-[11px] text-ink-faint">
                  Esperando la primera entrada de la traza…
                </p>
              ) : (
                <ol className="space-y-0.5">
                  {logs.map((entry, i) => {
                    const isLatest = i === logs.length - 1 && !done;
                    return (
                      <li
                        key={entry.seq}
                        data-level={entry.level}
                        className="term-line rise font-mono text-[11px] leading-[1.8]"
                      >
                        <span className="term-t">
                          {new Date(entry.at).toLocaleTimeString("es-CO", {
                            hour12: false,
                            timeZone: "America/Bogota",
                          })}
                        </span>
                        <span className={cx("font-medium", LOG_STYLE[entry.level])}>
                          [{LOG_TAG[entry.level]}]
                        </span>
                        <span
                          className={cx(
                            "term-msg overflow-hidden text-ink-soft",
                            isLatest && "typing",
                          )}
                          style={
                            isLatest
                              ? ({ "--term-chw": `${entry.message.length}ch` } as CSSProperties)
                              : undefined
                          }
                        >
                          {entry.message}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>

          {!done ? (
            <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
              El análisis corre en {executionLabel(run.scope.sandboxId)}, sobre el código cargado. La
              traza queda guardada en el expediente de la auditoría.
            </p>
          ) : null}
        </Card>
      </details>
    </div>
  );
}
