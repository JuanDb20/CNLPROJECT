"use client";

import { useEffect, useState } from "react";

const COLOR: Record<"bajo" | "medio" | "alto", string> = {
  bajo: "var(--color-safe)",
  medio: "var(--color-warning)",
  alto: "var(--color-critical)",
};

/** Arco que llega al puntaje con easing en vez de aparecer de golpe. */
export function RiskGauge({ score, level }: { score: number; level: "bajo" | "medio" | "alto" }) {
  /* Arranca en el puntaje real: sin JS (o antes de hidratar) la página dice 25,
     no 0, que sería el peor puntaje posible. La animación lo baja y lo sube. */
  const [shown, setShown] = useState(score);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(score);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = p === 1 ? 1 : 1 - 2 ** (-9 * p);
      setShown(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="relative h-[58px] w-[100px] shrink-0">
      <svg viewBox="0 0 100 58" className="h-full w-full" aria-hidden>
        <path
          d="M10,52 A40,40 0 0 1 90,52"
          fill="none"
          stroke="var(--color-line-strong)"
          strokeWidth="7"
          strokeLinecap="round"
          pathLength={100}
        />
        <path
          d="M10,52 A40,40 0 0 1 90,52"
          fill="none"
          stroke={COLOR[level]}
          strokeWidth="7"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - shown}
          style={{ transition: "stroke .3s ease" }}
        />
      </svg>
      <span className="tabnum absolute inset-x-0 bottom-0 text-center text-[22px] font-semibold leading-none text-ink">
        {shown}
      </span>
    </div>
  );
}
