# Die Retrieval-Schicht

> Erklärung der Bausteine in `lib/retrieval/`, `lib/security/` und `lib/chat/`.
> Alle Zahlen darin sind **gemessen**, nicht geschätzt — die Messbefehle stehen jeweils dabei.

---

## 1. Das Problem, das diese Schicht löst

Ein Sprachmodell weiß viel, aber nichts über deinen Korpus. Und es weiß nicht, **dass** es etwas nicht weiß.

Beispiel, direkt gemessen. Frage: *„Was bedeutet Takt in der Dressur?"*

**Ohne Retrieval** antwortete das Modell:

> „Takt bezeichnet die regelmäßige, rhythmische Gliederung von Zeit, Tönen oder Arbeitsabläufen und steht im übertragenen Sinn für Feingefühl im menschlichen Umgang."

Musiktheorie und Höflichkeit. Fachlich vollständig falsch — und **selbstbewusst formuliert**, ohne jeden Hinweis auf Unsicherheit. Genau das macht es gefährlich: die Nutzerin trainiert danach.

**Mit Retrieval:**

> „In der Dressur bezeichnet der Takt die absolute Gleichmäßigkeit der Bewegungen ohne Spannung (*absolute regularity without tension*) sowie die Fähigkeit, denselben Rhythmus und das natürliche Gleichgewicht auch bei Tempi- und Gangartenwechseln beizubehalten **(GENERAL IMPRESSION, S. 65)**. […] Im Schritt zeigt sich der Takt als regelmäßiger Viertakt **(WALK, S. 25–26)**, im Trab in der Gleichmäßigkeit und Elastizität der Tritte **(TROT, S. 27)**."

Jede Aussage nachprüfbar. **Das ist der ganze Zweck dieser Schicht:** nicht das Modell klüger machen, sondern es an Quellen binden und die Quellen sichtbar machen.

---

## 2. Der Datenfluss

```
        Frage: "spackt im Galopp, verhaspelt sich"
                        │
                        ▼
        ┌───────────────────────────────────┐
        │  queryTranslation.ts              │   1 LLM-Aufruf
        │  Laiensprache → Fachsprache       │
        └───────────────────────────────────┘
             │              │           │
        DE-Begriffe    EN-Begriffe    HyDE
             │              │           │
             └──────┬───────┴───────────┘
                    ▼
        ┌───────────────────────────────────┐
        │  embeddings.ts                    │   1 API-Aufruf für ALLE Varianten
        │  Text → je 1536 Zahlen            │
        └───────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
  vector.ts (4×)           keyword.ts (2×)        parallel
  match_chunks()           search_chunks_text()
  Bedeutung                Wörter
        │                        │
        └───────────┬────────────┘
                    ▼
        ┌───────────────────────────────────┐
        │  retriever.ts                     │
        │  Gewichte pro Sprache normieren   │
        └───────────────────────────────────┘
                    ▼
        ┌───────────────────────────────────┐
        │  rrf.ts — Fusion nach Rangposition│
        └───────────────────────────────────┘
                    ▼
              Top 6 Chunks
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  wrapContext.ts          types.ts citationOf()
  als Datenmaterial       "THE CANTER → Collected canter (S. 8)"
  abgegrenzt                    │
        │                       │
        ▼                       ▼
  prompt.ts + Modell      Quellenpanel im UI
```

Sechs Trefferlisten, ein Embedding-Aufruf, ein LLM-Aufruf für die Übersetzung, ein LLM-Aufruf für die Antwort.

---

## 3. Die Bausteine im Einzelnen

### `types.ts` — der Vertrag

Keine Logik, nur Typen plus eine Funktion. Der wichtigste Gedanke steckt im Kommentar über `RankedHit`:

```ts
/** score bedeutet je Arm etwas anderes — Cosine (0..1) beim Vektor-Arm,
 *  ts_rank (unbegrenzt) beim lexikalischen. Sie sind NICHT vergleichbar. */
```

