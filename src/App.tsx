import { useState } from 'react'
import { LeagueProvider, useLeague } from './state/LeagueContext'
import { CalculatorView } from './components/CalculatorView'
import { PlayersView } from './components/PlayersView'
import { PrizeWallView } from './components/PrizeWallView'
import { StandingsView } from './components/StandingsView'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'

const TABS = [
  { id: 'calculator', label: 'Rechner' },
  { id: 'players', label: 'Spieler' },
  { id: 'prizes', label: 'Prize Wall' },
  { id: 'standings', label: 'Tabelle' },
  { id: 'history', label: 'Verlauf' },
  { id: 'settings', label: 'Einstellungen' },
] as const

type TabId = (typeof TABS)[number]['id']

function Shell() {
  const { state } = useLeague()
  const [tab, setTab] = useState<TabId>('calculator')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {state.settings.leagueName}
          </h1>
          <p className="text-sm text-slate-400">
            {state.settings.seasonName} · Ticket-Rechner & Prize Wall
          </p>
        </div>
        <span className="rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1.5 text-xs text-slate-400">
          {state.players.length} Spieler · {state.ledger.length} Buchungen
        </span>
      </header>

      <nav className="flex flex-wrap gap-1 rounded-2xl border border-ink-700/70 bg-ink-900/60 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-300 hover:bg-ink-800 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="flex-1">
        {tab === 'calculator' && <CalculatorView />}
        {tab === 'players' && <PlayersView />}
        {tab === 'prizes' && <PrizeWallView />}
        {tab === 'standings' && <StandingsView />}
        {tab === 'history' && <HistoryView />}
        {tab === 'settings' && <SettingsView />}
      </main>

      <footer className="pb-2 text-center text-xs text-slate-600">
        Daten liegen lokal im Browser · Export unter „Einstellungen“
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <LeagueProvider>
      <Shell />
    </LeagueProvider>
  )
}
