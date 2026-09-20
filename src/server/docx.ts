import { writeZip } from "./zip";

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

export function docxFromLines(lines: string[]): Buffer {
  return writeZip([
    { path: "[Content_Types].xml", content: CONTENT_TYPES },
    { path: "_rels/.rels", content: ROOT_RELS },
    { path: "word/_rels/document.xml.rels", content: DOCUMENT_RELS },
    { path: "word/styles.xml", content: STYLES },
    { path: "word/document.xml", content: documentXml(lines) },
  ]);
}