Das ist die Begründung, warum die Fusion später Ränge statt Scores benutzt.

`citationOf()` baut die Quellenangabe: aus `{lesson: "THE CANTER", section: "Collected canter", page: 8}` wird `"THE CANTER → Collected canter (S. 8)"`. Das ist möglich, weil `scripts/ingest.ts` diese Metadaten pro Chunk mitschreibt — ohne die Chunking-Arbeit aus Schritt 2 könnte man nur „irgendwo in einem PDF" zitieren.

### `client.ts` — eine Entscheidung, kein Code

Vier Zeilen, dreißig Zeilen Begründung. Die Frage: mit welchem Schlüssel liest die Retrieval-Schicht?

Der Korpus ist **geteiltes Referenzmaterial**, keine Nutzerdaten. Er wird ausschließlich serverseitig gelesen — der Browser spricht mit `/api/chat`, nie direkt mit Supabase. Damit ist der Route-Handler die Vertrauensgrenze, und der Secret Key ist hier das richtige Werkzeug.

Das schwächt die Sicherheitsargumentation nicht:

| | Schutz |
|---|---|
| `profiles`, `horses`, `videos`, `analyses` | RLS, jede Reiterin sieht nur ihre Daten |
| `chunks` — Lesen | serverseitig, Route-Handler ist die Grenze |
| `chunks` — Schreiben | **keine Insert-Policy.** Verifiziert: INSERT mit Publishable Key → HTTP 401 |

Der letzte Punkt ist die Antwort auf „wo ist deine Prompt-Injection-Angriffsfläche?" — über die App kann niemand Text in die Wissensbasis einschmuggeln.

### `vector.ts` — Suche nach Bedeutung

Ruft die Postgres-Funktion `match_chunks()` auf. Vier Zeilen Code, aber dahinter steckt der Kern von RAG.

**Was ein Vektor hier ist:** Das Embedding-Modell liest Text und gibt 1536 Zahlen zurück — Koordinaten in einem 1536-dimensionalen Raum. Texte mit ähnlicher **Bedeutung** landen dicht beieinander, unabhängig von den Wörtern.

Gemessen mit `openai/text-embedding-3-small`, Ähnlichkeit zu „versammelter Galopp":

| Ähnlichkeit | Text | gemeinsame Wörter |
|---|---|---|
| **0.622** | „kurze Galoppsprünge mit erhobenem Hals und untergesetzter Hinterhand" | **keine** |
| 0.499 | „collected canter" | keine |
| 0.271 | „Nennungsgebühr und Startreihenfolge" | keine |
| 0.247 | „Apfelkuchen backen" | keine |

Keiner dieser Texte teilt ein Wort mit der Anfrage. Eine Wortsuche fände bei allen vier nichts. Der Vektor erkennt trotzdem, welcher dasselbe beschreibt.

**Warum das hier unverzichtbar ist:** „spackt" steht in keinem Reitlehrbuch. Ohne Vektoren funktionierte das System nur, wenn die Nutzerin die Fachbegriffe schon kennt — dann bräuchte sie es aber nicht.

**Warum die Funktion ein Embedding statt eines Strings nimmt:** Query Translation erzeugt vier Varianten. Die werden in *einem* API-Aufruf gemeinsam eingebettet. Vier einzelne Aufrufe hätten die Latenz vervierfacht.

Im SQL: `1 - (c.embedding <=> query_embedding)`. Der Operator `<=>` ist die Cosine-Distanz von pgvector; `1 - Distanz` ergibt die Ähnlichkeit — die Zahl, die als `score` zurückkommt.

### `terms.ts` und `keyword.ts` — Suche nach Wörtern

Getrennt in zwei Dateien, und das aus einem Grund, der beim Testen aufkam: `keyword.ts` importiert den Datenbank-Client, und der wirft beim Laden einen Fehler, wenn Credentials fehlen. Ein Unit-Test der reinen Query-Logik hätte deshalb Zugangsdaten gebraucht. **Reine Funktionen dürfen nicht an I/O hängen** — also liegt `toOrQuery()` in `terms.ts`, ohne einen einzigen Import.

