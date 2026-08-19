import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { LeagueState } from '../types'
import { loadState, saveState } from '../lib/storage'
import { leagueReducer, type Action } from './leagueReducer'

type LeagueContextValue = {
  state: LeagueState
  dispatch: (action: Action) => void
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(leagueReducer, null, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return <LeagueContext.Provider value={{ state, dispatch }}>{children}</LeagueContext.Provider>
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext)
  if (!ctx) throw new Error('useLeague muss innerhalb von <LeagueProvider> benutzt werden')
  return ctx
}
