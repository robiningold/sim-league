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

Die ganze App steckt in `src/App.jsx`:

- `CATALOG` — Produkte fürs „+ Produkt“-Dropdown samt Ticket-/CHF-Defaults
- `defaultWall()` — die Prize Wall beim Start
- `calc()` — die komplette Monatsrechnung (Umsatz, Tickets, Kosten, Gebühren, Gewinn)

Anpassen, committen, pushen → live.
