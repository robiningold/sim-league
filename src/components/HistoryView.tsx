import { useState } from 'react'
import { useLeague } from '../state/LeagueContext'
import { ledgerFor, playerName } from '../lib/league'
import { formatDate, signed } from '../lib/format'
import { Button, Card, Empty, inputClass } from './ui'
import type { LedgerKind } from '../types'

const KIND_LABEL: Record<LedgerKind, string> = {
  earn: 'Gutschrift',
  redeem: 'Einlösung',
  adjust: 'Korrektur',
}

const KIND_STYLE: Record<LedgerKind, string> = {
  earn: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25',
  redeem: 'bg-fuchsia-500/10 text-fuchsia-300 ring-fuchsia-500/25',
  adjust: 'bg-amber-500/10 text-amber-300 ring-amber-500/25',
}

export function HistoryView() {
  const { state, dispatch } = useLeague()
  const [playerId, setPlayerId] = useState<string>('all')
  const [kind, setKind] = useState<LedgerKind | 'all'>('all')

  const entries = ledgerFor(state, playerId).filter((e) => kind === 'all' || e.kind === kind)

  return (
    <Card
      title="Verlauf"
      subtitle="Jede Buchung ist einzeln zurücknehmbar — das Guthaben wird neu berechnet."
      actions={
        <div className="flex gap-2">
          <select className={inputClass} value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            <option value="all">Alle Spieler</option>
            {state.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as LedgerKind | 'all')}
          >
            <option value="all">Alle Arten</option>
            <option value="earn">Gutschriften</option>
            <option value="redeem">Einlösungen</option>
            <option value="adjust">Korrekturen</option>
          </select>
        </div>
      }
    >
      {entries.length === 0 ? (
        <Empty>Keine Buchungen für diese Auswahl.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-700 bg-ink-950/40 px-4 py-3"
            >
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${KIND_STYLE[entry.kind]}`}
              >
                {KIND_LABEL[entry.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-100">
                  <span className="font-medium">{playerName(state, entry.playerId)}</span>
                  <span className="text-slate-400"> · {entry.reason}</span>
                </p>
                <p className="text-xs text-slate-500">{formatDate(entry.date)}</p>
              </div>
              <span
                className={`tabular-nums text-sm font-semibold ${
                  entry.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {signed(entry.delta)}
              </span>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Diese Buchung zurücknehmen?')) {
                    dispatch({ type: 'ledger/remove', id: entry.id })
                  }
                }}
              >
                Rückgängig
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