**Die ODER-Entscheidung.** `websearch_to_tsquery` verknüpft Begriffe standardmäßig mit **UND**. Gemessen auf diesem Korpus:

```
"Galopp Takt Beinarbeit"          →  0 Treffer
"Galopp or Takt or Beinarbeit"    → 10 Treffer
"spackt or Galopp or verhaspelt"  → 10 Treffer
```

„Beinarbeit" kommt im Korpus nicht vor. Mit UND legt dieses **eine** unbekannte Wort den gesamten lexikalischen Arm lahm — und eine Laienformulierung enthält fast immer so ein Wort. Der Arm hätte zur Fusion nie etwas beigetragen.

Umgesetzt über das `or`-Schlüsselwort, das `websearch_to_tsquery` versteht. **Keine Migration nötig.**

**Warum Satzzeichen entfernt werden:** In der websearch-Syntax bedeutet ein führendes `-` NOT. `"spackt -Galopp"` hätte stillschweigend alle Galopp-Chunks **ausgeschlossen**. Ein Test deckt genau das ab.

**Und eine Präzisierung für das README der Abgabe:** Das hier ist **kein BM25**. `ts_rank` ist ein tf-idf-artiges Ranking. Die Kursunterlage spricht in ihrer Tabelle durchgehend von BM25 — wenn im Review gefragt wird, lautet die ehrliche Antwort: `ts_rank`, nicht BM25. Echtes BM25 bräuchte Korpus-Termstatistiken im Prozess, was den Zweck von Postgres aufhebt.

### `queryTranslation.ts` — das, was „advanced" bedeutet

Ein LLM-Aufruf, der die Frage **nicht beantwortet**, sondern in Suchbegriffe übersetzt. Drei Ausgaben: deutsche Fachbegriffe, englische Fachbegriffe, ein HyDE-Absatz.

Es löst drei Probleme, alle gemessen:

**Problem 1 — Vokabellücke.** Die Nutzerin schreibt „spackt im Galopp, verhaspelt sich". Die Reitlehre sagt „irregular", „four-beat canter", „Kreuzgalopp". Kein gemeinsames Wort, und semantisch weit genug entfernt, dass auch der Vektor-Arm schwächelt.

Gemessen — was das Modell aus dieser Frage macht:

```
deutsch:  Taktfehler, Kreuzgalopp, Viertakt, Hufschlagfolge, Galoppsprung, Balanceverlust
englisch: cross-canter, disunited canter, four-beat canter, canter rhythm, footfall sequence
```

Bemerkenswert: `Kreuzgalopp` und `Viertakt` waren genau die zwei Hypothesen, die vorher in `eval/queries.md` als Kandidaten notiert waren. Das Modell hat sie eigenständig gefunden.

**Problem 2 — Sprachlücke.** Siehe die Tabelle oben: die deutsche Umschreibung liegt bei 0.622, die exakte englische Übersetzung bei 0.499. **Ein Text mit demselben Sinn in derselben Sprache schlägt die wörtliche Übersetzung.** Deshalb erreichten deutsche Fragen den englischen Judging Manual nie.

Belegt mit einer Einzelmessung: bei „Wie sieht ein korrekter Galopp aus, welche Hufschlagfolge?"

| Arm | `THE CANTER` auf Rang | Treffer aus dem Judging Manual |
|---|---|---|
| Vektor mit der deutschen Originalfrage | nicht in Top 10 | 0/10 |
| Vektor mit deutschen Fachbegriffen | nicht in Top 10 | 0/10 |
| Vektor mit HyDE (deutsch) | nicht in Top 10 | 0/10 |
| **Vektor mit englischen Fachbegriffen** | **1** | **10/10** |

Die Übersetzung ins Englische ist deshalb im Systemprompt als **Pflicht** formuliert, nicht als Option.

