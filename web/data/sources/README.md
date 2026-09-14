# Sources of the knowledge base

The documents themselves are **not** in this repository — for size and, more importantly,
copyright. `scripts/ingest.ts` expects them in this folder.

## In the corpus

| File | Language | Role |
|---|---|---|
| `fei/FEI_Dressage_Judging_Manual_2025.pdf` | EN | 68 pages of teaching material: gaits, training scale, movements, fault patterns. "canter" 183×, "rhythm" 57×, "straightness" 18×. Chunked by heading (43 usable ALL-CAPS headings). |
| `de/Rahmentrainingskonzeption_Dressur.pdf` | DE | DOKR training framework. The German half of the corpus — the rider thinks and asks in German. Chunked by paragraph (no headings the parser can use). |
| `de/merkblatt_richter_grundpruefung_2026.pdf` | DE | FN/DRV leaflet for the judges' basic exam. Small but precise on terminology. |

440 chunks in total: 113 English, 327 German.

## Present, but deliberately outside the corpus

| File | Why |
|---|---|
| `fei/FEI_Dressage_Rules_2026.pdf` | Purely organisational — entries, dress code, judge categories. Checked against the full text: "canter" 1 hit, "piaffe" 0, "training scale" 0. Its role here is a different one: **Art. 423 MARKING** and **Art. 425 CALCULATION OF SCORES** are the source for `score_test_sheet`. |

## Where to obtain them, and the copyright boundary

Both FEI documents are official and freely downloadable from `inside.fei.org`. They carry
the note *"Reproduction strictly reserved"* — so: use them locally, cite them as sources,
and **do not commit them**. This folder is gitignored except for this file.

The German documents are published by DOKR/FN. The **FN Richtlinien** volumes (the
standard textbooks) are deliberately not used: they are sold commercially, and extracting
them into a knowledge base would be a different matter entirely from citing a freely
published manual.

## A gap in the corpus (measured, not assumed)

**No document in this corpus defines the six elements of the training scale.**

Verified in the Judging Manual:

- The six elements appear **exactly once**, as a list on **page 23**: *"all aspects of
  the Training Scale (rhythm, suppleness, contact, impulsion, straightness, collection)
  according to the level of the test are well fulfilled"*.
- There is **no** section that defines `collection`, `suppleness` and so on. It is a
  judges' manual and presupposes the fundamentals.
- `self-carriage` occurs 12×, always as a term in use, never as a term defined. It
  appears mostly in collection contexts (p. 5, 8, 14) and is named *alongside* `contact`
  on p. 31, so it is distinct from it.

The German leaflet does not fill the gap: it lists *"Losgelassenheit: innere und äußere
Losgelassenheit, Merkmale"* as an exam topic, without content.

**Two consequences, both visible in the code:**

1. `scale_element` as chunk metadata is **not supportable** from this corpus, so it was
   left out. A wrong filter attribute *hides* correct hits. The metadata fields that are
   safe: `lesson`, `page`, `source`, `language`, `strategy`.
2. Questions such as *"What does suppleness mean?"* return context rather than a
   definition. That is a missing source, not a retrieval fault — and it is exactly the
   kind of fundamental question the target user asks most often.

**Wanted:** a source with explanatory prose on the training scale ("suppleness means …",
not bullet points).
