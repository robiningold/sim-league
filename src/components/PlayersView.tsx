import { useState } from 'react'
import { useLeague } from '../state/LeagueContext'
import { statsFor } from '../lib/league'
import { formatTickets } from '../lib/format'
import { Button, Card, Empty, Field, Tickets, inputClass } from './ui'
import type { Player } from '../types'

const EMOJI_CHOICES = ['🎮', '🏎️', '🎯', '🕹️', '⚽', '🏀', '🧊', '🔥', '👾', '🐉', '🦊', '⚡']

function PlayerRow({ player }: { player: Player }) {
  const { state, dispatch } = useLeague()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(player.name)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const stats = statsFor(state, player.id)
  if (!stats) return null

  function applyAdjust(sign: 1 | -1) {
    const value = Number.parseInt(amount, 10)
    if (!Number.isFinite(value) || value <= 0) return
    dispatch({ type: 'adjust', playerId: player.id, delta: sign * value, reason })
    setAmount('')
    setReason('')
  }

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-950/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {player.emoji}
          </span>
          {editing ? (
            <input
              className={`${inputClass} max-w-[14rem]`}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                dispatch({ type: 'player/update', id: player.id, patch: { name: name.trim() || player.name } })
                setEditing(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          ) : (
            <button onClick={() => setEditing(true)} className="text-left">
              <span className="block font-medium text-slate-100">{player.name}</span>
              <span className="text-xs text-slate-500">
                {stats.earned} verdient · {stats.spent} ausgegeben · {stats.redemptions} Einlösungen
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tickets value={stats.balance} size="lg" />
          <Button
            onClick={() => dispatch({ type: 'player/update', id: player.id, patch: { active: !player.active } })}
          >
            {player.active ? 'Pausieren' : 'Aktivieren'}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm(`${player.name} inklusive Ticket-Verlauf löschen?`)) {
                dispatch({ type: 'player/remove', id: player.id })
              }
            }}
          >
            Löschen
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink-700 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_CHOICES.map((emoji) => (
            <button
              key={emoji}
              onClick={() => dispatch({ type: 'player/update', id: player.id, patch: { emoji } })}
              className={`h-8 w-8 rounded-lg text-lg transition-colors ${
                player.emoji === emoji ? 'bg-sky-500/20 ring-1 ring-sky-400' : 'hover:bg-ink-800'
              }`}
              aria-label={`Icon ${emoji} setzen`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <input
            className={`${inputClass} w-24`}
            inputMode="numeric"
            placeholder="Anzahl"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            className={`${inputClass} w-44`}
            placeholder="Grund (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="subtle" onClick={() => applyAdjust(1)}>
            + Gutschrift
          </Button>
          <Button variant="subtle" onClick={() => applyAdjust(-1)}>
            − Abzug
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PlayersView() {
  const { state, dispatch } = useLeague()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])

  function addPlayer() {
    dispatch({ type: 'player/add', name, emoji })
    setName('')
  }

  const totalBalance = state.players.reduce((sum, p) => sum + (statsFor(state, p.id)?.balance ?? 0), 0)

  return (
    <div className="flex flex-col gap-5">
      <Card title="Spieler anlegen" subtitle="Name eingeben, Icon wählen, fertig.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <Field label="Name">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                placeholder="Spielername"
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_CHOICES.map((choice) => (
              <button
                key={choice}
                onClick={() => setEmoji(choice)}
                className={`h-9 w-9 rounded-lg text-lg transition-colors ${
                  emoji === choice ? 'bg-sky-500/20 ring-1 ring-sky-400' : 'hover:bg-ink-800'
                }`}
                aria-label={`Icon ${choice} wählen`}
              >
                {choice}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={addPlayer} disabled={!name.trim()}>
            Hinzufügen
          </Button>
        </div>
      </Card>

      <Card
        title={`Kader · ${state.players.length}`}
        subtitle={`Offenes Ticket-Guthaben insgesamt: ${formatTickets(totalBalance)}`}
      >
        {state.players.length === 0 ? (
          <Empty>Noch keine Spieler angelegt.</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {state.players.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
