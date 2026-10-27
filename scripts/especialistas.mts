/**
 * Prueba de los especialistas (fintech, salud y titularidad del código) y del
 * diagnóstico de etapa: corre el catálogo sobre casos sembrados, aplica los parches
 * propuestos como lo hace el retesteo del ejemplo y comprueba que cada hallazgo
 * aparece y se cierra.
 *
 *   npm run especialistas
 */
import assert from "node:assert/strict";

import { applyPatch } from "@/domain/check-kit";
import { CHECK_CODES, runChecks } from "@/domain/checks";
import { diagnosticar, leerRespuestas, reglasDe, respuestasDelCodigo } from "@/domain/etapas";
import type { ClientInfo, RepoFile } from "@/domain/types";
import { EXAMPLE_FILES } from "@/server/example-repo";

const FINANCIERO = "Financiero y fintech";
const cliente = (sector: string): ClientInfo => ({
  name: "Crediveloz S.A.S.",
  nit: "",
  legalRepresentative: "",
  sector,
  system: "",
});
const codigos = (files: RepoFile[], sector = FINANCIERO) =>
  runChecks(files, cliente(sector)).map((f) => f.code);

/** Aplica todos los parches propuestos (igual que el retesteo del ejemplo) y devuelve los códigos que siguen. */
function trasCorregir(files: RepoFile[], sector = FINANCIERO): string[] {
  const corregido = runChecks(files, cliente(sector)).reduce(
    (acc, f) => applyPatch(acc, f.remediation.patch),
    files,
  );
  return codigos(corregido, sector);
}

function caso(nombre: string, files: RepoFile[], esperados: string[], sector = FINANCIERO) {
  const antes = codigos(files, sector);
  for (const c of esperados) assert.ok(antes.includes(c), `${nombre}: falta ${c} (encontró ${antes.join(", ")})`);
  const despues = trasCorregir(files, sector);
  const abiertos = esperados.filter((c) => despues.includes(c));
  assert.deepEqual(abiertos, [], `${nombre}: el parche no cierra ${abiertos.join(", ")}`);
  console.log(`✓ ${nombre}: ${esperados.join(", ")} aparecen y se cierran`);
}

// 1. El ejemplo de «Usar datos de ejemplo» es una fintech: el especialista se ve con un clic.
caso("Ejemplo Crediveloz", EXAMPLE_FILES, [
  "VGI-124", "VGI-126", "VGI-127", "VGI-128", "VGI-129", "VGI-130", "VGI-131",
]);

// 2. La Circular 001 de 2025 solo se aplica si el cliente declara el sector financiero;
//    la Ley 2300, la tarjeta y la titularidad, siempre.
{
  const otros = codigos(EXAMPLE_FILES, "Comercio electrónico");
  for (const c of ["VGI-124", "VGI-126", "VGI-127"]) assert.ok(!otros.includes(c), `${c} no debe correr fuera de fintech`);
  for (const c of ["VGI-128", "VGI-129", "VGI-130", "VGI-131"]) assert.ok(otros.includes(c), `${c} debe correr en cualquier sector`);
  console.log("✓ La Circular 001 de 2025 solo corre con el sector financiero");
}

// 3. App móvil de crédito que lee la agenda del teléfono.
caso("App que lee los contactos", [
  { path: "app/cobranza.ts", content: 'const agenda = await Contacts.getContactsAsync({ fields: ["phoneNumbers"] });\n' },
], ["VGI-125"]);

// 4. Historia clínica: lectura con solo iniciar sesión y edición de lo ya registrado.
caso("Historia clínica en la base", [
  {
    path: "supabase/migrations/0001_hc.sql",
    content: [
      "create table public.historias_clinicas (",
      "  id uuid primary key default gen_random_uuid(),",
      "  paciente_id uuid not null,",
      "  diagnostico text",
      ");",
      "alter table public.historias_clinicas enable row level security;",
      'create policy "personal_lee" on public.historias_clinicas',
      "  for select using (auth.role() = 'authenticated');",
      'create policy "personal_edita" on public.historias_clinicas',
      "  for update using (auth.role() = 'authenticated');",
      "",
    ].join("\n"),
  },
], ["VGI-132", "VGI-133"], "Salud");
caso("Historia clínica editada desde el código", [
  {
    path: "src/app/api/historia/route.ts",
    content: 'await supabase.from("historias_clinicas").update({ diagnostico }).eq("id", id);\n',
  },
], ["VGI-132"], "Salud");

