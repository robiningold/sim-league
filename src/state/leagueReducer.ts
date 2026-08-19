import type { LeagueState, LedgerEntry, Player, PlayerId, PrizeItem, Rule, Settings } from '../types'
import { newId } from '../lib/id'

export type Action =
  | { type: 'player/add'; name: string; emoji: string }
  | { type: 'player/update'; id: PlayerId; patch: Partial<Player> }
  | { type: 'player/remove'; id: PlayerId }
  | { type: 'award'; playerIds: PlayerId[]; amount: number; reason: string }
  | { type: 'adjust'; playerId: PlayerId; delta: number; reason: string }
  | { type: 'redeem'; playerId: PlayerId; item: PrizeItem }
  | { type: 'ledger/remove'; id: string }
  | { type: 'item/add'; item: Omit<PrizeItem, 'id'> }
  | { type: 'item/update'; id: string; patch: Partial<PrizeItem> }
  | { type: 'item/remove'; id: string }
  | { type: 'rule/add'; rule: Omit<Rule, 'id'> }
  | { type: 'rule/update'; id: string; patch: Partial<Rule> }
  | { type: 'rule/remove'; id: string }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'state/replace'; state: LeagueState }

function entry(partial: Omit<LedgerEntry, 'id' | 'date'>): LedgerEntry {
  return { ...partial, id: newId('l'), date: new Date().toISOString() }
}

export function leagueReducer(state: LeagueState, action: Action): LeagueState {
  switch (action.type) {
    case 'player/add': {
      const name = action.name.trim()
      if (!name) return state
      const player: Player = {
        id: newId('p'),
        name,
        emoji: action.emoji || '🎮',
        active: true,
        joinedAt: new Date().toISOString(),
      }
      return { ...state, players: [...state.players, player] }
    }

    case 'player/update':
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      }

    case 'player/remove':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.id),
        ledger: state.ledger.filter((e) => e.playerId !== action.id),
      }

    case 'award': {
      if (action.amount === 0 || action.playerIds.length === 0) return state
      const entries = action.playerIds.map((playerId) =>
        entry({ playerId, delta: action.amount, kind: 'earn', reason: action.reason }),
      )
      return { ...state, ledger: [...state.ledger, ...entries] }
    }

    case 'adjust': {
      if (action.delta === 0) return state
      return {
        ...state,
        ledger: [
          ...state.ledger,
          entry({
            playerId: action.playerId,
            delta: action.delta,
            kind: 'adjust',
            reason: action.reason.trim() || 'Manuelle Korrektur',
          }),
        ],
      }
    }

    case 'redeem':
      return {
        ...state,
        ledger: [
          ...state.ledger,
          entry({
            playerId: action.playerId,
            delta: -action.item.cost,
            kind: 'redeem',
            reason: action.item.name,
            itemId: action.item.id,
          }),
        ],
      }

    case 'ledger/remove':
      return { ...state, ledger: state.ledger.filter((e) => e.id !== action.id) }

    case 'item/add':
      return { ...state, items: [...state.items, { ...action.item, id: newId('i') }] }

    case 'item/update':
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      }

    case 'item/remove':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) }

    case 'rule/add':
      return { ...state, rules: [...state.rules, { ...action.rule, id: newId('r') }] }

    case 'rule/update':
      return {
        ...state,
        rules: state.rules.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      }

    case 'rule/remove':
      return { ...state, rules: state.rules.filter((r) => r.id !== action.id) }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'state/replace':
      return action.state
  }
}