**Problem 3 — Allerweltsbegriffe vergiften den lexikalischen Arm.** Rohprosa ergab die Query `"Was or bedeutet or Takt or der or Dressur"`. „Dressur" steht in fast jedem Chunk und taugt nicht zur Unterscheidung, aber `ts_rank` belohnt jeden Treffer. Deshalb bekommt der lexikalische Arm die **extrahierten Fachbegriffe**, nie die Rohfrage.

**Der Fallback ist keine Formalität.** Schlägt der Übersetzungsaufruf fehl oder liefert Unsinn, fällt die Funktion auf die Rohfrage zurück und loggt. Retrieval darf schlechter werden, aber nicht abbrechen.

### `rrf.ts` — die Fusion

Sechs Trefferlisten, eine Antwort. Wie zusammenführen?

Nicht über die Scores. Gemessen auf diesem Korpus: ein guter Vektortreffer liegt bei etwa **0.60**, ein guter `ts_rank`-Treffer bei etwa **0.07**. Addieren hieße, den Vektor-Arm das Ergebnis allein bestimmen zu lassen. Normalisieren hieße, eine Abbildung zu erfinden, die niemand begründen kann.

**Reciprocal Rank Fusion** umgeht das, indem es nur die Rangposition benutzt:

```
score(Chunk) = Σ über alle Listen   Gewicht / (60 + Rang)      Rang beginnt bei 1
```

Ein Rechenbeispiel:

```
Vektor-Arm:   1. Tragkraft (0.89)   2. Geraderichtung (0.85)   3. Losgelassenheit (0.81)
Keyword-Arm:  1. Aufgabe M5 (2.41)  2. Geraderichtung (1.10)   3. Pirouette (0.70)

Geraderichtung:  1/62 + 1/62 = 0.03226   ← gewinnt
Tragkraft:       1/61        = 0.01639
Aufgabe M5:      1/61        = 0.01639
```

**„Geraderichtung" stand in keiner Liste auf Platz 1 und gewinnt trotzdem** — weil zwei unabhängige Verfahren es gefunden haben. Übereinstimmung ist ein stärkeres Signal als ein Spitzenplatz.

Die `60` ist ein Dämpfungswert aus der Originalarbeit (Cormack et al., 2009). Mit `k=1` wäre der Vorsprung von Platz 1 brutal; mit `k=60` ist die Kurve flach genug, dass Konsens mehr zählt.

Zwei Details, die im Code begründet stehen:

- **`foundBy` pro Treffer** — merkt sich, welcher Arm den Chunk auf welchem Rang gefunden hat. Doppelter Nutzen: das Quellenpanel zeigt es an (`vector:en#2  keyword:en#2`), und du kannst im Review Vektor-only gegen Hybrid vergleichen.
- **Deterministischer Tie-Break nach `id`** — ohne ihn könnten identische Eingaben unterschiedliche Reihenfolgen liefern, und die RAGAs-Evaluation wäre nicht reproduzierbar.

### `retriever.ts` — die Orchestrierung, und ein behobener Fehler

Setzt die Kette zusammen und trifft eine Entscheidung, die aus einem **gemessenen Fehlschlag** entstand.

Bei „welche Hufschlagfolge hat der Galopp?" hatten *beide* englischen Arme den richtigen Chunk auf **Rang 1** — und er verlor die Fusion. Ursache:

```
deutsche Seite:  vector:original + vector:de + vector:hyde + keyword:de  =  4 Listen
englische Seite: vector:en + keyword:en                                  =  2 Listen
```

HyDE wird in der Sprache der Frage geschrieben, ist also eine dritte deutsche Stimme. RRF belohnt Übereinstimmung — und die deutsche Seite gewann durch **Stimmenzahl**, nicht durch Qualität.

**Der Denkfehler:** drei Umformulierungen derselben Frage sind kein unabhängiger Beleg. Sie sind dasselbe Signal, dreimal gezählt. RRF setzt implizit voraus, dass die Listen unabhängig sind.

