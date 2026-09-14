/** Reads the source PDFs, chunks them, embeds them and writes them to Supabase. */

import { readFile } from "node:fs/promises";
import { extractText } from "unpdf";
import { chunkDocument, type ChunkStrategy, type RawChunk } from "../lib/ingest/chunk.ts";
import { cleanDocument } from "../lib/ingest/clean.ts";
import { embed } from "../lib/embeddings.ts";
import { admin } from "../lib/supabase/admin.ts";

type Source = {
  path: string;
  language: "german" | "english";
  strategy: ChunkStrategy;
  note: string;
};

const SOURCES: Source[] = [
  {
    path: "data/sources/fei/FEI_Dressage_Judging_Manual_2025.pdf",
    language: "english",
    strategy: "heading",
    note: "43 ALL-CAPS lesson headings, all genuine boundaries",
  },
  {
    path: "data/sources/de/Rahmentrainingskonzeption_Dressur.pdf",
    language: "german",
    strategy: "paragraph",
    note: "no detectable headings; column layout with hyphenation",
  },
  {
    path: "data/sources/de/merkblatt_richter_grundpruefung_2026.pdf",
    language: "german",
    strategy: "paragraph",
    note: "exam syllabus; judging criteria per gait, German vocabulary",
  },
];

const EMBED_BATCH = 64;
const dryRun = process.argv.includes("--dry");

async function chunksFor(source: Source): Promise<RawChunk[]> {
  const buffer = new Uint8Array(await readFile(source.path));
  const { totalPages, text } = await extractText(buffer, { mergePages: false });
  const pages = cleanDocument(text);

  const chunks = chunkDocument({
    source: source.path.split("/").pop()!,
    language: source.language,
    strategy: source.strategy,
    pages,
  });

  const sizes = chunks.map((c) => c.content.length).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] ?? 0;
  const lessons = new Set(chunks.map((c) => c.metadata.lesson).filter(Boolean));

  console.log(`\n${source.path}`);
  console.log(`  ${source.note}`);
  console.log(`  Seiten:   ${totalPages}`);
  console.log(`  Chunks:   ${chunks.length}`);
  console.log(`  Zeichen:  min ${sizes[0]}  median ${median}  max ${sizes.at(-1)}`);
  if (lessons.size) console.log(`  Lektionen: ${lessons.size}`);

  return chunks;
}

async function store(chunks: RawChunk[], sourceName: string) {
  const { error: delError } = await admin
    .from("chunks")
    .delete()
    .eq("metadata->>source", sourceName);
  if (delError) throw new Error(`Delete failed for ${sourceName}: ${delError.message}`);

  let written = 0;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const vectors = await embed(batch.map((c) => c.content));

    const rows = batch.map((chunk, j) => ({
      content: chunk.content,
      embedding: vectors[j],
      language: chunk.language,
      metadata: chunk.metadata,
    }));

    const { error } = await admin.from("chunks").insert(rows);
    if (error) throw new Error(`Insert failed at offset ${i}: ${error.message}`);

    written += rows.length;
    process.stdout.write(`\r  eingefügt: ${written}/${chunks.length}`);
  }
  console.log();
}

const all: { source: Source; chunks: RawChunk[] }[] = [];
for (const source of SOURCES) {
  all.push({ source, chunks: await chunksFor(source) });
}

const total = all.reduce((n, x) => n + x.chunks.length, 0);
console.log(`\n${"─".repeat(60)}`);
console.log(`Gesamt: ${total} Chunks aus ${SOURCES.length} Dokumenten`);

if (dryRun) {
  console.log("\n--dry: nichts eingebettet, nichts geschrieben.");
  console.log("Ohne --dry laufen lassen, um die Wissensbasis zu füllen.");
} else {
  for (const { source, chunks } of all) {
    const name = source.path.split("/").pop()!;
    console.log(`\n${name}`);
    await store(chunks, name);
  }
  const { count } = await admin.from("chunks").select("*", { count: "exact", head: true });
  console.log(`\nchunks in der Datenbank: ${count}`);
}
