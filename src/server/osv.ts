import type { RepoFile } from "@/domain/types";

/**
 * Dependencias de ejecución con avisos de seguridad publicados en OSV.dev (base
 * abierta que agrega GitHub Advisories, NVD y otras; sin llave). Si OSV no
 * responde, el análisis sigue sin este hallazgo.
 */
export async function dependencyAdvisories(files: RepoFile[]) {
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
    .map(([name, range]) => [name, resolved[`node_modules/${name}`]?.version ?? String(range).replace(/^[\^~]/, "")])
    .filter(([, version]) => /^\d+\.\d+\.\d+/.test(version));
  if (pkgs.length === 0) return [];
  try {
    const res = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      body: JSON.stringify({ queries: pkgs.map(([name, version]) => ({ package: { name, ecosystem: "npm" }, version })) }),
      signal: AbortSignal.timeout(8000),
    });
    const { results } = (await res.json()) as { results: Array<{ vulns?: Array<{ id: string }> }> };
    const lines = manifest.content.split(/\r?\n/);
    return pkgs.flatMap(([name, version], i) => {
      const ids = results[i]?.vulns?.map((v) => v.id) ?? [];
      if (ids.length === 0) return [];
      const more = ids.length > 3 ? ", …" : "";
      return [{
        path: manifest.path,
        line: lines.findIndex((l) => l.includes(`"${name}"`)) + 1,
        text: `${name}@${version}: ${ids.length} avisos (${ids.slice(0, 3).join(", ")}${more})`,
      }];
    });
  } catch {
    return [];
  }
}
