# Sim League — Liga-Rechner

Ticket-Rechner, Prize Wall und Tabelle für die Sim League. React + Vite + Tailwind,
komplett im Browser lauffähig — noch ohne Backend.

## Lokal starten

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Produktions-Build (prüft auch die Typen)
npm run preview  # Build lokal ansehen
```

Node 20+ wird empfohlen.

## Was die App kann

| Tab | Funktion |
| --- | --- |
| **Rechner** | Spieler (auch mehrere gleichzeitig) auswählen, Leistungen abhaken, Tickets gutschreiben. Live-Vorschau pro Spieler und gesamt. |
| **Spieler** | Kader verwalten, Icon setzen, pausieren, manuell Tickets gutschreiben oder abziehen. |
| **Prize Wall** | Icons, Titles, Banner und Perks einlösen. Guthaben wird automatisch abgezogen, Bestand mitgezählt. |
| **Tabelle** | Rangliste nach verdienten Tickets inkl. Guthaben und Einlösungen. |
| **Verlauf** | Jede Buchung mit Datum und Grund — einzeln zurücknehmbar. |
| **Einstellungen** | Liga-/Saisonname, Ticket-Regeln bearbeiten, Export/Import als JSON, Zurücksetzen. |

### Datenmodell

Guthaben werden nicht gespeichert, sondern immer aus dem **Ledger** (`src/types.ts` → `LedgerEntry`)
berechnet: jede Gutschrift, Einlösung und Korrektur ist eine Buchung mit `delta`.
Dadurch stimmen Tabelle und Guthaben immer überein, und „Rückgängig“ ist einfach das
Löschen einer Buchung.

```
src/
  lib/league.ts        Auswertungen (Guthaben, Tabelle, Vorschau)
  lib/storage.ts       localStorage + JSON-Export/Import
  lib/seed.ts          Startdaten (Regeln, Prize Wall, Demo-Spieler)
  state/               Reducer + React-Context
  components/          eine Datei pro Tab
```

## Speicherung

Alles liegt aktuell im **localStorage des Browsers** (`sim-league:v1`) — jeder sieht also
nur seinen eigenen Stand. Unter *Einstellungen → Daten* lässt sich der Stand als JSON
exportieren und wieder importieren, z. B. um ihn an andere weiterzugeben oder später
nach Supabase zu migrieren.

## Deployment auf Vercel

1. Repo auf GitHub pushen.
2. In Vercel „Add New Project“ → dieses Repo wählen.
3. Framework-Preset **Vite** wird automatisch erkannt (Build `npm run build`, Output `dist`).
4. Deploy — ab jetzt deployt jeder Push auf `main` automatisch.

Environment-Variablen braucht die App im aktuellen Stand keine.

## Nächste Schritte

- **Supabase-Backend**: Tabellen `players`, `ledger`, `prize_items`; Supabase Auth für
  Spieler-Logins, damit alle denselben Stand sehen. Das Ledger-Modell lässt sich 1:1
  auf eine Tabelle abbilden.
- **Admin-Bereich**: Einlösungen bestätigen/ablehnen statt sofort abbuchen.
- **Spielerprofile**: eingelöste Icons/Titles/Banner als aktives Profilbild setzen.

API-Keys gehören in Vercel-Environment-Variablen bzw. eine lokale `.env` (steht in `.gitignore`),
niemals in den Code.
