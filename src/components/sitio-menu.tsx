"use client";

import { useEffect } from "react";

/* El menú es un popover nativo (Escape y clic afuera los resuelve el navegador);
   aria-expanded se refleja a mano en la hamburguesa para no depender de cada uno. */
export function MenuExpandido() {
  useEffect(() => {
    const menu = document.getElementById("menu");
    const burger = document.querySelector('[popovertarget="menu"]');
    if (!menu || !burger) return;
    const onToggle = (e: Event) =>
      burger.setAttribute("aria-expanded", String((e as ToggleEvent).newState === "open"));
    menu.addEventListener("toggle", onToggle);
    return () => menu.removeEventListener("toggle", onToggle);
  }, []);

  return null;
}
