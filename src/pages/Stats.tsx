import {
  formatDay, formatMinutes, formatShort, formatWeekRange, isoWeekNumber,
  minutesBetweenTimes, today, weekDays, weekStart, weekday,
} from '../lib/date'
import { nf, nf1, sum } from '../lib/format'
import type { Route } from '../lib/router'
import { useStore } from '../store/store'
import { ADHERENCE, SECTIONS, type SectionId } from '../store/types'
import {
  activeDates, bestStreak, dayKcal, dietForDate, levelInfo, pomodorosOn, recentWeeks,
  streak, studyMinutes, totalXp, totalXpForDay, weekProgress, weightTrend, xpForDay,
} from '../store/selectors'
import { Bar, Card, Empty, Stat } from '../components/ui/ui'
import { RadialGauge } from '../components/charts/RadialGauge'
import { Heatmap } from '../components/charts/Heatmap'
import { BarChart } from '../components/charts/BarChart'
import { compact } from '../components/charts/chart-utils'

const color = (id: SectionId) => SECTIONS.find(s => s.id === id)!.color

export function Stats({ go }: { go: (r: Route) => void }) {
  const data = useStore(s => s.data)

  const now = today()
  const monday = weekStart(now)
  const week = weekDays(monday)

  const xp = totalXp(data)
  const lvl = levelInfo(xp.total)
  const progress = weekProgress(data, monday)
  const weekPct = progress.reduce((a, p) => a + p.progress, 0) / progress.length

  const dates = activeDates(data)
  const dietSet = [1, 2, 3, 4, 5, 6, 7].some(wd => (data.dietWeek[wd]?.meals.length ?? 0) > 0)
  const isEmpty = dates.length === 0 && !dietSet && data.splitDays.length === 0 && data.tasks.length === 0

  // XP per giorno per la heatmap
  const heat: Record<string, number> = {}
  for (const d of dates) heat[d] = totalXpForDay(data, d)

  // XP per sezione nelle ultime 8 settimane
  const weeks = recentWeeks(8)
  const xpWeekly = weeks.map(w => {
    const acc: Record<SectionId, number> = { dieta: 0, workout: 0, studio: 0, routine: 0 }
    for (const d of weekDays(w)) {
      const x = xpForDay(data, d)
      acc.dieta += x.dieta; acc.workout += x.workout; acc.studio += x.studio; acc.routine += x.routine
    }
    return acc
  })

  const trend = weightTrend(data, 7)
  const lastW = trend[trend.length - 1]
  const prevW = trend.length > 7 ? trend[trend.length - 8] : trend[0]

  const todayPlan = data.weekPlans[monday]?.days[now]
  const diet = dietForDate(data, now)
  const split = data.splitDays.find(s => s.id === todayPlan?.workoutDayId)
  const workoutDone = data.workoutLogs.some(l => l.date === now)
  const studyTarget = todayPlan?.studyTargetMin
    ?? sum((todayPlan?.studyBlocks ?? []).map(b => minutesBetweenTimes(b.start, b.end)))
  const studiedToday = studyMinutes(data, [now])
  const tasksToday = data.tasks.filter(t => t.date === now)
  const adherenceToday = data.dietLogs[now]?.adherence
  const lecturesToday = data.lectures.filter(l => l.weekday === weekday(now)).sort((a, b) => a.start.localeCompare(b.start))

  if (isEmpty) return <Onboarding go={go} />

  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>📈 Statistiche</h1>
          <p className="main__sub">{formatDay(now)} · settimana {isoWeekNumber(now)} ({formatWeekRange(monday)})</p>
        </div>
        <button className="btn btn--primary" onClick={() => go('settimana')}>← Torna alla settimana</button>
      </header>

      {/* ------------------------------- HUD ------------------------------ */}
      <div className="hud" style={{ marginBottom: 14 }}>
        <div className="hud__level">
          <div>
            <b className="num">{lvl.level}</b>
            <span>LIVELLO</span>
          </div>
        </div>

        <div className="hud__main">
          <div className="row row--tight" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="label">Esperienza</span>
            <span className="small muted num">{nf.format(lvl.intoLevel)} / {nf.format(lvl.levelSpan)} XP · mancano {nf.format(lvl.toNext)}</span>
          </div>
          <div className="xpbar"><div className="xpbar__fill" style={{ width: `${lvl.progress * 100}%` }} /></div>
          <div className="legend" style={{ marginTop: 8 }}>
            {SECTIONS.map(s => (
              <span className="legend__item" key={s.id}>
                <span className="legend__swatch" style={{ ['--c' as string]: s.color }} />
                {s.label} <b className="num">{nf.format(xp[s.id])}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="row" style={{ gap: 22 }}>
          <Stat label="Streak" value={<span className="streak">🔥 {streak(data)}</span>} hint={`record ${bestStreak(data)} giorni`} />
          <Stat label="Settimana" value={Math.round(weekPct * 100)} unit="%" hint="completamento medio" />
          <Stat label="XP totali" value={nf.format(xp.total)} hint={`${dates.length} giorni giocati`} />
        </div>
      </div>

      {/* --------------------------- Le 4 sezioni ------------------------- */}
      <div className="grid grid--4" style={{ marginBottom: 14 }}>
        {progress.map(p => {
          const s = SECTIONS.find(x => x.id === p.id)!
          const weekXp = sum(week.map(d => xpForDay(data, d)[p.id]))
          return (
            <Card key={p.id} accent={s.color}>
              <div className="row" style={{ alignItems: 'center', gap: 14 }}>
                <RadialGauge value={p.progress} size={72} thickness={7} color={s.color} />
                <div style={{ minWidth: 0 }}>
                  <div className="row row--tight"><span style={{ fontSize: 15 }}>{s.icon}</span><b>{s.label}</b></div>
                  <div className="small muted" style={{ marginTop: 2 }}>{p.detail}</div>
                  <div className="small" style={{ marginTop: 6, color: s.color }}><b className="num">+{nf.format(weekXp)}</b> XP</div>
                </div>
              </div>
              <button className="btn btn--sm btn--ghost" style={{ marginTop: 10, width: '100%' }}
                onClick={() => go(p.id as Route)}>Apri {s.label} →</button>
            </Card>
          )
        })}
      </div>

      {/* ------------------------- Le quest di oggi ------------------------ */}
      <div className="grid grid--right" style={{ marginBottom: 14 }}>
        <Card title="Le quest di oggi" note={formatShort(now)}>
          {lecturesToday.length > 0 && (
            <div className="small muted" style={{ marginBottom: 8 }}>
              🎓 Lezioni: {lecturesToday.map(l =>
                `${data.courses.find(c => c.id === l.courseId)?.name ?? 'Corso'} ${l.start}`).join(' · ')}
            </div>
          )}

          <QuestRow
            section="dieta"
            title={diet ? `${diet.meals.length} pasti in programma` : 'Dieta non compilata'}
            meta={diet ? `${nf.format(dayKcal(diet))} kcal` : '—'}
            state={adherenceToday ? ADHERENCE[adherenceToday].label : undefined}
            stateTone={adherenceToday ? ADHERENCE[adherenceToday].tone : undefined}
            progress={adherenceToday ? ADHERENCE[adherenceToday].score : 0}
            onClick={() => go('dieta')}
          />
          <QuestRow
            section="workout"
            title={todayPlan?.workoutDayId === 'riposo' ? 'Riposo' : split ? split.name : 'Niente in programma'}
            meta={split ? `${nf.format(split.kcal)} kcal · ${split.durationMin}′` : '—'}
            state={workoutDone ? 'Fatto' : undefined}
            progress={workoutDone ? 1 : 0}
            onClick={() => go('workout')}
          />
          <QuestRow
            section="studio"
            title={studyTarget ? `Obiettivo ${formatMinutes(studyTarget)}` : 'Nessun obiettivo'}
            meta={`fatti ${formatMinutes(studiedToday)}`}
            progress={studyTarget ? Math.min(1, studiedToday / studyTarget) : 0}
            onClick={() => go('studio')}
          />
          <QuestRow
            section="routine"
            title={tasksToday.length ? `${tasksToday.filter(t => t.done).length} / ${tasksToday.length} task` : 'Nessuna task per oggi'}
            meta={tasksToday.filter(t => !t.done).slice(0, 2).map(t => t.title).join(' · ') || '—'}
            progress={tasksToday.length ? tasksToday.filter(t => t.done).length / tasksToday.length : 0}
            onClick={() => go('routine')}
          />
        </Card>

        <Card title="XP guadagnati" note="per sezione, ultime 8 settimane">
          <BarChart
            height={250}
            stacked
            labels={weeks.map(w => formatShort(w))}
            format={n => `${nf.format(Math.round(n))} XP`}
            yFormat={compact}
            series={SECTIONS.map(s => ({
              key: s.id, label: s.label, color: s.color, values: xpWeekly.map(w => w[s.id]),
            }))}
            highlightIndex={weeks.length - 1}
            emptyHint="Inizia a registrare: qui vedrai la tua curva"
          />
        </Card>
      </div>

      {/* ------------------------------ Heatmap --------------------------- */}
      <Card title="Costanza" note="XP per giorno, ultime 18 settimane">
        <Heatmap values={heat} endDate={now} weeks={18} format={n => `${nf.format(n)} XP`} />
      </Card>

      <div style={{ height: 14 }} />

      {/* ------------------------- Riepilogo numeri ----------------------- */}
      <div className="grid grid--4">
        <Card accent={color('dieta')}>
          <Stat label="Peso" value={lastW ? nf1.format(lastW.kg) : '—'} unit={lastW ? 'kg' : undefined}
            delta={lastW && prevW && Math.abs(lastW.trend - prevW.trend) > 0.05
              ? {
                value: `${nf1.format(Math.abs(lastW.trend - prevW.trend))} kg`,
                dir: lastW.trend < prevW.trend ? 'up' : 'down',
                arrow: lastW.trend < prevW.trend ? '▼' : '▲',
              }
              : undefined}
            hint="variazione media su 7 giorni" />
        </Card>
        <Card accent={color('workout')}>
          <Stat label="Allenamenti settimana" value={data.workoutLogs.filter(l => week.includes(l.date)).length}
            unit={`/ ${data.settings.workoutsPerWeekTarget}`} />
          <div style={{ marginTop: 8 }}>
            <Bar value={data.workoutLogs.filter(l => week.includes(l.date)).length / data.settings.workoutsPerWeekTarget}
              color={color('workout')} />
          </div>
        </Card>
        <Card accent={color('studio')}>
          <Stat label="Studio settimana" value={formatMinutes(studyMinutes(data, week))}
            hint={`${pomodorosOn(data, week)} 🍅 · obiettivo ${formatMinutes(data.studyGoals.weeklyMinutes)}`} />
          <div style={{ marginTop: 8 }}>
            <Bar value={studyMinutes(data, week) / data.studyGoals.weeklyMinutes} color={color('studio')} />
          </div>
        </Card>
        <Card accent={color('routine')}>
          <Stat label="Task aperte" value={data.tasks.filter(t => !t.done).length}
            hint={`${data.tasks.filter(t => t.doneAt && week.includes(t.doneAt)).length} chiuse questa settimana`} />
        </Card>
      </div>
    </>
  )
}

function QuestRow({ section, title, meta, state, stateTone = 'good', progress, onClick }: {
  section: SectionId
  title: string
  meta: string
  state?: string
  /** ruolo di stato (good/warning/serious/critical): il colore non deve mentire */
  stateTone?: string
  progress: number
  onClick: () => void
}) {
  const s = SECTIONS.find(x => x.id === section)!
  return (
    <div className="questrow" style={{ ['--accent' as string]: s.color, ['--accent-dim' as string]: s.dim }}>
      <div className="questrow__icon">{s.icon}</div>
      <div className="questrow__main">
        <div className="row row--tight">
          <span className="questrow__title">{title}</span>
          {state && <span className={`badge badge--${stateTone}`}><span className="badge__dot" />{state}</span>}
        </div>
        <div className="small muted" style={{ margin: '2px 0 5px' }}>{meta}</div>
        <Bar value={progress} color={s.color} />
      </div>
      <button className="btn btn--ghost btn--sm" onClick={onClick} aria-label={`Apri ${s.label}`}>→</button>
    </div>
  )
}

function Onboarding({ go }: { go: (r: Route) => void }) {
  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>Benvenuto nel tuo Life RPG 👾</h1>
          <p className="main__sub">
            Quattro sezioni, una settimana da riempire la domenica sera e da rispettare fino alla domenica dopo.
          </p>
        </div>
      </header>

      <Card>
        <Empty icon="🎮" text="Non c'è ancora niente da mostrare: costruisci le fondamenta e i grafici si riempiranno da soli." />
        <div className="grid grid--2" style={{ marginTop: 8 }}>
          {[
            { r: 'dieta' as Route, t: '1. Scrivi la dieta settimanale', d: 'I pasti di ogni giorno, una volta sola: finiscono da soli nella settimana.' },
            { r: 'workout' as Route, t: '2. Inserisci il tuo split', d: 'Push, Pull, Gambe… con esercizi, carichi e kcal stimate.' },
            { r: 'studio' as Route, t: '3. Corsi, lezioni e pomodoro', d: 'L\'orario universitario e il timer con cui conti le ore di studio.' },
            { r: 'settimana' as Route, t: '4. Pianifica la settimana', d: 'Allenamenti, obiettivi e task sui sette giorni. Poi limitati a eseguire.' },
          ].map(x => (
            <div key={x.r} className="card" style={{ background: 'var(--surface-2)' }}>
              <b>{x.t}</b>
              <p className="small muted" style={{ margin: '4px 0 10px' }}>{x.d}</p>
              <button className="btn btn--sm" onClick={() => go(x.r)}>Vai →</button>
            </div>
          ))}
        </div>
        <div className="row row--end" style={{ marginTop: 14 }}>
          <span className="small muted">Vuoi prima vedere com'è quando è pieno?</span>
          <button className="btn btn--sm" onClick={() => go('impostazioni')}>Carica dati di esempio</button>
        </div>
      </Card>
    </>
  )
}
