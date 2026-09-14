import { useMemo, useState } from 'react'
import {
  DAY_NAMES, addDays, dayNum, formatDay, formatMinutes, formatWeekRange,
  isoWeekNumber, minutesBetweenTimes, today, weekDays, weekStart, weekday, type ISODate,
} from '../lib/date'
import { sum } from '../lib/format'
import { useStore } from '../store/store'
import { ADHERENCE, SECTIONS, type Adherence, type DayPlan, type StudyBlock } from '../store/types'
import { dietPlanById, planKcal, weekProgress } from '../store/selectors'
import { uid } from '../lib/id'
import { Card, Empty, Field } from '../components/ui/ui'
import { Modal } from '../components/ui/Modal'
import { RadialGauge } from '../components/charts/RadialGauge'

const color = (id: string) => SECTIONS.find(s => s.id === id)!.color

export function Week() {
  const data = useStore(s => s.data)
  const copyWeek = useStore(s => s.copyWeek)
  const clearWeek = useStore(s => s.clearWeek)
  const markWeekPlanned = useStore(s => s.markWeekPlanned)
  const setWeekNote = useStore(s => s.setWeekNote)

  const [monday, setMonday] = useState<ISODate>(() => weekStart(today()))
  const [editing, setEditing] = useState<ISODate | null>(null)

  const days = weekDays(monday)
  const plan = data.weekPlans[monday]
  const progress = weekProgress(data, monday)
  const isCurrent = monday === weekStart(today())

  // La domenica sera si pianifica la settimana che arriva: lo ricordiamo qui.
  const nextMonday = addDays(weekStart(today()), 7)
  const nextEmpty = !data.weekPlans[nextMonday]
    || weekDays(nextMonday).every(d => {
      const p = data.weekPlans[nextMonday]?.days[d]
      return !p?.dietPlanId && !p?.workoutDayId && !p?.studyBlocks.length && !p?.studyTargetMin
    })
  const showSundayNudge = weekday(today()) === 7 && nextEmpty && monday !== nextMonday

  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>Settimana {isoWeekNumber(monday)}</h1>
          <div className="main__sub">
            {formatWeekRange(monday)}
            {isCurrent && <span className="badge" style={{ marginLeft: 8 }}>in corso</span>}
            {plan?.plannedAt && <span className="badge badge--good" style={{ marginLeft: 8 }}><span className="badge__dot" />pianificata</span>}
          </div>
        </div>
        <div className="row row--tight">
          <button className="btn btn--sm" onClick={() => setMonday(addDays(monday, -7))} aria-label="Settimana precedente">←</button>
          <button className="btn btn--sm" onClick={() => setMonday(weekStart(today()))}>Oggi</button>
          <button className="btn btn--sm" onClick={() => setMonday(addDays(monday, 7))} aria-label="Settimana successiva">→</button>
          <button className="btn btn--sm" onClick={() => copyWeek(addDays(monday, -7), monday)}>Copia precedente</button>
          <button className="btn btn--sm btn--primary" onClick={() => markWeekPlanned(monday)}>Piano pronto</button>
        </div>
      </header>

      {showSundayNudge && (
        <Card className="section-accent" accent="var(--s-routine)">
          <div className="row">
            <span style={{ fontSize: 20 }}>🌙</span>
            <div className="grow">
              <b>È domenica sera.</b>{' '}
              <span className="dim">La settimana che parte domani è ancora vuota: riempila adesso e poi limitati a rispettarla.</span>
            </div>
            <button className="btn btn--primary btn--sm" onClick={() => setMonday(nextMonday)}>Pianifica la prossima →</button>
          </div>
        </Card>
      )}

      <div className="grid grid--aside" style={{ margin: '14px 0' }}>
        <Card title="Avanzamento settimana">
          <div className="row" style={{ justifyContent: 'space-around', gap: 6 }}>
            {progress.map(p => (
              <RadialGauge
                key={p.id}
                value={p.progress}
                size={74}
                thickness={7}
                color={color(p.id)}
                label={SECTIONS.find(s => s.id === p.id)!.label}
              />
            ))}
          </div>
        </Card>

        <Card title="Note della settimana" note="l'intenzione che ti sei dato la domenica">
          <textarea
            className="textarea"
            placeholder="Es. settimana di scarico, tre sessioni di gambe, chiudere il capitolo 4 di Analisi…"
            value={plan?.note ?? ''}
            onChange={e => setWeekNote(monday, e.target.value)}
          />
          <div className="row row--end" style={{ marginTop: 10 }}>
            <button className="btn btn--sm btn--danger" onClick={() => {
              if (confirm('Svuotare tutta la pianificazione di questa settimana?')) clearWeek(monday)
            }}>Svuota settimana</button>
          </div>
        </Card>
      </div>

      <div className="week">
        {days.map((date, i) => (
          <DayCard key={date} date={date} name={DAY_NAMES[i]} onEdit={() => setEditing(date)} />
        ))}
      </div>

      {editing && <DayEditor date={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

/* ------------------------------- Giorno -------------------------------- */

function DayCard({ date, name, onEdit }: { date: ISODate; name: string; onEdit: () => void }) {
  const data = useStore(s => s.data)
  const toggleTask = useStore(s => s.toggleTask)
  const plan: DayPlan = data.weekPlans[weekStart(date)]?.days[date] ?? { studyBlocks: [] }

  const dietPlan = dietPlanById(data, plan.dietPlanId)
  const split = data.splitDays.find(s => s.id === plan.workoutDayId)
  const isRest = plan.workoutDayId === 'riposo'
  const lectures = data.lectures
    .filter(l => l.weekday === weekday(date))
    .sort((a, b) => a.start.localeCompare(b.start))
  const workoutDone = data.workoutLogs.some(l => l.date === date)
  const studied = sum(data.studyLogs.filter(l => l.date === date).map(l => l.minutes))
  const target = plan.studyTargetMin ?? sum(plan.studyBlocks.map(b => minutesBetweenTimes(b.start, b.end)))
  const tasks = data.tasks.filter(t => t.date === date)
  const adherence = data.dietLogs[date]?.adherence

  const isToday = date === today()

  return (
    <article className={`day${isToday ? ' day--today' : ''}${date < today() ? ' day--past' : ''}`}>
      <div className="day__head">
        <span className="day__name">{name}</span>
        {isToday && <span className="badge" style={{ padding: '0 6px', fontSize: 10 }}>oggi</span>}
        <span className="day__num">{dayNum(date)}</span>
      </div>

      {lectures.length > 0 && (
        <div className="day__slot">
          {lectures.map(l => (
            <div key={l.id} className="slot" style={{ ['--accent' as string]: 'var(--s-studio)', cursor: 'default' }}>
              <span className="slot__name">{data.courses.find(c => c.id === l.courseId)?.name ?? 'Lezione'}</span>
              <span className="slot__meta">{l.start}</span>
            </div>
          ))}
        </div>
      )}

      <div className="day__slot">
        <button className={`slot${dietPlan ? '' : ' slot--empty'}`} title={dietPlan?.name}
          style={{ ['--accent' as string]: 'var(--s-dieta)' }} onClick={onEdit}>
          <span>🍽️</span>
          <span className="slot__body">
            <span className="slot__name">{dietPlan?.name ?? 'Nessun piano'}</span>
            {dietPlan && <span className="slot__sub num">{planKcal(dietPlan)} kcal</span>}
          </span>
        </button>
        {adherence && (
          <span className={`badge badge--${ADHERENCE[adherence].tone}`} style={{ alignSelf: 'flex-start' }}>
            <span className="badge__dot" />{ADHERENCE[adherence].label}
          </span>
        )}
      </div>

      <div className="day__slot">
        <button className={`slot${split || isRest ? '' : ' slot--empty'}`} title={split?.focus}
          style={{ ['--accent' as string]: isRest ? 'var(--line)' : 'var(--s-workout)' }} onClick={onEdit}>
          <span>{isRest ? '😴' : '🏋️'}</span>
          <span className="slot__body">
            <span className="slot__name">{isRest ? 'Riposo' : split?.name ?? 'Nessun workout'}</span>
            {split && <span className="slot__sub num">{split.kcal} kcal · {split.durationMin}′</span>}
          </span>
          {split && workoutDone && <span className="slot__check">✅</span>}
        </button>
      </div>

      <div className="day__slot">
        <button className={`slot${target ? '' : ' slot--empty'}`}
          style={{ ['--accent' as string]: 'var(--s-studio)' }} onClick={onEdit}>
          <span>📚</span>
          <span className="slot__body">
            <span className="slot__name">{target ? `Studio ${formatMinutes(target)}` : 'Nessun obiettivo'}</span>
            {/* la percentuale ha senso solo su un giorno già vissuto */}
            {target > 0 && date <= today() && (
              <span className="slot__sub num">{formatMinutes(studied)} fatti · {Math.round((studied / target) * 100)}%</span>
            )}
          </span>
        </button>
      </div>

      {tasks.length > 0 && (
        <div className="day__slot">
          {tasks.map(t => (
            <button key={t.id} className="slot" style={{ ['--accent' as string]: 'var(--s-routine)' }}
              onClick={() => toggleTask(t.id)}>
              <span>{t.done ? '☑' : '☐'}</span>
              <span className={`slot__name${t.done ? ' strike' : ''}`}>{t.title}</span>
            </button>
          ))}
        </div>
      )}

      <button className="btn btn--ghost btn--sm" style={{ marginTop: 'auto' }} onClick={onEdit}>
        ✎ Pianifica
      </button>
    </article>
  )
}

/* ---------------------------- Editor del giorno ------------------------- */

function DayEditor({ date, onClose }: { date: ISODate; onClose: () => void }) {
  const data = useStore(s => s.data)
  const setDayPlan = useStore(s => s.setDayPlan)
  const setDietLog = useStore(s => s.setDietLog)
  const saveTask = useStore(s => s.saveTask)
  const toggleTask = useStore(s => s.toggleTask)
  const removeTask = useStore(s => s.removeTask)

  const plan: DayPlan = data.weekPlans[weekStart(date)]?.days[date] ?? { studyBlocks: [] }
  const [newTask, setNewTask] = useState('')
  const tasks = data.tasks.filter(t => t.date === date)
  const adherence = data.dietLogs[date]?.adherence
  const dietPlan = dietPlanById(data, plan.dietPlanId)

  const blocksMinutes = useMemo(
    () => sum(plan.studyBlocks.map(b => minutesBetweenTimes(b.start, b.end))),
    [plan.studyBlocks],
  )

  function addBlock() {
    const b: StudyBlock = { id: uid('sb'), label: 'Studio', start: '18:00', end: '20:00' }
    setDayPlan(date, { studyBlocks: [...plan.studyBlocks, b] })
  }

  function patchBlock(id: string, patch: Partial<StudyBlock>) {
    setDayPlan(date, { studyBlocks: plan.studyBlocks.map(b => b.id === id ? { ...b, ...patch } : b) })
  }

  return (
    <Modal open title={formatDay(date)} onClose={onClose} wide
      footer={<button className="btn btn--primary" onClick={onClose}>Fatto</button>}>

      <Field label="🍽️ Piano alimentare">
        <select className="select" value={plan.dietPlanId ?? ''}
          onChange={e => setDayPlan(date, { dietPlanId: e.target.value || undefined })}>
          <option value="">— nessun piano —</option>
          {data.dietPlans.map(p => (
            <option key={p.id} value={p.id}>{p.name} · {planKcal(p)} kcal</option>
          ))}
        </select>
      </Field>
      {data.dietPlans.length === 0 && (
        <p className="small muted">Crea prima un piano nella sezione Dieta.</p>
      )}
      {dietPlan && (
        <div>
          <span className="field__label">Com'è andata</span>
          <div className="chipbar" style={{ marginTop: 5 }}>
            {(Object.keys(ADHERENCE) as Adherence[]).map(a => (
              <button key={a} className="chip" aria-pressed={adherence === a}
                onClick={() => setDietLog(date, { adherence: adherence === a ? undefined : a })}>
                {ADHERENCE[a].icon} {ADHERENCE[a].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: 0 }} />

      <Field label="🏋️ Allenamento">
        <select className="select" value={plan.workoutDayId ?? ''}
          onChange={e => setDayPlan(date, { workoutDayId: e.target.value || undefined })}>
          <option value="">— non pianificato —</option>
          <option value="riposo">😴 Riposo</option>
          {data.splitDays.map(s => (
            <option key={s.id} value={s.id}>{s.name}{s.focus ? ` · ${s.focus}` : ''}</option>
          ))}
        </select>
      </Field>
      {data.splitDays.length === 0 && (
        <p className="small muted">Definisci il tuo split nella sezione Workout.</p>
      )}

      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: 0 }} />

      <div className="row" style={{ alignItems: 'flex-end' }}>
        <Field label="📚 Obiettivo di studio (minuti)" style={{ width: 200 }}>
          <input className="input input--num" type="number" min={0} step={15}
            value={plan.studyTargetMin ?? ''} placeholder={String(blocksMinutes || 0)}
            onChange={e => setDayPlan(date, { studyTargetMin: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
        <div className="spacer" />
        <button className="btn btn--sm" onClick={addBlock}>+ Blocco di studio</button>
      </div>

      {plan.studyBlocks.map(b => (
        <div className="row row--tight" key={b.id}>
          <input className="input input--sm" style={{ flex: '1 1 140px' }} value={b.label}
            onChange={e => patchBlock(b.id, { label: e.target.value })} />
          <select className="select input--sm" style={{ width: 130 }} value={b.courseId ?? ''}
            onChange={e => patchBlock(b.id, { courseId: e.target.value || undefined })}>
            <option value="">Corso…</option>
            {data.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input input--sm" type="time" style={{ width: 108 }} value={b.start}
            onChange={e => patchBlock(b.id, { start: e.target.value })} />
          <input className="input input--sm" type="time" style={{ width: 108 }} value={b.end}
            onChange={e => patchBlock(b.id, { end: e.target.value })} />
          <button className="btn btn--sm btn--ghost" aria-label="Rimuovi blocco"
            onClick={() => setDayPlan(date, { studyBlocks: plan.studyBlocks.filter(x => x.id !== b.id) })}>✕</button>
        </div>
      ))}

      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: 0 }} />

      <div>
        <span className="field__label">✅ Routine del giorno</span>
        <div className="list" style={{ marginTop: 6 }}>
          {tasks.length === 0 && <Empty icon="📋" text="Niente in programma" />}
          {tasks.map(t => (
            <div className="list__row" key={t.id}>
              <label className="check">
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                <span className={t.done ? 'strike' : ''}>{t.title}</span>
              </label>
              <div className="spacer" />
              <button className="btn btn--ghost btn--sm" onClick={() => removeTask(t.id)}>✕</button>
            </div>
          ))}
        </div>
        <form className="row row--tight" style={{ marginTop: 8 }} onSubmit={e => {
          e.preventDefault()
          if (!newTask.trim()) return
          saveTask({
            id: uid('t'), title: newTask.trim(), date, done: false,
            priority: 'media', repeat: 'mai', createdAt: new Date().toISOString(),
          })
          setNewTask('')
        }}>
          <input className="input input--sm" placeholder="Aggiungi una cosa da fare…"
            value={newTask} onChange={e => setNewTask(e.target.value)} />
          <button className="btn btn--sm" type="submit">Aggiungi</button>
        </form>
      </div>
    </Modal>
  )
}
