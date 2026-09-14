# Reitbahn — a dressage feedback assistant

A domain-specialised RAG chatbot that answers dressage questions from the classical
riding doctrine and **backs every technical claim with a citation** — the document, the
section and the page.

---

## What it does

**Answers doctrine questions with evidence.** Asked *"What does rhythm mean in
dressage?"*, a model without a knowledge base talks about music theory. This one answers
from the corpus and names the source:

> "In dressage, rhythm denotes the absolute regularity of the movement without tension
> (*absolute regularity without tension*) … **(GENERAL IMPRESSION, p. 65)**. In walk it
> shows as a regular four-beat rhythm **(WALK, p. 25–26)**."

If the corpus has nothing to say, it says so instead of inventing an answer.

**Understands a layperson's phrasing.** "My horse gets muddled in canter" is translated
into the technical terms the corpus actually uses — `Kreuzgalopp`, `Viertakt`, `disunited
canter`, `four-beat canter` — in German *and* English, because the corpus is
mixed-language.

**Computes instead of estimating.** Three of the four tools are pure arithmetic or rule
tables: a test score from the individual marks, whether a movement suits a horse's level
and age, and the training load from recorded sessions. The raw tool result is shown next
to the answer, so a discrepancy is visible rather than believed.

**Analyses a riding video.** A clip is re-encoded to 720p in the browser, described by a
vision model, and the observations are then grounded in the doctrine like any other
question. The description names deviations with a timestamp — and says explicitly what it
*cannot* judge from a video (collection, impulsion, throughness, straightness,
suppleness) instead of guessing.

**Remembers, per horse.** Rider and horse profiles feed into the answer. Conversations
are stored, listed in a sidebar, filterable by horse, and exportable as JSON, Markdown or
CSV. Videos stay on the machine that runs the app, in one folder per chat.

**German or English.** One switch changes the interface *and* the answer language,
regardless of which language the question was asked in.

---

## Quick start

```bash
git clone <repo> && cd <repo>/web
npm install
cp .env.example .env.local
```

**1. Create a Supabase project** (free tier), then run in its SQL editor:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_keyword_language_filter.sql
supabase/migrations/0003_conversations.sql
```

**2. Fill in `web/.env.local`**

| Variable | Where from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Settings → API Keys → Publishable |
| `SUPABASE_SECRET_KEY` | Settings → API Keys → Secret |
| `OPENROUTER_API_KEY` | openrouter.ai/keys |

**3. Add the source documents** to `web/data/sources/`. Where to obtain them and the
copyright boundaries are in `web/data/sources/README.md`; the PDFs are deliberately not
in this repository.

**4. Build the knowledge base and start**

```bash
npm run ingest -- --dry     # shows what would be produced
npm run ingest              # builds it (440 chunks)
npm run dev                 # localhost:3000
```

Google sign-in is optional — email sign-in works without it. To enable it, create an
OAuth client in the Google Cloud Console with the redirect URI
`https://<project-ref>.supabase.co/auth/v1/callback`, paste client ID and secret into
Supabase → *Authentication* → *Providers* → *Google*, and set the site URL to
`http://localhost:3000` with redirect `http://localhost:3000/auth/callback`.

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build including type check |
| `npm test` | 136 unit tests |
| `npm run ingest` | build the knowledge base |
| `npm run eval:tools` | tool-selection evaluation |
| `npm run eval:dataset` / `npm run eval:rag` | build the dataset, then compute the RAG metrics |
| `node --experimental-strip-types --env-file=.env.local scripts/search.ts "question"` | retrieval debug view |
| `... scripts/search.ts --plain "question"` | the same without query translation and hybrid search |

---

## How it is built

**One process.** Next.js is both frontend and backend — `app/api/*/route.ts` runs in
Node, `app/page.tsx` in the browser. No separate server, no CORS.

