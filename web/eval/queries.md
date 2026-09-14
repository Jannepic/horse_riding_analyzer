# Echte Fragen — Grundlage für Retrieval-Tests und RAGAs

Hier sammeln wir Fragen, **wie die Nutzerin sie wirklich formuliert**. Kein Fachjargon
glattgebügelt — der Bruch zwischen Laiensprache und Reitlehre-Vokabular ist der Punkt,
an dem sich Retrieval-Qualität entscheidet.

Pro Eintrag:
- **Frage** wörtlich, so wie gesagt
- **Fachbegriffe**, die das Retrieval finden müsste (bestätigt von der Reiterin)
- **Kategorie** nach dem Muster aus `documentation.md`: easy / medium / hard / edge

---

## 1. Galoppproblem  ·  Kategorie: hard

**Frage (wörtlich):**
> "Ihr Pferd spackt im Galopp, verhaspelt sich immer und kommt mit der Beinarbeit
> nicht zurecht."

**Warum hard:** Kein einziges Wort davon steht in der Reitlehre. Reine Vektorsuche
findet hier nichts Verwertbares — das ist der Testfall für Multi-Query und HyDE.

**Kandidaten für die Fachbegriffe** (VON DER REITERIN ZU BESTÄTIGEN):
- [ ] Kreuzgalopp
- [ ] Viertakt im Galopp / auseinanderfallender Galopp
- [ ] Außengalopp / falscher Galopp
- [ ] Geraderichtung
- [ ] Tragkraft der Hinterhand
- [ ] Losgelassenheit / Spannung

**Soll-Antwort:** offen, bis die Fachbegriffe bestätigt sind.

---

## Noch zu sammeln

Für eine belastbare Evaluation braucht es Fragen unterschiedlicher Art. Fehlend:

| # | Art | Wozu | Beispielform |
|---|---|---|---|
| 2 | Reine Lehrfrage, easy | Baseline — muss immer treffen | "Was ist Anlehnung?" |
| 3 | Konkrete Lektion, medium | Fachbegriff kommt wörtlich vor | "Wie reite ich Schulterherein?" |
| 4 | Aufgabe mit Nummer, hard | **Belegt, warum Hybrid Search nötig ist** — Nummern verwischen Embeddings | "Was wird in Aufgabe A5 bewertet?" |
| 5 | Pferdebezogen, medium | Muss `horse_profile_match` auslösen, nicht Retrieval | "Ist mein Sechsjähriger reif für Traversalen?" |
| 6 | Rechnerisch, medium | Muss `score_test_sheet` auslösen | "Ich hatte 7, 6, 8 mit Koeffizient 2 — wie viel Prozent?" |
| 7 | Kein Tool nötig, edge | Darf **gar kein** Tool auslösen | "Erzähl mir einen Witz" |
| 8 | Verweigerung, edge | Muss ablehnen | "Ist mein Pferd krank? Es lahmt." |

Nummer 7 und 8 sind nicht Beiwerk: die Tool-Calling-Evaluation im Kursmaterial prüft
ausdrücklich Fälle, in denen kein Tool aufgerufen werden darf.
