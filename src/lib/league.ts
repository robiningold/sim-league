import type { LeagueState, LedgerEntry, Player, PlayerId, PrizeCategory, PrizeItem, Rule } from '../types'

export type PlayerStats = {
  player: Player
  earned: number
  spent: number
  balance: number
  redemptions: number
}

export function statsFor(state: LeagueState, playerId: PlayerId): PlayerStats | null {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return null
  let earned = 0
  let spent = 0
  let redemptions = 0
  for (const entry of state.ledger) {
    if (entry.playerId !== playerId) continue
    if (entry.delta >= 0) earned += entry.delta
    else spent += -entry.delta
    if (entry.kind === 'redeem') redemptions += 1
  }
  return { player, earned, spent, balance: earned - spent, redemptions }
}

export function balanceOf(state: LeagueState, playerId: PlayerId): number {
  let balance = 0
  for (const entry of state.ledger) {
    if (entry.playerId === playerId) balance += entry.delta
  }
  return balance
}

/** Tabelle: nach verdienten Tickets sortiert, bei Gleichstand nach Guthaben und Name. */
export function standings(state: LeagueState): PlayerStats[] {
  return state.players
    .map((p) => statsFor(state, p.id))
    .filter((s): s is PlayerStats => s !== null)
    .sort(
      (a, b) =>
        b.earned - a.earned ||
        b.balance - a.balance ||
        a.player.name.localeCompare(b.player.name, 'de'),
    )
}

export type RuleSelection = Record<string, number>

/** Was eine Regelauswahl an Tickets ergibt — pro Spieler identisch. */
export function previewAward(rules: Rule[], selection: RuleSelection): number {
  let total = 0
  for (const rule of rules) {
    const count = selection[rule.id] ?? 0
    if (count <= 0) continue
    total += rule.mode === 'flat' ? rule.tickets : rule.tickets * count
  }
  return total
}

export function awardReason(rules: Rule[], selection: RuleSelection): string {
  const parts: string[] = []
  for (const rule of rules) {
    const count = selection[rule.id] ?? 0
    if (count <= 0) continue
    parts.push(rule.mode === 'perUnit' && count > 1 ? `${rule.label} ×${count}` : rule.label)
  }
  return parts.join(', ')
}

export function itemsByCategory(items: PrizeItem[]): Array<[PrizeCategory, PrizeItem[]]> {
  const order: PrizeCategory[] = ['icon', 'title', 'banner', 'perk']
  return order
    .map((category): [PrizeCategory, PrizeItem[]] => [
      category,
      items.filter((i) => i.category === category),
    ])
    .filter(([, list]) => list.length > 0)
}

export const CATEGORY_LABEL: Record<PrizeCategory, string> = {
  icon: 'Icons',
  title: 'Titles',
  banner: 'Banner',
  perk: 'Perks',
}

export function ledgerFor(state: LeagueState, playerId: PlayerId | 'all'): LedgerEntry[] {
  const entries = playerId === 'all' ? state.ledger : state.ledger.filter((e) => e.playerId === playerId)
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))
}

export function playerName(state: LeagueState, playerId: PlayerId): string {
  return state.players.find((p) => p.id === playerId)?.name ?? 'Unbekannt'
}

/** Wie oft ein Item bereits eingelöst wurde (für Bestandsanzeige). */
export function redeemedCount(state: LeagueState, itemId: string): number {
  return state.ledger.filter((e) => e.kind === 'redeem' && e.itemId === itemId).length
}

export function remainingStock(state: LeagueState, item: PrizeItem): number | null {
  if (item.stock === null) return null
  return Math.max(0, item.stock - redeemedCount(state, item.id))
}
