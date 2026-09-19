"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardHeader,
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
  system: "SYSTEM",
  info: "INFO",
  payload: "SCAN",
  vuln: "VULN",
  ok: "OK",
};

interface StateEvent {
  run: AuditRun;
  progress: number;
  phase: string;
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

      if (
        !finishedRef.current &&
        (data.run.status === "analizado" || data.run.status === "certificado")
      ) {
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

  const done = run.status === "analizado" || run.status === "certificado";

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

      {/* Progreso global */}
      <Card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">
            Progreso de pruebas: {progress}%
          </p>
          <p className="text-[12px] text-ink-muted">{phase}</p>
        </div>
        <ProgressBar value={progress} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Módulos */}
        <Card>
          <CardHeader title={done ? "Análisis completado" : "Módulos en progreso"} />
          <ul className="space-y-2.5">
            {run.modules.map((module) => (
              <li
                key={module.id}
                className="rounded-[8px] border border-line bg-surface-muted p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-ink">
                      {module.name}
                    </p>
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
        </Card>

        {/* Consola */}
        <Card>
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
                  Esperando el primer evento del orquestador…
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

          {done ? (
            <a
              href="/auditoria/riesgos"
              className={cx(buttonClass("primary", true), "mt-4")}
            >
              Ver mapa de riesgos ({run.findings.length} hallazgos)
            </a>
          ) : (
            <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
              El análisis corre en {executionLabel(run.scope.sandboxId)}, sobre el código cargado. Cada
              entrada de la traza queda sellada para el informe forense.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
