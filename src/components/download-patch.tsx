"use client";

import { buttonClass, cx } from "./ui";

/** Arma un unified diff mínimo con el parche ya calculado y lo descarga como .diff vía data: URI. */
export function DownloadPatch({
  code,
  target,
  removed,
  added,
  className,
}: {
  code: string;
  target: string;
  removed: string[];
  added: string[];
  className?: string;
}) {
  const diff = [
    `--- a/${target}`,
    `+++ b/${target}`,
    ...removed.map((line) => `-${line}`),
    ...added.map((line) => `+${line}`),
  ].join("\n");

  const href = `data:text/plain;charset=utf-8,${encodeURIComponent(diff)}`;

  return (
    <a href={href} download={`${code}.diff`} className={cx(buttonClass("secondary"), className)}>
      Descargar parche (.diff)
    </a>
  );
}
