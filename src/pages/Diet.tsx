import { useState } from 'react'
import { formatShort, today, type ISODate } from '../lib/date'
import { avg, nf, nf1, sum } from '../lib/format'
import { uid } from '../lib/id'
import { useStore } from '../store/store'
import { ADHERENCE, type Adherence, type DietPlan, type Meal } from '../store/types'
import { adherenceScore, kcalForDay, planKcal, recentDays, weightTrend } from '../store/selectors'
import { Card, Empty, Field, Stat } from '../components/ui/ui'
import { Modal } from '../components/ui/Modal'
import { LineChart } from '../components/charts/LineChart'
import { BarChart } from '../components/charts/BarChart'
import { compact } from '../components/charts/chart-utils'

const ACCENT = 'var(--s-dieta)'

export function Diet() {
  const data = useStore(s => s.data)
  const setDietLog = useStore(s => s.setDietLog)
  const setWeight = useStore(s => s.setWeight)
  const removeDietPlan = useStore(s => s.removeDietPlan)

  const [editing, setEditing] = useState<DietPlan | null>(null)
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
  const kcalAvg = avg(kcal14.filter((k): k is number => k != null))

  const todayLog = data.dietLogs[today()]

  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>🍽️ Dieta</h1>
          <p className="main__sub">Il piano che ti sei dato, il peso giorno per giorno e quanto lo stai rispettando.</p>
        </div>
        <button className="btn btn--accent" style={{ ['--accent' as string]: ACCENT }}
          onClick={() => setEditing(newPlan())}>+ Nuovo piano</button>
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
          <Stat label="Kcal medie 14 gg" value={kcalAvg ? nf.format(Math.round(kcalAvg)) : '—'}
            hint={`obiettivo ${nf.format(data.settings.kcalTarget)} kcal`} />
        </Card>
      </div>

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
            emptyHint="Assegna un piano ai giorni nella Settimana"
          />
        </Card>
      </div>

      <div className="grid grid--2" style={{ marginBottom: 14 }}>
        <Card title="Oggi" accent={ACCENT}>
          <span className="field__label">Sto seguendo il piano?</span>
          <div className="chipbar" style={{ margin: '6px 0 14px' }}>
            {(Object.keys(ADHERENCE) as Adherence[]).map(a => (
              <button key={a} className="chip" aria-pressed={todayLog?.adherence === a}
                onClick={() => setDietLog(today(), { adherence: todayLog?.adherence === a ? undefined : a })}>
                {ADHERENCE[a].icon} {ADHERENCE[a].label}
              </button>
            ))}
          </div>

          <div className="row" style={{ alignItems: 'flex-end' }}>
            <Field label="Kcal effettive (se diverse dal piano)" style={{ flex: '1 1 180px' }}>
              <input className="input input--num" type="number" min={0} step={50}
                placeholder={String(kcalForDay(data, today()) ?? '')}
                value={todayLog?.kcalActual ?? ''}
                onChange={e => setDietLog(today(), { kcalActual: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
          </div>

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
                            onClick={() => useStore.getState().removeWeight(w.date)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </Card>
      </div>

      <Card title="I tuoi piani alimentari" note={`${data.dietPlans.length} piani`}>
        {data.dietPlans.length === 0 ? (
          <Empty icon="📋" text="Nessun piano ancora. Creane uno e assegnalo ai giorni della settimana."
            action={<button className="btn btn--sm" onClick={() => setEditing(newPlan())}>+ Crea il primo piano</button>} />
        ) : (
          <div className="grid grid--auto">
            {data.dietPlans.map(p => (
              <div key={p.id} className="card" style={{ background: 'var(--surface-2)' }}>
                <div className="row">
                  <b>{p.name}</b>
                  <div className="spacer" />
                  <span className="badge num">{nf.format(planKcal(p))} kcal</span>
                </div>
                <div className="small muted" style={{ margin: '6px 0 10px' }}>
                  {p.meals.length} pasti · {sum(p.meals.map(m => m.items.length))} alimenti
                </div>
                <div className="row row--tight">
                  <button className="btn btn--sm" onClick={() => setEditing(p)}>Modifica</button>
                  <button className="btn btn--sm btn--ghost" onClick={() => setEditing({
                    ...p, id: uid('dp'), name: `${p.name} (copia)`,
                    meals: p.meals.map(m => ({ ...m, id: uid('m'), items: m.items.map(i => ({ ...i, id: uid('f') })) })),
                  })}>Duplica</button>
                  <div className="spacer" />
                  <button className="btn btn--sm btn--ghost btn--danger" onClick={() => {
                    if (confirm(`Eliminare "${p.name}"?`)) removeDietPlan(p.id)
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && <PlanEditor plan={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function newPlan(): DietPlan {
  return {
    id: uid('dp'),
    name: 'Nuovo piano',
    meals: [
      { id: uid('m'), name: 'Colazione', time: '08:00', items: [] },
      { id: uid('m'), name: 'Pranzo', time: '13:00', items: [] },
      { id: uid('m'), name: 'Cena', time: '20:00', items: [] },
    ],
  }
}

/* ---------------------------- Editor del piano -------------------------- */

function PlanEditor({ plan, onClose }: { plan: DietPlan; onClose: () => void }) {
  const save = useStore(s => s.saveDietPlan)
  const [draft, setDraft] = useState<DietPlan>(plan)

  const patchMeal = (id: string, patch: Partial<Meal>) =>
    setDraft(d => ({ ...d, meals: d.meals.map(m => m.id === id ? { ...m, ...patch } : m) }))

  const total = planKcal(draft)

  return (
    <Modal open wide title="Piano alimentare" onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn--primary" onClick={() => { save(draft); onClose() }}>Salva piano</button>
        </>
      }>
      <div className="row">
        <Field label="Nome" style={{ flex: '1 1 220px' }}>
          <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <div style={{ textAlign: 'right' }}>
          <div className="field__label">Totale</div>
          <div style={{ fontSize: 22, fontWeight: 700 }} className="num">{nf.format(total)} kcal</div>
        </div>
      </div>

      {draft.meals.map(meal => (
        <div key={meal.id} className="card" style={{ background: 'var(--surface-2)', padding: 12 }}>
          <div className="row row--tight" style={{ marginBottom: 8 }}>
            <input className="input input--sm" style={{ flex: '1 1 160px', fontWeight: 600 }}
              value={meal.name} onChange={e => patchMeal(meal.id, { name: e.target.value })} />
            <input className="input input--sm" type="time" style={{ width: 108 }}
              value={meal.time ?? ''} onChange={e => patchMeal(meal.id, { time: e.target.value })} />
            <span className="badge num">{nf.format(sum(meal.items.map(i => i.kcal)))} kcal</span>
            <button className="btn btn--sm btn--ghost btn--danger" aria-label="Rimuovi pasto"
              onClick={() => setDraft(d => ({ ...d, meals: d.meals.filter(m => m.id !== meal.id) }))}>✕</button>
          </div>

          {meal.items.map(item => (
            <div className="row row--tight" key={item.id} style={{ marginBottom: 5 }}>
              <input className="input input--sm" style={{ flex: '2 1 160px' }} placeholder="Alimento"
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

      <button className="btn btn--sm"
        onClick={() => setDraft(d => ({ ...d, meals: [...d.meals, { id: uid('m'), name: 'Spuntino', items: [] }] }))}>
        + Pasto
      </button>

      <Field label="Note">
        <input className="input" value={draft.note ?? ''} onChange={e => setDraft({ ...draft, note: e.target.value })}
          placeholder="Es. giorno di ricarica, allenamento pesante…" />
      </Field>
    </Modal>
  )
}
