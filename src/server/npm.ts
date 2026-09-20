import type { Hit } from "@/domain/check-kit";
import type { RepoFile } from "@/domain/types";

const REGISTRY = "https://registry.npmjs.org";
const MAX_PACKAGES = 80;
const MAX_PARALLEL = 8;

/**
 * Licencia de cada dependencia según el registro público de npm (sin llave). Copia
 * de osv.ts la lectura de package.json/package-lock.json y la tolerancia a fallos:
 * si una petición falla, esa dependencia simplemente no aparece.
 */
export async function dependencyLicenses(files: RepoFile[]): Promise<Hit[]> {
  const manifest = files.find((f) => /(^|\/)package\.json$/.test(f.path) && !f.path.includes("node_modules"));
  if (!manifest) return [];
  const lock = files.find((f) => f.path === manifest.path.replace(/package\.json$/, "package-lock.json"));
  let deps: Record<string, string>;
  let resolved: Record<string, { version?: string }>;
  try {
    deps = JSON.parse(manifest.content).dependencies ?? {};
    resolved = lock ? (JSON.parse(lock.content).packages ?? {}) : {};
  } catch {
    return [];
  }
  const pkgs = Object.entries(deps)
    .slice(0, MAX_PACKAGES)
    .map(
      ([name, range]) =>
        [name, resolved[`node_modules/${name}`]?.version ?? String(range).replace(/^[\^~]/, "")] as const,
    );
  if (pkgs.length === 0) return [];

  const lines = manifest.content.split(/\r?\n/);
  const lineOf = (name: string) => lines.findIndex((l) => l.includes(`"${name}"`)) + 1;

  const hits: Hit[] = [];
  for (let i = 0; i < pkgs.length; i += MAX_PARALLEL) {
    const batch = pkgs.slice(i, i + MAX_PARALLEL);
    const licenses = await Promise.all(batch.map(([name, version]) => fetchLicense(name, version)));
    batch.forEach(([name, version], j) => {
      const license = licenses[j];
      if (license !== null) hits.push({ path: manifest.path, line: lineOf(name), text: `${name}@${version}: ${license}` });
    });
  }
  return hits;
}

/** Consulta la licencia de un paquete en el registro de npm; null si falla o no existe. */
async function fetchLicense(name: string, version: string): Promise<string | null> {
  const exact = /^\d+\.\d+\.\d+/.test(version) ? version : "latest";
  try {
    const res = await fetch(`${REGISTRY}/${encodeURIComponent(name)}/${encodeURIComponent(exact)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { license?: string | { type?: string } };
    if (typeof data.license === "string") return data.license;
    return data.license?.type ?? "sin declarar";
  } catch {
    return null;
  }
}
