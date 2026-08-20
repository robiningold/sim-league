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

Ein Board für Ideen im Team: Elemente mit Titel, Beschreibung, Stichpunkten und Bildern
anlegen, verschieben, in der Grösse ändern, einfärben, gruppieren und mit Pfeilen
verbinden. Ein Klick öffnet rechts das Detailpanel. Die Arbeitsfläche ist 4000 × 2600
Einheiten gross; Elemente und Ansicht bleiben darin, es kann also nichts hinter dem Rand
verschwinden.

### Ohne Supabase

Läuft die App ohne die Keys unten, liegt das Board im `localStorage` des Browsers
(`op-liga-ideas:v2`) — jeder sieht nur sein eigenes. Export und Import als JSON sind der
einzige Weg zum Teilen.

### Mit Supabase — gemeinsames Board für alle

1. **Schema anlegen**: Inhalt von `supabase/schema.sql` im Supabase SQL Editor ausführen.
   Das legt die Tabellen, die Zugriffsregeln, Realtime und den Bilder-Bucket an.
2. **Liga-Konto anlegen**: Supabase → Authentication → Users → *Add user*, E-Mail
   `team@sim-league.app`, Passwort nach Wahl, **Auto Confirm User** aktivieren.
   Alle im Team benutzen dieses eine Konto; in der App wird nur das Passwort abgefragt.
3. **Keys setzen**, lokal in einer `.env` und in Vercel unter Environment Variables:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_TEAM_EMAIL=team@sim-league.app
   ```

Danach fragt der Idea Dump beim Öffnen nach dem Passwort und synchronisiert live: jede
Änderung landet über Supabase Realtime sofort bei allen offenen Browsern. Bilder gehen in
den Storage statt in den Browserspeicher, das 5-MB-Limit entfällt.

Beim ersten Start mit leerem Server wird ein vorhandenes lokales Board **hochgeladen**
statt überschrieben — euer bisheriger Stand wandert also einmalig mit.

Der anon-Key darf öffentlich sein: ohne Anmeldung geben die Zugriffsregeln nichts heraus.
Bilder im Bucket sind über ihre zufällige URL öffentlich lesbar.

Bei gleichzeitigem Bearbeiten gewinnt die letzte Änderung pro Element. Eigene, noch nicht
hochgeladene Änderungen werden nicht von fremden überschrieben — sie gehen zuerst raus.
