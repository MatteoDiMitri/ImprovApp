import { useState } from 'react'
import {
  DAY_NAMES, addDays, dayNum, formatDay, formatMinutes, formatWeekRange,
  isoWeekNumber, minutesBetweenTimes, today, weekDays, weekStart, weekday, type ISODate,
} from '../lib/date'
import { nf, sum } from '../lib/format'
import { uid } from '../lib/id'
import type { Route } from '../lib/router'
import { useStore } from '../store/store'
import { ADHERENCE, SECTIONS, type Adherence, type DayPlan, type StudyBlock } from '../store/types'
import {
  dayKcal, dietForDate, levelInfo, streak, studyMinutes, totalXp, weekProgress, xpForDay,
} from '../store/selectors'
import { Bar, Card, Empty, Field } from '../components/ui/ui'
import { Modal } from '../components/ui/Modal'


export function Week({ go }: { go: (r: Route) => void }) {
  const data = useStore(s => s.data)
  const copyWeek = useStore(s => s.copyWeek)
  const clearWeek = useStore(s => s.clearWeek)
  const markWeekPlanned = useStore(s => s.markWeekPlanned)
  const setWeekNote = useStore(s => s.setWeekNote)

  const [monday, setMonday] = useState<ISODate>(() => weekStart(today()))
  const [editing, setEditing] = useState<ISODate | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)

  const days = weekDays(monday)
  const plan = data.weekPlans[monday]
  const progress = weekProgress(data, monday)
  const isCurrent = monday === weekStart(today())

  const xp = totalXp(data)
  const lvl = levelInfo(xp.total)

  // La domenica sera si pianifica la settimana che arriva: lo ricordiamo qui.
  const nextMonday = addDays(weekStart(today()), 7)
  const nextEmpty = weekDays(nextMonday).every(d => {
    const p = data.weekPlans[nextMonday]?.days[d]
    return !p?.workoutDayId && !p?.studyBlocks.length && !p?.studyTargetMin
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
          <button className="btn btn--sm" onClick={() => setNoteOpen(true)}>
            📝 Note{plan?.note ? ' •' : ''}
          </button>
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

      {/* --------------------------- striscia HUD --------------------------- */}
      <div className="hud hud--slim">
        <div className="hud__level">
          <div><b className="num">{lvl.level}</b><span>LIVELLO</span></div>
        </div>
        <div className="hud__main">
          <div className="row row--tight" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="label">Esperienza</span>
            <span className="small muted num">{nf.format(lvl.intoLevel)} / {nf.format(lvl.levelSpan)} XP</span>
          </div>
          <div className="xpbar"><div className="xpbar__fill" style={{ width: `${lvl.progress * 100}%` }} /></div>
        </div>
        <div className="hud__sections">
          {progress.map(p => {
            const s = SECTIONS.find(x => x.id === p.id)!
            return (
              <button key={p.id} className="hudsection" onClick={() => go(p.id as Route)}
                style={{ ['--accent' as string]: s.color }} title={p.detail}>
                <span className="hudsection__top">
                  <span>{s.icon}</span>
                  <b className="num">{Math.round(p.progress * 100)}%</b>
                </span>
                <Bar value={p.progress} color={s.color} />
                <span className="hudsection__label">{s.label}</span>
              </button>
            )
          })}
        </div>
        <div className="hud__streak">
          <span className="streak">🔥 {streak(data)}</span>
          <span className="label">streak</span>
        </div>
      </div>

      {/* ---------------------------- i sette giorni ------------------------ */}
      <div className="week week--main">
        {days.map((date, i) => (
          <DayCard key={date} date={date} name={DAY_NAMES[i]} onEdit={() => setEditing(date)} />
        ))}
      </div>

      {editing && <DayEditor date={editing} onClose={() => setEditing(null)} />}

      <Modal open={noteOpen} title={`Note della settimana ${isoWeekNumber(monday)}`} onClose={() => setNoteOpen(false)}
        footer={
          <>
            <button className="btn btn--ghost btn--danger" onClick={() => {
              if (confirm('Svuotare tutta la pianificazione di questa settimana?')) { clearWeek(monday); setNoteOpen(false) }
            }}>Svuota settimana</button>
            <div className="spacer" />
            <button className="btn btn--primary" onClick={() => setNoteOpen(false)}>Fatto</button>
          </>
        }>
        <Field label="L'intenzione che ti sei dato">
          <textarea className="textarea" autoFocus
            placeholder="Es. settimana di scarico, tre sessioni di gambe, chiudere il capitolo 4 di Analisi…"
            value={plan?.note ?? ''} onChange={e => setWeekNote(monday, e.target.value)} />
        </Field>
      </Modal>
    </>
  )
}

/* ------------------------------- Giorno -------------------------------- */