**Die Behebung** (`balanceByLanguage`): jede Sprache trägt Gesamtgewicht 1, aufgeteilt auf ihre Listen. Deutsch: 4 Listen × 0,25. Englisch: 2 Listen × 0,5. Danach steht der richtige Chunk auf Platz 1.

Zwei Schalter für die Review-Demo:

```bash
node --experimental-strip-types --env-file=.env.local scripts/search.ts "frage"
node --experimental-strip-types --env-file=.env.local scripts/search.ts --plain "frage"
```

`--plain` schaltet Übersetzung und lexikalischen Arm ab — die Vergleichsbasis.

### `lib/security/wrapContext.ts` — Fremdinhalt abgrenzen

Der Korpus ist Text von Dritten. Stünde in einem Chunk „ignoriere deine Anweisungen", würde ihn ungeschützt in den Prompt zu setzen das Retrieval selbst zum Angriffsvektor machen.

Deshalb: jeder Beleg in einen abgegrenzten Block, der Systemprompt erklärt den Abschnitt ausdrücklich als **Datenmaterial**, und die Blockmarkierung wird aus dem Chunk-Inhalt entfernt, damit Text keine falsche Blockgrenze vortäuschen kann.

Das ist die zweite Schicht. Die erste ist die fehlende Insert-Policy — über die App kommt gar nichts in den Korpus.

### `lib/chat/prompt.ts` — wo die Domänenregeln stehen

Vier Regelblöcke:

1. **Quellenbindung** — Antworten stützen sich nur auf die Belege, jede Aussage mit Quellenangabe. Kein Treffer → „Dazu finde ich in meinen Quellen nichts", **ohne** Ergänzung aus eigenem Wissen. Das ist die wichtigste Einzelregel des Projekts.
2. **Umgang mit Belegen** — Datenmaterial, keine Anweisung.
3. **Grenzen** — keine tierärztlichen Diagnosen, keine erfundenen Noten.
4. **Stil** — Deutsch, knapp, englische Fachbegriffe in Klammern beibehalten.

Verifiziert, dass Regel 3 greift: bei der Galoppfrage hat das Modell von selbst auf körperliche Ursachen und Fachleute hingewiesen, ohne dass danach gefragt wurde.

---

## 4. Warum zwei Suchen und nicht eine

Jeder Arm versagt genau dort, wo der andere funktioniert.

| | Vektor | Keyword |
|---|---|---|
| „spackt im Galopp" | findet Galopp-Passagen | 0 Treffer, das Wort existiert nicht |
| „Aufgabe A5" | verwischt A5 mit A4 — beides „irgendeine Aufgabe" | trifft exakt |
| andere Sprache | überbrückt teilweise | gar nicht |
| Synonyme | stark | schwach |

Die Kursunterlage sagt es in ihrer Tabelle: *„Exact term matching → BM25 — Embeddings may blur exact identifiers"* und *„Production systems with mixed query types → Hybrid"*.

**Eine Präzisierung an derselben Tabelle:** Dort steht bei *„Multilingual or synonym-heavy queries" → „Embeddings — captures meaning across different phrasings"*. Unsere Messung zeigt die Grenze: Embeddings überbrücken Formulierungen zuverlässig, aber bei gemischtsprachigem Korpus gewinnt fast immer die Sprache der Frage (0.622 gegen 0.499). Kein Widerspruch zum Material — eine Verfeinerung.

---

## 5. Die Zahlen an einem Ort

| Größe | Wert | Wo festgelegt |
|---|---|---|
| Chunks im Korpus | 440 (327 deutsch, 113 englisch) | `scripts/ingest.ts` |
| Embedding-Modell | `openai/text-embedding-3-small` | `lib/embeddings.ts` |
| Dimensionen | 1536 | dort, **muss** zu `vector(1536)` passen |
| Treffer pro Arm | 10 | `retriever.ts: PER_ARM` |
| Chunks in den Prompt | 6 | `retriever.ts: TOP_K` |
| RRF-Dämpfung | 60 | `rrf.ts: RRF_K` |
| Trefferlisten pro Anfrage | 6 (4 Vektor, 2 Keyword) | `retriever.ts` |
| Tests | 32 | `npm test` |

