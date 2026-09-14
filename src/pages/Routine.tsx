import { useMemo, useState } from 'react'
import { addDays, formatShort, relativeLabel, today, weekDays, weekStart, type ISODate } from '../lib/date'
import { uid } from '../lib/id'
import { useStore } from '../store/store'
import type { Priority, Repeat, Task } from '../store/types'
import { recentDays, streak } from '../store/selectors'
import { Card, Empty, Field, Stat } from '../components/ui/ui'
import { Modal } from '../components/ui/Modal'
import { BarChart } from '../components/charts/BarChart'

const ACCENT = 'var(--s-routine)'

const PRIO: Record<Priority, { label: string; tone: string }> = {
  alta:  { label: 'Alta',  tone: 'critical' },
  media: { label: 'Media', tone: 'warning' },
  bassa: { label: 'Bassa', tone: 'good' },
}

type Filter = 'tutte' | 'oggi' | 'settimana' | 'senza-data' | 'fatte'

export function Routine() {
  const data = useStore(s => s.data)
  const saveTask = useStore(s => s.saveTask)
  const toggleTask = useStore(s => s.toggleTask)
  const removeTask = useStore(s => s.removeTask)
  const clearDoneTasks = useStore(s => s.clearDoneTasks)

  const [filter, setFilter] = useState<Filter>('tutte')
  const [editing, setEditing] = useState<Task | null>(null)
  const [quick, setQuick] = useState('')
  const [quickDate, setQuickDate] = useState<ISODate | ''>(today())

  const now = today()
  const week = weekDays(weekStart(now))
  const open = data.tasks.filter(t => !t.done)
  const doneToday = data.tasks.filter(t => t.doneAt === now).length
  const doneWeek = data.tasks.filter(t => t.doneAt && week.includes(t.doneAt)).length
  const late = open.filter(t => t.date && t.date < now).length

  const days14 = recentDays(14)
  const perDay = days14.map(d => data.tasks.filter(t => t.doneAt === d).length)

  const groups = useMemo(() => {
    const visible = data.tasks.filter(t => {
      if (filter === 'fatte') return t.done
      if (t.done) return false
      if (filter === 'oggi') return t.date === now
      if (filter === 'settimana') return t.date && week.includes(t.date)
      if (filter === 'senza-data') return !t.date
      return true
    })
    const by = (name: string, pred: (t: Task) => boolean) => ({ name, items: visible.filter(pred) })
    if (filter === 'fatte') return [by('Completate', () => true)]
    return [
      by('In ritardo', t => !!t.date && t.date < now),
      by('Oggi', t => t.date === now),
      by('Domani', t => t.date === addDays(now, 1)),
      by('Prossimi giorni', t => !!t.date && t.date > addDays(now, 1)),
      by('Senza data', t => !t.date),
    ].filter(g => g.items.length > 0)
  }, [data.tasks, filter, now, week])

  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>✅ Routine</h1>
          <p className="main__sub">Le cose secondarie che vanno fatte comunque. Buttale qui e toglile di torno.</p>
        </div>
        <button className="btn btn--accent" style={{ ['--accent' as string]: ACCENT }}
          onClick={() => setEditing(blankTask(now))}>+ Nuova task</button>
      </header>

      <div className="grid grid--4" style={{ marginBottom: 14 }}>
        <Card accent={ACCENT}><Stat label="Aperte" value={open.length} hint={late > 0 ? `${late} in ritardo` : 'tutto in orario'} /></Card>
        <Card accent={ACCENT}><Stat label="Fatte oggi" value={doneToday} /></Card>
        <Card accent={ACCENT}><Stat label="Fatte questa settimana" value={doneWeek} hint={`obiettivo ${data.settings.tasksPerWeekTarget}`} /></Card>
        <Card accent={ACCENT}><Stat label="Streak routine" value={streak(data, 'routine')} unit="gg" /></Card>
      </div>

      <div className="grid grid--left" style={{ marginBottom: 14 }}>
        <Card title="Lista">
          <form className="row row--tight" onSubmit={e => {
            e.preventDefault()
            if (!quick.trim()) return
            saveTask({
              id: uid('t'), title: quick.trim(), date: quickDate || undefined, done: false,
              priority: 'media', repeat: 'mai', createdAt: new Date().toISOString(),
            })
            setQuick('')
          }}>
            <input className="input" style={{ flex: '2 1 200px' }} placeholder="Aggiungi una cosa da fare…"
              value={quick} onChange={e => setQuick(e.target.value)} />
            <input className="input" type="date" style={{ width: 150 }} value={quickDate}
              onChange={e => setQuickDate(e.target.value)} />
            <button className="btn btn--accent" style={{ ['--accent' as string]: ACCENT }} type="submit">+</button>
          </form>

          <div className="chipbar" style={{ margin: '12px 0' }}>
            {(['tutte', 'oggi', 'settimana', 'senza-data', 'fatte'] as Filter[]).map(f => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === 'senza-data' ? 'senza data' : f}
              </button>
            ))}
            {filter === 'fatte' && (
              <>
                <div className="spacer" />
                <button className="btn btn--sm btn--ghost btn--danger" onClick={() => {
                  if (confirm('Eliminare tutte le task completate?')) clearDoneTasks()
                }}>Svuota completate</button>
              </>
            )}
          </div>

          {groups.length === 0 && <Empty icon="🎉" text="Niente da fare qui. Goditela." />}

          {groups.map(g => (
            <div key={g.name} style={{ marginBottom: 14 }}>
              <div className="label" style={{ marginBottom: 4 }}>
                {g.name} <span className="num">({g.items.length})</span>
              </div>
              <div className="list">
                {g.items.map(t => (
                  <div className="list__row" key={t.id}>
                    <label className="check" style={{ flex: 1, minWidth: 0 }}>
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                      <span className={t.done ? 'strike' : ''} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </span>
                    </label>
                    {t.repeat !== 'mai' && <span className="badge" title={`Ricorrenza ${t.repeat}`}>↻</span>}
                    <span className={`badge badge--${PRIO[t.priority].tone}`}>
                      <span className="badge__dot" />{PRIO[t.priority].label}
                    </span>
                    {t.date && (
                      <span className={`small ${!t.done && t.date < now ? '' : 'muted'}`}
                        style={!t.done && t.date < now ? { color: 'var(--critical)' } : undefined}>
                        {relativeLabel(t.date)}
                      </span>
                    )}
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(t)}>✎</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => removeTask(t.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <div className="stack">
          <Card title="Task completate" note="ultimi 14 giorni">
            <BarChart
              height={200}
              integer
              labels={days14.map(d => formatShort(d))}
              format={n => `${Math.round(n)} task`}
              series={[{ key: 'task', label: 'Completate', color: ACCENT, values: perDay }]}
              emptyHint="Nessuna task completata di recente"
            />
          </Card>

          <Card title="Come funziona" accent={ACCENT}>
            <ul className="small dim" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
              <li>Ogni task completata vale XP: <b>bassa 4</b>, <b>media 6</b>, <b>alta 10</b>.</li>
              <li>Le task con una data compaiono nel giorno corrispondente del pianificatore settimanale.</li>
              <li>Una task ricorrente, quando la spunti, si ricrea da sola al giorno successivo o alla settimana dopo.</li>
            </ul>
          </Card>
        </div>
      </div>

      {editing && <TaskEditor task={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function blankTask(date: ISODate): Task {
  return { id: uid('t'), title: '', date, done: false, priority: 'media', repeat: 'mai', createdAt: new Date().toISOString() }
}

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const save = useStore(s => s.saveTask)
  const [draft, setDraft] = useState<Task>(task)

  return (
    <Modal open title="Task" onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn--primary" disabled={!draft.title.trim()}
            onClick={() => { save(draft); onClose() }}>Salva</button>
        </>
      }>
      <Field label="Cosa">
        <input className="input" autoFocus value={draft.title} placeholder="Prenotare il dentista"
          onChange={e => setDraft({ ...draft, title: e.target.value })} />
      </Field>
      <div className="row">
        <Field label="Quando" style={{ width: 160 }}>
          <input className="input" type="date" value={draft.date ?? ''}
            onChange={e => setDraft({ ...draft, date: e.target.value || undefined })} />
        </Field>
        <Field label="Priorità" style={{ flex: '1 1 130px' }}>
          <select className="select" value={draft.priority}
            onChange={e => setDraft({ ...draft, priority: e.target.value as Priority })}>
            {(Object.keys(PRIO) as Priority[]).map(p => <option key={p} value={p}>{PRIO[p].label}</option>)}
          </select>
        </Field>
        <Field label="Ricorrenza" style={{ flex: '1 1 130px' }}>
          <select className="select" value={draft.repeat}
            onChange={e => setDraft({ ...draft, repeat: e.target.value as Repeat })}>
            <option value="mai">Mai</option>
            <option value="giornaliera">Ogni giorno</option>
            <option value="settimanale">Ogni settimana</option>
          </select>
        </Field>
      </div>
    </Modal>
  )
}
