"use client";

import { useEffect } from "react";

const MSG_POLITICA = "Para crear la cuenta debes autorizar el tratamiento de tus datos.";
const MSG_CONFIRMAR = "Las contraseñas no coinciden.";

/**
 * Mensajes propios para dos validaciones nativas del formulario de registro (la casilla
 * de política y que "Repetir contraseña" coincida). Sin esto el navegador usa su propio
 * texto por defecto para la casilla, o el formulario tendría que ir y volver del servidor
 * para avisar el desajuste de contraseñas. El servidor sigue validando ambas cosas igual.
 */
export function ValidacionRegistro() {
  useEffect(() => {
    const form = document.getElementById("form-registro");
    if (!(form instanceof HTMLFormElement)) return;
    const clave = form.elements.namedItem("clave");
    const confirmar = form.elements.namedItem("confirmarClave");
    const politica = form.elements.namedItem("politica");
    if (
      !(clave instanceof HTMLInputElement) ||
      !(confirmar instanceof HTMLInputElement) ||
      !(politica instanceof HTMLInputElement)
    )
      return;

    const revisarConfirmar = () => {
      const noCoincide = confirmar.value !== "" && confirmar.value !== clave.value;
      confirmar.setCustomValidity(noCoincide ? MSG_CONFIRMAR : "");
    };
    const revisarPolitica = () => politica.setCustomValidity(politica.checked ? "" : MSG_POLITICA);

    revisarPolitica();
    clave.addEventListener("input", revisarConfirmar);
    confirmar.addEventListener("input", revisarConfirmar);
    politica.addEventListener("change", revisarPolitica);
    return () => {
      clave.removeEventListener("input", revisarConfirmar);
      confirmar.removeEventListener("input", revisarConfirmar);
      politica.removeEventListener("change", revisarPolitica);
    };
  }, []);

  return null;
}
