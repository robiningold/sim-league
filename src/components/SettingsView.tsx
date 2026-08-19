import { useRef, useState } from 'react'
import { useLeague } from '../state/LeagueContext'
import { exportStateFile, parseState } from '../lib/storage'
import { createEmptyState, createSeedState } from '../lib/seed'
import { Button, Card, Empty, Field, inputClass } from './ui'
import type { RuleMode } from '../types'

function RulesEditor() {
  const { state, dispatch } = useLeague()
  const [label, setLabel] = useState('')
  const [tickets, setTickets] = useState('10')
  const [group, setGroup] = useState('Bonus')
  const [mode, setMode] = useState<RuleMode>('flat')

  function addRule() {
    const value = Number.parseInt(tickets, 10)
    if (!label.trim() || !Number.isFinite(value)) return
    dispatch({ type: 'rule/add', rule: { label: label.trim(), tickets: value, group: group.trim() || 'Bonus', mode } })
    setLabel('')
  }

  return (
    <div className="flex flex-col gap-4">
      {state.rules.length === 0 ? (
        <Empty>Keine Regeln definiert.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.rules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-700 bg-ink-950/40 px-3 py-2"
            >
              <input
                className={`${inputClass} min-w-[12rem] flex-1`}
                value={rule.label}
                onChange={(e) => dispatch({ type: 'rule/update', id: rule.id, patch: { label: e.target.value } })}
              />
              <input
                className={`${inputClass} w-28`}
                value={rule.group}
                onChange={(e) => dispatch({ type: 'rule/update', id: rule.id, patch: { group: e.target.value } })}
              />
              <input
                className={`${inputClass} w-20`}
                inputMode="numeric"
                value={rule.tickets}
                onChange={(e) =>
                  dispatch({
                    type: 'rule/update',
                    id: rule.id,
                    patch: { tickets: Number.parseInt(e.target.value, 10) || 0 },
                  })
                }
              />
              <select
                className={`${inputClass} w-36`}
                value={rule.mode}
                onChange={(e) =>
                  dispatch({ type: 'rule/update', id: rule.id, patch: { mode: e.target.value as RuleMode } })
                }
              >
                <option value="flat">einmalig</option>
                <option value="perUnit">pro Stück</option>
              </select>
              <Button variant="danger" onClick={() => dispatch({ type: 'rule/remove', id: rule.id })}>
                Löschen
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 border-t border-ink-700 pt-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Neue Regel">
          <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Pole Position" />
        </Field>
        <Field label="Gruppe">
          <input className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)} />
        </Field>
        <Field label="Tickets">
          <input className={inputClass} inputMode="numeric" value={tickets} onChange={(e) => setTickets(e.target.value)} />
        </Field>
        <Field label="Zählweise">
          <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value as RuleMode)}>
            <option value="flat">einmalig</option>
            <option value="perUnit">pro Stück</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Button variant="primary" className="w-full" onClick={addRule} disabled={!label.trim()}>
            Regel hinzufügen
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SettingsView() {
  const { state, dispatch } = useLeague()
  const fileInput = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  async function handleImport(file: File) {
    setImportError(null)
    try {
      const imported = parseState(await file.text())
      if (!imported) {
        setImportError('Die Datei enthält keinen gültigen Liga-Stand.')
        return
      }
      if (confirm('Aktuellen Stand durch die Datei ersetzen?')) {
        dispatch({ type: 'state/replace', state: imported })
      }
    } catch {
      setImportError('Die Datei konnte nicht gelesen werden.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Liga" subtitle="Name und Saison erscheinen in der Kopfzeile und der Tabelle.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Liga-Name">
            <input
              className={inputClass}
              value={state.settings.leagueName}
              onChange={(e) => dispatch({ type: 'settings/update', patch: { leagueName: e.target.value } })}
            />
          </Field>
          <Field label="Saison">
            <input
              className={inputClass}
              value={state.settings.seasonName}
              onChange={(e) => dispatch({ type: 'settings/update', patch: { seasonName: e.target.value } })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Ticket-Regeln" subtitle="Diese Regeln stehen im Rechner zur Auswahl.">
        <RulesEditor />
      </Card>

      <Card
        title="Daten"
        subtitle="Alles liegt aktuell nur im Browser (localStorage). Export sichert den Stand als JSON."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" onClick={() => exportStateFile(state)}>
            Export (JSON)
          </Button>
          <Button variant="subtle" onClick={() => fileInput.current?.click()}>
            Import
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImport(file)
              e.target.value = ''
            }}
          />
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('Alle Spieler und Buchungen löschen? Regeln und Prize Wall bleiben erhalten.')) {
                dispatch({ type: 'state/replace', state: { ...createEmptyState(), settings: state.settings } })
              }
            }}
          >
            Saison zurücksetzen
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Wirklich alles auf die Demo-Daten zurücksetzen?')) {
                dispatch({ type: 'state/replace', state: createSeedState() })
              }
            }}
          >
            Werkszustand
          </Button>
        </div>
        {importError && <p className="mt-3 text-sm text-rose-300">{importError}</p>}
      </Card>
    </div>
  )
}
