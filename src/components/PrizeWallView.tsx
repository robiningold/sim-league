import { useState } from 'react'
import { useLeague } from '../state/LeagueContext'
import { CATEGORY_LABEL, balanceOf, itemsByCategory, remainingStock } from '../lib/league'
import { formatTickets } from '../lib/format'
import { Button, Card, Empty, Field, Tickets, inputClass } from './ui'
import type { PrizeCategory, PrizeItem } from '../types'

const CATEGORIES: PrizeCategory[] = ['icon', 'title', 'banner', 'perk']

function ItemCard({
  item,
  buyerId,
  balance,
  onRedeem,
  editMode,
}: {
  item: PrizeItem
  buyerId: string | null
  balance: number
  onRedeem: () => void
  editMode: boolean
}) {
  const { state, dispatch } = useLeague()
  const stock = remainingStock(state, item)
  const soldOut = stock !== null && stock <= 0
  const affordable = buyerId !== null && balance >= item.cost
  const disabled = !buyerId || !affordable || soldOut || !item.active

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
        item.active ? 'border-ink-700 bg-ink-950/40' : 'border-ink-700/50 bg-ink-950/20 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-slate-100">{item.name}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.description}</p>
        </div>
        <Tickets value={item.cost} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          {stock === null ? 'unbegrenzt' : soldOut ? 'ausverkauft' : `noch ${stock} verfügbar`}
        </span>
        {editMode ? (
          <div className="flex gap-2">
            <Button
              onClick={() => dispatch({ type: 'item/update', id: item.id, patch: { active: !item.active } })}
            >
              {item.active ? 'Ausblenden' : 'Anzeigen'}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`„${item.name}“ von der Prize Wall entfernen?`)) {
                  dispatch({ type: 'item/remove', id: item.id })
                }
              }}
            >
              Löschen
            </Button>
          </div>
        ) : (
          <Button variant={affordable && !soldOut ? 'primary' : 'ghost'} disabled={disabled} onClick={onRedeem}>
            {soldOut
              ? 'Ausverkauft'
              : !buyerId
                ? 'Spieler wählen'
                : affordable
                  ? 'Einlösen'
                  : `${formatTickets(item.cost - balance)} fehlen`}
          </Button>
        )}
      </div>
    </div>
  )
}

function NewItemForm() {
  const { dispatch } = useLeague()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('100')
  const [category, setCategory] = useState<PrizeCategory>('icon')
  const [stock, setStock] = useState('')

  function submit() {
    const costValue = Number.parseInt(cost, 10)
    if (!name.trim() || !Number.isFinite(costValue) || costValue <= 0) return
    const stockValue = stock.trim() === '' ? null : Number.parseInt(stock, 10)
    dispatch({
      type: 'item/add',
      item: {
        name: name.trim(),
        description: description.trim(),
        cost: costValue,
        category,
        stock: stockValue !== null && Number.isFinite(stockValue) ? stockValue : null,
        active: true,
      },
    })
    setName('')
    setDescription('')
    setCost('100')
    setStock('')
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Icon: Blitz" />
      </Field>
      <Field label="Beschreibung">
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kurzer Text"
        />
      </Field>
      <Field label="Kategorie">
        <select
          className={inputClass}
          value={category}
          onChange={(e) => setCategory(e.target.value as PrizeCategory)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Kosten">
        <input className={inputClass} inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} />
      </Field>
      <Field label="Bestand" hint="leer = unbegrenzt">
        <div className="flex gap-2">
          <input className={inputClass} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            +
          </Button>
        </div>
      </Field>
    </div>
  )
}

export function PrizeWallView() {
  const { state, dispatch } = useLeague()
  const [buyerId, setBuyerId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const activePlayers = state.players.filter((p) => p.active)
  const balance = buyerId ? balanceOf(state, buyerId) : 0
  const visibleItems = editMode ? state.items : state.items.filter((i) => i.active)

  function redeem(item: PrizeItem) {
    if (!buyerId) return
    const player = state.players.find((p) => p.id === buyerId)
    if (!player) return
    if (!confirm(`${player.name} löst „${item.name}“ für ${item.cost} Tickets ein?`)) return
    dispatch({ type: 'redeem', playerId: buyerId, item })
    setMessage(`${player.name} hat „${item.name}“ eingelöst.`)
    window.setTimeout(() => setMessage(null), 4000)
  }

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="Prize Wall"
        subtitle="Wer löst ein? Guthaben wird beim Einlösen automatisch abgezogen."
        actions={
          <Button variant={editMode ? 'primary' : 'ghost'} onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Bearbeiten beenden' : 'Wall bearbeiten'}
          </Button>
        }
      >
        {activePlayers.length === 0 ? (
          <Empty>Noch keine aktiven Spieler — lege sie im Tab „Spieler“ an.</Empty>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {activePlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setBuyerId(buyerId === player.id ? null : player.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  buyerId === player.id
                    ? 'border-sky-400 bg-sky-500/15 text-white'
                    : 'border-ink-600 text-slate-300 hover:bg-ink-800'
                }`}
              >
                <span aria-hidden>{player.emoji}</span>
                {player.name}
                <span className="text-xs text-slate-400">{formatTickets(balanceOf(state, player.id))}</span>
              </button>
            ))}
            {buyerId && (
              <span className="ml-auto text-sm text-slate-400">
                Guthaben: <Tickets value={balance} />
              </span>
            )}
          </div>
        )}
        {message && (
          <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {message}
          </p>
        )}
      </Card>

      {editMode && (
        <Card title="Neuer Preis" subtitle="Erscheint sofort auf der Wall.">
          <NewItemForm />
        </Card>
      )}

      {itemsByCategory(visibleItems).map(([category, items]) => (
        <Card key={category} title={CATEGORY_LABEL[category]}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                buyerId={buyerId}
                balance={balance}
                editMode={editMode}
                onRedeem={() => redeem(item)}
              />
            ))}
          </div>
        </Card>
      ))}

      {visibleItems.length === 0 && <Empty>Die Prize Wall ist leer.</Empty>}
    </div>
  )
}
