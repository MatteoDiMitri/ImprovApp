import { useState } from 'react'
import {
  DAY_NAMES, formatMinutes, formatShort, minutesBetweenTimes, today, weekDays, weekStart,
} from '../lib/date'
import { nf, sum } from '../lib/format'
import { uid } from '../lib/id'
import { useStore } from '../store/store'
import type { Course, Lecture } from '../store/types'
import { recentDays, recentWeeks, streak, studyMinutes, studyMinutesByCourse } from '../store/selectors'
import { Bar, Card, Empty, Field, Stat } from '../components/ui/ui'
import { Modal } from '../components/ui/Modal'
import { BarChart } from '../components/charts/BarChart'

const ACCENT = 'var(--s-studio)'

export function Study() {
  const data = useStore(s => s.data)
  const addStudyLog = useStore(s => s.addStudyLog)
  const removeStudyLog = useStore(s => s.removeStudyLog)
  const setStudyGoals = useStore(s => s.setStudyGoals)
  const removeLecture = useStore(s => s.removeLecture)
  const removeCourse = useStore(s => s.removeCourse)

  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [form, setForm] = useState({ date: today(), courseId: '', minutes: '60', topic: '' })

  const days14 = recentDays(14)
  const weeks = recentWeeks(8)
  const thisWeek = weekDays(weekStart(today()))

  const minutesToday = studyMinutes(data, [today()])
  const minutesWeek = studyMinutes(data, thisWeek)
  const byCourse = studyMinutesByCourse(data, thisWeek)
  const maxCourse = Math.max(1, ...byCourse.map(c => c.minutes))

  const lectureHours = sum(data.lectures.map(l => minutesBetweenTimes(l.start, l.end))) / 60

  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>📚 Studio</h1>
          <p className="main__sub">Il calendario delle lezioni e le ore che ci metti davvero, contro gli obiettivi che ti dai.</p>
        </div>
        <div className="row row--tight">
          <button className="btn" onClick={() => setEditingCourse({ id: uid('c'), name: '' })}>+ Corso</button>
          <button className="btn btn--accent" style={{ ['--accent' as string]: ACCENT }}
            onClick={() => setEditingLecture({ id: uid('l'), courseId: data.courses[0]?.id ?? '', weekday: 1, start: '09:00', end: '11:00' })}>
            + Lezione
          </button>
        </div>
      </header>

      <div className="grid grid--4" style={{ marginBottom: 14 }}>
        <Card accent={ACCENT}>
          <Stat label="Studio oggi" value={formatMinutes(minutesToday)}
            hint={`obiettivo ${formatMinutes(data.studyGoals.dailyMinutes)}`} />
          <div style={{ marginTop: 8 }}><Bar value={minutesToday / data.studyGoals.dailyMinutes} color={ACCENT} /></div>
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Questa settimana" value={formatMinutes(minutesWeek)}
            hint={`obiettivo ${formatMinutes(data.studyGoals.weeklyMinutes)}`} />
          <div style={{ marginTop: 8 }}><Bar value={minutesWeek / data.studyGoals.weeklyMinutes} color={ACCENT} /></div>
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Streak studio" value={streak(data, 'studio')} unit="gg"
            hint="giorni consecutivi con almeno una sessione" />
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Lezioni a settimana" value={nf.format(Math.round(lectureHours * 10) / 10)} unit="h"
            hint={`${data.courses.length} corsi · ${data.lectures.length} slot`} />
        </Card>
      </div>

      <div className="grid grid--2" style={{ marginBottom: 14 }}>
        <Card title="Minuti di studio" note="ultimi 14 giorni">
          <BarChart
            height={230}
            labels={days14.map(d => formatShort(d))}
            format={n => formatMinutes(n)}
            yFormat={n => `${Math.round(n)}′`}
            reference={{ value: data.studyGoals.dailyMinutes, label: 'obiettivo' }}
            series={[{ key: 'min', label: 'Minuti', color: ACCENT, values: days14.map(d => studyMinutes(data, [d])) }]}
            emptyHint="Registra la prima sessione qui sotto"
          />
        </Card>

        <Card title="Ore per settimana" note="ultime 8 settimane">
          <BarChart
            height={230}
            labels={weeks.map(w => formatShort(w))}
            format={n => `${Math.round(n * 10) / 10} h`}
            yFormat={n => `${Math.round(n)}h`}
            reference={{ value: data.studyGoals.weeklyMinutes / 60, label: 'obiettivo' }}
            series={[{
              key: 'h', label: 'Ore', color: ACCENT,
              values: weeks.map(w => Math.round(studyMinutes(data, weekDays(w)) / 6) / 10),
            }]}
            highlightIndex={weeks.length - 1}
            emptyHint="Nessuna sessione registrata"
          />
        </Card>
      </div>

      <Card title="Calendario lezioni" note="si ripete ogni settimana">
        {data.lectures.length === 0 ? (
          <Empty icon="🎓" text="Nessuna lezione inserita. Aggiungi il tuo orario universitario."
            action={<button className="btn btn--sm"
              onClick={() => setEditingLecture({ id: uid('l'), courseId: data.courses[0]?.id ?? '', weekday: 1, start: '09:00', end: '11:00' })}>
              + Aggiungi lezione</button>} />
        ) : (
          <div className="week">
            {DAY_NAMES.map((name, i) => {
              const list = data.lectures.filter(l => l.weekday === i + 1).sort((a, b) => a.start.localeCompare(b.start))
              return (
                <div key={name} className="day" style={{ minHeight: 120 }}>
                  <div className="day__head"><span className="day__name">{name}</span></div>
                  {list.length === 0 && <span className="small muted">—</span>}
                  {list.map(l => (
                    <button key={l.id} className="slot" style={{ ['--accent' as string]: ACCENT }}
                      onClick={() => setEditingLecture(l)}>
                      <span className="slot__name">
                        {data.courses.find(c => c.id === l.courseId)?.name ?? 'Corso'}
                        <br /><span className="small muted">{l.start}–{l.end}{l.room ? ` · ${l.room}` : ''}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div style={{ height: 14 }} />

      <div className="grid grid--2" style={{ marginBottom: 14 }}>
        <Card title="Registra studio" accent={ACCENT}>
          <form className="stack" onSubmit={e => {
            e.preventDefault()
            const m = Number(form.minutes)
            if (!m || m <= 0) return
            addStudyLog({
              id: uid('sl'), date: form.date, minutes: m,
              courseId: form.courseId || undefined, topic: form.topic || undefined,
            })
            setForm(f => ({ ...f, minutes: '60', topic: '' }))
          }}>
            <div className="row">
              <Field label="Data" style={{ width: 150 }}>
                <input className="input" type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Corso" style={{ flex: '1 1 150px' }}>
                <select className="select" value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
                  <option value="">— nessuno —</option>
                  {data.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Minuti" style={{ width: 110 }}>
                <input className="input input--num" type="number" min={5} step={5} value={form.minutes}
                  onChange={e => setForm({ ...form, minutes: e.target.value })} />
              </Field>
            </div>
            <Field label="Argomento">
              <input className="input" placeholder="Capitolo 4, esercizi di algebra…" value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })} />
            </Field>
            <div className="row row--end">
              <button className="btn btn--accent" style={{ ['--accent' as string]: ACCENT }} type="submit">Aggiungi sessione</button>
            </div>
          </form>

          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />

          <div className="row">
            <Field label="Obiettivo giornaliero (min)" style={{ flex: 1 }}>
              <input className="input input--num" type="number" min={0} step={15} value={data.studyGoals.dailyMinutes}
                onChange={e => setStudyGoals({ dailyMinutes: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Obiettivo settimanale (min)" style={{ flex: 1 }}>
              <input className="input input--num" type="number" min={0} step={30} value={data.studyGoals.weeklyMinutes}
                onChange={e => setStudyGoals({ weeklyMinutes: Number(e.target.value) || 0 })} />
            </Field>
          </div>
        </Card>

        <Card title="Ripartizione per corso" note="questa settimana">
          {byCourse.length === 0
            ? <Empty icon="📊" text="Nessuna sessione questa settimana" />
            : (
              <div className="stack" style={{ gap: 12 }}>
                {byCourse.map(c => (
                  <div key={c.id}>
                    <div className="row row--tight" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{c.name}</span>
                      <b className="num">{formatMinutes(c.minutes)}</b>
                    </div>
                    <Bar value={c.minutes / maxCourse} color={ACCENT} />
                  </div>
                ))}
              </div>
            )}

          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />

          <span className="field__label">Corsi</span>
          <div className="list" style={{ marginTop: 6 }}>
            {data.courses.length === 0 && <Empty icon="🎒" text="Nessun corso" />}
            {data.courses.map(c => (
              <div className="list__row" key={c.id}>
                <span>{c.name}</span>
                {c.cfu ? <span className="badge">{c.cfu} CFU</span> : null}
                <div className="spacer" />
                <button className="btn btn--ghost btn--sm" onClick={() => setEditingCourse(c)}>✎</button>
                <button className="btn btn--ghost btn--sm" onClick={() => {
                  if (confirm(`Eliminare "${c.name}" e le sue lezioni?`)) removeCourse(c.id)
                }}>✕</button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Sessioni recenti" flush>
        {data.studyLogs.length === 0
          ? <div style={{ padding: 16 }}><Empty icon="📓" text="Nessuna sessione registrata" /></div>
          : (
            <div style={{ maxHeight: 320, overflow: 'auto' }}>
              <table className="table">
                <thead><tr><th>Data</th><th>Corso</th><th>Argomento</th><th className="right">Durata</th><th /></tr></thead>
                <tbody>
                  {[...data.studyLogs].reverse().slice(0, 60).map(l => (
                    <tr key={l.id}>
                      <td className="muted">{formatShort(l.date)}</td>
                      <td>{data.courses.find(c => c.id === l.courseId)?.name ?? '—'}</td>
                      <td className="dim">{l.topic ?? ''}</td>
                      <td className="right"><b>{formatMinutes(l.minutes)}</b></td>
                      <td className="right" style={{ width: 40 }}>
                        <button className="btn btn--ghost btn--sm" onClick={() => removeStudyLog(l.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {editingLecture && <LectureEditor lecture={editingLecture} onClose={() => setEditingLecture(null)}
        onDelete={() => { removeLecture(editingLecture.id); setEditingLecture(null) }} />}
      {editingCourse && <CourseEditor course={editingCourse} onClose={() => setEditingCourse(null)} />}
    </>
  )
}

function LectureEditor({ lecture, onClose, onDelete }: { lecture: Lecture; onClose: () => void; onDelete: () => void }) {
  const courses = useStore(s => s.data.courses)
  const save = useStore(s => s.saveLecture)
  const [draft, setDraft] = useState<Lecture>(lecture)

  return (
    <Modal open title="Lezione" onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost btn--danger" onClick={onDelete}>Elimina</button>
          <div className="spacer" />
          <button className="btn btn--ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn--primary" onClick={() => { save(draft); onClose() }}>Salva</button>
        </>
      }>
      <Field label="Corso">
        <select className="select" value={draft.courseId} onChange={e => setDraft({ ...draft, courseId: e.target.value })}>
          <option value="">— seleziona —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {courses.length === 0 && <p className="small muted">Crea prima un corso.</p>}
      <div className="row">
        <Field label="Giorno" style={{ flex: '1 1 120px' }}>
          <select className="select" value={draft.weekday} onChange={e => setDraft({ ...draft, weekday: Number(e.target.value) })}>
            {DAY_NAMES.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
          </select>
        </Field>
        <Field label="Inizio" style={{ width: 120 }}>
          <input className="input" type="time" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} />
        </Field>
        <Field label="Fine" style={{ width: 120 }}>
          <input className="input" type="time" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} />
        </Field>
        <Field label="Aula" style={{ flex: '1 1 100px' }}>
          <input className="input" value={draft.room ?? ''} onChange={e => setDraft({ ...draft, room: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

function CourseEditor({ course, onClose }: { course: Course; onClose: () => void }) {
  const save = useStore(s => s.saveCourse)
  const [draft, setDraft] = useState<Course>(course)

  return (
    <Modal open title="Corso" onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn--primary" disabled={!draft.name.trim()}
            onClick={() => { save(draft); onClose() }}>Salva</button>
        </>
      }>
      <Field label="Nome">
        <input className="input" autoFocus value={draft.name} placeholder="Analisi Matematica II"
          onChange={e => setDraft({ ...draft, name: e.target.value })} />
      </Field>
      <div className="row">
        <Field label="CFU" style={{ width: 110 }}>
          <input className="input input--num" type="number" min={0} value={draft.cfu ?? ''}
            onChange={e => setDraft({ ...draft, cfu: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
        <Field label="Docente" style={{ flex: 1 }}>
          <input className="input" value={draft.docente ?? ''} onChange={e => setDraft({ ...draft, docente: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}
