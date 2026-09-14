import { useMemo, useState } from 'react'
import { formatShort, formatWeekRange, today, weekDays, weekStart, type ISODate } from '../lib/date'
import { nf, nf1, sum } from '../lib/format'
import { uid } from '../lib/id'
import { useStore } from '../store/store'
import type { ExerciseDef, ExerciseLog, SplitDay, WorkoutLog } from '../store/types'
import { allExerciseNames, exerciseHistory, recentWeeks, streak } from '../store/selectors'
import { Card, Empty, Field, Stat } from '../components/ui/ui'
import { Modal } from '../components/ui/Modal'
import { LineChart } from '../components/charts/LineChart'
import { BarChart } from '../components/charts/BarChart'
import { compact } from '../components/charts/chart-utils'

const ACCENT = 'var(--s-workout)'

export function Workout() {
  const data = useStore(s => s.data)
  const removeSplitDay = useStore(s => s.removeSplitDay)
  const removeWorkoutLog = useStore(s => s.removeWorkoutLog)

  const [editingSplit, setEditingSplit] = useState<SplitDay | null>(null)
  const [logging, setLogging] = useState<WorkoutLog | null>(null)

  const names = allExerciseNames(data)
  // di default l'esercizio con più storico: il grafico apre su qualcosa che racconta qualcosa
  const mostLogged = useMemo(() => {
    const count = new Map<string, number>()
    for (const l of data.workoutLogs) for (const e of l.entries) count.set(e.name, (count.get(e.name) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  }, [data.workoutLogs])
  const [exercise, setExercise] = useState<string>('')
  const selected = exercise || mostLogged || names[0] || ''
  const history = useMemo(() => exerciseHistory(data, selected), [data, selected])

  const weeks = recentWeeks(8)
  const kcalPerWeek = weeks.map(w => {
    const days = weekDays(w)
    return sum(data.workoutLogs.filter(l => days.includes(l.date)).map(l => l.kcal))
  })
  const sessionsPerWeek = weeks.map(w => {
    const days = weekDays(w)
    return data.workoutLogs.filter(l => days.includes(l.date)).length
  })

  const thisWeek = weekDays(weekStart(today()))
  const doneThisWeek = data.workoutLogs.filter(l => thisWeek.includes(l.date)).length
  const kcal30 = sum(data.workoutLogs.filter(l => l.date >= recentWeeks(5)[0]).map(l => l.kcal))
  const totalVolume = sum(data.workoutLogs.flatMap(l =>
    l.entries.map(e => e.weight * e.sets * (parseInt(e.reps, 10) || 0))))

  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>🏋️ Workout</h1>
          <p className="main__sub">Il tuo split, le kcal bruciate e come si muovono i carichi esercizio per esercizio.</p>
        </div>
        <div className="row row--tight">
          <button className="btn" onClick={() => setEditingSplit(newSplitDay())}>+ Giorno di split</button>
          <button className="btn btn--accent" style={{ ['--accent' as string]: ACCENT }}
            onClick={() => setLogging(blankLog(data.splitDays[0]))}>+ Registra allenamento</button>
        </div>
      </header>

      <div className="grid grid--4" style={{ marginBottom: 14 }}>
        <Card accent={ACCENT}>
          <Stat label="Questa settimana" value={doneThisWeek} unit={`/ ${data.settings.workoutsPerWeekTarget}`}
            hint={formatWeekRange(weekStart(today()))} />
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Kcal bruciate (5 sett.)" value={nf.format(kcal30)}
            hint={`${data.workoutLogs.length} sessioni in archivio`} />
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Volume totale" value={nf.format(Math.round(totalVolume / 1000))} unit="t"
            hint="kg × serie × ripetizioni" />
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Streak allenamenti" value={streak(data, 'workout')} unit="gg"
            hint="giorni consecutivi con una sessione" />
        </Card>
      </div>

      <div className="grid grid--2" style={{ marginBottom: 14 }}>
        <Card title="Kcal bruciate per settimana" note="ultime 8 settimane">
          <BarChart
            height={230}
            labels={weeks.map(w => formatShort(w))}
            format={n => `${nf.format(Math.round(n))} kcal`}
            yFormat={compact}
            series={[{ key: 'kcal', label: 'Kcal', color: ACCENT, values: kcalPerWeek }]}
            highlightIndex={weeks.length - 1}
            emptyHint="Registra il primo allenamento"
          />
          <div className="small muted" style={{ marginTop: 6 }}>
            Sessioni: {sessionsPerWeek.join(' · ')}
          </div>
        </Card>

        <Card title="Transizione dei carichi"
          action={
            <select className="select input--sm" style={{ width: 190 }} value={selected}
              onChange={e => setExercise(e.target.value)}>
              {names.length === 0 && <option>—</option>}
              {names.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          }>
          <LineChart
            height={230}
            labels={history.map(h => formatShort(h.date))}
            format={n => `${nf1.format(n)} kg`}
            yFormat={n => nf1.format(n)}
            series={[{ key: 'w', label: selected || 'Carico', color: ACCENT, values: history.map(h => h.weight), area: true }]}
            emptyHint="Nessuna serie registrata per questo esercizio"
          />
          {history.length > 1 && (
            <div className="small muted" style={{ marginTop: 6 }}>
              Da {nf1.format(history[0].weight)} kg a {nf1.format(history[history.length - 1].weight)} kg
              {' '}({history[history.length - 1].weight >= history[0].weight ? '+' : ''}
              {nf1.format(history[history.length - 1].weight - history[0].weight)} kg)
            </div>
          )}
        </Card>
      </div>

      <Card title="Il tuo split" note={`${data.splitDays.length} giorni`}>
        {data.splitDays.length === 0 ? (
          <Empty icon="🗂️" text="Nessun giorno di split. Crea Push / Pull / Gambe e assegnali alla settimana."
            action={<button className="btn btn--sm" onClick={() => setEditingSplit(newSplitDay())}>+ Crea il primo</button>} />
        ) : (
          <div className="grid grid--auto">
            {data.splitDays.map(s => (
              <div key={s.id} className="card" style={{ background: 'var(--surface-2)' }}>
                <div className="row">
                  <b>{s.name}</b>
                  <div className="spacer" />
                  <span className="badge num">{nf.format(s.kcal)} kcal</span>
                </div>
                <div className="small muted" style={{ margin: '4px 0 10px' }}>
                  {s.focus || '—'} · {s.exercises.length} esercizi · {s.durationMin}′
                </div>
                <table className="table" style={{ fontSize: 12.5 }}>
                  <tbody>
                    {s.exercises.slice(0, 5).map(e => (
                      <tr key={e.id}>
                        <td style={{ padding: '4px 0' }}>{e.name}</td>
                        <td className="right muted nowrap" style={{ padding: '4px 0' }}>{e.sets}×{e.reps}</td>
                        <td className="right nowrap" style={{ padding: '4px 0 4px 10px', width: 78 }}><b>{nf1.format(e.weight)} kg</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {s.exercises.length > 5 && <div className="small muted">+{s.exercises.length - 5} altri</div>}
                <div className="row row--tight" style={{ marginTop: 10 }}>
                  <button className="btn btn--sm" onClick={() => setEditingSplit(s)}>Modifica</button>
                  <button className="btn btn--sm btn--accent" style={{ ['--accent' as string]: ACCENT }}
                    onClick={() => setLogging(blankLog(s))}>Registra</button>
                  <div className="spacer" />
                  <button className="btn btn--sm btn--ghost btn--danger" onClick={() => {
                    if (confirm(`Eliminare "${s.name}"?`)) removeSplitDay(s.id)
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ height: 14 }} />

      <Card title="Storico sessioni" flush>
        {data.workoutLogs.length === 0
          ? <div style={{ padding: 16 }}><Empty icon="📓" text="Ancora nessuna sessione registrata" /></div>
          : (
            <div style={{ maxHeight: 380, overflow: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th><th>Sessione</th><th className="right">Durata</th>
                    <th className="right">Kcal</th><th className="right">Volume</th><th />
                  </tr>
                </thead>
                <tbody>
                  {[...data.workoutLogs].reverse().map(l => (
                    <tr key={l.id}>
                      <td className="muted">{formatShort(l.date)}</td>
                      <td><b>{l.name}</b>{l.note && <span className="small muted"> · {l.note}</span>}</td>
                      <td className="right">{l.durationMin}′</td>
                      <td className="right">{nf.format(l.kcal)}</td>
                      <td className="right">
                        {nf.format(Math.round(sum(l.entries.map(e => e.weight * e.sets * (parseInt(e.reps, 10) || 0)))))} kg
                      </td>
                      <td className="right nowrap" style={{ width: 84 }}>
                        <button className="btn btn--ghost btn--sm" onClick={() => setLogging(l)}>✎</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => removeWorkoutLog(l.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {editingSplit && <SplitEditor day={editingSplit} onClose={() => setEditingSplit(null)} />}
      {logging && <LogEditor log={logging} onClose={() => setLogging(null)} />}
    </>
  )
}

function newSplitDay(): SplitDay {
  return { id: uid('sd'), name: 'Nuovo giorno', focus: '', kcal: 400, durationMin: 60, exercises: [] }
}

function blankLog(split?: SplitDay): WorkoutLog {
  return {
    id: uid('wl'),
    date: today(),
    splitDayId: split?.id,
    name: split?.name ?? 'Allenamento',
    kcal: split?.kcal ?? 400,
    durationMin: split?.durationMin ?? 60,
    entries: (split?.exercises ?? []).map(e => ({
      exerciseId: e.id, name: e.name, weight: e.weight, reps: e.reps, sets: e.sets,
    })),
  }
}

/* ------------------------------ Editor split ---------------------------- */

function SplitEditor({ day, onClose }: { day: SplitDay; onClose: () => void }) {
  const save = useStore(s => s.saveSplitDay)
  const [draft, setDraft] = useState<SplitDay>(day)

  const patchEx = (id: string, patch: Partial<ExerciseDef>) =>
    setDraft(d => ({ ...d, exercises: d.exercises.map(e => e.id === id ? { ...e, ...patch } : e) }))

  return (
    <Modal open wide title="Giorno di split" onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn--primary" onClick={() => { save(draft); onClose() }}>Salva</button>
        </>
      }>
      <div className="row">
        <Field label="Nome" style={{ flex: '1 1 160px' }}>
          <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Focus" style={{ flex: '1 1 160px' }}>
          <input className="input" placeholder="Petto / Tricipiti" value={draft.focus ?? ''}
            onChange={e => setDraft({ ...draft, focus: e.target.value })} />
        </Field>
        <Field label="Kcal stimate" style={{ width: 120 }}>
          <input className="input input--num" type="number" min={0} step={25} value={draft.kcal}
            onChange={e => setDraft({ ...draft, kcal: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Durata (min)" style={{ width: 120 }}>
          <input className="input input--num" type="number" min={0} step={5} value={draft.durationMin}
            onChange={e => setDraft({ ...draft, durationMin: Number(e.target.value) || 0 })} />
        </Field>
      </div>

      <div>
        <span className="field__label">Esercizi</span>
        <table className="table" style={{ marginTop: 6 }}>
          <thead>
            <tr><th>Esercizio</th><th style={{ width: 70 }}>Serie</th><th style={{ width: 90 }}>Ripetizioni</th><th style={{ width: 96 }}>Kg</th><th style={{ width: 36 }} /></tr>
          </thead>
          <tbody>
            {draft.exercises.map(e => (
              <tr key={e.id}>
                <td><input className="input input--sm" value={e.name} placeholder="Panca piana"
                  onChange={ev => patchEx(e.id, { name: ev.target.value })} /></td>
                <td><input className="input input--sm input--num" type="number" min={1} value={e.sets}
                  onChange={ev => patchEx(e.id, { sets: Number(ev.target.value) || 1 })} /></td>
                <td><input className="input input--sm" value={e.reps} placeholder="8-10"
                  onChange={ev => patchEx(e.id, { reps: ev.target.value })} /></td>
                <td><input className="input input--sm input--num" type="number" min={0} step={1.25} value={e.weight}
                  onChange={ev => patchEx(e.id, { weight: Number(ev.target.value) || 0 })} /></td>
                <td>
                  <button className="btn btn--sm btn--ghost" aria-label="Rimuovi"
                    onClick={() => setDraft(d => ({ ...d, exercises: d.exercises.filter(x => x.id !== e.id) }))}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn--sm" style={{ marginTop: 8 }}
          onClick={() => setDraft(d => ({
            ...d, exercises: [...d.exercises, { id: uid('ex'), name: '', sets: 3, reps: '8-10', weight: 0 }],
          }))}>+ Esercizio</button>
      </div>
    </Modal>
  )
}

/* --------------------------- Registra allenamento ----------------------- */

function LogEditor({ log, onClose }: { log: WorkoutLog; onClose: () => void }) {
  const save = useStore(s => s.saveWorkoutLog)
  const setExerciseWeight = useStore(s => s.setExerciseWeight)
  const splitDays = useStore(s => s.data.splitDays)
  const [draft, setDraft] = useState<WorkoutLog>(log)
  // I carichi registrati diventano i nuovi carichi di riferimento dello split.
  const [syncSplit, setSyncSplit] = useState(true)

  const patchEntry = (i: number, patch: Partial<ExerciseLog>) =>
    setDraft(d => ({ ...d, entries: d.entries.map((e, j) => j === i ? { ...e, ...patch } : e) }))

  function commit() {
    save(draft)
    if (syncSplit && draft.splitDayId) {
      for (const e of draft.entries) {
        if (e.exerciseId) setExerciseWeight(draft.splitDayId, e.exerciseId, e.weight)
      }
    }
    onClose()
  }

  function loadSplit(id: string) {
    const s = splitDays.find(x => x.id === id)
    if (!s) { setDraft(d => ({ ...d, splitDayId: undefined })); return }
    setDraft(d => ({
      ...d, splitDayId: s.id, name: s.name, kcal: s.kcal, durationMin: s.durationMin,
      entries: s.exercises.map(e => ({ exerciseId: e.id, name: e.name, weight: e.weight, reps: e.reps, sets: e.sets })),
    }))
  }

  return (
    <Modal open wide title="Registra allenamento" onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn--primary" onClick={commit}>Salva sessione</button>
        </>
      }>
      <div className="row">
        <Field label="Data" style={{ width: 150 }}>
          <input className="input" type="date" value={draft.date}
            onChange={e => setDraft({ ...draft, date: e.target.value as ISODate })} />
        </Field>
        <Field label="Da split" style={{ flex: '1 1 170px' }}>
          <select className="select" value={draft.splitDayId ?? ''} onChange={e => loadSplit(e.target.value)}>
            <option value="">— libero —</option>
            {splitDays.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Kcal bruciate" style={{ width: 120 }}>
          <input className="input input--num" type="number" min={0} step={25} value={draft.kcal}
            onChange={e => setDraft({ ...draft, kcal: Number(e.target.value) || 0 })} />
        </Field>
        <Field label="Durata (min)" style={{ width: 120 }}>
          <input className="input input--num" type="number" min={0} step={5} value={draft.durationMin}
            onChange={e => setDraft({ ...draft, durationMin: Number(e.target.value) || 0 })} />
        </Field>
      </div>

      <table className="table">
        <thead>
          <tr><th>Esercizio</th><th style={{ width: 70 }}>Serie</th><th style={{ width: 90 }}>Rip.</th><th style={{ width: 96 }}>Kg</th><th style={{ width: 36 }} /></tr>
        </thead>
        <tbody>
          {draft.entries.map((e, i) => (
            <tr key={i}>
              <td><input className="input input--sm" value={e.name}
                onChange={ev => patchEntry(i, { name: ev.target.value })} /></td>
              <td><input className="input input--sm input--num" type="number" min={1} value={e.sets}
                onChange={ev => patchEntry(i, { sets: Number(ev.target.value) || 1 })} /></td>
              <td><input className="input input--sm" value={e.reps}
                onChange={ev => patchEntry(i, { reps: ev.target.value })} /></td>
              <td><input className="input input--sm input--num" type="number" min={0} step={1.25} value={e.weight}
                onChange={ev => patchEntry(i, { weight: Number(ev.target.value) || 0 })} /></td>
              <td><button className="btn btn--sm btn--ghost" aria-label="Rimuovi"
                onClick={() => setDraft(d => ({ ...d, entries: d.entries.filter((_, j) => j !== i) }))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="row">
        <button className="btn btn--sm" onClick={() => setDraft(d => ({
          ...d, entries: [...d.entries, { exerciseId: '', name: '', weight: 0, reps: '8-10', sets: 3 }],
        }))}>+ Esercizio</button>
        <div className="spacer" />
        <label className="check small">
          <input type="checkbox" checked={syncSplit} onChange={e => setSyncSplit(e.target.checked)} />
          Aggiorna i carichi dello split
        </label>
      </div>

      <Field label="Nota">
        <input className="input" value={draft.note ?? ''} onChange={e => setDraft({ ...draft, note: e.target.value })}
          placeholder="Sensazioni, PR, dolori…" />
      </Field>
    </Modal>
  )
}
