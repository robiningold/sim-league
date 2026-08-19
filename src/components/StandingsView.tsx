import { useLeague } from '../state/LeagueContext'
import { standings } from '../lib/league'
import { formatTickets } from '../lib/format'
import { Card, Empty, Tickets } from './ui'

const MEDALS = ['🥇', '🥈', '🥉']

export function StandingsView() {
  const { state } = useLeague()
  const rows = standings(state)
  const totalEarned = rows.reduce((sum, r) => sum + r.earned, 0)
  const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Spieler', value: formatTickets(rows.length) },
          { label: 'Tickets verdient', value: formatTickets(totalEarned) },
          { label: 'Tickets eingelöst', value: formatTickets(totalSpent) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ink-700/70 bg-ink-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card title="Tabelle" subtitle={`${state.settings.seasonName} — sortiert nach verdienten Tickets.`}>
        {rows.length === 0 ? (
          <Empty>Noch keine Spieler in der Wertung.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Spieler</th>
                  <th className="px-2 py-2 text-right">Verdient</th>
                  <th className="px-2 py-2 text-right">Eingelöst</th>
                  <th className="px-2 py-2 text-right">Einlösungen</th>
                  <th className="px-2 py-2 text-right">Guthaben</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.player.id} className="border-t border-ink-700/70">
                    <td className="px-2 py-3 text-slate-400">{MEDALS[index] ?? index + 1}</td>
                    <td className="px-2 py-3">
                      <span className="mr-2" aria-hidden>
                        {row.player.emoji}
                      </span>
                      <span className="font-medium text-slate-100">{row.player.name}</span>
                      {!row.player.active && (
                        <span className="ml-2 rounded bg-ink-700 px-1.5 py-0.5 text-xs text-slate-400">
                          pausiert
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-slate-200">
                      {formatTickets(row.earned)}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-slate-400">
                      {formatTickets(row.spent)}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-slate-400">{row.redemptions}</td>
                    <td className="px-2 py-3 text-right">
                      <Tickets value={row.balance} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
