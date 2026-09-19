"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { RuleChip, SeverityBadge, buttonClass, cx } from "@/components/ui";
import type { FrameworkId, Severity } from "@/domain/types";

export interface RiskRow {
  id: string;
  code: string;
  severity: Severity;
  title: string;
  summary: string;
  signed: boolean;
  frameworks: FrameworkId[];
  chips: Array<{ kind: string; label: string }>;
}

export interface FilterOption {
  id: FrameworkId | "todos";
  label: string;
}

export function RiskList({
  rows,
  filters,
}: {
  rows: RiskRow[];
  filters: FilterOption[];
}) {
  const [active, setActive] = useState<FrameworkId | "todos">("todos");

  const visible = useMemo(
    () =>
      active === "todos"
        ? rows
        : rows.filter((row) => row.frameworks.includes(active)),
    [rows, active],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por marco">
          {filters.map((filter) => {
            const isActive = filter.id === active;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActive(filter.id)}
                aria-pressed={isActive}
                className={cx(
                  "rounded-[6px] border px-2.5 py-1.5 font-mono text-[10.5px] transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  isActive
                    ? "border-ink bg-ink text-canvas"
                    : "border-line bg-surface text-ink-soft hover:bg-surface-muted",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-ink-muted">
          Orden: alta severidad y riesgo jurídico primero
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-muted">
          Ningún hallazgo del marco seleccionado.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start gap-x-4 gap-y-3 py-4 sm:flex-nowrap"
            >
              <div className="w-full sm:w-[108px] sm:shrink-0">
                <SeverityBadge severity={row.severity} />
                <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
                  {row.code}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-snug text-ink">
                  {row.title}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                  {row.summary}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.chips.map((chip) => (
                    <RuleChip
                      key={`${row.id}-${chip.label}`}
                      kind={chip.kind}
                      label={chip.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {row.signed ? (
                  <span className="rounded-[5px] bg-safe-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-safe">
                    Firmado
                  </span>
                ) : null}
                <Link
                  href={`/auditoria/hallazgos/${row.id}`}
                  className={cx(buttonClass("secondary"), "px-3 py-1.5 text-[12px]")}
                >
                  Ver hallazgo
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
