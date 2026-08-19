import type { LeagueState } from '../types'

const now = new Date().toISOString()

/** Startdaten für eine frische Liga — jederzeit über "Zurücksetzen" wiederherstellbar. */
export function createSeedState(): LeagueState {
  return {
    version: 1,
    settings: { leagueName: 'Sim League', seasonName: 'Season 1' },
    players: [
      { id: 'p_demo1', name: 'Spieler 1', emoji: '🎮', active: true, joinedAt: now },
      { id: 'p_demo2', name: 'Spieler 2', emoji: '🏎️', active: true, joinedAt: now },
      { id: 'p_demo3', name: 'Spieler 3', emoji: '🎯', active: true, joinedAt: now },
    ],
    rules: [
      { id: 'r_start', label: 'Teilnahme am Spieltag', tickets: 10, mode: 'flat', group: 'Spieltag' },
      { id: 'r_win', label: 'Sieg', tickets: 25, mode: 'perUnit', group: 'Ergebnis' },
      { id: 'r_draw', label: 'Unentschieden', tickets: 12, mode: 'perUnit', group: 'Ergebnis' },
      { id: 'r_loss', label: 'Niederlage (Trostpreis)', tickets: 5, mode: 'perUnit', group: 'Ergebnis' },
      { id: 'r_streak', label: 'Siegesserie (3 in Folge)', tickets: 20, mode: 'flat', group: 'Bonus' },
      { id: 'r_mvp', label: 'MVP des Spieltags', tickets: 30, mode: 'flat', group: 'Bonus' },
      { id: 'r_clean', label: 'Clean Sheet / kein Ausfall', tickets: 15, mode: 'flat', group: 'Bonus' },
      { id: 'r_report', label: 'Ergebnis pünktlich gemeldet', tickets: 5, mode: 'flat', group: 'Liga-Dienst' },
    ],
    items: [
      { id: 'i_icon_flame', name: 'Icon: Flamme', category: 'icon', cost: 60, description: 'Animiertes Profilbild-Icon.', stock: null, active: true },
      { id: 'i_icon_crown', name: 'Icon: Krone', category: 'icon', cost: 120, description: 'Nur für Tabellenführer gedacht — aber kaufbar.', stock: null, active: true },
      { id: 'i_title_rookie', name: 'Title: Rookie of the Season', category: 'title', cost: 90, description: 'Titel unter dem Spielernamen.', stock: 3, active: true },
      { id: 'i_title_legend', name: 'Title: Liga-Legende', category: 'title', cost: 250, description: 'Der teuerste Titel der Liga.', stock: 1, active: true },
      { id: 'i_banner_neon', name: 'Banner: Neon Grid', category: 'banner', cost: 150, description: 'Profilbanner im Retro-Look.', stock: null, active: true },
      { id: 'i_banner_champ', name: 'Banner: Champion', category: 'banner', cost: 300, description: 'Goldbanner mit Pokal.', stock: 2, active: true },
      { id: 'i_perk_pick', name: 'Perk: Freie Gegnerwahl', category: 'perk', cost: 200, description: 'Einmalig den Gegner für einen Spieltag wählen.', stock: 5, active: true },
      { id: 'i_perk_rematch', name: 'Perk: Rematch-Joker', category: 'perk', cost: 180, description: 'Ein verlorenes Match einmal wiederholen.', stock: 5, active: true },
    ],
    ledger: [],
  }
}

/** Leerer Start ohne Demo-Spieler, aber mit Regeln und Prize Wall. */
export function createEmptyState(): LeagueState {
  return { ...createSeedState(), players: [], ledger: [] }
}
