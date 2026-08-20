# OP TCG Liga — Prize-Wall-Rechner

Interaktiver Rechner für die Liga: Ticket-Ökonomie, Prize Wall und PDF-Export.

## Lokal starten

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
```

## Was der Rechner macht

- **Zwei Auszahlungsmodi im Vergleich** — *Top X* (nur die besten Plätze bekommen Tickets)
  gegen *Ticket pro Win* (jeder Match-Sieg gibt ein Ticket). Beide Modelle stehen
  nebeneinander: Tickets/Event, Preis-Anteil und Gewinn/Monat.
- **Monats-Rechnung** aus Kapazität, Auslastung, Turnieren pro Woche, Eintritt,
  Zahlungsgebühren und Fixkosten → Netto-Gewinn und Beute pro Kopf.
- **Sticker-Wert vs. reale Kosten**: was Spieler sehen (Ticket-Wert) gegen das, was ein
  Ticket uns wirklich kostet. Warnung, sobald der ausgeschüttete Sticker-Wert über dem
  Umsatz liegt.
- **Gewinn nach Auslastung** als Kurve mit Break-even-Linie und Marker auf dem
  aktuellen Wert.
- **Prize Wall** frei gestaltbar: Produkte aus dem Katalog hinzufügen, Ticket-Preise und
  CHF-Kosten anpassen. Die Spalte *K/Ticket* färbt sich grün, wenn ein Produkt nah am
  Sticker-Wert liegt; *Grind* zeigt, wie viele Events ein Sieger bzw. ein
  Mittelfeld-Spieler dafür braucht.
- **PDF-Report** über „Als PDF speichern“ (Druckansicht mit Parametern, Monats-Rechnung
  und kompletter Wall).

Alles läuft im Browser, ohne Backend. Eingaben werden nicht gespeichert — nach einem
Reload stehen wieder die Startwerte da; für Festhalten den PDF-Export nutzen.

## Deployment auf Vercel

Das Repo ist mit Vercel verbunden: jeder Push auf `main` deployt automatisch.
Framework-Preset **Vite**, Build `npm run build`, Output `dist`. Environment-Variablen
braucht die App keine.

## Weiterbauen

```
src/App.jsx           Menü und Seitenwechsel
src/TicketRechner.jsx Prize-Wall-Rechner
src/IdeaBoard.jsx     Idea Dump
```

Im Rechner (`src/TicketRechner.jsx`):

- `DISPLAYS` — die Set-Displays mit ihrem CHF-Einkaufspreis. Neue Sets hier eintragen,
  sie landen automatisch im Dropdown und in der Start-Wall.
- `PEG` und `MARKUP_START` — Ticket-Wert und Wall-Aufschlag beim Start; im UI sind beide
  Regler, die die ganze Wall live neu bepreisen.
- `TIERS` und `TIER_START` — Auszahlungsstufen für Top X
- `calc()` — die komplette Monatsrechnung

Anpassen, committen, pushen → live.

## Idea Dump

Ein Board für Ideen im Team: Notizen anlegen, beschriften, verschieben, einfärben,
gruppieren und mit Pfeilen verbinden. Bilder lassen sich aufs Board ziehen oder mit
Strg+V einfügen; sie werden beim Import auf 900 px verkleinert, damit der Speicher reicht.

Das Board liegt im `localStorage` des Browsers (`op-liga-ideas:v1`) — **jeder sieht nur
sein eigenes Board**. Zum Teilen gibt es Export und Import als JSON. Ein gemeinsames Board
für alle bräuchte ein Backend (z. B. Supabase).
