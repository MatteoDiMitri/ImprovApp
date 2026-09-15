import { useState } from 'react'
import { DAY_NAMES, DAY_NAMES_LONG, formatShort, today, weekday, type ISODate } from '../lib/date'
import { nf, nf1, sum } from '../lib/format'
import { uid } from '../lib/id'
import { useStore } from '../store/store'
import { ADHERENCE, type Adherence, type Meal } from '../store/types'
import { adherenceScore, dayKcal, kcalForDay, recentDays, weeklyDietKcal, weightTrend } from '../store/selectors'
import { Card, Empty, Field, Stat } from '../components/ui/ui'
import { LineChart } from '../components/charts/LineChart'
import { BarChart } from '../components/charts/BarChart'
import { compact } from '../components/charts/chart-utils'

const ACCENT = 'var(--s-dieta)'

export function Diet() {
  const data = useStore(s => s.data)
  const setDietLog = useStore(s => s.setDietLog)
  const setWeight = useStore(s => s.setWeight)
  const removeWeight = useStore(s => s.removeWeight)

  const [day, setDay] = useState<number>(() => weekday(today()))
  const [weightInput, setWeightInput] = useState('')
  const [weightDate, setWeightDate] = useState<ISODate>(today())

  const trend = weightTrend(data, 7)
  const last = trend[trend.length - 1]
  const prev = trend.length > 7 ? trend[trend.length - 8] : trend[0]
  const delta = last && prev ? last.trend - prev.trend : 0

  const days30 = recentDays(30)
  const days14 = recentDays(14)
  const adh30 = adherenceScore(data, days30)
  const kcal14 = days14.map(d => kcalForDay(data, d))
  const budget = weeklyDietKcal(data)

  const todayLog = data.dietLogs[today()]

  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>🍽️ Dieta</h1>
          <p className="main__sub">
            Scrivi qui la tua dieta settimanale: finisce da sola nei giorni della Settimana, senza doverla assegnare.
          </p>
        </div>
      </header>

      <div className="grid grid--4" style={{ marginBottom: 14 }}>
        <Card accent={ACCENT}>
          <Stat label="Peso attuale" value={last ? nf1.format(last.kg) : '—'} unit={last ? 'kg' : undefined}
            delta={last && prev && Math.abs(delta) > 0.05
              ? { value: `${nf1.format(Math.abs(delta))} kg / 7gg`, dir: delta < 0 ? 'up' : 'down', arrow: delta < 0 ? '▼' : '▲' }
              : undefined}
            hint={last ? `media mobile ${nf1.format(last.trend)} kg` : 'registra la prima pesata'} />
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Obiettivo" value={data.profile.targetWeightKg ? nf1.format(data.profile.targetWeightKg) : '—'}
            unit={data.profile.targetWeightKg ? 'kg' : undefined}
            hint={last && data.profile.targetWeightKg
              ? `${nf1.format(Math.abs(last.trend - data.profile.targetWeightKg))} kg da percorrere`
              : 'impostalo nelle impostazioni'} />
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Aderenza 30 giorni" value={adh30 != null ? Math.round(adh30) : '—'} unit={adh30 != null ? '%' : undefined}
            hint={`${days30.filter(d => data.dietLogs[d]?.adherence).length} giorni registrati`} />
        </Card>
        <Card accent={ACCENT}>
          <Stat label="Media della dieta" value={budget.perDay ? nf.format(Math.round(budget.perDay)) : '—'}
            unit={budget.perDay ? 'kcal' : undefined}
            hint={budget.daysSet ? `${budget.daysSet} giorni su 7 compilati` : 'nessun giorno compilato'} />
        </Card>
      </div>

      <WeekDietEditor day={day} onDay={setDay} />

      <div style={{ height: 14 }} />

      <div className="grid grid--2" style={{ marginBottom: 14 }}>
        <Card title="Andamento del peso" note="punti = pesate, tratteggio = media mobile 7 giorni">
          <LineChart
            height={230}
            labels={trend.map(t => formatShort(t.date))}
            format={n => `${nf1.format(n)} kg`}
            yFormat={n => nf1.format(n)}
            reference={data.profile.targetWeightKg ? { value: data.profile.targetWeightKg, label: 'obiettivo' } : undefined}
            series={[
              { key: 'peso', label: 'Peso', color: ACCENT, values: trend.map(t => t.kg), showDots: trend.length <= 40 },
              { key: 'trend', label: 'Media 7 gg', color: 'var(--ink-2)', values: trend.map(t => t.trend), dashed: true, showDots: false },
            ]}
            emptyHint="Registra la prima pesata qui sotto"
          />
        </Card>

        <Card title="Kcal per giorno" note="ultimi 14 giorni">
          <BarChart
            height={230}
            labels={days14.map(d => formatShort(d))}
            format={n => `${nf.format(Math.round(n))} kcal`}
            yFormat={compact}
            reference={{ value: data.settings.kcalTarget, label: 'obiettivo' }}
            series={[{ key: 'kcal', label: 'Kcal', color: ACCENT, values: kcal14.map(k => k ?? 0) }]}
            emptyHint="Compila la dieta settimanale qui sopra"
          />
        </Card>
      </div>

      <div className="grid grid--2">
        <Card title="Oggi" accent={ACCENT}>
          <span className="field__label">Sto seguendo la dieta?</span>
          <div className="chipbar" style={{ margin: '6px 0 14px' }}>
            {(Object.keys(ADHERENCE) as Adherence[]).map(a => (
              <button key={a} className="chip" aria-pressed={todayLog?.adherence === a}
                onClick={() => setDietLog(today(), { adherence: todayLog?.adherence === a ? undefined : a })}>
                {ADHERENCE[a].icon} {ADHERENCE[a].label}
              </button>
            ))}
          </div>

          <Field label="Kcal effettive (solo se hai mangiato diverso dalla dieta)">
            <input className="input input--num" type="number" min={0} step={50}
              placeholder={String(kcalForDay(data, today()) ?? '')}
              value={todayLog?.kcalActual ?? ''}
              onChange={e => setDietLog(today(), { kcalActual: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>

          <Field label="Nota" style={{ marginTop: 10 }}>
            <input className="input" placeholder="Cena fuori, pranzo saltato…"
              value={todayLog?.note ?? ''}
              onChange={e => setDietLog(today(), { note: e.target.value })} />
          </Field>
        </Card>

        <Card title="Registro peso" accent={ACCENT}>
          <form className="row row--tight" onSubmit={e => {
            e.preventDefault()
            const v = Number(weightInput.replace(',', '.'))
            if (!v || v <= 0) return
            setWeight(weightDate, v)
            setWeightInput('')
          }}>
            <input className="input" type="date" style={{ width: 150 }} value={weightDate}
              onChange={e => setWeightDate(e.target.value)} />
            <input className="input input--num" style={{ width: 100 }} inputMode="decimal"
              placeholder="kg" value={weightInput} onChange={e => setWeightInput(e.target.value)} />
            <button className="btn btn--accent" style={{ ['--accent' as string]: ACCENT }} type="submit">Salva</button>
          </form>

          <div style={{ maxHeight: 210, overflow: 'auto', marginTop: 10 }}>
            {data.weights.length === 0
              ? <Empty icon="⚖️" text="Nessuna pesata registrata" />
              : (
                <table className="table">
                  <tbody>
                    {[...data.weights].reverse().slice(0, 30).map(w => (
                      <tr key={w.date}>
                        <td className="muted">{formatShort(w.date)}</td>
                        <td className="right"><b>{nf1.format(w.kg)} kg</b></td>
                        <td className="right" style={{ width: 34 }}>
                          <button className="btn btn--ghost btn--sm" aria-label="Elimina"
                            onClick={() => removeWeight(w.date)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </Card>
      </div>
    </>
  )
}

/* ====================== Editor della dieta settimanale ==================== */

function WeekDietEditor({ day, onDay }: { day: number; onDay: (d: number) => void }) {
  const dietWeek = useStore(s => s.data.dietWeek)
  const setDietMeals = useStore(s => s.setDietMeals)
  const setDietNote = useStore(s => s.setDietNote)
  const copyDietDay = useStore(s => s.copyDietDay)
  const clearDietDay = useStore(s => s.clearDietDay)

  const [copyOpen, setCopyOpen] = useState(false)
  const [targets, setTargets] = useState<number[]>([])

  const current = dietWeek[day] ?? { meals: [] }
  const meals = current.meals
  const oggi = weekday(today())

  const patchMeal = (id: string, patch: Partial<Meal>) =>
    setDietMeals(day, meals.map(m => m.id === id ? { ...m, ...patch } : m))

  function addMeal() {
    const preset = ['Colazione', 'Pranzo', 'Cena', 'Spuntino']
    const name = preset[meals.length] ?? 'Spuntino'
    setDietMeals(day, [...meals, { id: uid('m'), name, items: [] }])
  }

  return (
    <Card
      title="La tua dieta settimanale"
      note="si salva da sola · vale per tutte le settimane"
      accent={ACCENT}
    >
      {/* selettore dei giorni, con le kcal già visibili */}
      <div className="daytabs">
        {DAY_NAMES.map((name, i) => {
          const wd = i + 1
          const k = dayKcal(dietWeek[wd])
          return (
            <button key={wd} className="daytab" aria-pressed={wd === day} onClick={() => onDay(wd)}>
              <span className="daytab__name">{name}</span>
              <span className="daytab__kcal num">{k ? nf.format(k) : '—'}</span>
              {wd === oggi && <span className="daytab__today" aria-label="oggi" />}
            </button>
          )
        })}
      </div>

      <div className="row" style={{ margin: '14px 0 10px', alignItems: 'center' }}>
        <h3 style={{ fontSize: 16 }}>{DAY_NAMES_LONG[day - 1]}</h3>
        <span className="badge num">{nf.format(dayKcal(current))} kcal</span>
        <div className="spacer" />
        <button className="btn btn--sm" onClick={() => { setCopyOpen(o => !o); setTargets([]) }}>
          ⧉ Copia su…
        </button>
        {meals.length > 0 && (
          <button className="btn btn--sm btn--ghost btn--danger" onClick={() => {
            if (confirm(`Svuotare ${DAY_NAMES_LONG[day - 1]}?`)) clearDietDay(day)
          }}>Svuota</button>
        )}
      </div>

      {copyOpen && (
        <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 12 }}>
          <div className="row row--tight" style={{ marginBottom: 10 }}>
            <span className="small dim">Copia {DAY_NAMES_LONG[day - 1]} su:</span>
            <div className="spacer" />
            <button className="btn btn--sm btn--ghost"
              onClick={() => setTargets(DAY_NAMES.map((_, i) => i + 1).filter(w => w !== day))}>
              Tutti gli altri
            </button>
          </div>
          <div className="chipbar">
            {DAY_NAMES.map((name, i) => {
              const wd = i + 1
              if (wd === day) return null
              return (
                <button key={wd} className="chip" aria-pressed={targets.includes(wd)}
                  onClick={() => setTargets(t => t.includes(wd) ? t.filter(x => x !== wd) : [...t, wd])}>
                  {name}
                </button>
              )
            })}
          </div>
          <div className="row row--end" style={{ marginTop: 12 }}>
            <button className="btn btn--sm btn--ghost" onClick={() => setCopyOpen(false)}>Annulla</button>
            <button className="btn btn--sm btn--accent" style={{ ['--accent' as string]: ACCENT }}
              disabled={targets.length === 0}
              onClick={() => { copyDietDay(day, targets); setCopyOpen(false); setTargets([]) }}>
              Copia su {targets.length} giorni
            </button>
          </div>
        </div>
      )}

      {meals.length === 0 && (
        <Empty icon="🥗" text={`${DAY_NAMES_LONG[day - 1]} è vuoto. Aggiungi il primo pasto.`} />
      )}

      <div className="stack" style={{ gap: 10 }}>
        {meals.map(meal => (
          <div key={meal.id} className="card" style={{ background: 'var(--surface-2)', padding: 12 }}>
            <div className="row row--tight" style={{ marginBottom: 8 }}>
              <input className="input input--sm" style={{ flex: '1 1 150px', fontWeight: 600 }}
                value={meal.name} onChange={e => patchMeal(meal.id, { name: e.target.value })} />
              <input className="input input--sm" type="time" style={{ width: 108 }}
                value={meal.time ?? ''} onChange={e => patchMeal(meal.id, { time: e.target.value })} />
              <span className="badge num">{nf.format(sum(meal.items.map(i => i.kcal)))} kcal</span>
              <button className="btn btn--sm btn--ghost btn--danger" aria-label="Rimuovi pasto"
                onClick={() => setDietMeals(day, meals.filter(m => m.id !== meal.id))}>✕</button>
            </div>

            {meal.items.map(item => (
              <div className="row row--tight" key={item.id} style={{ marginBottom: 5 }}>
                <input className="input input--sm" style={{ flex: '2 1 150px' }} placeholder="Alimento"
                  value={item.name}
                  onChange={e => patchMeal(meal.id, { items: meal.items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i) })} />
                <input className="input input--sm" style={{ flex: '1 1 90px' }} placeholder="Quantità"
                  value={item.qty ?? ''}
                  onChange={e => patchMeal(meal.id, { items: meal.items.map(i => i.id === item.id ? { ...i, qty: e.target.value } : i) })} />
                <input className="input input--sm input--num" style={{ width: 92 }} type="number" min={0} placeholder="kcal"
                  value={item.kcal || ''}
                  onChange={e => patchMeal(meal.id, { items: meal.items.map(i => i.id === item.id ? { ...i, kcal: Number(e.target.value) || 0 } : i) })} />
                <button className="btn btn--sm btn--ghost" aria-label="Rimuovi alimento"
                  onClick={() => patchMeal(meal.id, { items: meal.items.filter(i => i.id !== item.id) })}>✕</button>
              </div>
            ))}

            <button className="btn btn--sm btn--ghost" style={{ marginTop: 4 }}
              onClick={() => patchMeal(meal.id, { items: [...meal.items, { id: uid('f'), name: '', kcal: 0 }] })}>
              + Alimento
            </button>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn--sm btn--accent" style={{ ['--accent' as string]: ACCENT }} onClick={addMeal}>
          + Pasto
        </button>
        <input className="input input--sm" style={{ flex: '1 1 200px' }} placeholder="Nota del giorno (facoltativa)"
          value={current.note ?? ''} onChange={e => setDietNote(day, e.target.value)} />
      </div>
    </Card>
  )
}