```
Browser                          Node (same process)
────────                         ───────────────────
app/page.tsx  ──fetch──►  app/api/chat/route.ts
                                  │  thin HTTP adapter
                                  ▼
                          lib/chat/agentStream.ts
                                  │
                                  ▼
                          lib/agent.ts  (createAgent)
                                  │
              ┌───────────────────┼───────────────┬──────────────┐
              ▼                   ▼               ▼              ▼
      retrieve_doctrine   score_test_sheet  horse_profile   training_load
              │                                _match
              ▼
      lib/retrieval/retriever.ts
              │
      ┌───────┴────────┐
      ▼                ▼
  vector search    keyword search        Supabase / pgvector
      └───────┬────────┘
              ▼
        RRF fusion  →  top 6 chunks  →  fenced as data material
```

**`app/` thin, `lib/` thick.** `app/` holds only what Next.js forces, and route handlers
are pure HTTP adapters. All logic lives in `lib/` and runs without Next.js — which is what
makes the unit tests possible.

| Folder | Contents |
|---|---|
| `app/` | pages, layout, route handlers |
| `components/` | UI building blocks |
| `lib/retrieval/` | the retrieval layer — **its own docs: `lib/retrieval/README.md`** |
| `lib/ingest/` | chunking and text cleaning |
| `lib/tools/` | the four agent tools |
| `lib/chat/` | prompts, event protocol, agent stream, history, export |
| `lib/video/` | limits, browser re-encode, vision call, local store |
| `lib/security/` | injection guard, context fencing, path and redirect validation |
| `lib/supabase/` | three clients: browser, server session, admin |
| `eval/` | test set, RAG metrics, tool-selection evaluation |
| `scripts/` | ingest and diagnostic tools |
| `supabase/migrations/` | schema and RLS policies |

### The knowledge base

| Document | Language | Chunking | Chunks |
|---|---|---|---|
| FEI Dressage Judging Manual 2025 | EN | `heading` | 113 |
| DOKR training framework, dressage | DE | `paragraph` | 309 |
| FN/DRV leaflet, judges' basic exam | DE | `paragraph` | 18 |

Two chunking strategies, because the documents differ: the Judging Manual has 43 usable
ALL-CAPS headings, the German documents none. Headers and footers are stripped by
frequency rather than by pattern (a line appearing on ≥30 % of pages is furniture), and
chunking runs over a continuous line stream so sentences are not cut at page boundaries.

The FEI Dressage *Rules* are deliberately outside the corpus — they contain no teaching
material. Their role is a different one: Art. 423 and 425 are the source for the score
calculation.

### Retrieval

Detailed in **`web/lib/retrieval/README.md`**. In short: the question is translated into
German and English technical terms plus a hypothetical answer (HyDE), all variants are
embedded in one API call, six hit lists run in parallel (4× vector, 2× lexical), and the
fusion works on rank positions rather than scores — because cosine (0..1) and `ts_rank`
(unbounded) are not comparable. Each language carries the same total weight, so three
rephrasings of the same question do not outvote a single good hit in the other language.

The lexical arm uses Postgres `ts_rank`, a tf-idf-style ranking. That is **not BM25**.

### The tools

| Tool | What it does | Where its numbers come from |
|---|---|---|
| `retrieve_doctrine` | hybrid search over the doctrine | — |
| `score_test_sheet` | marks × coefficients → percentage | FEI Rules Art. 423.3, 423.4, 425.1 |
| `horse_profile_match` | movement × training level × age | Judging Manual p. 13–23, German FN leaflet |
| `training_load` | sessions, rest days, load progression | pure arithmetic |

Retrieval is a tool rather than a fixed step, because not every question needs the
doctrine: "tell me a joke" and "my horse is lame" trigger no tool at all.

### Security

| Layer | Protection |
|---|---|
| Database | RLS on every user table; each rider sees only her own data |
| Database | `chunks` has no insert policy — nothing can be smuggled into the knowledge base through the app |
| Prompt | retrieved evidence and video observations sit in fenced blocks, declared as data |
| Input | the injection guard flags patterns and rewrites nothing |
| Paths | video paths must match a strict pattern; traversal ends in 404, not 500 |
| Redirects | only internal paths are accepted as a redirect target |
| Domain | no veterinary diagnoses, no invented marks, no feedback without evidence |
| Keys | the secret key never reaches the browser bundle; three clients for three roles |

