import { useMemo, useState } from 'react'
import { useLeague } from '../state/LeagueContext'
import { awardReason, balanceOf, previewAward, type RuleSelection } from '../lib/league'
import { formatTickets } from '../lib/format'
import { Button, Card, Empty, Field, Tickets, inputClass } from './ui'
import type { Rule } from '../types'

function groupRules(rules: Rule[]): Array<[string, Rule[]]> {
  const groups = new Map<string, Rule[]>()
  for (const rule of rules) {
    const list = groups.get(rule.group) ?? []
    list.push(rule)
    groups.set(rule.group, list)
  }
  return [...groups.entries()]
}

export function CalculatorView() {
  const { state, dispatch } = useLeague()
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selection, setSelection] = useState<RuleSelection>({})
  const [note, setNote] = useState('')
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const activePlayers = state.players.filter((p) => p.active)
  const perPlayer = useMemo(() => previewAward(state.rules, selection), [state.rules, selection])
  const total = perPlayer * selectedPlayers.length
  const canAward = perPlayer !== 0 && selectedPlayers.length > 0

  function togglePlayer(id: string) {
    setSelectedPlayers((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  function setCount(ruleId: string, count: number) {
    setSelection((prev) => ({ ...prev, [ruleId]: Math.max(0, count) }))
  }

  function reset() {
    setSelection({})
    setSelectedPlayers([])
    setNote('')
  }

  function award() {
    const base = awardReason(state.rules, selection)
    const reason = note.trim() ? `${note.trim()} — ${base}` : base
    dispatch({ type: 'award', playerIds: selectedPlayers, amount: perPlayer, reason })
    setConfirmation(
      `${formatTickets(perPlayer)} Tickets an ${selectedPlayers.length} Spieler gutgeschrieben.`,
    )
    reset()
    window.setTimeout(() => setConfirmation(null), 4000)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-5">
        <Card
          title="1 · Spieler wählen"
          subtitle="Die Gutschrift gilt für alle ausgewählten Spieler gleichermaßen."
          actions={
            activePlayers.length > 0 && (
              <Button
                onClick={() =>
                  setSelectedPlayers(
                    selectedPlayers.length === activePlayers.length
                      ? []
                      : activePlayers.map((p) => p.id),
                  )
                }
              >
                {selectedPlayers.length === activePlayers.length ? 'Keinen' : 'Alle'}
              </Button>
            )
          }
        >
          {activePlayers.length === 0 ? (
            <Empty>Noch keine aktiven Spieler — lege sie im Tab „Spieler“ an.</Empty>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activePlayers.map((player) => {
                const selected = selectedPlayers.includes(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      selected
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-ink-600 text-slate-300 hover:border-ink-600/40 hover:bg-ink-800'
                    }`}
                  >
                    <span aria-hidden>{player.emoji}</span>
                    <span className="font-medium">{player.name}</span>
                    <span className="text-xs text-slate-400">
                      {formatTickets(balanceOf(state, player.id))}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="2 · Leistungen abhaken" subtitle="Regeln bearbeitest du unter „Einstellungen“.">
          <div className="flex flex-col gap-5">
            {groupRules(state.rules).map(([group, rules]) => (
              <div key={group}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rules.map((rule) => {
                    const count = selection[rule.id] ?? 0
                    const on = count > 0
                    return (
                      <div
                        key={rule.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                          on ? 'border-sky-500/60 bg-sky-500/10' : 'border-ink-700 bg-ink-950/40'
                        }`}
                      >
                        <button
                          onClick={() => setCount(rule.id, on ? 0 : 1)}
                          className="flex-1 text-left"
                        >
                          <span className="block text-sm text-slate-100">{rule.label}</span>
                          <span className="text-xs text-slate-400">
                            {formatTickets(rule.tickets)} Tickets
                            {rule.mode === 'perUnit' ? ' pro Stück' : ''}
                          </span>
                        </button>
                        {rule.mode === 'perUnit' ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="subtle"
                              className="h-8 w-8 !px-0"
                              onClick={() => setCount(rule.id, count - 1)}
                              aria-label={`${rule.label} verringern`}
                            >
                              −
                            </Button>
                            <span className="w-6 text-center text-sm tabular-nums">{count}</span>
                            <Button
                              variant="subtle"
                              className="h-8 w-8 !px-0"
                              onClick={() => setCount(rule.id, count + 1)}
                              aria-label={`${rule.label} erhöhen`}
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => setCount(rule.id, e.target.checked ? 1 : 0)}
                            className="h-5 w-5 accent-sky-500"
                            aria-label={rule.label}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card title="3 · Gutschreiben">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-ink-700 bg-ink-950/60 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-400">Pro Spieler</span>
                <Tickets value={perPlayer} size="lg" />
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-ink-700 pt-3">
                <span className="text-sm text-slate-400">
                  Gesamt · {selectedPlayers.length} Spieler
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  {formatTickets(total)} 🎟️
                </span>
              </div>
            </div>

            <Field label="Notiz" hint="z. B. Spieltag 4 — landet im Verlauf.">
              <input
                className={inputClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Spieltag 4"
              />
            </Field>

            {selection && previewAward(state.rules, selection) > 0 && (
              <p className="text-xs leading-relaxed text-slate-400">
                {awardReason(state.rules, selection)}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" disabled={!canAward} onClick={award}>
                Tickets gutschreiben
              </Button>
              <Button onClick={reset}>Reset</Button>
            </div>

            {confirmation && (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {confirmation}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
