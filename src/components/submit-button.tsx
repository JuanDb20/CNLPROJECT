"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { buttonClass, cx, type ButtonVariant } from "./ui";

/** Botón de envío que muestra estado pendiente mientras corre la acción del `<form>` padre. */
export function SubmitButton({
  children,
  pendingText = "Cargando…",
  variant = "brand",
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cx(buttonClass(variant), className)}>
      {pending ? pendingText : children}
    </button>
  );
}
