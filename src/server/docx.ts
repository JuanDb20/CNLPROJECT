import { crc32, deflateRawSync } from "node:zlib";

/**
 * Genera un .docx mínimo válido a partir de líneas de texto, sin dependencias.
 *
 * Formato de línea acordado con el resto de VIGÍA (ver Patch.added cuando
 * `patch.kind === "documento"`): "# " título, "## " subtítulo, "" separación,
 * "- " viñeta, cualquier otra línea es un párrafo normal.
 */

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  "</Types>";

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  "</Relationships>";

const DOCUMENT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  "</Relationships>";

// docDefaults fija Arial 11 (sz 22 = medios puntos) para todo párrafo normal; Heading1/Heading2
// son los estilos reservados de Word: los muestra como "Título 1"/"Título 2" en su interfaz en español.
const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  "<w:docDefaults><w:rPrDefault><w:rPr>" +
  '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/>' +
  "</w:rPr></w:rPrDefault></w:docDefaults>" +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading1">' +
  '<w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
  '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr>' +
  '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="32"/></w:rPr>' +
  "</w:style>" +
  '<w:style w:type="paragraph" w:styleId="Heading2">' +
  '<w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>' +
  '<w:pPr><w:keepNext/><w:spacing w:before="180" w:after="90"/></w:pPr>' +
  '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:sz w:val="26"/></w:rPr>' +
  "</w:style>" +
  "</w:styles>";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraph(text: string, opts?: { style?: "Heading1" | "Heading2"; bullet?: boolean }): string {
  const props =
    (opts?.style ? `<w:pStyle w:val="${opts.style}"/>` : "") + (opts?.bullet ? '<w:ind w:left="360"/>' : "");
  const pPr = props ? `<w:pPr>${props}</w:pPr>` : "";
  const text_ = escapeXml(opts?.bullet ? `• ${text}` : text);
  return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${text_}</w:t></w:r></w:p>`;
}

function documentXml(lines: string[]): string {
  const body = lines
    .map((line) => {
      if (line === "") return "<w:p/>";
      if (line.startsWith("# ")) return paragraph(line.slice(2), { style: "Heading1" });
      if (line.startsWith("## ")) return paragraph(line.slice(3), { style: "Heading2" });
      if (line.startsWith("- ")) return paragraph(line.slice(2), { bullet: true });
      return paragraph(line);
    })
    .join("");
  const sectPr =
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${body}${sectPr}</w:body></w:document>`
  );
}

/**
 * Empaqueta las partes del .docx en un .zip.
 *
 * No reutiliza `writeZip` de `@/server/zip`: esa función deja el CRC-32 en 0
 * (nadie lo nota al releer con su propio `readZip`), pero Word y python-docx
 * (que abre el .docx como .zip con el `zipfile` de Python) rechazan un
 * archivo así con "Bad CRC-32", comprobado al validar este módulo. Esta copia
 * mínima solo añade el CRC real con `zlib.crc32`.
 */
function zip(files: { path: string; content: string }[]): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const { path, content } of files) {
    const name = Buffer.from(path, "utf8");
    const data = Buffer.from(content, "utf8");
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

export function docxFromLines(lines: string[]): Buffer {
  return zip([
    { path: "[Content_Types].xml", content: CONTENT_TYPES },
    { path: "_rels/.rels", content: ROOT_RELS },
    { path: "word/_rels/document.xml.rels", content: DOCUMENT_RELS },
    { path: "word/styles.xml", content: STYLES },
    { path: "word/document.xml", content: documentXml(lines) },
  ]);
}
