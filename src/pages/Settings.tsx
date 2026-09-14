import { useRef, useState } from 'react'
import { nf } from '../lib/format'
import { DATA_VERSION, useStore } from '../store/store'
import { demoData } from '../store/seed'
import type { AppData } from '../store/types'
import { activeDates, totalXp, XP } from '../store/selectors'
import { Card, Field, Stat } from '../components/ui/ui'

export function Settings() {
  const data = useStore(s => s.data)
  const patchProfile = useStore(s => s.patchProfile)
  const patchSettings = useStore(s => s.patchSettings)
  const replaceAll = useStore(s => s.replaceAll)
  const reset = useStore(s => s.reset)

  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const xp = totalXp(data)
  const days = activeDates(data).length

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `improvapp-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importJson(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (typeof parsed !== 'object' || !parsed || !('dietPlans' in parsed)) throw new Error('formato')
        replaceAll({ ...parsed, version: DATA_VERSION })
        setMessage('Dati importati.')
      } catch {
        setMessage('File non valido: deve essere un export di ImprovApp.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <header className="main__head">
        <div className="grow">
          <h1>⚙️ Impostazioni</h1>
          <p className="main__sub">Profilo, obiettivi e gestione dei dati. Tutto resta su questo dispositivo.</p>
        </div>
      </header>

      {message && (
        <Card><div className="row"><span>{message}</span><div className="spacer" />
          <button className="btn btn--sm btn--ghost" onClick={() => setMessage(null)}>OK</button></div></Card>
      )}

      <div className="grid grid--2" style={{ margin: '14px 0' }}>
        <Card title="Profilo">
          <div className="stack">
            <Field label="Nome">
              <input className="input" value={data.profile.name}
                onChange={e => patchProfile({ name: e.target.value })} placeholder="Come ti chiami" />
            </Field>
            <div className="row">
              <Field label="Altezza (cm)" style={{ flex: 1 }}>
                <input className="input input--num" type="number" min={0} value={data.profile.heightCm ?? ''}
                  onChange={e => patchProfile({ heightCm: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
              <Field label="Peso obiettivo (kg)" style={{ flex: 1 }}>
                <input className="input input--num" type="number" min={0} step={0.1} value={data.profile.targetWeightKg ?? ''}
                  onChange={e => patchProfile({ targetWeightKg: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
            </div>
            <Field label="Data di inizio">
              <input className="input" type="date" value={data.profile.startDate}
                onChange={e => patchProfile({ startDate: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card title="Obiettivi">
          <div className="stack">
            <Field label="Kcal giornaliere di riferimento">
              <input className="input input--num" type="number" min={0} step={50} value={data.settings.kcalTarget}
                onChange={e => patchSettings({ kcalTarget: Number(e.target.value) || 0 })} />
            </Field>
            <div className="row">
              <Field label="Allenamenti a settimana" style={{ flex: 1 }}>
                <input className="input input--num" type="number" min={0} max={14} value={data.settings.workoutsPerWeekTarget}
                  onChange={e => patchSettings({ workoutsPerWeekTarget: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Task a settimana" style={{ flex: 1 }}>
                <input className="input input--num" type="number" min={0} value={data.settings.tasksPerWeekTarget}
                  onChange={e => patchSettings({ tasksPerWeekTarget: Number(e.target.value) || 0 })} />
              </Field>
            </div>
            <p className="small muted">
              Gli obiettivi di studio si impostano nella sezione Studio, perché cambiano spesso.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Come si guadagnano gli XP" note="la regola del gioco">
        <div className="grid grid--4">
          <Stat label="Dieta" value={XP.dietaPerfetto} unit="XP"
            hint={`giorno perfetto · +${XP.pesoLoggato} XP se ti pesi`} />
          <Stat label="Workout" value={XP.workoutBase} unit="XP"
            hint="a sessione, +1 XP ogni 25 kcal bruciate" />
          <Stat label="Studio" value="1" unit="XP / 4 min"
            hint={`+${XP.studioObiettivo} XP quando centri l'obiettivo del giorno`} />
          <Stat label="Routine" value={`${XP.taskBassa}–${XP.taskAlta}`} unit="XP"
            hint="per task, in base alla priorità" />
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Il livello cresce con una curva quadratica: ogni livello costa un po' di più del precedente,
          quindi la costanza vale più di una settimana eroica isolata.
        </p>
      </Card>

      <div style={{ height: 14 }} />

      <Card title="Dati">
        <div className="grid grid--3" style={{ marginBottom: 14 }}>
          <Stat label="Giorni giocati" value={days} />
          <Stat label="XP totali" value={nf.format(xp.total)} />
          <Stat label="Voci salvate" value={nf.format(
            data.weights.length + data.workoutLogs.length + data.studyLogs.length +
            data.tasks.length + Object.keys(data.dietLogs).length)} />
        </div>

        <div className="row">
          <button className="btn" onClick={exportJson}>⬇ Esporta JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Importa JSON</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = '' }} />
          <div className="spacer" />
          <button className="btn" onClick={() => {
            if (confirm('Sostituire i dati attuali con un set di esempio di 6 settimane?')) {
              replaceAll(demoData())
              setMessage('Dati di esempio caricati. Puoi azzerare tutto quando vuoi.')
            }
          }}>🎲 Carica dati di esempio</button>
          <button className="btn btn--danger" onClick={() => {
            if (confirm('Cancellare TUTTI i dati? L\'operazione non è reversibile.')) {
              reset()
              setMessage('Tutto azzerato.')
            }
          }}>Azzera tutto</button>
        </div>

        <p className="small muted" style={{ marginTop: 12 }}>
          I dati vivono nel <b>localStorage</b> di questo browser: non passano da nessun server.
          Se cambi dispositivo o pulisci i dati del sito, esporta prima il JSON.
        </p>
      </Card>
    </>
  )
}