function DayCard({ date, name, onEdit }: { date: ISODate; name: string; onEdit: () => void }) {
  const data = useStore(s => s.data)
  const toggleTask = useStore(s => s.toggleTask)
  const plan: DayPlan = data.weekPlans[weekStart(date)]?.days[date] ?? { studyBlocks: [] }

  const diet = dietForDate(data, date)
  const split = data.splitDays.find(s => s.id === plan.workoutDayId)
  const isRest = plan.workoutDayId === 'riposo'
  const lectures = data.lectures
    .filter(l => l.weekday === weekday(date))
    .sort((a, b) => a.start.localeCompare(b.start))
  const workoutDone = data.workoutLogs.some(l => l.date === date)
  const studied = studyMinutes(data, [date])
  const target = plan.studyTargetMin ?? sum(plan.studyBlocks.map(b => minutesBetweenTimes(b.start, b.end)))
  const tasks = data.tasks.filter(t => t.date === date)
  const adherence = data.dietLogs[date]?.adherence

  const isToday = date === today()
  const xp = xpForDay(data, date)
  const dayXp = xp.dieta + xp.workout + xp.studio + xp.routine

  return (
    <article className={`day${isToday ? ' day--today' : ''}${date < today() ? ' day--past' : ''}`}>
      <div className="day__head">
        <span className="day__name">{name}</span>
        {isToday && <span className="badge" style={{ padding: '0 6px', fontSize: 10 }}>oggi</span>}
        <span className="day__num">{dayNum(date)}</span>
      </div>

      <div className="day__body">
        {lectures.length > 0 && (
          <div className="day__slot">
            {lectures.map(l => (
              <div key={l.id} className="slot" style={{ ['--accent' as string]: 'var(--s-studio)', cursor: 'default' }}>
                <span className="slot__body">
                  <span className="slot__name">{data.courses.find(c => c.id === l.courseId)?.name ?? 'Lezione'}</span>
                  <span className="slot__sub">🎓 {l.start}–{l.end}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* la dieta arriva dalla dieta settimanale: qui non si assegna niente */}
        <div className="day__slot">
          <button className={`slot${diet ? '' : ' slot--empty'}`}
            style={{ ['--accent' as string]: 'var(--s-dieta)' }} onClick={onEdit}
            title={diet?.meals.map(m => m.name).join(' · ')}>
            <span>🍽️</span>
            <span className="slot__body">
              <span className="slot__name">{diet ? `${diet.meals.length} pasti` : 'Dieta non compilata'}</span>
              {diet && <span className="slot__sub num">{nf.format(dayKcal(diet))} kcal</span>}
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
      </div>

      <div className="day__foot">
        {dayXp > 0 && <span className="small muted num nowrap">+{dayXp} XP</span>}
        <div className="spacer" />
        <button className="btn btn--ghost btn--sm nowrap" onClick={onEdit}>Pianifica</button>
      </div>
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
  const diet = dietForDate(data, date)

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

      {/* --- dieta: in sola lettura, arriva dalla dieta settimanale --- */}
      <div>
        <span className="field__label">🍽️ Dieta del giorno</span>
        {diet ? (
          <div className="card" style={{ background: 'var(--surface-2)', padding: 12, marginTop: 6 }}>
            <div className="row row--tight" style={{ marginBottom: 8 }}>
              <span className="small dim">Dalla tua dieta settimanale</span>
              <div className="spacer" />
              <span className="badge num">{nf.format(dayKcal(diet))} kcal</span>
            </div>
            <table className="table" style={{ fontSize: 12.5 }}>
              <tbody>
                {diet.meals.map(m => (
                  <tr key={m.id}>
                    <td style={{ padding: '4px 0' }}><b>{m.name}</b>{m.time ? <span className="muted"> · {m.time}</span> : null}</td>
                    <td className="dim" style={{ padding: '4px 0' }}>{m.items.map(i => i.name).filter(Boolean).join(', ') || '—'}</td>
                    <td className="right nowrap" style={{ padding: '4px 0' }}>{nf.format(sum(m.items.map(i => i.kcal)))} kcal</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small muted" style={{ marginTop: 6 }}>
            Questo giorno non ha ancora pasti. Compilalo nella sezione Dieta: comparirà qui in automatico.
          </p>
        )}

        <span className="field__label" style={{ display: 'block', marginTop: 12 }}>Com'è andata</span>
        <div className="chipbar" style={{ marginTop: 5 }}>
          {(Object.keys(ADHERENCE) as Adherence[]).map(a => (
            <button key={a} className="chip" aria-pressed={adherence === a}
              onClick={() => setDietLog(date, { adherence: adherence === a ? undefined : a })}>
              {ADHERENCE[a].icon} {ADHERENCE[a].label}
            </button>
          ))}
        </div>
      </div>

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
            value={plan.studyTargetMin ?? ''} placeholder="0"
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
