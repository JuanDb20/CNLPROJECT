import { inflateRawSync } from "node:zlib";

import type { RepoFile } from "@/domain/types";

const MAX_FILES = 3000;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const SKIP = /(^|\/)(node_modules|\.git|\.next|dist|build|__MACOSX)\/|(^|\/)\.DS_Store$/;

/**
 * Lee un .zip en memoria y devuelve sus archivos de texto. Nunca escribe en
 * disco, así que una ruta maliciosa dentro del .zip no puede salir de él. Los
 * límites de tamaño protegen contra archivos que se inflan al descomprimirse.
 */
export function readZip(buffer: Buffer): RepoFile[] {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || eocd + 22 > buffer.length) {
    throw new Error("El archivo no es un .zip válido");
  }
  const count = buffer.readUInt16LE(eocd + 10);
  if (count > MAX_FILES) throw new Error(`El .zip tiene más de ${MAX_FILES} archivos`);

  const files: RepoFile[] = [];
  let offset = buffer.readUInt32LE(eocd + 16);
  let total = 0;

  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("El .zip está dañado");
    const encrypted = buffer.readUInt16LE(offset + 8) & 1;
    const method = buffer.readUInt16LE(offset + 10);
    const compressed = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const local = buffer.readUInt32LE(offset + 42);
    const path = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    offset +=
      46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);

    if (encrypted || path.endsWith("/") || SKIP.test(path) || size > MAX_FILE_BYTES) continue;
    total += size;
    if (total > MAX_TOTAL_BYTES) throw new Error("El código descomprimido supera 20 MB");

    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(start, start + compressed);
    let data: Buffer;
    try {
      if (method === 0) data = raw;
      else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: MAX_FILE_BYTES });
      else continue;
    } catch {
      continue;
    }
    if (data.includes(0)) continue; // binario: imágenes, fuentes, compilados
    files.push({ path, content: data.toString("utf8") });
  }

  return stripRoot(files);
}

/** Quita la carpeta raíz común que agrega la opción «Comprimir» del sistema operativo. */
function stripRoot(files: RepoFile[]): RepoFile[] {
  const root = files[0]?.path.split("/")[0];
  if (!root || !files.every((f) => f.path.startsWith(`${root}/`))) return files;
  return files.map((f) => ({ ...f, path: f.path.slice(root.length + 1) }));
}
