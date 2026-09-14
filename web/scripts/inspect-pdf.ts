/** Helper: shows what a PDF looks like after text extraction. */

import { readFile } from "node:fs/promises";
import { extractText } from "unpdf";

const [path, pageArg] = process.argv.slice(2);
if (!path) {
  console.error("Aufruf: inspect-pdf.ts <pfad.pdf> [seitenzahl]");
  process.exit(1);
}

const buf = new Uint8Array(await readFile(path));
const { totalPages, text } = await extractText(buf, { mergePages: false });
const all = text.join("\n");

const junk = (all.match(/[^\p{L}\p{N}\s.,;:!?()\-–—/§%"'„“…°&+*=\[\]]/gu) ?? []).length;

console.log(`\n${path}`);
console.log(`  Seiten:        ${totalPages}`);
console.log(`  Zeichen:       ${all.length.toLocaleString("de")}`);
console.log(`  je Seite:      ${Math.round(all.length / totalPages)}`);
console.log(`  Müllzeichen:   ${junk}  (${((junk / all.length) * 100).toFixed(3)} %)`);

if (pageArg) {
  const n = Number(pageArg);
  console.log(`\n--- Seite ${n} ---\n`);
  console.log(text[n - 1] ?? "(keine solche Seite)");
}
