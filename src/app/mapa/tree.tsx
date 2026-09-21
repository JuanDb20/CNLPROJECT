"use client";

import { useRef, useState } from "react";

import { buttonClass, cx } from "@/components/ui";

export interface Area {
  id: string;
  numero: string;
  titulo: string;
  subtitulo: string;
  imagen: string;
  alt: string;
  practica: string;
  capacidades: string[];
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className}>
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AreasTree({ areas }: { areas: Area[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = useState(false);

  function toggleAll() {
    const next = !allOpen;
    containerRef.current
      ?.querySelectorAll("details")
      .forEach((d) => (d.open = next));
    setAllOpen(next);
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={toggleAll} className={buttonClass("secondary")}>
          {allOpen ? "Colapsar todo" : "Expandir todo"}
        </button>
      </div>

      {areas.map((area) => (
        <details
          key={area.id}
          id={area.id}
          className="group scroll-mt-5 overflow-hidden rounded-[12px] border border-line bg-surface"
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:px-6 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-wider text-brand">
                {area.numero}
              </p>
              <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
                {area.titulo}
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                {area.subtitulo}
              </p>
            </div>
            <ChevronIcon className="mt-1.5 size-4 shrink-0 text-ink-faint transition-transform duration-200 group-open:rotate-180" />
          </summary>

          <div className="border-t border-line px-5 pb-6 pt-5 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
              <img
                src={area.imagen}
                alt={area.alt}
                loading="lazy"
                className="w-full rounded-[8px] border border-line-strong"
              />
              <div className="space-y-4">
                <p className="rounded-[8px] border border-brand-soft bg-brand-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">
                  <span className="font-medium text-brand">En la práctica: </span>
                  {area.practica}
                </p>
                <ul className="space-y-2">
                  {area.capacidades.map((c) => (
                    <li
                      key={c}
                      className={cx(
                        "flex gap-2 text-[12.5px] leading-relaxed text-ink-soft",
                      )}
                    >
                      <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-faint" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
