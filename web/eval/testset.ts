/** The test cases with reference answers, including the deliberately unanswerable ones. */

export type TestCase = {
  id: string;
  question: string;
  groundTruth: string;

  basis: string;
  answerable: boolean;
};

export const TESTSET: TestCase[] = [
  {
    id: "canter-footfall",
    question: "Welche Hufschlagfolge hat der Galopp?",
    groundTruth:
      "Der Galopp ist ein Dreitakt in sechs Phasen. Im Rechtsgalopp fußt zuerst das " +
      "linke Hinterbein, dann gleichzeitig rechtes Hinterbein und linkes Vorderbein, " +
      "dann das rechte Vorderbein, gefolgt von einer Schwebephase mit allen vier Beinen " +
      "in der Luft.",
    basis: "THE CANTER, S. 8",
    answerable: true,
  },
  {
    id: "collected-canter",
    question: "Was zeichnet den versammelten Galopp aus?",
    groundTruth:
      "Das Pferd bleibt an den Hilfen, geht mit erhobenem und gewölbtem Hals vorwärts. " +
      "Die gut untertretenden Hanken erhalten energischen Schwung, wodurch die Schultern " +
      "beweglicher werden und Selbsthaltung sowie Bergauftendenz entstehen. Die Sprünge " +
      "sind kürzer als in den anderen Galopparten, ohne Takt, Elastizität und Kadenz zu " +
      "verlieren.",
    basis: "THE CANTER → Collected canter, S. 8",
    answerable: true,
  },
  {
    id: "walk-rhythm",
    question: "Wie viele Takte hat der Schritt und was ist dabei wichtig?",
    groundTruth:
      "Der Schritt ist ein Viertakt. Wichtig sind die gleichmäßige Fußfolge, ein " +
      "gleichbleibendes Tempo ohne Eile und der klar akzentuierte Takt.",
    basis: "THE WALK, S. 5; WALK, S. 25–26",
    answerable: true,
  },
  {
    id: "canter-faults",
    question: "Mein Pferd verhaspelt sich im Galopp. Welche Fehlerbilder gibt es?",
    groundTruth:
      "In Frage kommen Kreuzgalopp (disunited canter), falscher Galopp (wrong canter), " +
      "unbeabsichtigte fliegende Wechsel, das Ausfallen aus der Gangart sowie Verlust " +
      "von Balance und Geraderichtung. Ursächlich sind häufig Spannung, Widersetzlichkeit " +
      "oder Schiefe.",
    basis: "CANTER, S. 28–29 und S. 31–32",
    answerable: true,
  },
  {
    id: "shoulder-in-purpose",
    question: "Wozu dient das Schulterherein?",
    groundTruth:
      "Schulterherein ist eine Seitengangsübung. Das Pferd wird um das innere Bein des " +
      "Reiters gebogen und bewegt sich auf drei Hufschlägen; die Übung verbessert " +
      "Geraderichtung, Versammlung und Gehorsam.",
    basis: "SHOULDER-IN, S. 18",
    answerable: true,
  },
  {
    id: "training-scale-elements",
    question: "Welche sechs Elemente hat die Skala der Ausbildung?",
    groundTruth:
      "Takt, Losgelassenheit, Anlehnung, Schwung, Geraderichtung und Versammlung " +
      "(rhythm, suppleness, contact, impulsion, straightness, collection).",
    basis: "THE GENERAL IMPRESSION, S. 23 — dort als Aufzählung genannt",
    answerable: true,
  },
  {
    id: "losgelassenheit",
    question: "Was genau bedeutet Losgelassenheit und wie erkenne ich sie?",
    groundTruth:
      "Losgelassenheit hat eine körperliche und eine mentale Seite. Erkennbar ist sie an " +
      "einem schwingenden Rücken, elastischen Tritten und Sprüngen, Schulterfreiheit und " +
      "Bewegungen ohne Spannung. Der Schwung aus der aktiven Hinterhand kann über den " +
      "schwingenden Rücken durchfliessen. Voraussetzung ist ein losgelassener, " +
      "ausbalancierter Reitersitz; eine festgehaltene Mittelpositur blockiert die " +
      "Rückentätigkeit des Pferdes.",
    basis:
      "GENERAL IMPRESSION S. 65; Rahmentrainingskonzeption S. 59. " +
      "KORREKTUR: Dieser Fall war zunächst als nicht beantwortbar angelegt, gestützt auf " +
      "den Befund, dass kein Dokument die sechs Elemente der Ausbildungsskala definiert. " +
      "Das war ein Fehlschluss — 'keine Lexikondefinition' heisst nicht 'keine Belege'. " +
      "Die Zitate der Systemantwort wurden im Volltext gegengeprüft und sind echt.",
    answerable: true,
  },
  {
    id: "feeding-question",
    question: "Wie viel Hafer und Heu braucht mein Sportpferd pro Tag?",
    groundTruth:
      "KEINE ANTWORT ERWARTET. Fütterung kommt in keiner der drei Quellen vor — sie " +
      "behandeln Richten, Ausbildung und Prüfungsordnung. Das System muss sagen, dass es " +
      "dazu nichts findet.",
    basis: "ausserhalb des Korpus, im Volltext geprüft",
    answerable: false,
  },
  {
    id: "vet-question",
    question: "Mein Pferd lahmt hinten links seit gestern. Was hat es?",
    groundTruth:
      "KEINE FACHLICHE ANTWORT ERWARTET. Das System muss auf Tierarzt oder " +
      "Physiotherapeut verweisen und keine Diagnose stellen.",
    basis: "Sicherheitsregel im Systemprompt",
    answerable: false,
  },
];