---

## Quality

**136 unit tests** (`npm test`), run by Node directly — no Jest, no Vitest. Covered above
all: the three deterministic tools, the security checks, and the transformations nobody
notices when they break.

**Tool selection 8/8** (`npm run eval:tools`) across easy, medium, hard and three edge
cases — including one that checks the system refuses to diagnose a lame horse.

**RAG metrics** over 9 test cases, implemented in `eval/metrics.ts` following the RAGAs
definitions:

| Metric | Value |
|---|---|
| Faithfulness | 0.82 |
| Answer relevancy | 0.69 |
| Context precision | 0.69 |
| Context recall | 0.93 |
| Refusal correctness | 1.00 |

These are guide values for before/after comparisons, not truth to two decimal places —
an LLM judge fluctuates, and one faithfulness value moved from 1.00 to 0.73 between two
runs.

---

## Limits

- **Latency 15–25 seconds.** Query translation, six searches, then generation. Reasoning
  tokens dominate the output budget, which is why the first token arrives late.
- **Context precision 0.69.** The useful evidence is not reliably at the top; a reranker
  over the top 20 would be the single biggest improvement.
- **No document defines the six elements of the training scale.** The corpus presupposes
  them, so a question about the definition returns context rather than a definition. A
  missing source, not a retrieval fault.
- **Video uploads are capped at 20 MB and 60 seconds.** The limit is not ours: OpenRouter
  drops an upload that takes too long. The browser re-encodes to 720p to fit, which needs
  a visible window — a hidden tab throttles frame output.
- **The local video store does not survive a deployment.** Serverless hosting has no
  persistent file system, and Vercel caps request bodies at 4.5 MB.
- **The profile page guards client-side.** RLS protects the data, but the page flashes
  briefly before redirecting.

---

## Reviewing this project

**What runs with no credentials at all:**

```bash
cd web && npm install
npm test        # 136 unit tests — no database, no network, no keys
npm run build   # production build including the type check
```

That is deliberate, not luck. Four modules are split so that pure logic can be tested
without credentials: `terms.ts` beside `keyword.ts`, `paths.ts` beside `store.ts`,
`types.ts` beside `analyse.ts`, `encodeTargets.ts` beside `compress.ts`. A module-level
`throw` for a missing API key would otherwise have forced credentials on its neighbour's
tests. Covered above all: the three deterministic tools, the security checks (path
traversal, open redirect, CSV escaping), and the transformations nobody notices when they
break.

**What running the app needs:** your own Supabase project with the three migrations
applied, and your own OpenRouter key. Copy `web/.env.example` to `web/.env.local` and
fill in the four values.

**What cannot be reproduced from this repository:** the knowledge base. The source PDFs
carry *"Reproduction strictly reserved"* and are therefore gitignored — and committing the
extracted chunks would be the same material in another form. Without them `npm run ingest`
has nothing to read, and retrieval returns nothing. Where to obtain each document is
listed in `web/data/sources/README.md`.

**So the intended path is a walkthrough**, with the author driving a running instance.
Three questions show the substance in about three minutes:

1. *"What does rhythm mean in dressage?"* — the same question that yields music theory
   without a knowledge base returns a cited answer from the doctrine.
2. *"I scored 7, 6 and 8, the last one with coefficient 2 — what percentage?"* — the tool
   card shows the computed value next to the prose, so a discrepancy would be visible
   rather than believed.
3. *"My horse has been lame since yesterday"* — no tool fires, and the answer refers the
   rider to a vet. The domain limit holds on its own.

---

## Further documents

| File | Contents |
|---|---|
| `web/lib/retrieval/README.md` | the retrieval layer in detail, with every measurement |
| `web/data/sources/README.md` | sources, how to obtain them, copyright, the corpus gap |
| `web/eval/queries.md` | real user questions as the basis for testing |
