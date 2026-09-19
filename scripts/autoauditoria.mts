/**
 * Autoauditoría: corre el catálogo de pruebas de VIGÍA sobre el código de VIGÍA
 * y deja el resultado en src/app/transparencia/resultado.json, que es lo que
 * muestra la página pública /transparencia.
 *
 *   npm run autoauditoria
 *
 * Hay que regenerarlo antes de cada despliegue: el JSON es una foto del código
 * que se publica, con su SHA-256.
 */
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runChecks } from "@/domain/checks";
import type { RepoFile } from "@/domain/types";
import { dependencyAdvisories } from "@/server/osv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEXT = /\.(ts|tsx|mts|mjs|js|jsx|json|css|md)$/;
const OUT = join(root, "src", "app", "transparencia", "resultado.json");

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      // El propio resultado queda fuera: si entrara, su SHA-256 nunca sería estable.
      return TEXT.test(entry.name) && full !== OUT ? [full] : [];
    }),
  );
  return found.flat();
}

const paths = [...(await walk(join(root, "src"))), join(root, "package.json")];
const files: RepoFile[] = (
  await Promise.all(
    paths.map(async (path) => ({
      path: relative(root, path),
      content: await readFile(path, "utf8"),
    })),
  )
).sort((a, b) => a.path.localeCompare(b.path));

// Huella del conjunto analizado: ruta + contenido, en orden de ruta.
const sha256 = createHash("sha256")
  .update(files.map((f) => `${f.path}\n${f.content}`).join("\n"))
  .digest("hex");

const advisories = await dependencyAdvisories(files);
const findings = runChecks(files, "VIGÍA", advisories);

const resultado = {
  fecha: new Date().toISOString(),
  sha256,
  archivos: files.length,
  hallazgos: findings.map((f) => ({
    code: f.code,
    title: f.title,
    severity: f.severity,
    locations: f.evidence.locations,
  })),
  avisosOsv: advisories.length,
};

await writeFile(OUT, `${JSON.stringify(resultado, null, 2)}\n`);
console.log(
  `${files.length} archivos · ${findings.length} hallazgos · ${advisories.length} avisos OSV\n${relative(root, OUT)}`,
);
