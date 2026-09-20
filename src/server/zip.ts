import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

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

  /* Un desplazamiento corrupto hace que Buffer lance un RangeError técnico de
     Node; envolver el recorrido lo convierte en un error del dominio. */
  try {
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

      if (encrypted || path.endsWith("/") || SKIP.test(path)) continue;
      /* `size` lo declara quien arma el .zip, así que no se puede creer: solo
         sirve para descartar entradas enormes antes de gastar CPU. Los topes de
         verdad se aplican abajo, sobre los bytes que salen descomprimidos. */
      if (size > MAX_FILE_BYTES && method !== 0) continue;

      const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      const raw = buffer.subarray(start, start + compressed);
      let data: Buffer;
      try {
        if (method === 0) {
          if (raw.length > MAX_FILE_BYTES) continue; // "stored": el tope va sobre el tamaño real
          data = raw;
        } else if (method === 8) {
          data = inflateRawSync(raw, { maxOutputLength: MAX_FILE_BYTES });
        } else continue;
      } catch {
        continue;
      }
      if (data.includes(0)) continue; // binario: imágenes, fuentes, compilados
      total += data.length;
      if (total > MAX_TOTAL_BYTES) throw new Error("El código descomprimido supera 20 MB");
      files.push({ path, content: data.toString("utf8") });
    }
  } catch (error) {
    if (error instanceof RangeError) throw new Error("El .zip está dañado");
    throw error;
  }

  return stripRoot(files);
}

/** Quita la carpeta raíz común que agrega la opción «Comprimir» del sistema operativo. */
function stripRoot(files: RepoFile[]): RepoFile[] {
  const root = files[0]?.path.split("/")[0];
  if (!root || !files.every((f) => f.path.startsWith(`${root}/`))) return files;
  return files.map((f) => ({ ...f, path: f.path.slice(root.length + 1) }));
}

/**
 * Empaqueta archivos en memoria como un .zip válido: lo lee `readZip` (auditorías
 * de ejemplo) y también Word y Python (los .docx que exporta VIGÍA), que sí
 * comprueban el CRC-32 de cada entrada.
 */
export function writeZip(files: RepoFile[]): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.path, "utf8");
    const data = Buffer.from(file.content, "utf8");
    const compressed = deflateRawSync(data);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(8, 10);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(compressed.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(header, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, eocd]);
}
