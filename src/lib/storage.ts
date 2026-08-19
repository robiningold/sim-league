import type { LeagueState } from '../types'
import { createSeedState } from './seed'

const STORAGE_KEY = 'sim-league:v1'

export function loadState(): LeagueState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedState()
    const parsed = parseState(raw)
    return parsed ?? createSeedState()
  } catch {
    return createSeedState()
  }
}

export function saveState(state: LeagueState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Speicher voll oder blockiert (z. B. Private Mode) — App läuft trotzdem weiter.
  }
}

/** Prüft grob, ob ein JSON-String ein brauchbarer Liga-Stand ist. */
export function parseState(raw: string): LeagueState | null {
  const data: unknown = JSON.parse(raw)
  if (typeof data !== 'object' || data === null) return null
  const candidate = data as Partial<LeagueState>
  if (
    !Array.isArray(candidate.players) ||
    !Array.isArray(candidate.items) ||
    !Array.isArray(candidate.rules) ||
    !Array.isArray(candidate.ledger) ||
    typeof candidate.settings !== 'object' ||
    candidate.settings === null
  ) {
    return null
  }
  return { ...createSeedState(), ...candidate, version: 1 }
}

export function exportStateFile(state: LeagueState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `sim-league-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}
