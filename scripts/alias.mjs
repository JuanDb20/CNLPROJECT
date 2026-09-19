/**
 * Resuelve los imports "@/…" (el alias de Next) para poder correr el dominio de
 * VIGÍA con `node --experimental-strip-types`, sin añadir ninguna dependencia.
 */
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        url: pathToFileURL(resolve(src, `${specifier.slice(2)}.ts`)).href,
        shortCircuit: true,
      };
    }
    // TypeScript admite "./zip" sin extensión; Node no.
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
