export type PlayerId = string

export type Player = {
  id: PlayerId
  name: string
  emoji: string
  active: boolean
  joinedAt: string
}

export type PrizeCategory = 'icon' | 'title' | 'banner' | 'perk'

export type PrizeItem = {
  id: string
  name: string
  category: PrizeCategory
  cost: number
  description: string
  /** null = unbegrenzt verfügbar */
  stock: number | null
  active: boolean
}

export type LedgerKind = 'earn' | 'redeem' | 'adjust'

export type LedgerEntry = {
  id: string
  playerId: PlayerId
  /** positiv = gutgeschrieben, negativ = abgezogen */
  delta: number
  kind: LedgerKind
  reason: string
  date: string
  itemId?: string
}

export type RuleMode = 'flat' | 'perUnit'

export type Rule = {
  id: string
  label: string
  tickets: number
  mode: RuleMode
  group: string
}

export type Settings = {
  leagueName: string
  seasonName: string
}

export type LeagueState = {
  version: 1
  settings: Settings
  players: Player[]
  items: PrizeItem[]
  rules: Rule[]
  ledger: LedgerEntry[]
}