---

## 6. Was noch schwach ist

Ehrlich benannt — das ist ein eigenes Bewertungskriterium („understands the potential problems with the application").

**Latenz 15–25 Sekunden.** Der Übersetzungsaufruf mit einem Reasoning-Modell frisst den Großteil. Für einen Chat zu langsam. Hebel: ein schnelles Modell nur für die Übersetzung, oder HyDE weglassen und messen, was es kostet.

**Migration 0002 nicht angewendet.** Der lexikalische Arm filtert noch nicht nach Sprache, durchsucht also englische Chunks mit deutschem Stemming und umgekehrt. Funktioniert trotzdem gut, wäre aber präziser.

**Lücke im Korpus.** Kein Dokument **definiert** die sechs Elemente der Ausbildungsskala. Der Judging Manual nennt sie einmal als Liste (S. 23) und setzt sie voraus. Bei „Was bedeutet Losgelassenheit?" liefert das Retrieval deshalb Umfeld statt Definition. Das ist kein Retrieval-Problem, sondern eine fehlende Quelle.

**`ts_rank` ist kein BM25.** Siehe oben. Präzise benennen, nicht überverkaufen.

**Keine Reranking-Stufe.** Ein Cross-Encoder über den Top-20 würde die Reihenfolge messbar verbessern. Bewusst nicht gebaut — erst messen, dann optimieren.

**Sprachgewichtung ist eine Heuristik.** „Jede Sprache gleich viel" ist begründet und behebt einen belegten Fehler, aber es ist keine gelernte Gewichtung. Bei einer Frage, die rein deutsches Material betrifft, verschenkt sie die Hälfte des Budgets an englische Treffer.

---

## 7. Fragen, die im Review kommen

**Warum RRF und nicht die Scores addieren?**
Weil Cosine (0..1) und `ts_rank` (unbegrenzt, korpusabhängig) auf unvergleichbaren Skalen liegen — gemessen 0.60 gegen 0.07. Normalisieren wäre eine erfundene Abbildung. RRF braucht nur die Rangposition.

**Was macht dein RAG „advanced"?**
Query Translation in drei Varianten plus Hybrid-Suche plus rangbasierte Fusion. Live vorführbar mit `scripts/search.ts` gegen `--plain`.

**Ist deine Keyword-Suche BM25?**
Nein. `ts_rank`, ein tf-idf-artiges Ranking. Echtes BM25 bräuchte Korpus-Termstatistiken im Prozess.

**Warum liest die Retrieval-Schicht mit dem Secret Key?**
Der Korpus ist geteiltes Referenzmaterial und wird nur serverseitig gelesen; der Route-Handler ist die Grenze. RLS schützt weiter alle Nutzertabellen, und `chunks` hat keine Insert-Policy — verifiziert mit HTTP 401.

**Wo hat dein System versagt, und wie hast du es gefunden?**
Zwei belegte Fälle: der englische Arm durchsuchte deutsche Chunks (`lang` steuerte nur das Stemming), und die Sprach-Stimmenmehrheit verdrängte den richtigen Chunk trotz Rang 1 in beiden englischen Armen. Beides fiel in der Debug-Ansicht `scripts/search.ts` auf — deshalb wurde sie vor der Chat-Anbindung gebaut.

**Warum steht Retrieval hinter einem Tool und nicht als fester Schritt?**
(Kommt in Schritt 6.) Damit der Agent entscheidet, ob er die Lehre braucht — bei „rechne meine Prüfungsnote" wäre Retrieval sinnlos.

**Was würdest du mit doppelter Zeit verbessern?**
Reranker über den Top-20, eine Quelle die die Ausbildungsskala erklärt, gelernte statt heuristischer Armgewichte, und ein schnelleres Übersetzungsmodell gegen die Latenz.