// 5. Titularidad: el aviso de otra empresa se reporta; el del cliente o uno genérico, no.
caso("Licencia a nombre de la agencia", [
  { path: "LICENSE", content: "MIT License\n\nCopyright (c) 2026 Estudio Pixel Dev\n" },
], ["VGI-131"], "Tecnología");
for (const aviso of ["Copyright (c) 2026 CREDIVELOZ SAS", "Copyright (c) 2026 The Authors"]) {
  assert.ok(!codigos([{ path: "LICENSE", content: `${aviso}\n` }], "Tecnología").includes("VGI-131"), aviso);
}
console.log("✓ El aviso a nombre del cliente o genérico no se reporta");

// 6. Lo que va dentro de una plantilla `…` es texto: un repositorio guardado como dato no
//    dispara la cobranza, pero un mensaje real cuyo cuerpo habla de mora sí.
{
  const cobranza = EXAMPLE_FILES.find((f) => f.path === "src/cobranza.ts")!.content;
  const comoDato = `export const CODIGO = \`${cobranza.replaceAll("`", "\\`")}\`;\n`;
  const c = codigos([{ path: "src/ejemplo.ts", content: comoDato }], "Comercio electrónico");
  assert.ok(!c.includes("VGI-128") && !c.includes("VGI-129"), "el código guardado como texto no es código");
  const real = "await sms.messages.create({ to: c.celular, body: `Su cuota de ${c.valor} está en mora` });\n";
  assert.ok(codigos([{ path: "src/aviso.ts", content: real }], "Comercio electrónico").includes("VGI-128"));
  console.log("✓ El código guardado como texto no dispara la cobranza; el mensaje real sí");
}

// 7. Diagnóstico de etapa.
{
  assert.equal(leerRespuestas({ producto: "idea" }), null, "sin «quién programa» no hay diagnóstico");

  const idea = diagnosticar(leerRespuestas({ producto: "idea", equipo: "contratistas", marca: "en-uso" })!);
  assert.equal(idea.etapa.id, "idea");
  assert.deepEqual(idea.ahora.map((o) => o.id), ["marca"]);
  assert.ok(idea.despues.some((o) => o.id === "cesion"), "la cesión llega con el prototipo");

  const fintech = diagnosticar(
    leerRespuestas({
      producto: "usuarios", equipo: "socios", sociedad: "si", marca: "registrada", ia: "si",
      datos: ["personales", "sensibles"], sector: "Financiero y fintech",
    })!,
  );
  assert.equal(fintech.etapa.id, "usuarios");
  assert.equal(fintech.especialista?.id, "financiero");
  assert.ok(fintech.ahora.some((o) => o.id === "fintech"));
  assert.ok(fintech.despues.some((o) => o.id === "cobranza"));

  const escala = leerRespuestas({ producto: "usuarios", equipo: "empleados", inversion: "si" })!;
  assert.equal(diagnosticar(escala).etapa.id, "escala");

  // Toda obligación cita reglas que existen y pruebas que existen.
  const todo = [
    { producto: "usuarios", equipo: "contratistas", cobra: "si", ia: "si", herramienta: "si",
      inversion: "si", datos: ["personales", "sensibles", "menores", "financieros"],
      exterior: ["chile", "ue"], sector: "Financiero y fintech" },
    { producto: "usuarios", equipo: "empleados", datos: ["personales"], sector: "Salud" },
  ].flatMap((p) => diagnosticar(leerRespuestas(p)!).ahora);
  for (const o of todo) {
    assert.equal(reglasDe(o).length, o.reglas?.length ?? 0, `${o.id}: regla inexistente`);
    for (const c of o.pruebas ?? []) assert.ok(CHECK_CODES.includes(c), `${o.id}: prueba ${c} inexistente`);
  }

  const desdeCodigo = respuestasDelCodigo(EXAMPLE_FILES, FINANCIERO);
  assert.equal(desdeCodigo.get("ia"), "si");
  assert.deepEqual(desdeCodigo.getAll("datos"), ["personales", "sensibles"]);
  console.log(`✓ Diagnóstico de etapa: ${todo.length} obligaciones con su norma y sus pruebas`);
}

console.log("\nTodo en orden.");
